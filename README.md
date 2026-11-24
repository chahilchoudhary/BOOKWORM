# Book Worm – online bookstore

React + Tailwind front end, Express API, SQLite database (single file, no install).

## Run it (2 terminals)

Requires Node 22.12+ (uses the built-in `node:sqlite`).

```bash
npm run setup            # once: installs backend + frontend packages

# terminal 1 – API on http://localhost:4000
npm run dev:backend

# terminal 2 – website on http://localhost:5173
npm run dev:frontend
```

The database file `backend/bookworm.db` and the demo data are created automatically on first start. Delete the file to reset.

## Demo accounts and test data

| What | Value |
|---|---|
| Demo user (has order history + 500 gift points) | `demo@bookworm.test` / `Password123!` |
| New user (no history) | `new@bookworm.test` / `Password123!` |
| Coupons | `WELCOME100` (₹100 off, min ₹300) · `SAVE10` (10% off) |
| Card that succeeds | `4111 1111 1111 1111` (any name, CVV 3 digits, expiry in the future `MM/YYYY`) |
| Card that is declined | `4000 0000 0000 0002` |
| UPI | any `name@bank` |

Payments are simulated. No card data is stored or logged.

## Tests

```bash
npm test          # backend (pricing, API flow, 48h cancel) + frontend (routing, validation)
npm run typecheck
```

## Project layout

```
backend/src
  app.ts, server.ts      express app + start
  db.ts                  SQLite tables + transaction helper
  seed.ts                demo books, users, coupons
  pricing.ts             ALL price/coupon/points/cancel-window/payment rules (pure functions)
  http.ts                auth middleware, validation helper, error handler
  routes/                auth, books (catalogue + reviews), cart (+wishlist), orders
backend/tests            pricing unit tests + API integration tests
frontend/src
  api.ts, auth.tsx, cart.tsx, hooks.ts, format.ts
  components/            Navbar, Protected route, shared UI (cards, stars, covers)
  pages/                 Home, Book, Cart/Checkout, Payment, Confirmation, Orders, Wishlist, Authors, Login/Register
docs/                    requirements, architecture notes, wireframes (docs/design)
```

## Customer journey (from the brief) → where it is

| Step | Where |
|---|---|
| 1–2 Login / authentication | `/login`, `/register`; guests are redirected from protected pages |
| Order history + Buy it again, recommendations | `/orders`; "Recommended for You" on Home is based on past orders |
| 3, 5, 6 Catalogue, categories, brands | Home: category sidebar, filter bar (language, format, publisher, price, sort) |
| 7 Product with delivery date + related products | `/books/:id` |
| 8 Add to basket | Add to Cart (navbar badge updates) |
| 9 Delivery address | Cart/Checkout page, "Use Saved Address" |
| 10 Payment option + gift points | Gift points on checkout; `/payment` tabs Credit/Debit/UPI/Wallet |
| 11–12 Confirmation, cancel within 48 h | `/confirmation/:id`, `/orders` (the server rejects cancels after 48 h) |

## Simplifications (on purpose)
- SQLite instead of PostgreSQL so it runs with no install. All SQL is standard and confined to `backend/src`.
- Totals are always calculated on the server (`pricing.ts`); the browser only displays them.
- Dark theme only. No admin screens, real payment gateway, shipping tracking or returns.
- "My Writers" lists authors of books you bought.
