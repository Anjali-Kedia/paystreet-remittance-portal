# PayStreet API (Server)

**Express + Prisma + PostgreSQL + Redis** backend for the PayStreet remittance portal.

---

## 🛠 Tech Stack

- Node.js 20+ (ESM)
- Express 5
- Prisma ORM (PostgreSQL)
- Redis (FX cache)
- JWT (auth)
- Zod (validation)
- Jest + Supertest (tests)
- **FX Provider**: Open Exchange Rates (OXR), cached 15 minutes

---

## 📂 Folder Layout

```
server/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── middleware/   # auth, admin
│   ├── routes/       # auth, beneficiaries, transfers, fx, admin, kyc, receipts
│   ├── utils/        # crypto, fx, fx-cache, validation
│   ├── app.js        # createApp: mounts routers, CORS, JSON, error handler
│   └── index.js      # loads env + starts server (dev/prod)
├── tests/
│   ├── setup-env.js
│   ├── auth.test.js
│   └── beneficiaries.test.js
├── .env
├── .env.test
├── jest.config.mjs
└── package.json
```

---

## 1️⃣ Prerequisites

You can run **with Docker** (recommended), or **without Docker** (install Postgres & Redis locally).

### Option A — Run with Docker (recommended)

Requires **Docker Desktop** or **Rancher Desktop**.

From the **repo root** (where `docker-compose.yml` lives):

```bash
docker compose up -d
# Services:
# - PostgreSQL @ localhost:5432  (db: paystreet)
# - Redis       @ localhost:6379
```

If you don’t have the file, create `docker-compose.yml` in the project root:

```yaml
version: "3.9"
services:
  db:
    image: postgres:16
    container_name: paystreet-pg
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: paystreet
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
  redis:
    image: redis:7
    container_name: paystreet-redis
    ports:
      - "6379:6379"
volumes:
  pgdata:
```

### Option B — Run without Docker

#### macOS (Homebrew)

```bash
brew install postgresql@16 redis
brew services start postgresql@16
brew services start redis
createdb paystreet
```

#### Ubuntu/Debian

```bash
sudo apt update
sudo apt install postgresql redis-server
sudo systemctl enable --now postgresql
sudo systemctl enable --now redis-server
sudo -u postgres createdb paystreet
```

_Default local ports assumed: Postgres `5432`, Redis `6379`._

---

## 2️⃣ Environment Variables

Create `.env` in `server/`:

```env
# PostgreSQL (main DB)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/paystreet?schema=public"

# JWT
JWT_SECRET="REPLACE_WITH_A_LONG_RANDOM_STRING"

# Redis
REDIS_URL="redis://localhost:6379"

# FX Provider — Open Exchange Rates
FX_PROVIDER="openexchangerates"
OPEN_EXCHANGE_RATES_APP_ID="REPLACE_WITH_YOUR_OXR_APP_ID"

# FX cache TTL (ms). Default: 15 minutes
FX_CACHE_TTL_MS=900000

# API port (optional; default 5050)
PORT=5050
```

👉 **Get your OXR App ID**: create a free account at [Open Exchange Rates](https://openexchangerates.org/).

---

## 3️⃣ Install & Run (Development)

```bash
cd server
npm install
npm run prisma:push   # push schema to DATABASE_URL
npm run dev           # API on http://localhost:5050
```

---

## 4️⃣ Testing Setup (Jest + Supertest)

Use a **separate test DB** to avoid overwriting dev data.

### 1. Create `.env.test`

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/paystreet_test?schema=public"
JWT_SECRET="test_secret"
REDIS_URL="redis://localhost:6379"

FX_PROVIDER="openexchangerates"
OPEN_EXCHANGE_RATES_APP_ID="REPLACE_WITH_OXR_APP_ID_OR_SAME"
FX_CACHE_TTL_MS=1000
PORT=0
```

### 2. Create test DB & push schema

```bash
# Dockerized Postgres
docker exec -it paystreet-pg psql -U postgres -c 'CREATE DATABASE paystreet_test;' || true

# OR local Postgres
createdb paystreet_test || true

# Push schema
npm run prisma:test:push
```

### 3. Run tests

```bash
npm test
# or watch mode:
npm run test:watch
```

**Test scripts (`package.json`)**  
- `prisma:push` → push schema to `.env` DB  
- `prisma:test:push` → push schema to `.env.test` DB (force reset)  
- `test` → Jest + Supertest  

> Tests run against an **in-memory Express app** (`createApp()`), no network required.  
> DB tables cleaned in `beforeAll`, Prisma disconnected in `afterAll`.

---

## 5️⃣ API Overview

All routes are under `/api`.

### Auth
- `POST /api/auth/signup` → `{ user, token }`
- `POST /api/auth/login` → `{ user, token }`

### Beneficiaries (JWT)
- `GET /api/beneficiaries?q=ali`
- `POST /api/beneficiaries` → `{ name, bankAccount, country, currency }`
- `PUT /api/beneficiaries/:id`
- `DELETE /api/beneficiaries/:id`

### FX (JWT, OXR-backed)
- `GET /api/fx/status`
- `GET /api/fx/quote?from=USD&to=INR&amount=100`

### Transfers (JWT)
- `POST /api/transfers` → stores `fxRate`, `amountTo`, `fee`, `status`
- `GET /api/transfers?from=...&to=...&q=...`
- `GET /api/transfers/summary?from=...&to=...`

### Admin (JWT + admin)
- `GET /api/admin/users`
- `GET /api/admin/transactions?from=...&to=...`

### KYC (JWT, mock ReqRes)
- `POST /api/kyc/check`

### Receipts / Export (JWT)
- `GET /api/receipts/transactions.csv?from=...&to=...`
- `GET /api/receipts/transactions/:id.csv`
- `GET /api/receipts/transactions/:id.pdf`

---

## 🔧 Scripts Reference

```json
{
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js",
    "prisma:push": "prisma db push",
    "prisma:test:push": "dotenv -e .env.test -- prisma db push --force-reset",
    "test": "cross-env NODE_OPTIONS=--experimental-vm-modules jest --runInBand",
    "test:watch": "cross-env NODE_OPTIONS=--experimental-vm-modules jest --watch"
  }
}
```

---
