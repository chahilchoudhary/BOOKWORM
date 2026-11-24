import pg from 'pg';
import { env } from './config/env.js';

// Return COUNT()/AVG() (bigint/numeric) as JS numbers and DATE columns as plain 'yyyy-mm-dd' strings.
pg.types.setTypeParser(20, (v) => Number(v));
pg.types.setTypeParser(1700, (v) => Number(v));
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

type Db = pg.Pool | pg.PoolClient;

/** Run a parameterised query and return the rows. Always use $1, $2 ... — never build SQL from user input. */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  client: Db = pool,
): Promise<T[]> {
  return (await (client as pg.Pool).query<T>(sql, params)).rows;
}

/** First row or undefined. */
export async function one<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  client: Db = pool,
): Promise<T | undefined> {
  return (await query<T>(sql, params, client))[0];
}

/** Run fn inside a transaction on one connection; rolls back if it throws. */
export async function transaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0)
);
CREATE TABLE IF NOT EXISTS authors (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS books (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  author_id INTEGER NOT NULL REFERENCES authors(id),
  publisher TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '',
  format TEXT NOT NULL CHECK (format IN ('Paperback','Hardcover','eBook')),
  language TEXT NOT NULL DEFAULT 'English',
  price INTEGER NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 100 CHECK (stock >= 0),
  units_sold INTEGER NOT NULL DEFAULT 0,
  published_at DATE NOT NULL,
  cover_color TEXT NOT NULL DEFAULT '#facc15'
);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author_id);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL CHECK (length(body) <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (book_id, user_id)
);
CREATE TABLE IF NOT EXISTS cart_items (
  user_id INTEGER NOT NULL REFERENCES users(id),
  book_id INTEGER NOT NULL REFERENCES books(id),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 10),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_id)
);
CREATE TABLE IF NOT EXISTS wishlist_items (
  user_id INTEGER NOT NULL REFERENCES users(id),
  book_id INTEGER NOT NULL REFERENCES books(id),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_id)
);
CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('percent','flat')),
  value INTEGER NOT NULL,
  min_order INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('CONFIRMED','CANCELLED')),
  subtotal INTEGER NOT NULL,
  tax INTEGER NOT NULL,
  delivery INTEGER NOT NULL,
  discount INTEGER NOT NULL,
  points_used INTEGER NOT NULL,
  total INTEGER NOT NULL,
  payment_method TEXT NOT NULL,
  address JSONB NOT NULL,
  placed_at TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  book_id INTEGER NOT NULL REFERENCES books(id),
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
`;

/** Create the database itself if it does not exist yet (dev convenience), then create the tables. */
async function ensureDatabase(): Promise<void> {
  const url = new URL(env.DATABASE_URL);
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!/^\w+$/.test(name)) throw new Error(`Unsafe database name in DATABASE_URL: ${name}`);
  url.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: url.toString() });
  try {
    await admin.connect();
  } catch (e) {
    throw new Error(
      `Cannot connect to PostgreSQL (${url.hostname}:${url.port || 5432}). Is it running, and is DATABASE_URL correct? (${(e as Error).message})`,
    );
  }
  try {
    const found = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (found.rowCount === 0) await admin.query(`CREATE DATABASE "${name}"`);
  } finally {
    await admin.end();
  }
}

/** Create the database (if needed) and the tables. Safe to call on every start. */
export async function initDb(): Promise<void> {
  await ensureDatabase();
  await pool.query(SCHEMA);
}

/** Tests only: wipe everything. Refuses to run unless the database name ends in _test. */
export async function resetDb(): Promise<void> {
  const name = new URL(env.DATABASE_URL).pathname.slice(1);
  if (!name.endsWith('_test')) throw new Error(`resetDb refused: "${name}" is not a *_test database`);
  await ensureDatabase();
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await pool.query(SCHEMA);
}
