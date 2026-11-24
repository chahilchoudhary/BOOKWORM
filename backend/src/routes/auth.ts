import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { db } from '../db.js';
import { HttpError, parse, requireAuth, signToken, wrap, z, type AuthedRequest } from '../http.js';

export const authRouter = Router();

interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  points: number;
}

const publicUser = (u: UserRow) => ({ id: u.id, name: u.name, email: u.email, points: u.points });

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

authRouter.post(
  '/register',
  wrap((req, res) => {
    const { name, email, password } = parse(registerSchema, req.body);
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
      throw new HttpError(409, 'Email already registered');
    }
    const info = db
      .prepare('INSERT INTO users (name, email, password_hash) VALUES (?,?,?)')
      .run(name, email, bcrypt.hashSync(password, 10));
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(info.lastInsertRowid)) as unknown as UserRow;
    res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
  }),
);

const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

authRouter.post(
  '/login',
  wrap((req, res) => {
    const { email, password } = parse(loginSchema, req.body);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as unknown as UserRow | undefined;
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      throw new HttpError(401, 'Wrong email or password');
    }
    res.json({ token: signToken(user.id), user: publicUser(user) });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  wrap((req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get((req as AuthedRequest).userId) as unknown as UserRow | undefined;
    if (!user) throw new HttpError(401, 'Please log in');
    res.json({ user: publicUser(user) });
  }),
);

/** "My Writers": authors of books the user has bought (cancelled orders excluded). */
authRouter.get(
  '/me/writers',
  requireAuth,
  wrap((req, res) => {
    const items = db
      .prepare(
        `SELECT a.id, a.name, a.bio, COUNT(DISTINCT b.id) AS books
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id AND o.status = 'CONFIRMED'
         JOIN books b ON b.id = oi.book_id JOIN authors a ON a.id = b.author_id
         WHERE o.user_id = ? GROUP BY a.id ORDER BY books DESC, a.name`,
      )
      .all((req as AuthedRequest).userId);
    res.json({ items });
  }),
);

/** Saved address = the address used on the user's last order. */
authRouter.get(
  '/me/address',
  requireAuth,
  wrap((req, res) => {
    const row = db
      .prepare('SELECT address FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 1')
      .get((req as AuthedRequest).userId) as { address: string } | undefined;
    res.json({ address: row ? JSON.parse(row.address) : null });
  }),
);
