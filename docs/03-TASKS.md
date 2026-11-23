# Book Worm – Task Plan for Bob

Work **strictly in order**. One task = one branch `feature/T<nn>-<slug>` = one PR. Do not begin a task until the previous task's gate is green and the user has said "go". At the end of every task paste the report template from `00-READ-FIRST-BOB-RULES.md`.

Legend: **Prompt** = what to tell Bob. **DoD** = Definition of Done (the gate). **Validate** = what the reviewer (Claude) will check.

---
## Phase 0 – Foundation

### T00 – Repo scaffold & tooling
**Prompt:** "Read docs/00–03. Do ONLY T00. Create the monorepo skeleton exactly as in 02-ARCHITECTURE §4 (empty module folders may hold a `.gitkeep`). Initialise backend (Express+TS, `/api/health`) and frontend (Vite+React+TS+Tailwind) with the approved stack only. Add ESLint, Prettier, husky+lint-staged, Vitest in both, `docker-compose.yml` (postgres 16 on 5432 + a second test postgres on 5433), `.gitignore`, `.env.example` files, README with run steps."
**DoD:**
- `docker compose up -d postgres` works; `npm run dev` runs both apps; `GET /api/health` → `{status:"ok"}`; frontend shows a placeholder page.
- `npm run lint`, `npm run typecheck`, `npm test` pass in both packages (one smoke test each).
- Env validated by zod in `config/env.ts`; app fails fast with a clear message if env is missing.
**Validate:** folder tree matches §4; no extra deps; no secrets committed.

### T01 – Database schema, migrations, seed, data model doc
**Prompt:** "Do ONLY T01. Create migrations for every table in 02-ARCHITECTURE §7 (add `users.wallet_balance_paise` and `books.avg_rating`), constraints and indexes per §6.4, a seed script per §12, and `docs/DATA-MODEL.md` with a Mermaid ER diagram. Add npm scripts `db:migrate`, `db:reset`, `db:seed`."
**DoD:** fresh DB → migrate → seed succeeds twice (idempotent seed or reset); integration test asserts counts (≥40 books, ≥20 categories, 2 users, coupon exists) and that CHECK constraints reject negative price/qty.
**Validate:** FK + indexes present; money is integer; passwords in seed are bcrypt-hashed.

### T02 – Backend core (app skeleton, errors, validation, auth)
**Prompt:** "Do ONLY T02. Implement `app.ts` middleware (helmet, cors, pino-http, rate-limit on /auth), `AppError`, `errorHandler`, `validate` middleware, `auth` middleware, and the `auth` + `users` modules: register, login, me, saved address GET/PUT. Start `openapi.yaml` with these endpoints and serve Swagger UI at `/api/docs`."
**DoD:** integration tests: register ok, duplicate email 409, weak password 400, login ok/bad creds 401, `/auth/me` with/without token, address upsert. Password never returned in any response.
**Validate:** layering respected; JWT secret from env; consistent error JSON.

**🔒 GATE A (user + Claude review) before frontend work.**

---
## Phase 1 – Catalogue (backend then frontend)

### T03 – Catalogue API
**Prompt:** "Do ONLY T03. Modules `catalog`, `books`, `authors`, `recommendations`, `delivery`: GET categories, publishers, books (search q on title/author, category, language, format, price range, publisher, sort, pagination), shelves (recommended / bestsellers / newLaunches per FR-CAT-07/08), book detail, related, author page, `deliveryDate` computed server-side (FR-DEL). Update openapi.yaml."
**DoD:** tests per filter and per sort, pagination bounds (pageSize>50 → 400), shelves for demo user (history-based) vs new user (fallback), delivery date helper unit-tested with fixed clock, ebook rule.
**Validate:** SQL parameterised; N+1 queries avoided on list; indexes used.

### T04 – Design system & app shell (frontend)
**Prompt:** "Do ONLY T04. Study `docs/design/*.png`. Implement Tailwind theme tokens (dark default + light via CSS variables), IBM Plex Sans, `components/ui/*` primitives, `AppShell` with `Navbar` (brand, My Orders, My Wishlist, My Writers, cart badge, user menu, theme toggle), responsive mobile menu, router with all routes (pages can be stubs that render their title), AuthContext, ThemeContext, API client with token handling, MSW test setup."
**DoD:** Navbar matches wireframe at 1280px and collapses at 360px; theme toggle works and persists; each ui component has a render test; axe-style checks: labels/roles present.
**Validate:** no hard-coded hex in components; tokens used; keyboard navigation works.

### T05 – Home / catalogue page
**Prompt:** "Do ONLY T05. Implement HomePage per `01-catalogue-home.png` and FR-CAT-*: CategorySidebar, FilterBar (search w/ debounce, language, format, price range, publisher, sort), shelves vs result grid, BookCard, pagination, URL-synced filters, skeleton/empty/error states. Use the real API (MSW only in tests)."
**DoD:** component tests for filter→URL→request; responsive at 360/768/1280; screenshot comparison done manually against the PNG; Lighthouse accessibility ≥ 90 (note score).
**Validate:** BookCard markup reused by Related Reads later; server state only in TanStack Query.

### T06 – Product detail page
**Prompt:** "Do ONLY T06. Implement BookDetailPage per `02-product-detail.png` and FR-PDP-*: breadcrumbs, covers, price/delivery, Add to Cart/Wishlist (call APIs if they exist, otherwise disable with tooltip until T08/T10 – do not fake), facts, AboutWriter, ReviewForm (0/100 counter, star input) + ReviewList, RelatedReads."
**DoD:** review form validation tests (empty, >100 chars, rating required, login required); related reads render 3; 404 book shows NotFound.
**Backend part (include in this task):** reviews GET/POST endpoints + openapi + tests (duplicate review → 409; avg_rating updated).

**🔒 GATE B – catalogue module review.** Run E2E smoke: browse → filter → open product.

---
## Phase 2 – Account, cart, checkout

### T07 – Login & Register pages + protected routes
**DoD:** login/register forms (rhf+zod), error display, redirect back to originating page, logout, guest redirected from `/cart`; tests incl. redirect-after-login.

### T08 – Cart API + cart UI
**Prompt:** "Do ONLY T08. Backend: cart module (GET, PUT item, DELETE item, POST quote) + `orders/pricing.ts` per 02-ARCHITECTURE §9 + coupons + giftPoints read. Frontend: cart badge live count, items panel with QuantityStepper, Grand Total panel (price, tax, delivery, coupon, discount, total) driven by `/cart/quote`. Wire Add to Cart on product detail and Buy-it-again later."
**DoD:** **unit tests for pricing** (percent coupon, flat coupon, min-order not met, expired, points cap 20%, tax rounding, free-delivery threshold, empty cart); integration tests for cart ownership and stock limits; UI test: change qty → totals update from server.
**Validate:** UI never computes totals; money in paise.

### T09 – Checkout: address form & gift points
**DoD:** AddressForm per `03-cart-checkout.png` with "Use Saved Address", validation (pin 6 digits, phone 10 digits, email), country-code select, save address option, coupon Apply, gift points redeem control; Pay Now disabled until valid; tests for every validation rule.

**🔒 GATE C – cart/checkout review.**

---
## Phase 3 – Order, payment, confirmation

### T10 – Orders & payment backend
**Prompt:** "Do ONLY T10. Implement `POST /orders` (idempotency key), `POST /orders/:id/pay` with `mockGateway` (rules §11), transactional confirm per §10, `GET /orders`, `GET /orders/:id`, `POST /orders/:id/cancel` (48h rule using injectable clock), `POST /orders/:id/buy-again`, wishlist + authors follow endpoints + gift-points endpoint. Update openapi.yaml."
**DoD – required tests:** happy path; declined card leaves cart intact and order PAYMENT_FAILED; double POST with same idempotency key → one order; concurrent purchase of last copy → exactly one succeeds (409 for other); cancel at 47h59m ok, at 48h01m → 409; cancel restores stock and points; other user's order → 404/403; PAN/CVV never in DB or logs (test greps captured log output).
**Validate:** transaction boundaries, `FOR UPDATE`, no float math.

### T11 – Payment & confirmation UI
**DoD:** PaymentPage per `04-payment.png` (tabs Credit/Debit/UPI/Wallet, Luhn, expiry, CVV, per-tab validation, loading + failure + retry), ConfirmationPage per `05-purchase-confirmation.png` with order number and Cancel (while ≤48h), Continue shopping. Tests: decline shows error and allows retry; success clears cart badge.

### T12 – My Orders, Wishlist, Writers, Author page
**DoD:** OrdersPage (history, status, Buy it again, Cancel within 48h hidden after), WishlistPage, WritersPage (follow/unfollow), AuthorPage; tests for cancel button visibility with fake timers.

**🔒 GATE D – full purchase flow review.**

---
## Phase 4 – Quality & delivery

### T13 – Polish & responsive pass
Fix spacing/alignment vs wireframes, loading/validation states, dedupe components, Tailwind cleanup, mobile layouts for all pages, a11y fixes. DoD: manual checklist in `docs/QA-CHECKLIST.md` completed at 360/768/1280, both themes.

### T14 – E2E tests (Playwright)
Specs: register→login; browse+filter; add to cart→checkout→pay (success)→confirmation; declined card; cancel within window; guest redirect. DoD: all green headless; run command documented.

### T15 – Docs, OpenAPI completeness, Docker, CI
Complete `openapi.yaml` (every endpoint), README (setup, scripts, test accounts, architecture, how AI/Bob was used), full `docker compose up` brings the whole stack, GitHub Actions workflow (lint, typecheck, unit+integration with Postgres service, build). DoD: clean clone → one command → working app; CI green.

### T16 – Git delivery
Feature branches merged via PR into `main`, PR description with summary/screenshots/test evidence, access shared with manager. (User performs push/PR; Bob prepares description.)

---
## Requirement traceability (reviewer uses this)

| Requirement group | Task(s) |
|---|---|
| FR-AUTH | T02, T07 |
| FR-NAV | T04 |
| FR-CAT, FR-DEL | T03, T05 |
| FR-PDP | T06 |
| FR-CART, FR-CHK, FR-GIFT, FR-CPN | T08, T09 |
| FR-PAY, FR-CONF | T10, T11 |
| FR-ORD | T10, T12 |
| FR-WISH, FR-WRT | T10, T12 |
| NFR | T00, T13, T14, T15 |
