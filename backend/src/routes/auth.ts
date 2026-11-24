import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { one, query } from '../db.js';
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
  wrap(async (req, res) => {
    const { name, email, password } = parse(registerSchema, req.body);
    if (await one('SELECT 1 FROM users WHERE email = $1', [email])) {
      throw new HttpError(409, 'Email already registered');
    }
    const user = await one<UserRow>(
      'INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING *',
      [name, email, bcrypt.hashSync(password, 10)],
    );
    if (!user) throw new HttpError(500, 'Could not create account');
    res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
  }),
);

const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

authRouter.post(
  '/login',
  wrap(async (req, res) => {
    const { email, password } = parse(loginSchema, req.body);
    const user = await one<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      throw new HttpError(401, 'Wrong email or password');
    }
    res.json({ token: signToken(user.id), user: publicUser(user) });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  wrap(async (req, res) => {
    const user = await one<UserRow>('SELECT * FROM users WHERE id = $1', [(req as AuthedRequest).userId]);
    if (!user) throw new HttpError(401, 'Please log in');
    res.json({ user: publicUser(user) });
  }),
);

/** "My Writers": authors of books the user has bought (cancelled orders excluded). */
authRouter.get(
  '/me/writers',
  requireAuth,
  wrap(async (req, res) => {
    const items = await query(
      `SELECT a.id, a.name, a.bio, COUNT(DISTINCT b.id) AS books
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id AND o.status = 'CONFIRMED'
       JOIN books b ON b.id = oi.book_id JOIN authors a ON a.id = b.author_id
       WHERE o.user_id = $1 GROUP BY a.id ORDER BY books DESC, a.name`,
      [(req as AuthedRequest).userId],
    );
    res.json({ items });
  }),
);

/** Saved address = the address used on the user's last order. */
authRouter.get(
  '/me/address',
  requireAuth,
  wrap(async (req, res) => {
    const row = await one<{ address: unknown }>(
      'SELECT address FROM orders WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
      [(req as AuthedRequest).userId],
    );
    res.json({ address: row ? row.address : null });
  }),
);
