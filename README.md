# Batloung Farm Fresh Produce Distribution Management System (DIWA2110)

Web-based Distribution Management System for **Batloung Farm (Maseru, Lesotho)** to manage suppliers, fruits, vendors, purchases, sales, stock levels, payments, and reports. It replaces manual notebooks/spreadsheets with a MySQL-backed Node.js/Express REST API and a React (Vite) frontend.

## Test / Submission Deliverables
- **Live link:** [Batloung Farm Distribution System](https://batloung-farm-distribution-system-b.vercel.app)
- **GitHub repository link:** [Batloung-Farm-Distribution-System](https://github.com/moenothapelo62/Batloung-Farm-Distribution-System)
- **Demo video:** [Watch the Batloung Farm demonstration](https://github.com/moenothapelo62/Batloung-Farm-Distribution-System/releases/tag/demo-video)

> Fill in the links above before submission.

## Business Coverage
- Fruits: Apple, Banana, Orange, Mango, Grape.
- Suppliers from South African provinces (Gauteng, Free State, KwaZulu-Natal, Western Cape, Eastern Cape, Limpopo, Mpumalanga, North West).
- Sales to street vendors/small retailers in three packaging sizes: **small, medium, large** (each with a different selling price).
- Stock tracked **separately per fruit and packaging size** (not total-only).
- Purchases increase stock; sales validate availability, reduce stock, and reject insufficient-stock sales as a whole transaction (no partial updates).
- Payments support **Cash, Mobile Money, Credit** with status **PAID / PARTIALLY_PAID / UNPAID** and vendor outstanding balances.

## Project Structure
- `Database/`
  - `schema.sql` � creates `batloung_farm` and all 8 tables, PK/FK, constraints, indexes.
  - `seeds.sql` � realistic sample records across all relevant tables.
  - `reports.sql` � required SQL reporting queries (+ payment/low-stock helpers).
- `Backend/` � Node.js + Express + MySQL (`mysql2/promise`, `dotenv`, `cors`)
  - `config/` � `db.js` (pool + connection test, env-driven config)
  - `routes/` � REST route definitions
  - `controllers/` � request handling, validation, HTTP responses
  - `models/` � database queries
  - `middleware/` � error handling / validation helpers
  - `utils/` � shared helpers
  - `.env`, `.env.example`, `server.js`
- `Frontend/Batloung/` � React + Vite SPA (API-integrated)
  - `src/services/api.js` � Axios REST client (`VITE_API_URL`)
  - `src/utils/` � context + constants/mappers
  - `src/pages/` � Dashboard, Suppliers, Fruits, Stock, Vendors, Purchases, Sales, Payments, Reports

## Prerequisites
- Node.js 18+ and npm
- MySQL 8+

## 1) Database Setup (MySQL)
Run in MySQL (adjust path as needed):
```sql
SOURCE Database/schema.sql;
SOURCE Database/seeds.sql;
-- optional to run report queries:
-- SOURCE Database/reports.sql;
```
Notes:
- `schema.sql` starts with `DROP DATABASE IF EXISTS batloung_farm;` and recreates it (destructive reset by design for a clean test setup).
- Stock is stored per `(fruit_id, packaging_size)` in `stock` to satisfy packaging-specific tracking.

## 2) Backend Setup (Express API)
```bash
cd Backend
npm install
# configure environment
copy .env.example .env   # Windows (or: cp .env.example .env)
# edit .env with your MySQL credentials
npm start
```
API runs at `http://localhost:5000` by default.
- Health check: `GET /api/health`
- The server handles DB connection failures gracefully (logs a clear error and continues running; DB-dependent routes return meaningful errors until configured).

### Backend Environment Variables (`Backend/.env`)
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=batloung_farm
PORT=5000
```

## 3) Frontend Setup (React/Vite)
```bash
cd Frontend/Batloung
npm install
# ensure VITE_API_URL points to the backend
# .env example:
# VITE_API_URL=http://localhost:5000/api
npm run dev
```
Open the printed local URL (e.g. http://localhost:5173). The UI loads live data from the REST API and shows connection/loading/error states.

Build/preview:
```bash
npm run build
npm run preview
```

## REST API Summary
Base URL: `/api`

### Suppliers
- `POST /suppliers` � register supplier (201)
- `GET /suppliers` � list all (200)
- `GET /suppliers/:id` � get by ID (200/404)
- `PUT /suppliers/:id` � update (200/400/404)
- `DELETE /suppliers/:id` � delete, blocked if purchase records exist (200/400/404)

### Fruits & Stock
- `POST /fruits` � register fruit type (201) and initialize stock rows (small/medium/large)
- `GET /fruits` � list fruits (200)
- `GET /fruits/:id` � get fruit (200/404)
- `PUT /fruits/:id` � update fruit info (200/400/404)
- `DELETE /fruits/:id` � delete if no purchase/sale records (200/400/404)
- `GET /stock` or `GET /fruits/stock` � stock quantities per fruit & packaging size (200)
- `GET /fruits/:id/stock` � stock for a fruit (200)
- `GET /stock/low?threshold=10` or `GET /fruits/low-stock?threshold=10` � low stock (200)

### Vendors
- `POST /vendors` � register vendor (201)
- `GET /vendors` � list all (200)
- `GET /vendors?search=term` or `?q=term` � search by name or phone (200)
- `GET /vendors/:id` � get by ID (200/404)
- `PUT /vendors/:id` � update (200/400/404)
- `GET /vendors/balances`, `GET /vendors/:id/balance` � outstanding balances

### Purchases
- `POST /purchases` � record purchase (201)
  - Body: `{ supplier_id, purchase_date, items: [{ fruit_id, packaging_size, quantity, unit_cost }, ...] }`
  - Validates input, auto-calculates total, inserts purchase + details, increases stock per item in a **transaction** (COMMIT/ROLLBACK).

### Sales
- `POST /sales` � record sale (201/400)
  - Body: `{ vendor_id, sale_date, payment_status, payment_method, paid_amount?, items: [{ fruit_id, packaging_size, quantity, unit_price }, ...] }`
  - Validates input, auto-calculates total/payable, checks stock with row locks, **rejects entire sale** if any item is insufficient (no stock/record changes), reduces stock and records payment status in a **transaction**.

### Payments
- `POST /payments` � record vendor payment (200)
  - Body: `{ vendor_id, amount, payment_method }` (`Cash|Mobile Money|Credit`)
  - Applies payment to oldest outstanding sales, updates `paid_amount`/`payment_status` (`PAID|PARTIALLY_PAID|UNPAID`) in a **transaction**; prevents overpayment.
- `GET /payments/outstanding` � unpaid/partially paid sales
- `GET /payments/balances`, `GET /payments/balances/:id` � vendor balances

### Reports
- `GET /reports/top-fruits` � five most frequently sold fruits (by boxes)
- `GET /reports/revenue?start=YYYY-MM-DD&end=YYYY-MM-DD` � total revenue and sales count for date range
- `GET /reports/top-vendor` � vendor who purchased highest number of boxes
- `GET /reports/stock-levels` � current stock per fruit and packaging size
- `GET /reports/summary` � dashboard summary aggregates

### Validation & HTTP Status Codes
- `200 OK` � successful retrieval/update/delete/payment
- `201 Created` � successful record creation (supplier, fruit, vendor, purchase, sale)
- `400 Bad Request` � invalid/missing input, business-constraint violations (e.g. insufficient stock, delete with dependent records, overpayment)
- `404 Not Found` � missing record/route
- `500 Internal Server Error` � unexpected server/database errors (handled without crashing the app)

## SQL Reporting Queries (Part D)
Implemented in `Database/reports.sql` and exposed via `/api/reports/*`:
1. Five most frequently sold fruits
2. Total sales revenue in a specified date range
3. Vendor who purchased the highest number of boxes
4. Current stock levels for each fruit and packaging size
(plus vendor outstanding balances and low-stock identification)

## Verification Performed
- **Frontend:** `cd Frontend/Batloung && npm run lint` → **clean (0 errors, 0 warnings)**; `npm run build` → **success**.
- **Backend:** `node --check` on server, config, middleware, utils, routes, controllers, models → **success**.
- **Database scripts:** `schema.sql`, `seeds.sql`, `reports.sql` present and aligned to DIWA2110 (8 tables, packaging-specific stock, constraints, sample data, required reports).
- **DB/API runtime (end-to-end):** requires a running MySQL instance with valid credentials. Load `schema.sql` + `seeds.sql`, configure `Backend/.env`, start backend, then run frontend against the API to validate live CRUD, multi-item purchase/sale transactions (including insufficient-stock full rollback), payment status/outstanding balances, and report endpoints.

## System Testing Checklist (run after DB is configured)
1. **Database:** execute `schema.sql` and `seeds.sql`; confirm `batloung_farm` and all 8 tables, constraints, and `stock` rows per fruit/packaging size (small/medium/large).
2. **Backend health:** `npm start` in `Backend` → `GET /api/health` returns 200.
3. **Suppliers:** register/list/get/update/delete (delete blocked when purchase records exist).
4. **Fruits & Stock:** register/list/update fruits; view stock per fruit/packaging; identify low stock.
5. **Vendors:** register/list/search by name or phone/update; view balances.
6. **Purchases:** record multi-item purchase → total auto-calculated, stock increases per fruit+size (transactional).
7. **Sales:** record multi-item sale → total auto-calculated, stock decreases; **insufficient stock rejects entire sale with no partial changes** (transactional rollback).
8. **Payments:** record Cash/Mobile Money/Credit payment → status PAID/PARTIALLY_PAID/UNPAID updates correctly and outstanding balance per vendor is accurate.
9. **Reports:** top 5 sold fruits, revenue by date range, top vendor by boxes, current stock per fruit/packaging size.

## Submission Checklist
- [ ] Fill **Live link** above (deploy frontend and backend+MySQL; set `VITE_API_URL` to deployed API)
- [ ] Fill **GitHub repository link** above
- [ ] Fill **Demo video** link above (show DB setup, API/frontend, all required flows including transaction rollback and reports)
- [ ] Ensure `Backend/.env` is not committed with secrets; provide `.env.example` (included)

## Demo Guidance (for video)
1. Show database setup (`schema.sql`, `seeds.sql`) and packaging-specific `stock` rows.
2. Start backend and show `/api/health`, then start frontend.
3. Demonstrate: supplier/vendor/fruit registration & update; stock view & low-stock; multi-item purchase (stock increases, total auto-calculated); multi-item sale (total auto-calculated, stock decreases); insufficient-stock sale rejected without partial changes; payments (Cash/Mobile Money/Credit), PAID/PARTIALLY_PAID/UNPAID and outstanding balances; reports (top fruits, revenue by date range, top vendor, stock levels).
4. Include live link, GitHub repo, and this README context in submission.
