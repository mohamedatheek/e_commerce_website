# E-Commerce Checkout & Payment System

Frontend Live URL:
https://YOUR-VERCEL-URL.vercel.app

Backend API:
https://YOUR-RAILWAY-URL.up.railway.app

GitHub Repository:
https://github.com/YOUR-USERNAME/YOUR-REPOSITORY

Northline is Task 02 of the Software Engineer Intern practical assessment: a deployable storefront with atomic stock reservation, a mock payment gateway, duplicate-payment protection, cancellation, and refunds.

The **5-minute reservation duration** is an implementation decision for Task 02. It is configured with `RESERVATION_MINUTES` and stored as `expires_at` in the database.

---

## 1. Project Overview

This project is a small e-commerce checkout lab. Shoppers browse seeded products, persist a cart in the browser, reserve stock at checkout, then simulate **success**, **failure**, or **timeout** payments. A demo customer (`customer@example.com`) owns every order so the assessment can focus on inventory and payment correctness instead of authentication.

## 2. Assessment Requirements

Implemented end to end:

- Product search, category/price/availability filters, and sorting
- Cart persisted in `localStorage`
- PostgreSQL checkout with `SELECT … FOR UPDATE`
- Database-backed reservation expiry (not only `setTimeout`)
- Mock payment outcomes
- Payment idempotency (one payment and one order per checkout)
- Order history, cancellation, and mock refunds
- Concurrency and duplicate-payment test scripts
- Vercel / Railway / Neon deployment shape

## 3. Features

- Product listing and product details
- Cart add / quantity / remove / clear
- Checkout with reservation countdown
- Mock gateway buttons: Pay Successfully, Simulate Failure, Simulate Timeout
- Order history and order details with a status timeline
- Cancel unpaid reservations or refund paid orders
- Health endpoint for Railway

## 4. Technology Stack

| Layer | Stack |
| --- | --- |
| Frontend | React 18, Vite, React Router, Axios, CSS modules |
| Backend | Node.js, Express, `pg`, dotenv, cors, helmet, express-rate-limit |
| Database | Neon PostgreSQL |
| Deploy | Frontend → Vercel, backend → Railway, database → Neon |

MongoDB is not used.

## 5. Architecture

```
React storefront  →  Express REST API  →  Neon PostgreSQL
     cart in localStorage     services + transactions
```

- **Routes** define HTTP paths.
- **Controllers** validate params and shape JSON.
- **Services** own business rules and state transitions.
- **Inventory helpers** change `total_stock` / `reserved_stock`.
- **Middleware** handles CORS, rate limits, and errors.

Prices and stock from the browser are never trusted. Checkout and payment always re-read products inside a transaction.

## 6. Database Design

Tables:

- `users`
- `products`
- `checkout_sessions`
- `checkout_items`
- `stock_reservations`
- `orders`
- `order_items`
- `payments`
- `refunds`
- `order_status_history`

Important constraints:

- Money columns are `NUMERIC(12,2)`
- `products.reserved_stock <= total_stock` and both stay `>= 0`
- `orders.checkout_session_id` is **UNIQUE**
- `payments.checkout_session_id` is **UNIQUE**
- `payments.order_id` is **UNIQUE**
- `refunds.order_id` is **UNIQUE** (one refund per order)

Statuses:

| Entity | Values |
| --- | --- |
| checkout_sessions | ACTIVE, PAYMENT_PROCESSING, COMPLETED, EXPIRED, FAILED |
| stock_reservations | ACTIVE, CONSUMED, RELEASED, EXPIRED |
| orders | PENDING, PAID, CANCELLED, REFUNDED, FAILED, EXPIRED |
| payments | PENDING, SUCCESS, FAILED, TIMEOUT, REFUNDED |
| refunds | PENDING, SUCCESS, FAILED |

## 7. Stock Reservation Logic

Chosen model:

```
available_stock = total_stock - reserved_stock
```

- Checkout **increases** `reserved_stock` after locking the product row.
- Successful payment **consumes** the reservation: `reserved_stock -= qty` and `total_stock -= qty`.
- Failure, timeout, unpaid cancel, or expiry **releases** the reservation: `reserved_stock -= qty`.
- Paid cancel/refund **restores** sold units: `total_stock += qty` exactly once.

`available_stock` is computed, never stored as a writable client field.

## 8. Concurrency Protection

Checkout:

1. `BEGIN`
2. Lock products with `SELECT … FOR UPDATE` in product-id order
3. Re-check `total_stock - reserved_stock`
4. Insert session, items, reservations, and a PENDING order
5. `COMMIT` or `ROLLBACK`

Two customers cannot both reserve the last unit because the second transaction waits on the row lock and then sees insufficient stock (`409 Conflict`).

## 9. Payment Idempotency

The payment endpoint:

1. Locks the checkout session `FOR UPDATE`
2. Returns the existing successful payment/order if the session is already `COMPLETED`
3. Relies on unique constraints so a second insert cannot create another payment or order

Duplicate clicks or parallel `POST /api/checkout/:id/payment` requests therefore cannot create two charges.

## 10. Payment Outcomes

`POST /api/checkout/:id/payment` with `{ "outcome": "success" | "failure" | "timeout" }`.

| Outcome | Payment | Reservation | Order | Checkout | Stock |
| --- | --- | --- | --- | --- | --- |
| success | SUCCESS | CONSUMED | PAID | COMPLETED | permanently reduced |
| failure | FAILED | RELEASED | FAILED | FAILED | available again |
| timeout | TIMEOUT | EXPIRED | EXPIRED | EXPIRED | available again |

The UI labels this clearly as a **mock payment gateway for assessment testing**.

## 11. Refund / Cancellation Logic

- Unpaid `PENDING` order: cancel → `CANCELLED`, reservation `RELEASED`, stock available again.
- Paid order: cancel simulates a refund → `refunds` row `SUCCESS`, payment `REFUNDED`, order `REFUNDED`, `total_stock` restored once.
- A second cancel/refund is rejected (`409`) and blocked by `UNIQUE (order_id)` on `refunds`.

Invalid transitions such as `REFUNDED → PAID` or paying an `EXPIRED` checkout are rejected by `stateMachine.js`.

## 12. Project Structure

```
task-02/
  README.md
  backend/
    src/  app.js  server.js
    migrations/  seeds/  scripts/  tests/
  frontend/
    src/  pages/  components/  context/  services/
```

## 13. Local Setup

Prerequisites: Node.js 18+ and a Neon (or other PostgreSQL) database.

```bash
cd task-02/backend
cp .env.example .env
# put your DATABASE_URL into .env
npm install
npm run migrate
npm run seed
npm run dev

cd ../frontend
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173

## 14. Environment Variables

Backend (`task-02/backend/.env`):

```
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
FRONTEND_URL=http://localhost:5173
RESERVATION_MINUTES=5
DEMO_USER_ID=11111111-1111-4111-8111-111111111111
```

Frontend (`task-02/frontend/.env`):

```
VITE_API_URL=http://localhost:5000/api
```

Never commit real connection strings. `.env` files are gitignored; `.env.example` is kept.

## 15. Database Migration

```bash
cd task-02/backend
npm run migrate
```

The runner applies `migrations/*.sql` once and records filenames in `schema_migrations`. It uses `DATABASE_URL`, including Neon SSL.

## 16. Seed Instructions

```bash
cd task-02/backend
npm run seed
```

Seeds a demo user and 14 products (Electronics, Fashion, Home, Accessories), including low-stock items. Re-running is idempotent via fixed UUIDs / `ON CONFLICT`.

## 17. Running Backend

```bash
cd task-02/backend
npm run dev    # local watch
npm start      # production: node src/server.js
```

Listens on `process.env.PORT || 5000` at `0.0.0.0`.

## 18. Running Frontend

```bash
cd task-02/frontend
npm run dev
npm run build
npm run preview
```

## 19. How to Test Search / Filters

On the products page:

- Search `phone` or `lamp`
- Category `Electronics`
- Min/max price
- In stock only
- Sort price low-to-high, high-to-low, newest

Equivalent APIs:

```
GET /api/products?search=phone
GET /api/products?category=Electronics
GET /api/products?minPrice=100&maxPrice=1000
GET /api/products?inStock=true
GET /api/products?sort=price_asc
```

## 20. How to Test Payment Success

1. Add an in-stock item to the cart.
2. Checkout.
3. Click **Pay Successfully**.
4. Confirm order `PAID`, payment `SUCCESS`, and available stock decreased.

## 21. How to Test Payment Failure

1. Checkout any item.
2. Click **Simulate Failure**.
3. Confirm reservation released and the product is in stock again.

## 22. How to Test Payment Timeout

1. Checkout any item.
2. Click **Simulate Timeout**.
3. Confirm checkout/order `EXPIRED` and stock released.

## 23. How to Test Duplicate Payments

Automated:

```bash
# API must already be running
cd task-02/backend
npm run test:idempotency
```

Manual: open checkout, click **Pay Successfully** twice quickly. The second response is the same payment/order (`replayed: true` or identical IDs). Only one `payments` row exists.

## 24. How to Test Reservation Expiry

1. Set `RESERVATION_MINUTES=1` locally if you do not want to wait 5 minutes.
2. Start checkout and wait until `expires_at`.
3. Refresh checkout or attempt payment.
4. Session becomes `EXPIRED` and stock returns.

Expiry is stored in Postgres and applied by `expireOldReservations()` before product/checkout/payment/order reads. A 30s interval also runs while the process is awake, but correctness does not depend on that timer (Railway may sleep).

## 25. How to Test Cancellation

- Unpaid order → Order details → **Cancel reservation**.
- Paid order → **Cancel & refund** (confirm dialog).

A second cancel is rejected.

## 26. How to Test Refund

Cancel a **PAID** order or call:

```
POST /api/orders/:id/refund
```

Expect one `refunds` row, payment `REFUNDED`, inventory restored once.

## 27. How to Test Concurrency

Uses **Lab Stock Widget** (`22222222-2222-4222-8222-222222222222`) with 2 units. The script resets only that product.

```bash
cd task-02/backend
npm run test:concurrency
```

Expected: exactly 2 HTTP 201 checkouts and the rest `409 Insufficient stock`.

## 28. Deployment Instructions

### Neon

1. Create a Neon project.
2. Copy the pooled or direct `DATABASE_URL` (`sslmode=require`).
3. Run `npm run migrate` and `npm run seed` against that URL (local machine or a one-off Railway command).

### Railway (backend)

1. New service from this GitHub repo.
2. **Root directory:** `task-02/backend`
3. Variables:

```
DATABASE_URL=<NEON_DATABASE_URL>
NODE_ENV=production
FRONTEND_URL=https://YOUR-VERCEL-URL.vercel.app
RESERVATION_MINUTES=5
```

4. Start command is `npm start` (`node src/server.js`).
5. Confirm `GET https://YOUR-RAILWAY-URL.up.railway.app/api/health` returns `{ "status": "ok" }`.

### Vercel (frontend)

1. New project, **root directory:** `task-02/frontend`
2. Variable:

```
VITE_API_URL=https://YOUR-RAILWAY-DOMAIN.up.railway.app/api
```

3. `vercel.json` rewrites all routes to `index.html` so `/products/:id` and `/orders/:id` work on refresh.

After both URLs exist, put the Vercel origin in Railway `FRONTEND_URL` (no trailing slash required; the API strips it).

## 29. API Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | `{ "status": "ok" }` |
| GET | `/api/products` | query: search, category, minPrice, maxPrice, inStock, sort |
| GET | `/api/products/:id` | |
| POST | `/api/checkout` | body `{ items: [{ productId, quantity }] }` |
| GET | `/api/checkout/:id` | |
| POST | `/api/checkout/:id/payment` | body `{ outcome }` |
| GET | `/api/orders` | demo user |
| GET | `/api/orders/:id` | includes history |
| POST | `/api/orders/:id/cancel` | unpaid release or paid refund |
| POST | `/api/orders/:id/refund` | paid orders only |

JSON errors:

```json
{ "success": false, "message": "Insufficient stock" }
```

Stock/concurrency conflicts use **409**.

## 30. Known Assumptions

- Full authentication is out of scope. Every checkout uses the seeded demo user so auth can be added later (`users` already exists).
- Reservation window is **5 minutes** unless `RESERVATION_MINUTES` is changed.
- Shipping/tax are zero; backend `total` equals `subtotal`.
- The Lab Stock Widget exists so concurrency tests do not need to wipe the catalog.
- Product JSON uses camelCase (`availableStock`) mapped from SQL snake_case.
- Images are remote Unsplash URLs; a placeholder shows if a photo fails to load.

## Commands to run before pushing to GitHub

```bash
cd task-02/backend && npm install && npm test
cd task-02/frontend && npm install && npm run build
# Do not commit .env files
```

If a database is configured, also run `npm run migrate`, `npm run seed`, then start the API and run `npm run test:concurrency` and `npm run test:idempotency`.
