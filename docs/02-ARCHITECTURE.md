# Book Worm – Architecture, Structure & Coding Standards

## 1. System overview

```
Browser (React SPA, Vite, Tailwind)
        │  HTTPS/JSON  (Authorization: Bearer <JWT>)
        ▼
Express API (TypeScript)  ── modules: auth, users, books, catalog, recommendations,
        │                              cart, orders, coupons, gift-points, payments(mock), delivery
        ▼
PostgreSQL 16  (migrations + seed)
```
Monorepo, two packages (`frontend`, `backend`), no shared-code package (keep simple). Types for the API are generated from `backend/openapi.yaml` into the frontend (`npm run gen:api`).

## 2. Approved stack (do NOT add anything not listed without asking)

Pin major versions; run `npm view <pkg> version` to confirm what is installable – do not assume.

| Layer | Choice |
|---|---|
| Runtime | Node.js 20 LTS (or newer LTS), npm |
| Frontend | React 18, TypeScript (strict), Vite, React Router v6, Tailwind CSS 3 |
| Frontend data | TanStack Query (server state), React Context only for Auth + Theme |
| Forms | react-hook-form + zod (`@hookform/resolvers`) |
| Frontend tests | Vitest, React Testing Library, MSW (API mocking), Playwright (E2E) |
| Icons | `lucide-react` |
| Font | IBM Plex Sans via `@fontsource/ibm-plex-sans` |
| Backend | Express 4, TypeScript (strict), `pg` (node-postgres) – **no ORM**, SQL in repository files |
| Validation | zod |
| Auth | `jsonwebtoken`, `bcryptjs` |
| Security | `helmet`, `cors`, `express-rate-limit` |
| Logging | `pino`, `pino-http` |
| Migrations | `node-pg-migrate` (plain SQL/TS migrations) |
| API docs | OpenAPI 3.0 yaml, served with `swagger-ui-express` |
| Backend tests | Vitest + Supertest, against a real test Postgres DB (docker) |
| Lint/format | ESLint (typescript-eslint) + Prettier, both packages |
| Git hooks | husky + lint-staged (lint + typecheck on commit) |
| Containers | Docker Compose: `postgres`, `backend`, `frontend` |

## 3. Environment variables

`backend/.env.example` (commit) – real `.env` is git-ignored:
```
NODE_ENV=development
PORT=4000
DATABASE_URL=postgres://bookworm:bookworm@localhost:5432/bookworm
TEST_DATABASE_URL=postgres://bookworm:bookworm@localhost:5433/bookworm_test
JWT_SECRET=change-me-at-least-32-chars
JWT_EXPIRES_IN=2h
CORS_ORIGIN=http://localhost:5173
TAX_RATE=0.12
DELIVERY_DAYS=5
FREE_DELIVERY_THRESHOLD_PAISE=30000
DELIVERY_FEE_PAISE=4000
CANCEL_WINDOW_HOURS=48
```
`frontend/.env.example`: `VITE_API_URL=http://localhost:4000/api`

## 4. Project structure (create exactly this)

```
bookworm/
├─ README.md                      # run instructions, scripts, test accounts, architecture summary
├─ docker-compose.yml
├─ .gitignore  .editorconfig  .prettierrc
├─ docs/
│  ├─ 00-READ-FIRST-BOB-RULES.md  01-REQUIREMENTS.md  02-ARCHITECTURE.md  03-TASKS.md
│  ├─ OPEN-QUESTIONS.md           # Bob appends here
│  ├─ DATA-MODEL.md               # ER diagram (mermaid) + table notes (Task 1)
│  └─ design/                     # 00-architecture-diagram.png … 05-purchase-confirmation.png
├─ backend/
│  ├─ package.json  tsconfig.json  vitest.config.ts  .env.example  Dockerfile
│  ├─ openapi.yaml
│  ├─ migrations/                 # 001_init.sql … numbered, forward-only
│  ├─ seed/                       # seed.ts + data/*.json (books, authors, categories, users, coupons)
│  ├─ src/
│  │  ├─ server.ts                # starts http server
│  │  ├─ app.ts                   # builds express app (exported for tests)
│  │  ├─ config/env.ts            # zod-validated env, single source of config
│  │  ├─ db/pool.ts  db/tx.ts     # pg Pool, withTransaction helper
│  │  ├─ middleware/              # auth.ts, validate.ts, errorHandler.ts, notFound.ts, rateLimit.ts
│  │  ├─ lib/                     # errors.ts (AppError), money.ts, dates.ts, logger.ts
│  │  └─ modules/
│  │     ├─ auth/        auth.routes.ts auth.controller.ts auth.service.ts auth.schemas.ts
│  │     ├─ users/       (profile, saved address)  *.routes/controller/service/repository/schemas
│  │     ├─ books/       (list, detail, filters, related, reviews)
│  │     ├─ catalog/     (categories, publishers/brands, shelves)
│  │     ├─ recommendations/
│  │     ├─ authors/     (author page, follow/unfollow, my writers)
│  │     ├─ wishlist/
│  │     ├─ cart/
│  │     ├─ coupons/
│  │     ├─ giftPoints/
│  │     ├─ delivery/
│  │     ├─ payments/    payments.service.ts  mockGateway.ts
│  │     └─ orders/      (checkout, list, detail, cancel, buy-again)
│  └─ tests/
│     ├─ unit/           # pure functions: money, pricing, delivery, luhn, cancel-window
│     ├─ integration/    # supertest per module
│     └─ helpers/        # testDb.ts, factories.ts
└─ frontend/
   ├─ package.json  tsconfig.json  vite.config.ts  tailwind.config.ts  postcss.config.js
   ├─ index.html  .env.example  Dockerfile  playwright.config.ts
   ├─ public/            # favicon, illustrations (bg-books.svg|webp)
   ├─ src/
   │  ├─ main.tsx  App.tsx  router.tsx  index.css
   │  ├─ api/            # client.ts (fetch wrapper), generated/ (from openapi), queryKeys.ts, one hooks file per module (useBooks.ts, useCart.ts …)
   │  ├─ context/        # AuthContext.tsx, ThemeContext.tsx
   │  ├─ components/
   │  │  ├─ ui/          # Button, Input, Select, Checkbox, Modal, Tabs, Badge, Spinner, Skeleton, Toast, Stars, StarInput, QuantityStepper, Breadcrumbs, EmptyState, ErrorState
   │  │  ├─ layout/      # AppShell, Navbar, CategorySidebar, UserMenu, CartBadge, ThemeToggle
   │  │  └─ book/        # BookCard, BookGrid, BookShelf, RelatedReads, ReviewForm, ReviewList, AuthorBio, PriceBlock, DeliveryDate
   │  ├─ pages/          # HomePage, BookDetailPage, CartCheckoutPage, PaymentPage, ConfirmationPage,
   │  │                  # OrdersPage, WishlistPage, WritersPage, AuthorPage, LoginPage, RegisterPage, NotFoundPage
   │  ├─ features/       # checkout/ (AddressForm, OrderSummary, CouponInput, GiftPoints), payment/ (PaymentTabs, CardForm, UpiForm, WalletForm)
   │  ├─ hooks/          # useDebounce, useMediaQuery, useRequireAuth
   │  ├─ lib/            # format.ts (₹, dates), validators.ts (zod schemas, luhn), constants.ts
   │  ├─ types/          # app-level types not generated
   │  └─ test/           # setup.ts, msw handlers, render helpers
   └─ e2e/               # Playwright specs: auth, browse, purchase, cancel
```

## 5. Routes

Frontend (`router.tsx`):
| Path | Page | Auth |
|---|---|---|
| `/` | HomePage (catalogue; `?category=&q=&language=&format=&min=&max=&sort=&publisher=&page=`) | public |
| `/books/:id` | BookDetailPage | public |
| `/authors/:id` | AuthorPage | public |
| `/login`, `/register` | auth pages | public |
| `/cart` | CartCheckoutPage | required |
| `/payment/:orderId` | PaymentPage | required |
| `/confirmation/:orderId` | ConfirmationPage | required |
| `/orders` | OrdersPage | required |
| `/wishlist` | WishlistPage | required |
| `/writers` | WritersPage | required |
| `*` | NotFoundPage | public |

Filters live in the URL query string (shareable, back-button safe).

## 6. Coding standards (MANDATORY)

### 6.1 General
- TypeScript `strict: true`, **no `any`** (use `unknown` + narrowing), no `@ts-ignore` without a comment explaining why.
- ES modules, named exports (default export only for pages/lazy routes).
- Files ≤ ~250 lines; functions do one thing; no dead code; no commented-out code; no `console.log` (use pino on backend; none on frontend).
- Naming: `PascalCase` components/types/classes; `camelCase` vars/functions; `UPPER_SNAKE` constants; `kebab-case` not used for source files except config; React component files `PascalCase.tsx`; hooks `useXxx.ts`; backend files `module.layer.ts`; DB columns `snake_case`, JSON API fields `camelCase` (map in repository).
- Conventional Commits: `feat(cart): add quantity stepper`.
- Money: integer paise everywhere in DB/API/logic; format only at the UI edge via `lib/format.ts` (`Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'})`).
- Dates: store UTC `timestamptz`; delivery date formatted in UI as `Mon, 21 Jul`.

### 6.2 Frontend
- Function components + hooks only. Props typed with an `interface XxxProps`.
- **Server state in TanStack Query only.** Do not copy server data into `useState`/Context. Local UI state in `useState`; global state only Auth and Theme.
- API calls only through `src/api/*` hooks – **no `fetch` inside components**.
- Styling: **Tailwind utility classes only**; no inline `style` except dynamic values; no CSS modules. Colours/spacing via `tailwind.config.ts` theme tokens (`bg-surface`, `text-muted`, `bg-primary` …) mapped to CSS variables so dark/light work by toggling `class="dark"` on `<html>`. No hard-coded hex in components.
- Reusable primitives live in `components/ui`; pages compose them. If the same markup appears twice, extract it.
- Forms: react-hook-form + zod; show field errors under the field; set `aria-invalid`, `aria-describedby`.
- Every list/page handles **loading (skeleton), empty, error** states.
- Accessibility: semantic elements (`nav`, `main`, `button`), every input has a `<label>`, images have `alt`, visible focus ring, keyboard-operable tabs/modal (focus trap, Esc closes).
- Responsive: mobile-first Tailwind (`sm: md: lg:`); test at 360/768/1280.
- Routes lazy-loaded with `React.lazy` except Home.
- Never trust client totals; display what the API returns.
- Never log or persist card data; payment form values are sent once and cleared from state.
- Test ids only where roles/labels are insufficient (`data-testid`, kebab-case).

### 6.3 Backend
- Layering is strict: **routes → controller → service → repository**. Controllers only parse/validate/respond; services hold business rules and transactions; repositories hold SQL. No SQL outside repositories.
- **Parameterised queries only** (`$1,$2`). Never string-concatenate SQL.
- Every endpoint validates `params/query/body` with a zod schema via `validate` middleware.
- Errors: throw `AppError(status, code, message)`; one `errorHandler` returns `{error:{code,message,details?}}`. No stack traces to client in production.
- Multi-step writes (checkout, cancel) run inside `withTransaction`; use `SELECT … FOR UPDATE` on stock rows to prevent oversell.
- Auth middleware attaches `req.user = {id, role}`; ownership is checked in the service (a user can only read their own orders/cart).
- Passwords: bcrypt cost ≥ 10; JWT contains `sub` only (+ role); secret from env.
- Pagination: `?page=1&pageSize=12` → `{items, page, pageSize, total}`.
- HTTP codes: 200/201/204, 400 validation, 401 unauthenticated, 403 forbidden, 404, 409 conflict (e.g. cancel window passed, out of stock), 422 business rule, 500.
- API base path `/api`, JSON, plural nouns, versionless.
- Update `openapi.yaml` in the **same task** as any endpoint change.

### 6.4 Database
- Migrations are forward-only, numbered, idempotent where possible; never edit an applied migration.
- PKs: `uuid` (`gen_random_uuid()`); FKs with `ON DELETE` explicitly chosen; indexes on every FK and on filter/sort columns; `CHECK` constraints for non-negative money/qty and valid enums; `created_at/updated_at timestamptz`.

### 6.5 Testing standards
- Test file next to its layer (`tests/unit|integration`, `*.test.ts(x)` beside frontend component).
- Arrange-Act-Assert; one behaviour per test; no test depends on another's data; DB reset between integration tests.
- Frontend: query by role/label, not by class. Mock network with MSW, not by mocking hooks.
- A bug fix includes a regression test.

## 7. Data model (tables – full DDL is produced in Task 1 and documented in `docs/DATA-MODEL.md`)

| Table | Key columns |
|---|---|
| `users` | id, name, email (unique, citext), password_hash, role (`customer`), gift_points_balance, wallet_balance_paise, created_at |
| `addresses` | id, user_id, first_name, last_name, line1, line2, city, state, pin, country, phone_cc, phone, email, is_default |
| `categories` | id, name, slug (unique), parent_id null, sort_order |
| `publishers` | id, name, slug (brand) |
| `authors` | id, name, bio, photo_url |
| `books` | id, title, description, author_id, publisher_id, format (`paperback|hardcover|ebook`), language, price_paise, stock, isbn, cover_front_url, cover_back_url, published_at, avg_rating (derived), units_sold, created_at |
| `book_categories` | book_id, category_id (PK pair) |
| `reviews` | id, book_id, user_id, rating 1–5, body ≤100, created_at; UNIQUE(book_id,user_id) |
| `wishlist_items` | user_id, book_id (PK pair), created_at |
| `author_follows` | user_id, author_id (PK pair) |
| `cart_items` | user_id, book_id (PK pair), quantity (1–10) |
| `coupons` | code (unique), type (`percent|flat`), value, min_order_paise, expires_at, active |
| `orders` | id, user_id, status (`PENDING_PAYMENT|CONFIRMED|PAYMENT_FAILED|CANCELLED`), subtotal_paise, tax_paise, delivery_paise, discount_paise, points_redeemed, total_paise, coupon_code, address_snapshot jsonb, idempotency_key (unique per user), placed_at, cancelled_at |
| `order_items` | id, order_id, book_id, title_snapshot, unit_price_paise, quantity, delivery_date |
| `payments` | id, order_id, method (`credit_card|debit_card|upi|wallet`), status (`SUCCESS|FAILED|REFUNDED`), amount_paise, gateway_ref, last4 null, created_at |
| `gift_point_ledger` | id, user_id, delta, reason (`EARN|REDEEM|REFUND`), order_id, created_at |

## 8. REST API (all under `/api`; every item must appear in `openapi.yaml`)

| Method & path | Auth | Purpose |
|---|---|---|
| POST `/auth/register`, `/auth/login` | – | returns `{token,user}` |
| GET `/auth/me` | ✔ | current user |
| GET `/categories`, `/publishers` | – | sidebar + brand filter |
| GET `/books` | – | search/filter/sort/paginate (params from FR-CAT-02/06) |
| GET `/books/shelves` | optional | `{recommended,bestsellers,newLaunches}` |
| GET `/books/:id` | – | detail incl. author, publisher, rating, sold, deliveryDate |
| GET `/books/:id/related` | – | related reads (3) |
| GET/POST `/books/:id/reviews` | GET –, POST ✔ | list / create (409 if already reviewed) |
| GET `/authors/:id` | – | author + books |
| POST/DELETE `/authors/:id/follow`, GET `/me/writers` | ✔ | follow, unfollow, list |
| GET/POST/DELETE `/wishlist[/:bookId]` | ✔ | wishlist |
| GET `/cart` | ✔ | items + server-computed summary |
| PUT `/cart/items/:bookId` `{quantity}` ; DELETE `/cart/items/:bookId` | ✔ | upsert / remove |
| POST `/cart/quote` `{couponCode?, pointsToRedeem?}` | ✔ | totals preview (subtotal, tax, delivery, discount, total) |
| GET/PUT `/me/address` | ✔ | saved address |
| POST `/orders` `{address, couponCode?, pointsToRedeem?}` + `Idempotency-Key` header | ✔ | create PENDING_PAYMENT order from cart |
| POST `/orders/:id/pay` `{method, details}` | ✔ | mock payment → CONFIRMED or PAYMENT_FAILED |
| GET `/orders`, GET `/orders/:id` | ✔ | history / detail (own only) |
| POST `/orders/:id/cancel` | ✔ | within 48h only |
| POST `/orders/:id/buy-again` | ✔ | adds items to cart |
| GET `/me/gift-points` | ✔ | balance + ledger |
| GET `/health` | – | liveness |

## 9. Pricing algorithm (single implementation in `modules/orders/pricing.ts`, unit-tested)
```
subtotal  = Σ unit_price × qty
discount  = coupon (percent|flat, validate min order/expiry) ; capped at subtotal
points    = min(requested, balance, floor(20% × (subtotal − discount)))   (1 pt = ₹1 = 100 paise)
taxable   = subtotal − discount − points
tax       = round(taxable × TAX_RATE)
delivery  = subtotal ≥ FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
total     = taxable + tax + delivery
```
Rounding: half-up to paise. Same function used by `/cart/quote` and `/orders`.

## 10. Key flows
- **Checkout:** `POST /orders` (snapshot cart → order, reserves nothing) → UI goes to `/payment/:id` → `POST /orders/:id/pay` → on success one transaction: payment row, status CONFIRMED, stock −qty (FOR UPDATE, 409 if insufficient), units_sold +qty, points ledger (REDEEM, EARN), cart cleared.
- **Cancel:** transaction: verify owner, status CONFIRMED, `now − placed_at ≤ 48h`; mark CANCELLED; payment → REFUNDED; stock +qty; ledger REFUND for redeemed points and reverse EARN.
- **Recommendations:** categories & authors from the user's CONFIRMED orders, ranked by frequency, exclude already purchased; fallback to bestsellers.

## 11. Mock payment gateway rules (`mockGateway.ts`)
Deterministic: card number `4111111111111111` → success; `4000000000000002` → declined; other Luhn-valid → success; Luhn-invalid → 422. UPI id matching `^[\w.-]+@[\w]+$` → success; wallet → success if wallet balance (seed ₹5000 per user, stored in `users.wallet_balance_paise`) ≥ amount. Never persist PAN/CVV – store only `last4`.

## 12. Seed data (Task 1)
≥ 20 categories (list in FR-CAT-01), ≥ 8 publishers, ≥ 12 authors, **≥ 40 books** including the 9 books in the wireframes (Art of Focus ₹399, Art of Learning ₹259, Path to Success ₹359, Midnight Hour ₹299, Beneath the Stars ₹499, Final Frontier ₹359, Joy of Minimalism ₹149, Vanishing House ₹99 eBook, Lost Kitten ₹339), covers as local images in `frontend/public/covers/` (generate simple SVG placeholders if originals are unavailable), 2 demo users (`demo@bookworm.test` / `Password123!` with order history + 500 points; `new@bookworm.test` with no history), coupon `WELCOME100`.
