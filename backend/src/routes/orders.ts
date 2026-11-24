import { Router } from 'express';
import { db, transaction } from '../db.js';
import { HttpError, parse, requireAuth, wrap, z, type AuthedRequest } from '../http.js';
import { canCancel, deliveryDate, mockPay } from '../pricing.js';
import { loadCart, loadCoupon, quoteFor } from './cart.js';

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

const uid = (req: unknown) => (req as AuthedRequest).userId;

const addressSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.email('Enter a valid email'),
  line1: z.string().trim().min(1, 'Address is required'),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().trim().min(1, 'State is required'),
  pin: z.string().regex(/^\d{6}$/, 'Pin must be 6 digits'),
  country: z.string().trim().min(1, 'Country is required'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  phoneCode: z.string().default('+91'),
});

const checkoutSchema = z.object({
  address: addressSchema,
  couponCode: z.string().trim().optional(),
  pointsToRedeem: z.number().int().min(0).default(0),
  payment: z.object({
    method: z.enum(['credit_card', 'debit_card', 'upi', 'wallet']),
    cardNumber: z.string().optional(),
    upiId: z.string().optional(),
  }),
});

interface OrderRow {
  id: number;
  status: string;
  subtotal: number;
  tax: number;
  delivery: number;
  discount: number;
  points_used: number;
  total: number;
  payment_method: string;
  placed_at: string;
  cancelled_at: string | null;
}

function orderDto(o: OrderRow) {
  const items = db
    .prepare(
      `SELECT oi.book_id AS bookId, oi.quantity, oi.unit_price AS unitPrice, b.title, b.cover_color AS coverColor, b.format,
              a.name AS authorName, a.id AS authorId
       FROM order_items oi JOIN books b ON b.id = oi.book_id JOIN authors a ON a.id = b.author_id WHERE oi.order_id = ?`,
    )
    .all(o.id) as unknown as { format: string }[];
  return {
    id: o.id,
    status: o.status,
    subtotal: o.subtotal,
    tax: o.tax,
    delivery: o.delivery,
    discount: o.discount,
    pointsUsed: o.points_used,
    total: o.total,
    paymentMethod: o.payment_method,
    placedAt: o.placed_at,
    cancelledAt: o.cancelled_at,
    canCancel: canCancel(o.status, o.placed_at),
    items: items.map((i) => ({ ...i, deliveryDate: deliveryDate(i.format, new Date(o.placed_at)) })),
  };
}

function ownOrder(userId: number, id: number): OrderRow {
  const row = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(id, userId) as unknown as OrderRow | undefined;
  if (!row) throw new HttpError(404, 'Order not found');
  return row;
}

/** Checkout: price on the server, "pay" with the mock gateway, then create the order — all or nothing. */
ordersRouter.post(
  '/orders',
  wrap((req, res) => {
    const userId = uid(req);
    const body = parse(checkoutSchema, req.body);

    const { items } = loadCart(userId);
    if (items.length === 0) throw new HttpError(400, 'Your cart is empty');
    const coupon = loadCoupon(body.couponCode);
    if (body.couponCode && !coupon) throw new HttpError(400, 'Invalid coupon code');
    const { quote } = quoteFor(userId, body.couponCode, body.pointsToRedeem);
    if (quote.couponError) throw new HttpError(400, quote.couponError);

    const pay = mockPay(body.payment.method, body.payment);
    if (!pay.ok) throw new HttpError(402, pay.message);

    const orderId = transaction(() => {
      for (const { book, quantity } of items) {
        const changed = db.prepare('UPDATE books SET stock = stock - ?, units_sold = units_sold + ? WHERE id = ? AND stock >= ?').run(quantity, quantity, book.id, quantity);
        if (changed.changes === 0) throw new HttpError(409, `"${book.title}" is out of stock`);
      }
      const info = db
        .prepare(
          `INSERT INTO orders (user_id, status, subtotal, tax, delivery, discount, points_used, total, payment_method, address, placed_at)
           VALUES (?, 'CONFIRMED', ?,?,?,?,?,?,?,?,?)`,
        )
        .run(userId, quote.subtotal, quote.tax, quote.delivery, quote.discount, quote.pointsUsed, quote.total, body.payment.method, JSON.stringify(body.address), new Date().toISOString());
      const id = Number(info.lastInsertRowid);
      const addItem = db.prepare('INSERT INTO order_items (order_id, book_id, quantity, unit_price) VALUES (?,?,?,?)');
      for (const { book, quantity } of items) addItem.run(id, book.id, quantity, book.price);
      // spend redeemed points, earn 1 point per ₹100 paid
      db.prepare('UPDATE users SET points = points - ? + ? WHERE id = ?').run(quote.pointsUsed, Math.floor(quote.total / 100), userId);
      db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
      return id;
    });

    res.status(201).json({ order: orderDto(ownOrder(userId, orderId)) });
  }),
);

ordersRouter.get(
  '/orders',
  wrap((req, res) => {
    const rows = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(uid(req)) as unknown as OrderRow[];
    res.json({ items: rows.map(orderDto) });
  }),
);

const idParam = z.coerce.number().int().positive();

ordersRouter.get(
  '/orders/:id',
  wrap((req, res) => {
    res.json({ order: orderDto(ownOrder(uid(req), parse(idParam, req.params.id))) });
  }),
);

/** Cancel: only while CONFIRMED and within 48 hours. Refunds, restocks and returns points. */
ordersRouter.post(
  '/orders/:id/cancel',
  wrap((req, res) => {
    const userId = uid(req);
    const order = ownOrder(userId, parse(idParam, req.params.id));
    if (order.status === 'CANCELLED') throw new HttpError(409, 'Order is already cancelled');
    if (!canCancel(order.status, order.placed_at)) throw new HttpError(409, 'Orders can only be cancelled within 48 hours');

    transaction(() => {
      db.prepare("UPDATE orders SET status = 'CANCELLED', cancelled_at = ? WHERE id = ?").run(new Date().toISOString(), order.id);
      const items = db.prepare('SELECT book_id, quantity FROM order_items WHERE order_id = ?').all(order.id) as { book_id: number; quantity: number }[];
      for (const i of items) {
        db.prepare('UPDATE books SET stock = stock + ?, units_sold = MAX(units_sold - ?, 0) WHERE id = ?').run(i.quantity, i.quantity, i.book_id);
      }
      // give back redeemed points, take back points earned from this order
      db.prepare('UPDATE users SET points = MAX(points + ? - ?, 0) WHERE id = ?').run(order.points_used, Math.floor(order.total / 100), userId);
    });

    res.json({ order: orderDto(ownOrder(userId, order.id)) });
  }),
);

/** "Buy it again": put all items of a past order back in the cart. */
ordersRouter.post(
  '/orders/:id/buy-again',
  wrap((req, res) => {
    const userId = uid(req);
    const order = ownOrder(userId, parse(idParam, req.params.id));
    const items = db.prepare('SELECT book_id, quantity FROM order_items WHERE order_id = ?').all(order.id) as { book_id: number; quantity: number }[];
    for (const i of items) {
      const stock = (db.prepare('SELECT stock FROM books WHERE id = ?').get(i.book_id) as { stock: number }).stock;
      if (stock < 1) continue;
      db.prepare(
        `INSERT INTO cart_items (user_id, book_id, quantity) VALUES (?,?,?)
         ON CONFLICT (user_id, book_id) DO UPDATE SET quantity = MIN(quantity + excluded.quantity, 10)`,
      ).run(userId, i.book_id, Math.min(i.quantity, stock));
    }
    res.json(quoteFor(userId));
  }),
);
