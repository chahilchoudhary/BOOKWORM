# Book Worm – Online Bookstore

A responsive e-commerce web app where a customer can browse, select and buy books.

**Stack:** React 18 + TypeScript + Tailwind CSS (frontend) · Node.js + Express + TypeScript (API) · PostgreSQL (database)

## What you can do

- Log in or create an account (guests can browse, but need to log in to buy)
- Browse by **category** and filter by **language, format, publisher, price**; search by title or author; sort
- Home shelves: **Recommended for You** (based on your order history), **Bestsellers this Month**, **New Launches**
- Open a book: price, tentative **delivery date**, rating, reviews (max 100 characters), **related reads**
- Add to **cart**, change quantities, apply a **coupon**, redeem **gift points**
- Enter or reuse a saved **delivery address** (validated)
- **Pay** by credit card, debit card, UPI or wallet (simulated gateway) and see the **purchase confirmation**
- **My Orders** with **Buy it again** and **Cancel within 48 hours**
- **My Wishlist** and **My Writers** (authors of books you bought)

## Prerequisites

- **Node.js 22.12 or newer**
- **PostgreSQL 14 or newer**, running on `127.0.0.1:5432`, with a user that can create databases (default: user `bookworm`, password `bookworm`)

## Quick start

```bash
# 1. install packages for both apps (once)
npm run setup

# 2. configure the API (once) – edit DATABASE_URL if your Postgres differs
cp backend/.env.example backend/.env

# 3. start the API (terminal 1) -> http://localhost:4000
npm run dev:backend

# 4. start the website (terminal 2) -> http://localhost:5173
npm run dev:frontend
```

On its first start the API creates the `bookworm` database, the tables and the demo data. Starting it again never duplicates data. To reset everything, drop the `bookworm` database and restart the API.

Open **http://localhost:5173** and log in with a demo account below.

## Demo accounts and test data

| What | Value |
|---|---|
| Demo user (has order history, 500 gift points) | `demo@bookworm.test` / `Password123!` |
| New user (no history) | `new@bookworm.test` / `Password123!` |
| Coupons | `WELCOME100` (₹100 off, orders ₹300+) · `SAVE10` (10% off) |
| Card that succeeds | `4111 1111 1111 1111`, any name, 3-digit CVV, expiry in the future as `MM/YYYY` |
| Card that is declined | `4000 0000 0000 0002` |
| UPI | any `name@bank` |

Payments are **simulated**. No real payment is made and no card number or CVV is ever stored.

## Try the main journey (about 2 minutes)

1. Log in as `demo@bookworm.test`. Home shows *Recommended for You* based on the demo user's past orders.
2. Open any book → **Add to Cart**. The cart badge in the top bar updates.
3. Open the cart → fill in the address (or tick **Use Saved Address**) → apply `WELCOME100` → **Pay Now**.
4. Choose **Credit Card**, enter `4111 1111 1111 1111` → **Pay Now** → confirmation page.
5. Open **My Orders**: the new order has **Cancel order** (available for 48 hours). Older orders don't.

## Business rules (all calculated on the server, in `backend/src/pricing.ts`)

| Rule | Value |
|---|---|
| Tax | 12% of the amount after discount and points |
| Delivery | Free for orders of ₹300 or more, otherwise ₹40 |
| Delivery date | Order date + 5 days (eBooks are instant) |
| Gift points | 1 point = ₹1, at most 20% of the bill; earn 1 point per ₹100 paid |
| Cancellation | Only while the order is confirmed and within 48 hours of placing it |

The browser only displays totals; it never calculates prices.

## Tests

```bash
npm test            # backend + frontend
npm run typecheck
```

- **Backend (20 tests):** pricing, coupons, points, the 48-hour rule, auth, catalogue filters, reviews, and the full cart → checkout → cancel flow against a real PostgreSQL database.
- **Frontend (6 tests):** routing and login redirect, form validation, card and date helpers.
- The backend tests use a **separate database `bookworm_test`**, which is wiped on every run, so your real data is never touched. Set `TEST_DATABASE_URL` to use another server.

## Project structure

```
backend/
  openapi.yaml           API specification (OpenAPI 3)
  src/
    app.ts, server.ts    Express app and startup
    db.ts                PostgreSQL pool, tables, query and transaction helpers
    seed.ts              demo books, users, coupons, order history
    pricing.ts           price / coupon / points / cancel-window / payment rules
    http.ts              login check, input validation, error handling
    routes/              auth, books (+reviews), cart (+wishlist), orders
  tests/                 pricing unit tests and API integration tests
frontend/
  src/
    api.ts, auth.tsx, cart.tsx, hooks.ts, format.ts
    components/          Navbar, protected routes, shared UI (cards, stars, breadcrumbs)
    pages/               Home, Book, Cart/Checkout, Payment, Confirmation, Orders, Wishlist, Authors, Login/Register
docs/
  DATA-MODEL.md          database design and diagram
  design/                the wireframes this UI was built from
```

## API

The full list of endpoints is in [`backend/openapi.yaml`](backend/openapi.yaml). All endpoints are under `/api`; errors are returned as `{ "error": "message" }`.

## Database

See [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md). To look at the data, connect any PostgreSQL client to `127.0.0.1:5432`, database `bookworm`, user `bookworm`.

## Troubleshooting

| Problem | Fix |
|---|---|
| API exits with "Cannot connect to PostgreSQL" | Start PostgreSQL and check `DATABASE_URL` in `backend/.env` |
| Website shows "Cannot reach the server" | Start the API (`npm run dev:backend`) |
| Port already in use | Change `PORT` in `backend/.env` (and the proxy target in `frontend/vite.config.ts`) |

## Scope

Built from the capstone brief and wireframes. Not included: admin screens, a real payment gateway, shipment tracking and returns.
