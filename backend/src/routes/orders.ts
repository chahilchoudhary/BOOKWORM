import { Router } from 'express';
import { one, query, transaction } from '../db.js';
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
  placed_at: Date;
  cancelled_at: Date | null;
}

async function orderDto(o: OrderRow) {
  const items = await query<{ format: string }>(
    `SELECT oi.book_id AS "bookId", oi.quantity, oi.unit_price AS "unitPrice", b.title, b.cover_color AS "coverColor", b.format,
            a.name AS "authorName", a.id AS "authorId"
     FROM order_items oi JOIN books b ON b.id = oi.book_id JOIN authors a ON a.id = b.author_id
     WHERE oi.order_id = $1 ORDER BY oi.id`,
    [o.id],
  );
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

async function ownOrder(userId: number, id: number): Promise<OrderRow> {
  const row = await one<OrderRow>('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [id, userId]);
  if (!row) throw new HttpError(404, 'Order not found');
  return row;
}

/** Checkout: price on the server, "pay" with the mock gateway, then create the order — all or nothing. */
ordersRouter.post(
  '/orders',
  wrap(async (req, res) => {
    const userId = uid(req);
    const body = parse(checkoutSchema, req.body);

    const { items } = await loadCart(userId);
    if (items.length === 0) throw new HttpError(400, 'Your cart is empty');
    const coupon = await loadCoupon(body.couponCode);
    if (body.couponCode && !coupon) throw new HttpError(400, 'Invalid coupon code');
    const { quote } = await quoteFor(userId, body.couponCode, body.pointsToRedeem);
    if (quote.couponError) throw new HttpError(400, quote.couponError);

    const pay = mockPay(body.payment.method, body.payment);
    if (!pay.ok) throw new HttpError(402, pay.message);

    const orderId = await transaction(async (tx) => {
      // lock this user's row so two checkouts at once cannot spend the same gift points twice
      const user = await one<{ points: number }>('SELECT points FROM users WHERE id = $1 FOR UPDATE', [userId], tx);
      if (!user || quote.pointsUsed > user.points) throw new HttpError(409, 'Not enough gift points');

      // oversell protection: the row is only updated if enough stock is left, otherwise nothing changes
      for (const { book, quantity } of items) {
        const updated = await tx.query(
          'UPDATE books SET stock = stock - $1, units_sold = units_sold + $1 WHERE id = $2 AND stock >= $1',
          [quantity, book.id],
        );
        if (updated.rowCount === 0) throw new HttpError(409, `"${book.title}" is out of stock`);
      }
      const order = await one<{ id: number }>(
        `INSERT INTO orders (user_id, status, subtotal, tax, delivery, discount, points_used, total, payment_method, address, placed_at)
         VALUES ($1,'CONFIRMED',$2,$3,$4,$5,$6,$7,$8,$9,now()) RETURNING id`,
        [userId, quote.subtotal, quote.tax, quote.delivery, quote.discount, quote.pointsUsed, quote.total, body.payment.method, JSON.stringify(body.address)],
        tx,
      );
      if (!order) throw new HttpError(500, 'Could not create the order');
      for (const { book, quantity } of items) {
        await tx.query('INSERT INTO order_items (order_id, book_id, quantity, unit_price) VALUES ($1,$2,$3,$4)', [order.id, book.id, quantity, book.price]);
      }
      // spend redeemed points, earn 1 point per ₹100 paid
      await tx.query('UPDATE users SET points = points - $1 + $2 WHERE id = $3', [quote.pointsUsed, Math.floor(quote.total / 100), userId]);
      await tx.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
      return order.id;
    });

    res.status(201).json({ order: await orderDto(await ownOrder(userId, orderId)) });
  }),
);

ordersRouter.get(
  '/orders',
  wrap(async (req, res) => {
    const rows = await query<OrderRow>('SELECT * FROM orders WHERE user_id = $1 ORDER BY id DESC', [uid(req)]);
    res.json({ items: await Promise.all(rows.map(orderDto)) });
  }),
);

const idParam = z.coerce.number().int().positive();

ordersRouter.get(
  '/orders/:id',
  wrap(async (req, res) => {
    res.json({ order: await orderDto(await ownOrder(uid(req), parse(idParam, req.params.id))) });
  }),
);

/** Cancel: only while CONFIRMED and within 48 hours. Refunds, restocks and returns points. */
ordersRouter.post(
  '/orders/:id/cancel',
  wrap(async (req, res) => {
    const userId = uid(req);
    const id = parse(idParam, req.params.id);

    await transaction(async (tx) => {
      // lock the order row so a double-click cannot cancel (and restock) twice
      const order = await one<OrderRow>('SELECT * FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE', [id, userId], tx);
      if (!order) throw new HttpError(404, 'Order not found');
      if (order.status === 'CANCELLED') throw new HttpError(409, 'Order is already cancelled');
      if (!canCancel(order.status, order.placed_at)) throw new HttpError(409, 'Orders can only be cancelled within 48 hours');

      await tx.query("UPDATE orders SET status = 'CANCELLED', cancelled_at = now() WHERE id = $1", [id]);
      const items = await query<{ book_id: number; quantity: number }>('SELECT book_id, quantity FROM order_items WHERE order_id = $1', [id], tx);
      for (const i of items) {
        await tx.query('UPDATE books SET stock = stock + $1, units_sold = GREATEST(units_sold - $1, 0) WHERE id = $2', [i.quantity, i.book_id]);
      }
      // give back redeemed points, take back points earned from this order
      await tx.query('UPDATE users SET points = GREATEST(points + $1 - $2, 0) WHERE id = $3', [order.points_used, Math.floor(order.total / 100), userId]);
    });

    res.json({ order: await orderDto(await ownOrder(userId, id)) });
  }),
);

/** "Buy it again": put all items of a past order back in the cart. */
ordersRouter.post(
  '/orders/:id/buy-again',
  wrap(async (req, res) => {
    const userId = uid(req);
    const order = await ownOrder(userId, parse(idParam, req.params.id));
    const items = await query<{ book_id: number; quantity: number }>('SELECT book_id, quantity FROM order_items WHERE order_id = $1', [order.id]);
    for (const i of items) {
      const stock = (await one<{ stock: number }>('SELECT stock FROM books WHERE id = $1', [i.book_id]))?.stock ?? 0;
      if (stock < 1) continue;
      await query(
        `INSERT INTO cart_items (user_id, book_id, quantity) VALUES ($1,$2,$3)
         ON CONFLICT (user_id, book_id) DO UPDATE SET quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, 10)`,
        [userId, i.book_id, Math.min(i.quantity, stock)],
      );
    }
    res.json(await quoteFor(userId));
  }),
);
