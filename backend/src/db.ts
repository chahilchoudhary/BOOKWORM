import { DatabaseSync } from 'node:sqlite';
import { env } from './config/env.js';

export const db = new DatabaseSync(env.DB_FILE);
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0)
);
CREATE TABLE IF NOT EXISTS authors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  published_at TEXT NOT NULL,
  cover_color TEXT NOT NULL DEFAULT '#facc15'
);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL REFERENCES books(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL CHECK (length(body) <= 100),
  created_at TEXT NOT NULL,
  UNIQUE (book_id, user_id)
);
CREATE TABLE IF NOT EXISTS cart_items (
  user_id INTEGER NOT NULL REFERENCES users(id),
  book_id INTEGER NOT NULL REFERENCES books(id),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 10),
  PRIMARY KEY (user_id, book_id)
);
CREATE TABLE IF NOT EXISTS wishlist_items (
  user_id INTEGER NOT NULL REFERENCES users(id),
  book_id INTEGER NOT NULL REFERENCES books(id),
  PRIMARY KEY (user_id, book_id)
);
CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('percent','flat')),
  value INTEGER NOT NULL,
  min_order INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('CONFIRMED','CANCELLED')),
  subtotal INTEGER NOT NULL,
  tax INTEGER NOT NULL,
  delivery INTEGER NOT NULL,
  discount INTEGER NOT NULL,
  points_used INTEGER NOT NULL,
  total INTEGER NOT NULL,
  payment_method TEXT NOT NULL,
  address TEXT NOT NULL,
  placed_at TEXT NOT NULL,
  cancelled_at TEXT
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  book_id INTEGER NOT NULL REFERENCES books(id),
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL
);
`);

/** Run fn inside a transaction; rolls back if it throws. */
export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
