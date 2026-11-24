import { Router } from 'express';
import { CATEGORIES } from '../seed.js';
import { db } from '../db.js';
import { HttpError, optionalAuth, parse, requireAuth, wrap, z, type AuthedRequest } from '../http.js';
import { deliveryDate } from '../pricing.js';

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

const getBooks = (sql: string, ...params: (string | number)[]) =>
  (db.prepare(sql).all(...params) as unknown as BookRow[]).map(toBook);

booksRouter.get('/categories', (_req, res) => {
  res.json({ categories: CATEGORIES });
});

booksRouter.get('/publishers', (_req, res) => {
  const rows = db.prepare('SELECT DISTINCT publisher FROM books ORDER BY publisher').all() as { publisher: string }[];
  res.json({ publishers: rows.map((r) => r.publisher) });
});

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

const SORTS: Record<string, string> = {
  relevance: 'b.units_sold DESC',
  priceAsc: 'b.price ASC',
  priceDesc: 'b.price DESC',
  newest: 'b.published_at DESC',
  rating: 'rating DESC, b.units_sold DESC',
};

booksRouter.get(
  '/books',
  wrap((req, res) => {
    const f = parse(listSchema, req.query);
    const where: string[] = [];
    const params: (string | number)[] = [];
    if (f.q) {
      where.push('(b.title LIKE ? OR a.name LIKE ?)');
      params.push(`%${f.q}%`, `%${f.q}%`);
    }
    for (const [col, val] of [['b.category', f.category], ['b.language', f.language], ['b.format', f.format], ['b.publisher', f.publisher]] as const) {
      if (val) {
        where.push(`${col} = ?`);
        params.push(val);
      }
    }
    if (f.min !== undefined) { where.push('b.price >= ?'); params.push(f.min); }
    if (f.max !== undefined) { where.push('b.price <= ?'); params.push(f.max); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = (db.prepare(`SELECT COUNT(*) AS n FROM books b JOIN authors a ON a.id = b.author_id ${clause}`).get(...params) as { n: number }).n;
    const items = getBooks(
      `${BOOK_SELECT} ${clause} ORDER BY ${SORTS[f.sort]} LIMIT ? OFFSET ?`,
      ...params,
      f.pageSize,
      (f.page - 1) * f.pageSize,
    );
    res.json({ items, page: f.page, pageSize: f.pageSize, total });
  }),
);

/** Home shelves: Recommended / Bestsellers / New launches (3 each). */
booksRouter.get(
  '/books/shelves',
  optionalAuth,
  wrap((req, res) => {
    const userId = (req as Partial<AuthedRequest>).userId;
    const bestsellers = getBooks(`${BOOK_SELECT} ORDER BY b.units_sold DESC LIMIT 3`);
    const newLaunches = getBooks(`${BOOK_SELECT} ORDER BY b.published_at DESC LIMIT 3`);

    let recommended = bestsellers;
    if (userId) {
      // categories of books the user has bought, most frequent first; exclude books already bought
      const rows = db
        .prepare(
          `SELECT b.category AS category FROM order_items oi
           JOIN orders o ON o.id = oi.order_id AND o.status = 'CONFIRMED'
           JOIN books b ON b.id = oi.book_id WHERE o.user_id = ?
           GROUP BY b.category ORDER BY COUNT(*) DESC`,
        )
        .all(userId) as { category: string }[];
      if (rows.length) {
        const marks = rows.map(() => '?').join(',');
        const picks = getBooks(
          `${BOOK_SELECT}
           WHERE b.category IN (${marks})
             AND b.id NOT IN (SELECT oi.book_id FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.user_id = ?)
           ORDER BY b.units_sold DESC LIMIT 3`,
          ...rows.map((r) => r.category),
          userId,
        );
        if (picks.length === 3) recommended = picks;
        else recommended = [...picks, ...bestsellers.filter((b) => !picks.some((p) => p.id === b.id))].slice(0, 3);
      }
    }
    res.json({ recommended, bestsellers, newLaunches });
  }),
);

function findBook(id: number): BookRow {
  const row = db.prepare(`${BOOK_SELECT} WHERE b.id = ?`).get(id) as unknown as BookRow | undefined;
  if (!row) throw new HttpError(404, 'Book not found');
  return row;
}

const idParam = z.coerce.number().int().positive();

booksRouter.get(
  '/books/:id',
  wrap((req, res) => {
    const book = findBook(parse(idParam, req.params.id));
    const author = db.prepare('SELECT id, name, bio FROM authors WHERE id = ?').get(book.author_id);
    res.json({ book: toBook(book), author });
  }),
);

booksRouter.get(
  '/books/:id/related',
  wrap((req, res) => {
    const book = findBook(parse(idParam, req.params.id));
    const items = getBooks(
      `${BOOK_SELECT} WHERE b.id != ? ORDER BY (b.category = ?) DESC, (b.author_id = ?) DESC, b.units_sold DESC LIMIT 3`,
      book.id,
      book.category,
      book.author_id,
    );
    res.json({ items });
  }),
);

booksRouter.get(
  '/books/:id/reviews',
  wrap((req, res) => {
    const id = parse(idParam, req.params.id);
    findBook(id);
    const items = db
      .prepare(
        `SELECT r.id, r.rating, r.body, r.created_at AS createdAt, u.name AS userName
         FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.book_id = ? ORDER BY r.id DESC`,
      )
      .all(id);
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
  wrap((req, res) => {
    const id = parse(idParam, req.params.id);
    findBook(id);
    const { rating, body } = parse(reviewSchema, req.body);
    const userId = (req as AuthedRequest).userId;
    if (db.prepare('SELECT 1 FROM reviews WHERE book_id = ? AND user_id = ?').get(id, userId)) {
      throw new HttpError(409, 'You already reviewed this book');
    }
    db.prepare('INSERT INTO reviews (book_id, user_id, rating, body, created_at) VALUES (?,?,?,?,?)').run(id, userId, rating, body, new Date().toISOString());
    res.status(201).json({ ok: true });
  }),
);

booksRouter.get(
  '/authors/:id',
  wrap((req, res) => {
    const id = parse(idParam, req.params.id);
    const author = db.prepare('SELECT id, name, bio FROM authors WHERE id = ?').get(id);
    if (!author) throw new HttpError(404, 'Author not found');
    res.json({ author, books: getBooks(`${BOOK_SELECT} WHERE b.author_id = ? ORDER BY b.units_sold DESC`, id) });
  }),
);
