import { Router } from 'express';
import { RULES } from '../config/env.js';
import { one, query } from '../db.js';
import { HttpError, parse, requireAuth, wrap, z, type AuthedRequest } from '../http.js';
import { computeQuote, type CouponRow } from '../pricing.js';
import { BOOK_SELECT, toBook, type BookRow } from './books.js';

export const cartRouter = Router();
cartRouter.use(requireAuth);

const uid = (req: unknown) => (req as AuthedRequest).userId;

export async function loadCart(userId: number) {
  const rows = await query<BookRow & { quantity: number }>(
    `SELECT ci.quantity AS quantity, x.*
     FROM cart_items ci JOIN (${BOOK_SELECT}) x ON x.id = ci.book_id
     WHERE ci.user_id = $1 ORDER BY ci.added_at, ci.book_id`,
    [userId],
  );
  const items = rows.map((r) => ({ book: toBook(r), quantity: r.quantity }));
  const subtotal = items.reduce((sum, i) => sum + i.book.price * i.quantity, 0);
  return { items, subtotal };
}

export async function loadCoupon(code: string | undefined): Promise<CouponRow | null> {
  if (!code) return null;
  return (await one<CouponRow>('SELECT * FROM coupons WHERE code = $1', [code.trim().toUpperCase()])) ?? null;
}

export async function quoteFor(userId: number, couponCode?: string, points = 0) {
  const { items, subtotal } = await loadCart(userId);
  const coupon = await loadCoupon(couponCode);
  const balance = (await one<{ points: number }>('SELECT points FROM users WHERE id = $1', [userId]))?.points ?? 0;
  const quote = computeQuote(subtotal, coupon, points, balance);
  if (couponCode && !coupon) quote.couponError = 'Invalid coupon code';
  return { items, quote, pointsBalance: balance };
}

cartRouter.get(
  '/cart',
  wrap(async (req, res) => {
    res.json(await quoteFor(uid(req)));
  }),
);

const quoteSchema = z.object({
  couponCode: z.string().trim().optional(),
  pointsToRedeem: z.number().int().min(0).default(0),
});

cartRouter.post(
  '/cart/quote',
  wrap(async (req, res) => {
    const { couponCode, pointsToRedeem } = parse(quoteSchema, req.body ?? {});
    res.json(await quoteFor(uid(req), couponCode || undefined, pointsToRedeem));
  }),
);

const qtySchema = z.object({ quantity: z.number().int().min(1).max(RULES.MAX_QTY) });
const bookId = z.coerce.number().int().positive();

cartRouter.put(
  '/cart/items/:bookId',
  wrap(async (req, res) => {
    const id = parse(bookId, req.params.bookId);
    const { quantity } = parse(qtySchema, req.body);
    const book = await one<{ stock: number }>('SELECT stock FROM books WHERE id = $1', [id]);
    if (!book) throw new HttpError(404, 'Book not found');
    if (quantity > book.stock) throw new HttpError(409, `Only ${book.stock} left in stock`);
    await query(
      `INSERT INTO cart_items (user_id, book_id, quantity) VALUES ($1,$2,$3)
       ON CONFLICT (user_id, book_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
      [uid(req), id, quantity],
    );
    res.json(await quoteFor(uid(req)));
  }),
);

cartRouter.delete(
  '/cart/items/:bookId',
  wrap(async (req, res) => {
    await query('DELETE FROM cart_items WHERE user_id = $1 AND book_id = $2', [uid(req), parse(bookId, req.params.bookId)]);
    res.json(await quoteFor(uid(req)));
  }),
);

// ---- wishlist ----
cartRouter.get(
  '/wishlist',
  wrap(async (req, res) => {
    const rows = await query<BookRow>(
      `SELECT x.* FROM wishlist_items w JOIN (${BOOK_SELECT}) x ON x.id = w.book_id
       WHERE w.user_id = $1 ORDER BY w.added_at DESC, w.book_id`,
      [uid(req)],
    );
    res.json({ items: rows.map(toBook) });
  }),
);

cartRouter.put(
  '/wishlist/:bookId',
  wrap(async (req, res) => {
    const id = parse(bookId, req.params.bookId);
    if (!(await one('SELECT 1 FROM books WHERE id = $1', [id]))) throw new HttpError(404, 'Book not found');
    await query('INSERT INTO wishlist_items (user_id, book_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [uid(req), id]);
    res.json({ ok: true });
  }),
);

cartRouter.delete(
  '/wishlist/:bookId',
  wrap(async (req, res) => {
    await query('DELETE FROM wishlist_items WHERE user_id = $1 AND book_id = $2', [uid(req), parse(bookId, req.params.bookId)]);
    res.json({ ok: true });
  }),
);
