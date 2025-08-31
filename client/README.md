# PayStreet — Client (React + TailwindCSS)

A clean, production-ready React front-end for the PayStreet cross-border remittance portal.
It implements onboarding, beneficiary CRUD, money transfer with live FX, transaction history with export (CSV/PDF), KYC trigger, and an admin view — with a modern UI built using **TailwindCSS** + **shadcn/ui** components and **Sonner** toasts.

---

## ✨ Highlights

* **Auth**: Signup/Login with JWT (stored in `localStorage`) and auto-attach Authorization header via a tiny API client.
* **Routing**: Protected routes (`/transfer`, `/beneficiaries`, `/transactions`) and **Admin-only** route (`/admin`).
* **UX**: shadcn/ui Cards/Buttons/Inputs, skeleton loading states, debounced search, friendly toasts (Sonner).
* **Transfers**: Live FX quote indicator (Live/Cached), fee & total debit, confirm & persist to DB.
* **Transactions**: Filters (date + search), summary tiles, pagination, per-row receipt export **CSV/PDF**.
* **KYC**: Trigger mock KYC check from UI and show status badge in the nav.
* **Tests**: React Testing Library example tests in `src/__tests__`.

---

## 🧱 Tech Stack

* React 18 (Create React App)
* TypeScript
* TailwindCSS
* **shadcn/ui** + `lucide-react` icons
* **Sonner** for toasts
* React Router v6
* React Hook Form + Zod (validation)
* Axios (API client)
* Jest + React Testing Library (client tests)

---

## 📁 Project Structure

```
client/
  ├─ src/
  │  ├─ components/
  │  │  ├─ ui/                    # shadcn/ui components you installed (Button, Card, Input, Badge, Skeleton, ...)
  │  │  ├─ AdminRoute.tsx         # Guard for ADMIN-only pages
  │  │  ├─ NavBar.tsx             # Top navigation (Home, Transfer, Beneficiaries, Transactions, Admin*, Logout)
  │  │  ├─ ProtectedRoute.tsx     # Guard for authenticated pages
  │  │  ├─ RunKyc.tsx             # Small KYC runner widget
  │  │  └─ Toast.tsx              # (If present) legacy toast hook — replaced by Sonner
  │  ├─ context/
  │  │  └─ AuthContext.tsx        # Auth state, login/logout, token storage, user object
  │  ├─ lib/
  │  │  ├─ api.ts                 # Axios instance; injects JWT; baseURL from env
  │  │  ├─ download.ts            # Helper to trigger CSV/PDF downloads
  │  │  ├─ format.ts              # Money/number formatting helpers
  │  │  └─ utils.ts               # `cn()` tailwind merge, misc helpers
  │  ├─ pages/
  │  │  ├─ AdminDashboard.tsx     # Admin users + transactions with High-Risk highlighting
  │  │  ├─ Beneficiaries.tsx      # CRUD with debounced search
  │  │  ├─ Login.tsx              # Email/password login (zod validation)
  │  │  ├─ Signup.tsx             # Full name/email/password signup
  │  │  ├─ Transactions.tsx       # Filters, summary cards, table, export CSV/PDF
  │  │  └─ Transfer.tsx           # Live FX quote, fee, total debit; confirm transfer
  │  ├─ styles/
  │  │  └─ globals.css            # Tailwind base + shadcn theme tokens
  │  ├─ __tests__/
  │  │  └─ RunKyc.test.tsx        # Example test (React Testing Library)
  │  ├─ App.tsx                   # Router, routes, Toaster provider
  │  ├─ App.test.tsx              # Example CRA test
  │  ├─ index.tsx                 # Mount app
  │  └─ setupTests.ts             # RTL/Jest setup
  ├─ components.json              # shadcn config (aliases, css path, style)
  ├─ tailwind.config.js           # Tailwind setup
  ├─ postcss.config.js            # PostCSS plugins
  ├─ tsconfig.json                # Path alias '@/*' + React/TS options
  └─ package.json
```

---

## ⚙️ Environment

Create `client/.env`:

```env
# Base URL to your API (server exposes routes under /api)
REACT_APP_API_URL=http://localhost:5050/api
```

> If you deploy, point this to your hosted API (e.g. Render/Heroku):
> `REACT_APP_API_URL=https://your-server.onrender.com/api`

---

## 📦 Install & Run

```bash
# from repository root
cd client

# install
npm install

# start dev server
npm start   # opens http://localhost:3000

# tests (optional)
npm test
```

> Tailwind is configured in `src/styles/globals.css`.
> shadcn component paths are aliased as `@/components/ui/*` via `tsconfig.json`.

---

## 🧭 Routing & Guards

* **Public**: `/`, `/login`, `/signup`
* **Protected** (requires JWT): `/transfer`, `/beneficiaries`, `/transactions`
* **Admin** (requires `user.role === 'ADMIN'`): `/admin`

Guards:

* `ProtectedRoute` wraps protected screens; redirects to `/login` if no token.
* `AdminRoute` wraps admin screen; redirects to `/` if not admin.

Auth state lives in `AuthContext.tsx`:

* `user` shape includes `{ id, fullName, email, accountNumber, role, kycStatus? }`
* `token` stored in `localStorage` and automatically attached to requests (see `lib/api.ts`).

---

## 🔗 API Client

`src/lib/api.ts` (Axios):

* `baseURL` = `process.env.REACT_APP_API_URL` (default fallback is `http://localhost:5050/api`).
* Request interceptor inserts `Authorization: Bearer <token>` when logged in.
* Responses errors are handled by the pages (with Sonner toasts).

---


## 🧩 Pages — Behavior & API usage

### `Signup.tsx`

* Validates `fullName`, `email`, `password` via zod.
* POST `/auth/signup`
* On success → sets auth, toast success, navigate `/`.

### `Login.tsx`

* Validates `email`, `password`.
* POST `/auth/login`
* On success → sets auth, toast success, navigate `/`.

### `Beneficiaries.tsx`

* Debounced search on “name”.
* GET `/beneficiaries?q=…`
* Add: POST `/beneficiaries` (name, bankAccount, country, currency)
* Edit: PUT `/beneficiaries/:id`
* Delete: DELETE `/beneficiaries/:id`
* Uses shadcn Cards/Inputs/Buttons; skeletons when loading.

### `Transfer.tsx`

* Loads user’s beneficiaries.
* Debounced **FX quote** when amount/currencies/beneficiary change:

  * GET `/fx/quote?from=USD&to=INR&amount=123.45` → `{ rate, result, fee, totalDebit, meta: { provider, cached, asOfMs } }`
* Confirm:

  * POST `/transfers` with `{beneficiaryId, amountFrom, sourceCurrency, targetCurrency}`
  * On success → toast & show summary
* Shows live/cached indicator, provider, age (e.g., “12s ago”).

### `Transactions.tsx`

* Filters: `from`, `to`, `q` (beneficiary name).
* GET `/transfers` → paginated list
* GET `/transfers/summary` → totals/avg rate
* **Export**:

  * CSV (with filter): `GET /receipts/transactions.csv?from=&to=&q=`
  * Per-row CSV: `GET /receipts/transactions/:id.csv`
  * Per-row PDF: `GET /receipts/transactions/:id.pdf`
* Skeleton rows on initial load.

### `AdminDashboard.tsx`

* Users table:

  * GET `/admin/users` → `{ id, fullName, email, role, createdAt, _count: { beneficiaries, transactions } }`
* Transactions table:

  * GET `/admin/transactions?from=&to=&q=&page=&pageSize=`
  * Rows flagged as **High-Risk** if USD equivalent > 10,000.

### `RunKyc.tsx`

* (Optional widget; you can add to Home or Transactions header)
* POST `/kyc/check` with `{ fullName, email, country }`
* Shows toast with status; nav badge may reflect `user.kycStatus`.

---

## 🔐 Auth Lifecycle

1. Signup/Login returns `{ user, token }`.
2. `AuthContext` saves both, sets default Axios `Authorization` header.
3. Guards redirect if unauthenticated or unauthorized.
4. Logout clears storage & Axios auth header; returns to `/`.

---

## 🧪 Testing (client)

* Jest + React Testing Library configured in `src/setupTests.ts`.
* Example test: `src/__tests__/RunKyc.test.tsx`
  Run:

  ```bash
  npm test
  ```

---

## 🧾 Formatting & Scripts

```bash
# start dev server
npm start

# run client tests
npm test

# build for production
npm run build

---

## 🔌 Server Endpoints (used by the client)

> Base URL: `REACT_APP_API_URL` (e.g., `http://localhost:5050/api`)

**Auth**

* `POST /auth/signup` → `{ user, token }`
* `POST /auth/login` → `{ user, token }`

**Beneficiaries (auth)**

* `GET /beneficiaries?q=`
* `POST /beneficiaries`
* `PUT /beneficiaries/:id`
* `DELETE /beneficiaries/:id`

**FX (auth)**

* `GET /fx/status`
* `GET /fx/quote?from=&to=&amount=`

**Transfers (auth)**

* `POST /transfers`
* `GET /transfers?from=&to=&q=&page=&pageSize=`
* `GET /transfers/summary?from=&to=&q=`

**Admin (admin only)**

* `GET /admin/users`
* `GET /admin/transactions?from=&to=&q=&page=&pageSize=`

**KYC (auth)**

* `POST /kyc/check`

**Receipts (auth)**

* `GET /receipts/transactions.csv?from=&to=&q=`
* `GET /receipts/transactions/:id.csv`
* `GET /receipts/transactions/:id.pdf`

---
