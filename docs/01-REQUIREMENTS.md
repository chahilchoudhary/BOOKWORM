# Book Worm – Requirements

Derived from "AI Specialist – Front end and Mobile – Capstone instructions.pptx" (slides + wireframes + architecture diagram).
Items marked **[DECK]** are stated in the deck. Items marked **[WIREFRAME]** are visible in a design image. Items marked **[ASSUMED]** are my proposed defaults where the deck is silent – to be confirmed (see §9).

## 1. Goal

An e-commerce web platform where a customer can **browse, select and purchase books** [DECK slide 5]. Deliverable is a responsive front end (web chosen; mobile-responsive), a backend API, a PostgreSQL database, tests, an OpenAPI spec, and a Git PR [DECK slides 15, 18].

Capstone scoring emphasis [DECK]: UI converted from designs, AI-generated code reviewed/refined, end-to-end tested, Git workflow, documented process.

## 2. Users and roles

| Role | Source | Capabilities |
|---|---|---|
| Guest | [DECK diagram] | Browse home/catalogue, view product detail. Cannot checkout. [ASSUMED: must log in to checkout] |
| Registered user (member) | [DECK diagram] | Everything a guest can + cart, wishlist, checkout, payment, order history, reviews, cancel order |
| Admin / store management | [DECK diagram: "Create Stores / Catalogs / Store policies"] | **OUT OF SCOPE** for this build. Data is loaded by seed script. |

## 3. Customer journey (12 steps) [DECK slide 5]

1 Login → 2 User authentication (+ order history with "Buy it again", recommendations from order history) → 3 Access catalogue per category → 5 Select category → 6 Browse brands → 7 Select product (tagged with tentative delivery date; related products shown) → 8 Add to basket → 9 Select delivery address → 10 Initiate payment with the right option + redeem gift points → 11 Payment confirmation → 12 Confirmation on purchase + **cancel order within 48 hrs**.

## 4. Functional requirements

### 4.1 Authentication & member (FR-AUTH)
- FR-AUTH-01 Register with name, email, password. Email unique. [ASSUMED fields]
- FR-AUTH-02 Login / logout. [DECK]
- FR-AUTH-03 Session via JWT; protected routes redirect guests to Login and return them to the page they came from after login.
- FR-AUTH-04 Password min 8 chars, stored hashed (bcrypt).
- FR-AUTH-05 Profile menu (user icon, top right) shows user name + Logout. [WIREFRAME]
- FR-AUTH-06 Guest can browse everything read-only. [DECK diagram]

### 4.2 Global layout (FR-NAV) [WIREFRAME all screens]
- FR-NAV-01 Top bar: book icon + "Book Worm" brand (links Home) | **My Orders** | **My Wishlist** | **My Writers** | cart icon with item-count badge | user icon.
- FR-NAV-02 Cart badge shows total number of distinct line items [ASSUMED; wireframe shows "2"] and updates immediately.
- FR-NAV-03 Breadcrumbs on product and checkout pages: `Home / Non-Fiction / Self Help / <Book> / Checkout` [WIREFRAME].
- FR-NAV-04 Dark theme is the default (matches wireframes). Light theme available via toggle; both must be visually consistent [DECK slide 19 step 5].
- FR-NAV-05 Responsive: desktop and mobile layouts [DECK slide 19 step 7]. Top-bar links collapse to a menu on mobile; category sidebar becomes a drawer/dropdown.
- FR-NAV-06 "My Writers" lists authors the user follows; see FR-WRT.

### 4.3 Catalogue / home page (FR-CAT) [WIREFRAME 01-catalogue-home.png]
- FR-CAT-01 Left sidebar of categories, "All" selected by default. Exact list from wireframe: All, Romance, Mystery, Science Fiction, Fantasy, Historical, Biography, Self-help, Memoir, Travel, Cooking, Children's, Young Adult, Comics & Graphic Novels, Poetry, Drama, Science, Philosophy, Religion, Language Learning.
- FR-CAT-02 Filter/search bar: **Search** (text, by title/author), **Language**, **Format** (Paperback, Hardcover, eBook, etc.), **Price Range**, **Sort by** (default "Relevance"; also price asc/desc, newest, rating [ASSUMED]).
- FR-CAT-03 Home (category = All, no filters) shows three shelves: **Recommended for You**, **Bestsellers this Month**, **New Launches**, 3 books per row.
- FR-CAT-04 When a category, search or filter is active, show a flat paginated result grid instead of shelves. [ASSUMED]
- FR-CAT-05 Book card: cover, title, "by <author link>", short description, format, category links (e.g. "Non-fiction, Self Help"), price in ₹, "Delivery by <Ddd, DD Mon>".
- FR-CAT-06 **Browse by brand** [DECK step 6]: filter by brand. [ASSUMED: brand = publisher; the wireframe has no brand control, so add a "Brand/Publisher" filter to the filter bar]
- FR-CAT-07 Recommended for You is derived from the user's order history (categories/authors of purchased books, excluding already-purchased). Guests / users with no history get popular books. [DECK + ASSUMED fallback]
- FR-CAT-08 Bestsellers this Month = top by units sold in last 30 days; New Launches = most recent `published_at`. [ASSUMED rules]
- FR-CAT-09 Empty state, loading skeletons and error state for every list.
- FR-CAT-10 Clicking a card navigates to Product Detail.

### 4.4 Product detail (FR-PDP) [WIREFRAME 02-product-detail.png]
- FR-PDP-01 Breadcrumb; front and back cover images; title; "by <author link>"; description; "Published by: <publisher link>"; format; category links.
- FR-PDP-02 Price (₹) and "Delivery by <date>" (tentative delivery date) [DECK].
- FR-PDP-03 Buttons: **Add to Cart** (primary blue), **Add to Wishlist** (secondary grey). Wishlist toggles; requires login.
- FR-PDP-04 Facts row: Language, Rating (stars, average), "Sells N copies sold".
- FR-PDP-05 "About the writer": photo, name, bio.
- FR-PDP-06 **Reviews**: form with textarea (max 100 chars, live counter `0/100`), 5-star input, Submit; list of existing reviews (name, text, stars). One review per user per book. Login required to submit. [WIREFRAME]
- FR-PDP-07 Right column **Related Reads** (3 books: same category/author first), same card style as catalogue. [DECK "Related products appear"]
- FR-PDP-08 Out-of-stock books show "Out of stock" and disable Add to Cart. [ASSUMED]

### 4.5 Cart & checkout (FR-CART / FR-CHK) [WIREFRAME 03-cart-checkout.png]
Single page titled **Shopping Cart** with three panels.
- FR-CART-01 Items panel: cover, title, author, description, format, categories, unit price, delivery date, quantity stepper (− / +, min 1, max = stock, max 10 [ASSUMED]), remove item (via qty to 0 or remove control [ASSUMED]).
- FR-CART-02 Cart persists server-side for logged-in users. Guest "Add to Cart" prompts login. [ASSUMED]
- FR-CHK-01 **Address panel**: checkbox "Use Saved Address" (fills from user's saved default address), fields: First Name, Last Name, Address (Line 1/2), e-mail, City, Pin (6 digits), Phone Number (country code select, default +91, + number), State, Country (select, default India).
- FR-CHK-02 Validation on all fields (required, email format, 6-digit pin, 10-digit phone); inline error messages; Pay Now disabled while invalid.
- FR-CHK-03 Option to save the address for next time. [ASSUMED]
- FR-CHK-04 **Grand Total panel**: Price (N items), Tax, Delivery Charges ("Free" when 0), **Apply Coupon** input + Apply button, Discount, **Total Amount**, **Pay Now**.
- FR-CHK-05 Redeem gift points toggle/field in the panel [DECK step 10]; shows points available, points applied, and reduces Total.
- FR-CHK-06 Totals recomputed on the **server** and returned to the UI; the UI never computes the authoritative price.
- FR-CHK-07 Pay Now → payment screen with the server-calculated payable amount.

### 4.6 Payment (FR-PAY) [WIREFRAME 04-payment.png]
- FR-PAY-01 Modal/card "Complete Payment" with "Payable Amount: ₹X".
- FR-PAY-02 Left tab list: **Credit Card**, **Debit card**, **UPI**, **Wallet** [DECK "right payment option"].
- FR-PAY-03 Card tabs: Card Number (`XXXX-XXXX-XXXX-XXXX`, Luhn check), Name on Card, CVV (3 digits), Date of Expiry (`MM/YYYY`, not in the past). UPI tab: UPI ID field. Wallet tab: wallet balance + pay. [ASSUMED fields for UPI/Wallet]
- FR-PAY-04 **Payments are SIMULATED.** A mock payment gateway module decides success/failure (e.g. test card `4111 1111 1111 1111` succeeds, `4000 0000 0000 0002` declines). **No real card data is stored or logged – ever.** [ASSUMED; the deck has no real gateway]
- FR-PAY-05 On success: order status `CONFIRMED`, payment `SUCCESS`, stock decremented, cart cleared, gift points deducted/earned. On failure: show error, keep cart, allow retry. All in one DB transaction.
- FR-PAY-06 Idempotency: double-clicking Pay Now must not create two orders (idempotency key).

### 4.7 Purchase confirmation (FR-CONF) [WIREFRAME 05-purchase-confirmation.png]
- FR-CONF-01 Green check icon, text "Your purchase of the following reads is successful", the purchased books (card style), and **Continue your Shopping** button → Home. [DECK slide 14: "message should bring up the purchase completion"]
- FR-CONF-02 Show order number and a **Cancel order** option while within 48 hours. [DECK step 12; the control position is not in the wireframe – placed in My Orders and also shown on confirmation, ASSUMED]

### 4.8 Orders (FR-ORD) [DECK + diagram "Order History", "Confirm / Cancel / Reduce Order"]
- FR-ORD-01 **My Orders**: list orders newest first with date, status, items, total, delivery date.
- FR-ORD-02 **Buy it again** button on each past item → adds to cart. [DECK]
- FR-ORD-03 **Cancel order** allowed only when `now − placed_at ≤ 48h` and status ∈ {CONFIRMED, PROCESSING}; enforced on the server. After 48h the button is hidden and API returns 409.
- FR-ORD-04 Cancelling triggers a (simulated) refund, restores stock, restores/returns gift points, sets status `CANCELLED`. [diagram: Refund processing]
- FR-ORD-05 Order status lifecycle: `PENDING_PAYMENT → CONFIRMED → CANCELLED` (also `PAYMENT_FAILED`). Shipping statuses (SHIPPED/DELIVERED) are out of scope; delivery date is informational.
- FR-ORD-06 "Reduce order" (remove one item/qty from an order) from the diagram is **OUT OF SCOPE** unless confirmed.

### 4.9 Wishlist (FR-WISH) [WIREFRAME nav "My Wishlist"]
- FR-WISH-01 Add/remove from product detail; "My Wishlist" page lists items with Add to Cart and Remove.

### 4.10 Writers (FR-WRT) [WIREFRAME nav "My Writers"]
- FR-WRT-01 Author links on cards/detail go to an Author page (bio + their books).
- FR-WRT-02 Follow/unfollow an author; "My Writers" lists followed authors and their books. [ASSUMED meaning]

### 4.11 Delivery date (FR-DEL) [DECK slide 5 step 7]
- FR-DEL-01 Each book shows tentative delivery = today + `DELIVERY_DAYS` (config, default 5; ebook = instant "Available instantly" [ASSUMED]). Format `Mon, 21 Jul`.
- FR-DEL-02 Computed on the server so all screens agree.

### 4.12 Gift points & coupons (FR-GIFT / FR-CPN) [DECK step 10 + diagram]
- FR-GIFT-01 Each user has a points balance (ledger). Seed demo users with points. 1 point = ₹1; earn 1 point per ₹100 spent; max redeem = 20% of subtotal. [ASSUMED rules]
- FR-CPN-01 Coupon codes: type (percent / flat), value, min order, expiry, active flag. Seed `WELCOME100` (flat ₹100, min ₹300) to match the wireframe's ₹100 discount. One coupon per order.
- FR-CPN-02 Invalid/expired coupon → clear error message.

## 5. Visual / UX requirements (from wireframes)
- Theme: near-black page (`#161616`), panels `#262626`, top bar `#161616` with 1px bottom border; primary blue `#0F62FE`; secondary button grey `#393939`; links blue `#78A9FF` underlined; text white / grey `#C6C6C6`; rating stars yellow `#F1C21B`; success green `#24A148`; cart badge red `#DA1E28`. (Values approximated from the images – IBM Carbon palette; verify against images.)
- Font: IBM Plex Sans (the wireframes appear to use it). Currency symbol ₹ with `en-IN` formatting.
- Square corners on buttons/inputs (Carbon style), underlined-bottom inputs on dark fill.
- Payment & confirmation screens use a full-bleed illustrated book background (use the same illustration or a CSS/SVG equivalent) with a centred dark card.
- Loading states, validations, disabled states, toast/inline errors, keyboard focus rings, alt text on images [DECK slide 19 step 8].
- Accessibility: WCAG 2.1 AA contrast targets, semantic HTML, labels bound to inputs.

## 6. Non-functional requirements
- NFR-01 Responsive at 360 / 768 / 1280+ px.
- NFR-02 Pages load < 2 s on local; list endpoints paginated (default 12, max 50).
- NFR-03 All money stored as integer minor units (paise); never floats.
- NFR-04 All API input validated server-side (zod); consistent error JSON `{error:{code,message,details?}}`.
- NFR-05 OpenAPI 3.0 spec served at `/api/docs` and committed as `backend/openapi.yaml` [DECK slide 15].
- NFR-06 Automated tests: unit, API integration, component, E2E (see `03-TASKS.md`). Coverage target ≥ 70% lines on backend services and frontend utils/hooks. [ASSUMED]
- NFR-07 Runs locally with one command (`docker compose up`) plus documented non-docker path.
- NFR-08 No secrets in repo; CORS restricted to the frontend origin; rate-limit auth endpoints; helmet enabled.

## 7. Architecture diagram → modules [DECK slide 6]
The diagram shows 6 domain modules; the backend is organised the same way:

| Diagram box | Responsibilities listed (some text is hard to read in the image) | Backend module |
|---|---|---|
| Member | Guest/registered users, login & logout, roles/entitlement | `auth`, `users` |
| Store | Create stores, catalogs, store policies | seed data only (single store) |
| Catalog | Browse catalogue by entitlement; browse by category & brand; recommended products from order history; up-sell & cross-sell products | `books`, `catalog`, `recommendations` |
| Order | Create/modify order, order checkout, confirm / cancel / reduce order, order history, redeem gift points, coupons | `cart`, `orders`, `coupons`, `gift-points` |
| Payment | Payment processing via gateway, refund processing, payment confirmation, gift & wallet | `payments` (mock gateway) |
| Shipping | Shipping rate calculation, approximate delivery time, return shipment | `delivery` (rate + date only; returns out of scope) |

Flow: Registered User → User Login → Home Page ← Guest User; Home → Browse → Add to Cart → Payment Processing → Shipment.

## 8. Out of scope
Admin UI, real payment gateway, real shipping/tracking, returns, email/SMS, multi-store, i18n, native mobile app, social login.

## 9. Open questions / assumptions needing owner confirmation
1. Framework: deck says "your choice (web or mobile)" with React + Tailwind as the example → **React + Tailwind web, responsive** chosen.
2. Backend language is not specified → **Node.js + Express + TypeScript** chosen.
3. Wireframe numbers are inconsistent: cart shows ₹508 + ₹62 tax − ₹100 = ₹470 but the payment screen says ₹580. Treated as placeholder; real UI must show the server total on both screens.
4. Tax: ₹62 on ₹508 ≈ 12.2%. Using configurable `TAX_RATE=12%`.
5. Delivery charges "Free" shown at ₹508. Rule assumed: free when subtotal ≥ ₹300, else ₹40.
6. "Brand" = publisher (no brand data in wireframes).
7. Gift-point and coupon rules (FR-GIFT-01, FR-CPN-01) are invented defaults.
8. Architecture-diagram callout text is partially illegible (hatched clouds). Items in §7 were read on a best-effort basis; please check the original slide 6.
9. "Reduce order", returns, admin features excluded.
10. The deck also suggests an "ICA Agent" test-case generator and optional cloud deploy (ROSA/ROKS) – optional, not required to pass.
