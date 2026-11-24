import { Router } from 'express';
import { RULES } from '../config/env.js';
import { db } from '../db.js';
import { HttpError, parse, requireAuth, wrap, z, type AuthedRequest } from '../http.js';
import { computeQuote, type CouponRow } from '../pricing.js';
import { BOOK_SELECT, toBook, type BookRow } from './books.js';

export const cartRouter = Router();
cartRouter.use(requireAuth);

const uid = (req: unknown) => (req as AuthedRequest).userId;

export function loadCart(userId: number) {
  const rows = db
    .prepare(
      `SELECT ci.quantity AS quantity, b.stock AS stock_left, x.*
       FROM cart_items ci
       JOIN (${BOOK_SELECT}) x ON x.id = ci.book_id
       JOIN books b ON b.id = ci.book_id
       WHERE ci.user_id = ? ORDER BY ci.rowid`,
    )
    .all(userId) as unknown as (BookRow & { quantity: number })[];
  const items = rows.map((r) => ({ book: toBook(r), quantity: r.quantity }));
  const subtotal = items.reduce((sum, i) => sum + i.book.price * i.quantity, 0);
  return { items, subtotal };
}

export function loadCoupon(code: string | undefined): CouponRow | null {
  if (!code) return null;
  const row = db.prepare('SELECT * FROM coupons WHERE code = ?').get(code.trim().toUpperCase()) as unknown as CouponRow | undefined;
  return row ?? null;
}

export function quoteFor(userId: number, couponCode?: string, points = 0) {
  const { items, subtotal } = loadCart(userId);
  const coupon = loadCoupon(couponCode);
  const balance = (db.prepare('SELECT points FROM users WHERE id = ?').get(userId) as { points: number }).points;
  const quote = computeQuote(subtotal, coupon, points, balance);
  if (couponCode && !coupon) quote.couponError = 'Invalid coupon code';
  return { items, quote, pointsBalance: balance };
}

cartRouter.get(
  '/cart',
  wrap((req, res) => {
    res.json(quoteFor(uid(req)));
  }),
);

const quoteSchema = z.object({
  couponCode: z.string().trim().optional(),
  pointsToRedeem: z.number().int().min(0).default(0),
});

cartRouter.post(
  '/cart/quote',
  wrap((req, res) => {
    const { couponCode, pointsToRedeem } = parse(quoteSchema, req.body ?? {});
    res.json(quoteFor(uid(req), couponCode || undefined, pointsToRedeem));
  }),
);

const qtySchema = z.object({ quantity: z.number().int().min(1).max(RULES.MAX_QTY) });
const bookId = z.coerce.number().int().positive();

cartRouter.put(
  '/cart/items/:bookId',
  wrap((req, res) => {
    const id = parse(bookId, req.params.bookId);
    const { quantity } = parse(qtySchema, req.body);
    const book = db.prepare('SELECT stock FROM books WHERE id = ?').get(id) as { stock: number } | undefined;
    if (!book) throw new HttpError(404, 'Book not found');
    if (quantity > book.stock) throw new HttpError(409, `Only ${book.stock} left in stock`);
    db.prepare(
      `INSERT INTO cart_items (user_id, book_id, quantity) VALUES (?,?,?)
       ON CONFLICT (user_id, book_id) DO UPDATE SET quantity = excluded.quantity`,
    ).run(uid(req), id, quantity);
    res.json(quoteFor(uid(req)));
  }),
);

cartRouter.delete(
  '/cart/items/:bookId',
  wrap((req, res) => {
    db.prepare('DELETE FROM cart_items WHERE user_id = ? AND book_id = ?').run(uid(req), parse(bookId, req.params.bookId));
    res.json(quoteFor(uid(req)));
  }),
);

// ---- wishlist ----
cartRouter.get(
  '/wishlist',
  wrap((req, res) => {
    const rows = db
      .prepare(`SELECT x.* FROM wishlist_items w JOIN (${BOOK_SELECT}) x ON x.id = w.book_id WHERE w.user_id = ? ORDER BY w.rowid DESC`)
      .all(uid(req)) as unknown as BookRow[];
    res.json({ items: rows.map(toBook) });
  }),
);

cartRouter.put(
  '/wishlist/:bookId',
  wrap((req, res) => {
    const id = parse(bookId, req.params.bookId);
    if (!db.prepare('SELECT 1 FROM books WHERE id = ?').get(id)) throw new HttpError(404, 'Book not found');
    db.prepare('INSERT OR IGNORE INTO wishlist_items (user_id, book_id) VALUES (?,?)').run(uid(req), id);
    res.json({ ok: true });
  }),
);

cartRouter.delete(
  '/wishlist/:bookId',
  wrap((req, res) => {
    db.prepare('DELETE FROM wishlist_items WHERE user_id = ? AND book_id = ?').run(uid(req), parse(bookId, req.params.bookId));
    res.json({ ok: true });
  }),
);
