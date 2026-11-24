import bcrypt from 'bcryptjs';
import { db } from './db.js';

export const CATEGORIES = [
  'Romance', 'Mystery', 'Science Fiction', 'Fantasy', 'Historical', 'Biography', 'Self-help',
  'Memoir', 'Travel', 'Cooking', "Children's", 'Young Adult', 'Comics & Graphic Novels',
  'Poetry', 'Drama', 'Science', 'Philosophy', 'Religion', 'Language Learning',
];

const authors = [
  ['Arjun Patel', 'Productivity writer and speaker.'],
  ['Raj Patel', 'Educator focused on lifelong learning.'],
  ['James Wright', 'Author of practical guides on goals and growth.'],
  ['James Adams', 'Thriller and horror novelist.'],
  ['Jessica Martin', 'Romance novelist.'],
  ['Laura Mitchell', 'Science fiction author.'],
  [
    'Daniel Reed',
    'Daniel Reed is a writer, minimalist, and productivity coach based in San Francisco. His work includes Less, But Better and The Focus Reset.',
  ],
  ['Clara Nelson', 'Writes chilling mysteries.'],
  ['Emily Parker', "Children's author."],
  ['Meera Iyer', 'Cook and food writer.'],
  ['Tom Walker', 'Travel writer and photographer.'],
  ['Dr. Anita Rao', 'Science communicator.'],
] as const;

// [title, description, authorIdx(1-based), publisher, category, tags, format, price, sold, publishedAt, color]
type B = [string, string, number, string, string, string, string, number, number, string, string];
const books: B[] = [
  ['The Art of Focus', 'Practical guide to mastering focus & boosting productivity every day.', 1, 'ABC Publishers', 'Self-help', 'Non-fiction,Self Help', 'Paperback', 399, 320, '2025-03-10', '#f5f0e8'],
  ['The Art of Learning', 'Master the mindset and methods for effective lifelong learning.', 2, 'ABC Publishers', 'Self-help', 'Non-fiction,Self Help', 'Paperback', 259, 210, '2025-02-01', '#dc2626'],
  ['The Path to Success', 'A practical guide to achieving goals with clarity and confidence.', 3, 'Summit Press', 'Self-help', 'Non-fiction,Self Help', 'Paperback', 359, 280, '2025-01-12', '#0f766e'],
  ['The Midnight Hour', "Haunting tale of a man's journey & the shadows of a forgotten past.", 4, 'Nightfall Books', 'Mystery', 'Fiction,Thriller,Horror', 'Paperback', 299, 500, '2025-05-02', '#134e4a'],
  ['Beneath the Stars', 'A heartwarming tale, where two souls discover who you need.', 5, 'Rosewood', 'Romance', 'Fiction,Love,Drama', 'Hardcover', 499, 450, '2025-04-18', '#9a3412'],
  ['The Final Frontier', 'A mission to space secrets to change humanity forever.', 6, 'Orbit House', 'Science Fiction', 'Fiction,Thriller', 'Paperback', 359, 430, '2025-04-01', '#0c4a6e'],
  ['Joy of Minimalism', 'Declutter your life to uncover peace, clarity, and joy.', 7, 'ABC Publishers', 'Self-help', 'Non-fiction,Self Help', 'Paperback', 149, 145, '2025-10-20', '#facc15'],
  ['The Vanishing House', 'A chilling mystery unfolds within a house that disappears.', 8, 'Nightfall Books', 'Mystery', 'Fiction,Horror', 'eBook', 99, 90, '2025-10-05', '#1f2937'],
  ['The Lost Kitten', 'A heartwarming tale of courage, friendship, and feline adventure.', 9, 'Little Leaf', "Children's", 'Fiction,Children', 'Hardcover', 339, 60, '2025-10-12', '#f97316'],
  ['Pasta Every Day', 'Simple Italian recipes for busy weeknights.', 10, 'Spice Route', 'Cooking', 'Non-fiction,Recipes', 'Paperback', 449, 120, '2024-11-02', '#b45309'],
  ['Wandering Himalayas', 'A journey through mountain villages and quiet trails.', 11, 'Summit Press', 'Travel', 'Non-fiction,Travel', 'Paperback', 379, 75, '2024-09-14', '#0369a1'],
  ['Cosmos in a Cup', 'Big ideas in physics, explained over coffee.', 12, 'Orbit House', 'Science', 'Non-fiction,Science', 'Paperback', 329, 98, '2024-12-01', '#4338ca'],
  ['Letters to Tomorrow', 'Poems about change, hope and ordinary days.', 5, 'Rosewood', 'Poetry', 'Poetry', 'eBook', 129, 40, '2025-06-06', '#be185d'],
  ['Kingdom of Ash', 'An exiled heir returns to reclaim a burning realm.', 4, 'Orbit House', 'Fantasy', 'Fiction,Fantasy', 'Paperback', 429, 260, '2025-03-25', '#7c2d12'],
  ['Echoes of 1857', 'A sweeping historical novel of a nation in revolt.', 11, 'Summit Press', 'Historical', 'Fiction,Historical', 'Hardcover', 549, 85, '2024-08-10', '#78350f'],
  ['A Life Unfolded', 'The candid memoir of a self-taught chef.', 10, 'Spice Route', 'Memoir', 'Non-fiction,Memoir', 'Paperback', 289, 52, '2025-01-30', '#065f46'],
  ['Teen Spirit Squad', 'Five friends, one summer and a secret map.', 9, 'Little Leaf', 'Young Adult', 'Fiction,Adventure', 'Paperback', 249, 140, '2025-05-15', '#a21caf'],
  ['Speak Spanish Fast', 'Learn everyday Spanish in 30 days.', 2, 'ABC Publishers', 'Language Learning', 'Non-fiction,Language', 'Paperback', 319, 88, '2024-10-01', '#ca8a04'],
  ['Thinking Slowly', 'An accessible tour of philosophy for modern life.', 1, 'Summit Press', 'Philosophy', 'Non-fiction,Philosophy', 'Paperback', 349, 66, '2024-07-21', '#475569'],
  ['Rangoli Comics Vol. 1', 'Colourful superhero stories from the old city.', 12, 'Little Leaf', 'Comics & Graphic Novels', 'Fiction,Comics', 'Paperback', 199, 150, '2025-08-08', '#e11d48'],
  ['The Silent Verdict', 'A courtroom drama where one witness changes everything.', 8, 'Nightfall Books', 'Drama', 'Fiction,Drama', 'Paperback', 309, 110, '2025-02-20', '#3f3f46'],
  ['Walking the Path', 'Reflections on faith, doubt and daily practice.', 2, 'ABC Publishers', 'Religion', 'Non-fiction,Religion', 'Paperback', 269, 45, '2024-06-11', '#15803d'],
  ['Mr. Gandhi: A Life', 'A balanced biography built from letters and diaries.', 3, 'Summit Press', 'Biography', 'Non-fiction,Biography', 'Hardcover', 599, 130, '2024-05-05', '#92400e'],
  ['Love in Monsoon', 'Two strangers share one umbrella and one summer.', 5, 'Rosewood', 'Romance', 'Fiction,Love', 'eBook', 149, 330, '2025-09-09', '#0891b2'],
];

export function seed(): void {
  const count = db.prepare('SELECT COUNT(*) AS n FROM books').get() as { n: number };
  if (count.n > 0) return;

  const addAuthor = db.prepare('INSERT INTO authors (name, bio) VALUES (?, ?)');
  for (const [name, bio] of authors) addAuthor.run(name, bio);

  const addBook = db.prepare(
    `INSERT INTO books (title, description, author_id, publisher, category, tags, format, price, units_sold, published_at, cover_color)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  );
  for (const b of books) addBook.run(...b);

  const addUser = db.prepare('INSERT INTO users (name, email, password_hash, points) VALUES (?,?,?,?)');
  const hash = bcrypt.hashSync('Password123!', 10);
  addUser.run('Demo User', 'demo@bookworm.test', hash, 500);
  addUser.run('New User', 'new@bookworm.test', hash, 0);

  db.prepare('INSERT INTO coupons (code, type, value, min_order) VALUES (?,?,?,?)').run('WELCOME100', 'flat', 100, 300);
  db.prepare('INSERT INTO coupons (code, type, value, min_order) VALUES (?,?,?,?)').run('SAVE10', 'percent', 10, 0);

  // Demo user's order history (one recent, one old) so "Recommended for You" and "Cancel" can be shown.
  const addOrder = db.prepare(
    `INSERT INTO orders (user_id, status, subtotal, tax, delivery, discount, points_used, total, payment_method, address, placed_at)
     VALUES (1,'CONFIRMED',?,?,0,0,0,?, 'credit_card', ?, ?)`,
  );
  const addItem = db.prepare('INSERT INTO order_items (order_id, book_id, quantity, unit_price) VALUES (?,?,?,?)');
  const addr = JSON.stringify({ firstName: 'Demo', lastName: 'User', line1: '12 Park Street', city: 'Bengaluru', state: 'Karnataka', pin: '560001', country: 'India', phone: '9876543210', email: 'demo@bookworm.test' });
  const old = addOrder.run(399, 48, 447, addr, new Date(Date.now() - 10 * 86400000).toISOString());
  addItem.run(Number(old.lastInsertRowid), 1, 1, 399);
  const recent = addOrder.run(259, 31, 290, addr, new Date(Date.now() - 3600000).toISOString());
  addItem.run(Number(recent.lastInsertRowid), 2, 1, 259);

  db.prepare('INSERT INTO reviews (book_id, user_id, rating, body, created_at) VALUES (?,?,?,?,?)').run(
    7, 1, 5, 'The accordion component delivers large amounts of content in a small space.', new Date().toISOString(),
  );
}
