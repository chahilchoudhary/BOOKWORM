# Book Worm – Copy/Paste Prompts for Bob (T00 → T16)

How to use:
1. Open the `bookworm` folder in Bob. Make sure `docs/` and `docs/design/` are present.
2. Paste ONE prompt at a time, in order. Wait for Bob's report, bring it to Claude for validation, then paste the next.
3. Every prompt starts with the same short "context line" so Bob re-reads the right docs and stays on one task.
4. If Bob asks a question or proposes a library not in the approved stack, answer "No – use only docs/02 §2 stack" unless you decide otherwise.

Each prompt is intentionally short: it points to the doc sections that hold the detail instead of repeating them.

---

## T00 – Repo scaffold & tooling

```
Read docs/00-READ-FIRST-BOB-RULES.md and docs/02-ARCHITECTURE.md (§2, §3, §4, §6). Do ONLY task T00 from docs/03-TASKS.md. Do not start any other task.

Create:
1. Monorepo skeleton exactly as in 02-ARCHITECTURE §4 (use .gitkeep in empty folders).
2. backend: Express + TypeScript (strict), src/app.ts (exports app), src/server.ts, src/config/env.ts (zod-validated env, fail fast), GET /api/health -> {"status":"ok"}. Vitest + Supertest with one health test.
3. frontend: Vite + React 18 + TypeScript + Tailwind 3 + React Router, a placeholder page, Vitest + React Testing Library with one smoke test.
4. ESLint (typescript-eslint) + Prettier + husky + lint-staged in both packages; scripts: dev, build, lint, typecheck, test.
5. docker-compose.yml: postgres 16 on 5432 (db bookworm) and a test postgres on 5433 (db bookworm_test).
6. .gitignore, .editorconfig, .prettierrc, backend/.env.example, frontend/.env.example (values from 02-ARCHITECTURE §3), README with run steps.

Use ONLY the approved stack. Verify each package version exists with `npm view` before installing.
Done when: `docker compose up -d` works, both apps start, /api/health responds, and lint + typecheck + test pass in both packages. Finish with the report template.
```

## T01 – Database schema, migrations, seed

```
Read docs/00-READ-FIRST-BOB-RULES.md, docs/02-ARCHITECTURE.md (§6.4, §7, §12) and docs/01-REQUIREMENTS.md (FR-CAT-01). Do ONLY task T01.

1. Create forward-only numbered SQL migrations in backend/migrations using node-pg-migrate for EVERY table in 02-ARCHITECTURE §7. Add users.wallet_balance_paise and books.avg_rating. Use uuid PKs, explicit ON DELETE, indexes on all FKs and on filter/sort columns (category, price, published_at, units_sold, title), CHECK constraints (price/qty >= 0, rating 1-5, review body <= 100, enums), created_at/updated_at timestamptz. Enable citext for email.
2. backend/db/pool.ts and db/tx.ts (withTransaction helper) – generic only, no business logic.
3. Seed script backend/seed/seed.ts per 02-ARCHITECTURE §12: all 20 categories from FR-CAT-01, >=8 publishers, >=12 authors, >=40 books including the 9 wireframe books with the exact prices, 2 demo users (bcryptjs-hashed passwords), demo user has past CONFIRMED orders and 500 gift points, coupon WELCOME100. Seed must be re-runnable (reset first).
4. npm scripts: db:migrate, db:reset, db:seed.
5. docs/DATA-MODEL.md with a Mermaid ER diagram and one line per table.
6. Integration test (against the test DB on 5433): after migrate+seed assert counts (>=40 books, >=20 categories, 2 users, coupon exists) and that negative price / quantity inserts are rejected.

Cover images: use local placeholder SVG files in frontend/public/covers/ if originals are unavailable; do not download from the internet.
Done when: reset -> migrate -> seed works twice in a row and tests pass. Finish with the report template.
```

## T02 – Backend core: errors, validation, auth, users

```
Read docs/00-READ-FIRST-BOB-RULES.md, docs/02-ARCHITECTURE.md (§6.3, §8, §9 not needed) and docs/01-REQUIREMENTS.md (FR-AUTH-*). Do ONLY task T02.

Implement in backend/src:
- lib/errors.ts (AppError), middleware/errorHandler.ts (returns {error:{code,message,details?}}, no stack in production), notFound.ts, validate.ts (zod for params/query/body), auth.ts (JWT bearer -> req.user {id, role}), rateLimit.ts (auth routes only).
- app.ts: helmet, cors (origin from env), pino-http, json body limit, /api routing, error handlers.
- modules/auth: POST /auth/register, POST /auth/login, GET /auth/me. bcryptjs cost >= 10, password min 8, email unique (409), JWT with sub + role from env secret/expiry.
- modules/users: GET and PUT /me/address (saved default address, fields per FR-CHK-01).
- Layering routes -> controller -> service -> repository; parameterised SQL only in repositories.
- backend/openapi.yaml started with these endpoints; serve Swagger UI at /api/docs.

Integration tests (Supertest + test DB): register ok, duplicate email 409, weak password 400, login ok, wrong password 401, /auth/me with and without token, address upsert, password_hash never present in any response.
Done when lint, typecheck and tests pass. Finish with the report template.
```

> 🔒 **GATE A** – bring Bob's T00–T02 reports to Claude before continuing.

## T03 – Catalogue API

```
Read docs/00-READ-FIRST-BOB-RULES.md, docs/02-ARCHITECTURE.md (§6.3, §8, §10) and docs/01-REQUIREMENTS.md (FR-CAT-*, FR-DEL-*). Do ONLY task T03.

Implement backend modules catalog, books, authors, recommendations, delivery (routes/controller/service/repository/schemas each):
- GET /categories, GET /publishers
- GET /books with query: q (title or author, case-insensitive), category (slug), language, format, minPrice, maxPrice (paise), publisher, sort (relevance|priceAsc|priceDesc|newest|rating), page, pageSize (default 12, max 50 -> else 400). Response {items,page,pageSize,total}.
- GET /books/shelves -> {recommended, bestsellers, newLaunches} (3 each). recommended: from the logged-in user's CONFIRMED orders (categories/authors by frequency, exclude purchased), fallback to bestsellers; auth is optional on this route. bestsellers: units sold last 30 days (fallback units_sold). newLaunches: newest published_at.
- GET /books/:id (with author, publisher, categories, avg rating, units sold, deliveryDate), GET /books/:id/related (3, same category/author first, excluding itself)
- GET /authors/:id (author + books)
- delivery module: deliveryDate = today + DELIVERY_DAYS from env; ebook -> flag "instant". Pure function with injectable clock.
Update backend/openapi.yaml.

Tests: each filter and each sort, pagination bounds, shelves for the demo user vs the new user, related excludes self, 404 for unknown id, delivery date unit tests with a fixed clock incl. ebook.
Avoid N+1 queries on list endpoints. Done when lint, typecheck, tests pass. Finish with the report template.
```

## T04 – Design system & app shell (frontend)

```
Read docs/00-READ-FIRST-BOB-RULES.md, docs/02-ARCHITECTURE.md (§2, §4, §5, §6.2) and docs/01-REQUIREMENTS.md (FR-NAV-*, §5 Visual). Look at ALL images in docs/design/. Do ONLY task T04.

Implement in frontend/src:
1. Tailwind theme tokens mapped to CSS variables (surface, surface-alt, border, text, muted, primary, secondary, link, star, success, danger). Dark is default (values from requirements §5); light theme via class "dark" toggle on <html>. IBM Plex Sans via @fontsource. No hard-coded hex in components.
2. components/ui: Button (primary/secondary/ghost, loading), Input, Select, Checkbox, Modal (focus trap, Esc), Tabs (vertical, keyboard), Badge, Spinner, Skeleton, Toast, Stars, StarInput, QuantityStepper, Breadcrumbs, EmptyState, ErrorState.
3. components/layout: AppShell, Navbar (book icon + "Book Worm", My Orders, My Wishlist, My Writers, cart icon with count badge, user menu with Login/Logout, theme toggle), mobile menu below md breakpoint.
4. router.tsx with every route in 02-ARCHITECTURE §5; pages are stubs rendering their title; lazy-load all but Home.
5. context/AuthContext (token in localStorage, /auth/me on load), ThemeContext (persisted), api/client.ts (fetch wrapper adding bearer token, parsing the error JSON), TanStack Query provider.
6. MSW + Vitest setup in src/test.

Tests: render test per ui component; Navbar shows login vs user state; theme toggle persists; QuantityStepper min/max.
Done when it matches the wireframe navbar at 1280px and collapses at 360px; lint, typecheck, tests pass. Finish with the report template.
```

## T05 – Home / catalogue page

```
Read docs/00-READ-FIRST-BOB-RULES.md, docs/02-ARCHITECTURE.md (§5, §6.2) and docs/01-REQUIREMENTS.md (FR-CAT-*). Open docs/design/01-catalogue-home.png and match its layout. Do ONLY task T05.

Implement:
- api/useBooks.ts, useCategories.ts, usePublishers.ts, useShelves.ts (TanStack Query hooks, query keys in api/queryKeys.ts).
- components/layout/CategorySidebar (All + the categories from the API; selected state highlighted).
- FilterBar: search (debounced 300ms), Language, Format, Price Range, Publisher, Sort. All filter state lives in the URL query string (?category=&q=&language=&format=&min=&max=&sort=&publisher=&page=).
- components/book/BookCard (cover, title, "by author" link, description, format, category links, price in rupees via lib/format.ts, "Delivery by Mon, 21 Jul"), BookShelf (titled row of 3), BookGrid.
- HomePage: no filters -> three shelves (Recommended for You, Bestsellers this Month, New Launches); any filter/category/search -> paginated grid. Skeleton, empty and error states.
- Category sidebar becomes a dropdown/drawer on mobile; grid is 1 column on mobile, 2 on md, 3 on lg.

Tests: typing in search updates URL and request; selecting a category; empty state; error state; BookCard renders formatted price/date.
Done when responsive at 360/768/1280 and lint, typecheck, tests pass. Finish with the report template and note any visual differences from the PNG.
```

## T06 – Product detail page (+ reviews API)

```
Read docs/00-READ-FIRST-BOB-RULES.md, docs/02-ARCHITECTURE.md (§6, §8) and docs/01-REQUIREMENTS.md (FR-PDP-*). Open docs/design/02-product-detail.png and match it. Do ONLY task T06.

Backend (modules/books): GET /books/:id/reviews, POST /books/:id/reviews (auth; rating 1-5, body 1-100 chars; one per user per book -> 409; recompute books.avg_rating). Update openapi.yaml. Integration tests for each rule.

Frontend: BookDetailPage with Breadcrumbs, front/back covers, title, author link, publisher, format, category links, PriceBlock, DeliveryDate, Add to Cart and Add to Wishlist buttons, facts row (language, rating stars, copies sold), AuthorBio, ReviewForm (textarea with live 0/100 counter, StarInput, Submit; react-hook-form + zod), ReviewList, RelatedReads (3 BookCards in a right column; stacks below on mobile). Out-of-stock disables Add to Cart.
Add to Cart / Add to Wishlist: those APIs do not exist yet. Render the buttons but leave them DISABLED with a title "Available after cart task" – do NOT fake the behaviour. They get wired in T08/T12.

Tests: review validation (empty, >100, no rating, not logged in shows login prompt), related reads shows 3, unknown id shows NotFound.
Done when lint, typecheck, tests pass. Finish with the report template.
```

> 🔒 **GATE B** – bring reports T03–T06 to Claude.

## T07 – Login & Register pages, protected routes

```
Read docs/00-READ-FIRST-BOB-RULES.md, docs/02-ARCHITECTURE.md (§5, §6.2) and docs/01-REQUIREMENTS.md (FR-AUTH-*). Do ONLY task T07.

Implement LoginPage and RegisterPage (react-hook-form + zod, field-level errors, loading state, server error message), a ProtectedRoute wrapper using useRequireAuth that redirects guests to /login?next=<path> and returns them there after login, logout in the user menu (clears token and query cache). Styling uses the existing ui components and theme tokens; mobile friendly.
Apply ProtectedRoute to /cart, /payment/:orderId, /confirmation/:orderId, /orders, /wishlist, /writers.

Tests: validation messages, successful login stores the token and redirects to `next`, failed login shows error, guest visiting /cart is redirected to /login, logout clears state.
Done when lint, typecheck, tests pass. Finish with the report template.
```

## T08 – Cart & pricing (API + UI)

```
Read docs/00-READ-FIRST-BOB-RULES.md, docs/02-ARCHITECTURE.md (§8, §9) and docs/01-REQUIREMENTS.md (FR-CART-*, FR-CHK-04..06, FR-GIFT-01, FR-CPN-*). Open docs/design/03-cart-checkout.png. Do ONLY task T08.

Backend:
- modules/orders/pricing.ts: ONE pure function implementing the algorithm in 02-ARCHITECTURE §9 (integer paise, half-up rounding, env TAX_RATE, delivery threshold/fee). Do not duplicate this logic anywhere.
- modules/coupons (validate code: active, not expired, min order) and modules/giftPoints (balance + GET /me/gift-points).
- modules/cart: GET /cart, PUT /cart/items/:bookId {quantity 1..10, <= stock}, DELETE /cart/items/:bookId, POST /cart/quote {couponCode?, pointsToRedeem?} returning the full price breakdown.
- Update openapi.yaml.

Frontend:
- api hooks useCart, useQuote; cart badge in Navbar shows item count live.
- Wire "Add to Cart" on BookDetailPage and BookCard where applicable (guest -> redirect to login).
- Cart page top panel: items with cover, details, QuantityStepper, remove. Right panel "Grand Total": Price (N items), Tax, Delivery Charges ("Free" at 0), Apply Coupon input + Apply, Discount, Total Amount, Pay Now (disabled for now – checkout is T09/T10). Totals ALWAYS come from /cart/quote, never computed in the UI.

Tests: UNIT tests for pricing (percent coupon, flat coupon, min order not met, expired coupon, points cap at 20%, tax rounding, free delivery at threshold, empty cart); integration tests for cart ownership and stock limit; UI test: changing quantity refreshes totals from the API.
Done when lint, typecheck, tests pass. Finish with the report template.
```

## T09 – Checkout address form & gift points

```
Read docs/00-READ-FIRST-BOB-RULES.md, docs/02-ARCHITECTURE.md (§6.2) and docs/01-REQUIREMENTS.md (FR-CHK-01..05). Open docs/design/03-cart-checkout.png (Address panel). Do ONLY task T09. No backend changes except what is strictly needed to read/save the address (already exists from T02).

Implement features/checkout/AddressForm: checkbox "Use Saved Address" (fills from GET /me/address), First Name, Last Name, Address line 1/2, e-mail, City, Pin (exactly 6 digits), Phone with country-code select (default +91) + 10-digit number, State, Country select (default India). zod schema in lib/validators.ts; inline error text; "Save this address" checkbox (PUT /me/address on successful checkout later). Add GiftPoints control in the Grand Total panel (shows available points, input to apply, calls /cart/quote with pointsToRedeem, shows applied amount). Pay Now enabled only when the address is valid and the cart is non-empty; for now it only stores the validated form in page state (order creation is T10/T11).

Tests: every validation rule (required, email, pin, phone), use-saved-address fills fields, Pay Now disabled/enabled transitions, gift points updates the total via the API.
Done when lint, typecheck, tests pass. Finish with the report template.
```

> 🔒 **GATE C** – bring reports T07–T09 to Claude.

## T10 – Orders & payment backend

```
Read docs/00-READ-FIRST-BOB-RULES.md, docs/02-ARCHITECTURE.md (§6.3, §8, §9, §10, §11) and docs/01-REQUIREMENTS.md (FR-PAY-*, FR-ORD-*, FR-WISH-*, FR-WRT-*). Do ONLY task T10.

Implement:
- POST /orders (header Idempotency-Key required; body {address, couponCode?, pointsToRedeem?}): snapshot the cart into an order PENDING_PAYMENT using pricing.ts; same key twice returns the same order.
- modules/payments/mockGateway.ts + POST /orders/:id/pay {method, details} using the rules in §11. Never store or log PAN/CVV; store only last4. On success, in ONE transaction: payment SUCCESS, order CONFIRMED, stock decrement with SELECT ... FOR UPDATE (409 if insufficient), units_sold increment, gift point ledger REDEEM + EARN (1 point per 100 rupees), clear cart. On decline: payment FAILED, order PAYMENT_FAILED, cart untouched, allow retry on the same order.
- GET /orders, GET /orders/:id (own only), POST /orders/:id/cancel (only CONFIRMED and within CANCEL_WINDOW_HOURS of placed_at, injectable clock; else 409): payment REFUNDED, stock restored, points refunded/reversed.
- POST /orders/:id/buy-again (adds order items to cart).
- Wishlist: GET/POST/DELETE /wishlist[/:bookId]. Authors: POST/DELETE /authors/:id/follow, GET /me/writers.
- Update openapi.yaml.

Required tests: happy path; declined card keeps cart and allows retry; same idempotency key -> one order; two concurrent purchases of the last copy -> exactly one succeeds; cancel at 47h59m succeeds and 48h01m returns 409; cancel restores stock and points; another user's order -> 404; PAN/CVV not present in DB rows or captured logs.
Done when lint, typecheck, tests pass. Finish with the report template.
```

## T11 – Payment & confirmation UI

```
Read docs/00-READ-FIRST-BOB-RULES.md, docs/02-ARCHITECTURE.md (§5, §6.2, §11) and docs/01-REQUIREMENTS.md (FR-PAY-*, FR-CONF-*). Open docs/design/04-payment.png and 05-purchase-confirmation.png. Do ONLY task T11.

1. In CartCheckoutPage, Pay Now calls POST /orders (generate an Idempotency-Key once per attempt), then navigates to /payment/:orderId.
2. PaymentPage: full-bleed illustrated background (use public/bg-books.svg – create a simple SVG illustration if none exists), centred card "Complete Payment" with "Payable Amount" from the order. Vertical Tabs: Credit Card, Debit card, UPI, Wallet. Card tabs: Card Number (formatted XXXX-XXXX-XXXX-XXXX, Luhn), Name on Card, CVV (3 digits), Expiry MM/YYYY (not in the past). UPI tab: UPI ID. Wallet tab: shows balance. Pay Now calls POST /orders/:id/pay; loading state; on failure show the error and allow retry; clear sensitive fields from state after submit. Never log or store card data.
3. ConfirmationPage: green check, "Your purchase of the following reads is successful", purchased books as cards, order number, "Continue your Shopping" button -> Home, and a "Cancel order" button while the order is within 48h. Cart badge resets to 0 after success.

Tests: tab switching and per-tab validation, Luhn failure, declined card shows error and retry works (MSW), success navigates to confirmation, cart badge cleared.
Done when lint, typecheck, tests pass. Finish with the report template.
```

## T12 – My Orders, Wishlist, Writers, Author page

```
Read docs/00-READ-FIRST-BOB-RULES.md, docs/02-ARCHITECTURE.md (§5, §6.2) and docs/01-REQUIREMENTS.md (FR-ORD-*, FR-WISH-*, FR-WRT-*). Do ONLY task T12.

Implement:
- OrdersPage: orders newest first (date, status, items, total, delivery date); per item "Buy it again" (POST /orders/:id/buy-again then toast + cart badge update); "Cancel order" button visible only while status is CONFIRMED and within 48h (use server-provided placedAt; confirm dialog; refresh after).
- WishlistPage: items with Add to Cart and Remove; wire the Add to Wishlist button on BookDetailPage (toggle state).
- AuthorPage: bio, photo, books grid, Follow/Unfollow.
- WritersPage ("My Writers"): followed authors with their books; empty state.
- Enable any remaining disabled buttons left from T06.
All with loading, empty, error states.

Tests: cancel button visible at 47h and hidden at 49h (fake timers), buy-again adds to cart, wishlist toggle, follow/unfollow.
Done when lint, typecheck, tests pass. Finish with the report template.
```

> 🔒 **GATE D** – full purchase flow review with Claude (we will click through it together).

## T13 – Polish & responsive pass

```
Read docs/00-READ-FIRST-BOB-RULES.md and docs/02-ARCHITECTURE.md (§6.2). Compare every screen with docs/design/*.png. Do ONLY task T13 – no new features.

1. Fix spacing/alignment/colour differences versus the wireframes.
2. Verify loading, empty, error and validation states on every page.
3. Mobile layouts at 360px and 768px for every page; no horizontal scroll.
4. Remove duplicated components/markup; clean unused Tailwind classes and dead code.
5. Accessibility: labels, alt text, focus rings, keyboard use of tabs/modal, colour contrast in both themes.
6. Create docs/QA-CHECKLIST.md (page x viewport x theme grid) and tick each item you actually verified; mark anything you could not verify as NOT VERIFIED.

Done when lint, typecheck, tests pass. Finish with the report template listing every visual change made.
```

## T14 – End-to-end tests (Playwright)

```
Read docs/00-READ-FIRST-BOB-RULES.md and docs/02-ARCHITECTURE.md (§2, §4). Do ONLY task T14.

Add Playwright (chromium only) in frontend/e2e with a config that starts the DB (test), backend and frontend, resets and seeds the DB before the run. Specs:
1. register -> login -> logout
2. browse: filter by category and search, open a product
3. add to cart -> checkout address -> pay with 4111 1111 1111 1111 -> confirmation shown -> order appears in My Orders
4. declined card 4000 0000 0000 0002 shows the error and a retry with the good card succeeds
5. cancel an order within 48h works; an order older than 48h (seeded) has no cancel button
6. guest opening /cart is redirected to login
Use role/label selectors, no fixed sleeps. Add npm script test:e2e and document it in README.
Done when all specs pass headless; paste the run output. Finish with the report template.
```

## T15 – Docs, OpenAPI, Docker, CI

```
Read docs/00-READ-FIRST-BOB-RULES.md and docs/02-ARCHITECTURE.md (§2, §8). Do ONLY task T15.

1. Make backend/openapi.yaml complete: every endpoint in 02-ARCHITECTURE §8 with schemas, auth, error responses; add a test that fails if a registered Express route is missing from the spec.
2. Dockerfiles for backend and frontend and a docker-compose.yml that brings up the whole stack (db, migrate+seed, backend, frontend) with one command.
3. README: overview, architecture summary, prerequisites, quick start (docker) and manual start, env vars, scripts, test accounts (demo@bookworm.test / Password123!, new@bookworm.test), test card numbers, how to run unit/integration/e2e tests, project structure, and a section "How Bob (agentic IDE) was used" summarising the task-by-task process.
4. .github/workflows/ci.yml: lint, typecheck, backend unit+integration (Postgres service), frontend tests, build.
Done when a clean clone + `docker compose up --build` gives a working app and you list the exact commands you ran. Finish with the report template.
```

## T16 – Git delivery

```
Read docs/00-READ-FIRST-BOB-RULES.md. Do ONLY task T16. Do NOT push anything; prepare only.

1. Confirm `git status` is clean and no secrets/.env files are tracked (list the command output).
2. Write docs/PR-DESCRIPTION.md: summary, feature list mapped to the 12 customer journey steps, tech stack, how to run, test evidence (counts from the last runs), known limitations (mock payments, out-of-scope items from requirements §8), and a list of screenshots to attach.
3. Write docs/VIDEO-SCRIPT.md: a 3-minute outline of how the agentic IDE was used (prompts per phase, what was reviewed/fixed manually, tests, Git flow).
4. Print the exact git commands for me to run: create branch, stage, commit (Conventional Commits), push, open PR.
Finish with the report template.
```

---

## If Bob goes off track – short corrective prompts

- **Did extra work:** `You went beyond task <Txx>. Revert everything outside its scope and list what you reverted. Do not start the next task.`
- **Used an unapproved library:** `Remove <lib>. docs/02-ARCHITECTURE.md §2 lists the only allowed stack. Reimplement with it or add the question to docs/OPEN-QUESTIONS.md.`
- **Claims done but tests fail:** `Run lint, typecheck and all tests now and paste the real output. Fix failures before reporting.`
- **Invented requirement/API:** `That is not in docs/01 or docs/02. Remove it, or log it in docs/OPEN-QUESTIONS.md with a proposed default.`
- **Hard-coded data in UI:** `Replace the hard-coded data with the API hook per docs/02 §6.2. No fetch in components.`
- **Wireframe mismatch:** `Open docs/design/<file>.png and list every visual difference with your current screen, then fix them.`
