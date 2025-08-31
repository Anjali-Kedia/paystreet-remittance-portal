# PayStreet — Client (React + TailwindCSS)

A clean, production-ready **React front-end** for the PayStreet cross-border remittance portal.  

It implements onboarding, beneficiary CRUD, money transfer with live FX, transaction history with export (CSV/PDF), KYC trigger, and an admin view — with a modern UI built using **TailwindCSS** + **shadcn/ui** components and **Sonner** toasts.

---

## ✨ Highlights

- **Auth**: Signup/Login with JWT (stored in `localStorage`) and auto-attach Authorization header via a tiny API client.  
- **Routing**: Protected routes (`/transfer`, `/beneficiaries`, `/transactions`) and **Admin-only** route (`/admin`).  
- **UX**: shadcn/ui Cards/Buttons/Inputs, skeleton loading states, debounced search, friendly toasts (Sonner).  
- **Transfers**: Live FX quote indicator (Live/Cached), fee & total debit, confirm & persist to DB.  
- **Transactions**: Filters (date + search), summary tiles, pagination, per-row receipt export **CSV/PDF**.  
- **KYC**: Trigger mock KYC check from UI and show status badge in the nav.  
- **Tests**: React Testing Library example tests in `src/__tests__`.  

---

## 🧱 Tech Stack

- React 18 (Create React App)  
- TypeScript  
- TailwindCSS  
- **shadcn/ui** + `lucide-react` icons  
- **Sonner** for toasts  
- React Router v6  
- React Hook Form + Zod (validation)  
- Axios (API client)  
- Jest + React Testing Library  

---

## 📁 Project Structure

```
client/
├─ src/
│  ├─ components/
│  │  ├─ ui/                # shadcn/ui components (Button, Card, Input, Badge, Skeleton, …)
│  │  ├─ AdminRoute.tsx     # Guard for ADMIN-only pages
│  │  ├─ NavBar.tsx         # Top navigation
│  │  ├─ ProtectedRoute.tsx # Guard for authenticated pages
│  │  ├─ RunKyc.tsx         # Small KYC runner widget
│  │  └─ Toast.tsx          # (Optional legacy toast hook — replaced by Sonner)
│  ├─ context/
│  │  └─ AuthContext.tsx    # Auth state, login/logout, token storage, user object
│  ├─ lib/
│  │  ├─ api.ts             # Axios instance; injects JWT; baseURL from env
│  │  ├─ download.ts        # Helper to trigger CSV/PDF downloads
│  │  ├─ format.ts          # Money/number formatting helpers
│  │  └─ utils.ts           # cn() tailwind merge, misc helpers
│  ├─ pages/
│  │  ├─ AdminDashboard.tsx # Admin users + transactions with High-Risk highlighting
│  │  ├─ Beneficiaries.tsx  # CRUD with debounced search
│  │  ├─ Login.tsx          # Email/password login
│  │  ├─ Signup.tsx         # Full name/email/password signup
│  │  ├─ Transactions.tsx   # Filters, summary cards, table, export CSV/PDF
│  │  └─ Transfer.tsx       # Live FX quote, fee, total debit; confirm transfer
│  ├─ styles/
│  │  └─ globals.css        # Tailwind base + shadcn theme tokens
│  ├─ __tests__/
│  │  └─ RunKyc.test.tsx    # Example RTL test
│  ├─ App.tsx               # Router, routes, Toaster provider
│  ├─ App.test.tsx          # Example CRA test
│  ├─ index.tsx             # Mount app
│  └─ setupTests.ts         # Jest + RTL setup
├─ components.json          # shadcn config
├─ tailwind.config.js       # Tailwind setup
├─ postcss.config.js        # PostCSS plugins
├─ tsconfig.json            # Path alias '@/*'
└─ package.json
```

---

## ⚙️ Environment

Create `client/.env`:

```env
# Base URL to your API (server exposes routes under /api)
REACT_APP_API_URL=http://localhost:5050/api
```

👉 If deployed, point this to your hosted API (e.g. Render/Heroku):
```
REACT_APP_API_URL=https://your-server.onrender.com/api
```

---

## 📦 Install & Run

```bash
cd client

# install
npm install

# start dev server
npm start   # opens http://localhost:3000

# run tests
npm test
```

> Tailwind config is in `src/styles/globals.css`.  
> shadcn components are aliased as `@/components/ui/*` via `tsconfig.json`.  

---

## 🧭 Routing & Guards

- **Public**: `/`, `/login`, `/signup`  
- **Protected (JWT)**: `/transfer`, `/beneficiaries`, `/transactions`  
- **Admin (role = ADMIN)**: `/admin`  

Guards:  
- `ProtectedRoute` → wraps protected screens; redirects to `/login` if no token.  
- `AdminRoute` → wraps admin screen; redirects to `/` if not admin.  

Auth state (`AuthContext.tsx`):  
- `user` shape: `{ id, fullName, email, accountNumber, role, kycStatus? }`  
- `token` stored in `localStorage` and attached to all requests (`lib/api.ts`).  

---

## 🔗 API Client

Located at `src/lib/api.ts`:  
- `baseURL` = `process.env.REACT_APP_API_URL` (defaults to `http://localhost:5050/api`)  
- Request interceptor adds `Authorization: Bearer <token>` if logged in  
- Errors surfaced to pages → handled with **Sonner** toasts  

---

## 🧩 Pages & Behavior

### `Signup.tsx`
- Validates `fullName`, `email`, `password` (zod)  
- POST `/auth/signup` → sets auth, toast success, navigate `/`  

### `Login.tsx`
- Validates `email`, `password`  
- POST `/auth/login` → sets auth, toast success, navigate `/`  

### `Beneficiaries.tsx`
- Debounced search on name  
- GET `/beneficiaries?q=...`  
- Add/Edit/Delete CRUD  
- Uses shadcn components & skeletons  

### `Transfer.tsx`
- Loads beneficiaries  
- Live FX quote (`GET /fx/quote?from=USD&to=INR&amount=123`)  
- Confirm transfer (`POST /transfers`)  
- Shows Live/Cached indicator & provider info  

### `Transactions.tsx`
- Filters: date, beneficiary search  
- GET `/transfers` (paginated)  
- GET `/transfers/summary` (totals, avg rate)  
- Export CSV/PDF via `/receipts` endpoints  
- Skeletons while loading  

### `AdminDashboard.tsx`
- `GET /admin/users` → user list with counts  
- `GET /admin/transactions` → flagged if USD > $10k  

### `RunKyc.tsx`
- POST `/kyc/check`  
- Toast with result + nav badge update  

---

## 🔐 Auth Lifecycle

1. Signup/Login → `{ user, token }`  
2. Stored in context + `localStorage`  
3. Axios auto-attaches token  
4. Guards redirect unauth/unauthorized users  
5. Logout clears storage & headers  

---

## 🧪 Testing

Configured with Jest + React Testing Library.  

```bash
npm test
```

Example: `src/__tests__/RunKyc.test.tsx`  

---

## 🧾 Scripts

```bash
npm start    # start dev server
npm test     # run client tests
npm run build # build for production
```

---

## 🔌 Server Endpoints Used

Base URL = `REACT_APP_API_URL`  

- **Auth**  
  - `POST /auth/signup`  
  - `POST /auth/login`  

- **Beneficiaries**  
  - `GET /beneficiaries?q=`  
  - `POST /beneficiaries`  
  - `PUT /beneficiaries/:id`  
  - `DELETE /beneficiaries/:id`  

- **FX**  
  - `GET /fx/status`  
  - `GET /fx/quote?from=&to=&amount=`  

- **Transfers**  
  - `POST /transfers`  
  - `GET /transfers`  
  - `GET /transfers/summary`  

- **Admin**  
  - `GET /admin/users`  
  - `GET /admin/transactions`  

- **KYC**  
  - `POST /kyc/check`  

- **Receipts**  
  - `GET /receipts/transactions.csv?from=&to=&q=`  
  - `GET /receipts/transactions/:id.csv`  
  - `GET /receipts/transactions/:id.pdf`  

---
