import { Router } from 'express';
import { one, query } from '../db.js';
import { HttpError, optionalAuth, parse, requireAuth, wrap, z, type AuthedRequest } from '../http.js';
import { deliveryDate } from '../pricing.js';
import { CATEGORIES } from '../seed.js';

export const booksRouter = Router();

export interface BookRow {
  id: number;
  title: string;
  description: string;
  author_id: number;
  author_name: string;
  publisher: string;
  category: string;
  tags: string;
  format: string;
  language: string;
  price: number;
  stock: number;
  units_sold: number;
  published_at: string;
  cover_color: string;
  rating: number | null;
}

export const BOOK_SELECT = `
  SELECT b.*, a.name AS author_name,
    (SELECT ROUND(AVG(rating), 1) FROM reviews r WHERE r.book_id = b.id) AS rating
  FROM books b JOIN authors a ON a.id = b.author_id`;

export function toBook(b: BookRow) {
  return {
    id: b.id,
    title: b.title,
    description: b.description,
    author: { id: b.author_id, name: b.author_name },
    publisher: b.publisher,
    category: b.category,
    tags: b.tags ? b.tags.split(',') : [],
    format: b.format,
    language: b.language,
    price: b.price,
    inStock: b.stock > 0,
    unitsSold: b.units_sold,
    rating: b.rating ?? 0,
    coverColor: b.cover_color,
    deliveryDate: deliveryDate(b.format),
  };
}

const getBooks = async (sql: string, params: unknown[] = []) => (await query<BookRow>(sql, params)).map(toBook);

booksRouter.get('/categories', (_req, res) => {
  res.json({ categories: CATEGORIES });
});

booksRouter.get(
  '/publishers',
  wrap(async (_req, res) => {
    const rows = await query<{ publisher: string }>('SELECT DISTINCT publisher FROM books ORDER BY publisher');
    res.json({ publishers: rows.map((r) => r.publisher) });
  }),
);

const listSchema = z.object({
  q: z.string().trim().optional(),
  category: z.string().optional(),
  language: z.string().optional(),
  format: z.string().optional(),
  publisher: z.string().optional(),
  min: z.coerce.number().int().min(0).optional(),
  max: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['relevance', 'priceAsc', 'priceDesc', 'newest', 'rating']).default('relevance'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

// Fixed whitelist: the sort key picks a clause from here, user text is never put into SQL.
const SORTS: Record<string, string> = {
  relevance: 'b.units_sold DESC, b.id',
  priceAsc: 'b.price ASC, b.id',
  priceDesc: 'b.price DESC, b.id',
  newest: 'b.published_at DESC, b.id',
  rating: 'rating DESC NULLS LAST, b.units_sold DESC, b.id',
};

booksRouter.get(
  '/books',
  wrap(async (req, res) => {
    const f = parse(listSchema, req.query);
    const where: string[] = [];
    const params: unknown[] = [];
    const add = (sql: string, ...values: unknown[]) => {
      // replace each "?" with the next $n placeholder
      let i = params.length;
      where.push(sql.replace(/\?/g, () => `$${++i}`));
      params.push(...values);
    };
    if (f.q) add('(b.title ILIKE ? OR a.name ILIKE ?)', `%${f.q}%`, `%${f.q}%`);
    if (f.category) add('b.category = ?', f.category);
    if (f.language) add('b.language = ?', f.language);
    if (f.format) add('b.format = ?', f.format);
    if (f.publisher) add('b.publisher = ?', f.publisher);
    if (f.min !== undefined) add('b.price >= ?', f.min);
    if (f.max !== undefined) add('b.price <= ?', f.max);
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const totalRow = await one<{ n: number }>(
      `SELECT COUNT(*) AS n FROM books b JOIN authors a ON a.id = b.author_id ${clause}`,
      params,
    );
    const items = await getBooks(
      `${BOOK_SELECT} ${clause} ORDER BY ${SORTS[f.sort]} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, f.pageSize, (f.page - 1) * f.pageSize],
    );
    res.json({ items, page: f.page, pageSize: f.pageSize, total: totalRow?.n ?? 0 });
  }),
);

/** Home shelves: Recommended / Bestsellers / New launches (3 each). */
booksRouter.get(
  '/books/shelves',
  optionalAuth,
  wrap(async (req, res) => {
    const userId = (req as Partial<AuthedRequest>).userId;
    const bestsellers = await getBooks(`${BOOK_SELECT} ORDER BY b.units_sold DESC, b.id LIMIT 3`);
    const newLaunches = await getBooks(`${BOOK_SELECT} ORDER BY b.published_at DESC, b.id LIMIT 3`);

    let recommended = bestsellers;
    if (userId) {
      // categories of books the user has bought, most frequent first; exclude books already bought
      const rows = await query<{ category: string }>(
        `SELECT b.category AS category FROM order_items oi
         JOIN orders o ON o.id = oi.order_id AND o.status = 'CONFIRMED'
         JOIN books b ON b.id = oi.book_id WHERE o.user_id = $1
         GROUP BY b.category ORDER BY COUNT(*) DESC`,
        [userId],
      );
      if (rows.length) {
        const picks = await getBooks(
          `${BOOK_SELECT}
           WHERE b.category = ANY($1::text[])
             AND b.id NOT IN (SELECT oi.book_id FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.user_id = $2)
           ORDER BY b.units_sold DESC, b.id LIMIT 3`,
          [rows.map((r) => r.category), userId],
        );
        recommended =
          picks.length === 3 ? picks : [...picks, ...bestsellers.filter((b) => !picks.some((p) => p.id === b.id))].slice(0, 3);
      }
    }
    res.json({ recommended, bestsellers, newLaunches });
  }),
);

async function findBook(id: number): Promise<BookRow> {
  const row = await one<BookRow>(`${BOOK_SELECT} WHERE b.id = $1`, [id]);
  if (!row) throw new HttpError(404, 'Book not found');
  return row;
}

const idParam = z.coerce.number().int().positive();

booksRouter.get(
  '/books/:id',
  wrap(async (req, res) => {
    const book = await findBook(parse(idParam, req.params.id));
    const author = await one('SELECT id, name, bio FROM authors WHERE id = $1', [book.author_id]);
    res.json({ book: toBook(book), author });
  }),
);

booksRouter.get(
  '/books/:id/related',
  wrap(async (req, res) => {
    const book = await findBook(parse(idParam, req.params.id));
    const items = await getBooks(
      `${BOOK_SELECT} WHERE b.id <> $1
       ORDER BY (b.category = $2) DESC, (b.author_id = $3) DESC, b.units_sold DESC, b.id LIMIT 3`,
      [book.id, book.category, book.author_id],
    );
    res.json({ items });
  }),
);

booksRouter.get(
  '/books/:id/reviews',
  wrap(async (req, res) => {
    const id = parse(idParam, req.params.id);
    await findBook(id);
    const items = await query(
      `SELECT r.id, r.rating, r.body, r.created_at AS "createdAt", u.name AS "userName"
       FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.book_id = $1 ORDER BY r.id DESC`,
      [id],
    );
    res.json({ items });
  }),
);

const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Choose a rating').max(5),
  body: z.string().trim().min(1, 'Write something').max(100, 'Max 100 characters'),
});

booksRouter.post(
  '/books/:id/reviews',
  requireAuth,
  wrap(async (req, res) => {
    const id = parse(idParam, req.params.id);
    await findBook(id);
    const { rating, body } = parse(reviewSchema, req.body);
    const userId = (req as AuthedRequest).userId;
    if (await one('SELECT 1 FROM reviews WHERE book_id = $1 AND user_id = $2', [id, userId])) {
      throw new HttpError(409, 'You already reviewed this book');
    }
    await query('INSERT INTO reviews (book_id, user_id, rating, body) VALUES ($1,$2,$3,$4)', [id, userId, rating, body]);
    res.status(201).json({ ok: true });
  }),
);

booksRouter.get(
  '/authors/:id',
  wrap(async (req, res) => {
    const id = parse(idParam, req.params.id);
    const author = await one('SELECT id, name, bio FROM authors WHERE id = $1', [id]);
    if (!author) throw new HttpError(404, 'Author not found');
    res.json({ author, books: await getBooks(`${BOOK_SELECT} WHERE b.author_id = $1 ORDER BY b.units_sold DESC, b.id`, [id]) });
  }),
);
