```md
# PayStreet API (server)

Express + Prisma + PostgreSQL + Redis backend for the PayStreet remittance portal.

## Stack

- Node.js 20+, ESM
- Express 5
- Prisma ORM (PostgreSQL)
- Redis (FX cache)
- JWT (auth)
- Zod (validation)
- Jest + Supertest (tests)
- **FX Provider:** Open Exchange Rates (OXR), cached 15 minutes

Folder layout:
```

server/
prisma/
schema.prisma
src/
middleware/ (auth, admin)
routes/ (auth, beneficiaries, transfers, fx, admin, kyc, receipts)
utils/ (crypto, fx, fx-cache, validation)
app.js       # createApp: mounts routers, CORS, JSON, error handler
index.js     # loads env + starts server (for dev/prod)
tests/
setup-env.js
auth.test.js
beneficiaries.test.js
.env
.env.test
jest.config.mjs
package.json

````

---

## 1) Prerequisites

You can run **with Docker** (recommended), or **without Docker** (install Postgres & Redis locally).

### Option A — Run with Docker (recommended)

**Docker Desktop** or **Rancher Desktop** installed.

From the **repo root** (where `docker-compose.yml` lives):

```bash
docker compose up -d
# Services:
# - PostgreSQL @ localhost:5432  (db: paystreet)
# - Redis       @ localhost:6379
````

> If you don’t have the top-level `docker-compose.yml`, create this in the project root:

```yaml
version: "3.9"
services:
  db:
    image: postgres:16
    container_name: paystreet-pg
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_USER: postgres
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
# Create DB:
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

> Default local ports assumed: Postgres `5432`, Redis `6379`.

---

## 2) Environment variables

Create `.env` in `server/`:

```env
# PostgreSQL (main DB)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/paystreet?schema=public"

# JWT
# Generate a strong secret: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET="REPLACE_WITH_A_LONG_RANDOM_STRING"

# Redis
REDIS_URL="redis://localhost:6379"

# FX Provider — Open Exchange Rates (https://openexchangerates.org/)
FX_PROVIDER="openexchangerates"
OPEN_EXCHANGE_RATES_APP_ID="REPLACE_WITH_YOUR_OXR_APP_ID"

# FX cache TTL (ms). 15 minutes default.
FX_CACHE_TTL_MS=900000

# API port (optional; default 5050)
PORT=5050
```

> **Where to get OXR App ID?**
> Create a free account at Open Exchange Rates → copy your **App ID** into `.env`.

---

## 3) Install & run (development)

```bash
cd server
npm i
npm run prisma:push     # push Prisma schema to DATABASE_URL
npm run dev             # API on http://localhost:5050
```

---

## 4) Testing setup (Jest + Supertest)

Use a **separate** test database to avoid clobbering dev data.

1. Create `.env.test` in `server/`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/paystreet_test?schema=public"
JWT_SECRET="test_secret"
REDIS_URL="redis://localhost:6379"

FX_PROVIDER="openexchangerates"
OPEN_EXCHANGE_RATES_APP_ID="REPLACE_WITH_OXR_APP_ID_OR_SAME"
FX_CACHE_TTL_MS=1000
PORT=0
```

2. Create the DB and push schema:

* If Docker/DB is running, create DB once:

  ```bash
  # Dockerized Postgres:
  docker exec -it paystreet-pg psql -U postgres -c 'CREATE DATABASE paystreet_test;' || true

  # OR local Postgres:
  createdb paystreet_test || true
  ```

* Push schema to the test DB:

  ```bash
  npm run prisma:test:push
  ```

3. Run tests:

```bash
npm test
# or: npm run test:watch
```

### Test scripts (from package.json)

* `prisma:push` – push schema to `.env` DB
* `prisma:test:push` – push schema to `.env.test` DB (force reset)
* `test` – Jest with Node VM modules + Supertest

> Tests run against an **in-memory Express app** (`createApp()`), no network required.
> We clean tables in `beforeAll` and disconnect Prisma in `afterAll`.

---

## 5) API overview

All routes are mounted under `/api`.

### Auth

* `POST /api/auth/signup`
  Body: `{ fullName, email, password }`
  → 201 `{ user, token }` (email unique, accountNumber auto-UUID)
* `POST /api/auth/login`
  Body: `{ email, password }`
  → 200 `{ user, token }`

### Beneficiaries (JWT required)

* `GET /api/beneficiaries?q=ali`
* `POST /api/beneficiaries` `{ name, bankAccount, country, currency }`
* `PUT /api/beneficiaries/:id`
* `DELETE /api/beneficiaries/:id`

### FX (JWT required; OXR-backed)

* `GET /api/fx/status` → `{ ok, provider, cached, cacheAgeMs, cacheTtlMs }`
* `GET /api/fx/quote?from=USD&to=INR&amount=100`
  → `{ success, from, to, amount, rate, result, fee, totalDebit, meta }`

  * **Rates cached 15m** in Redis.

### Transfers (JWT required)

* `POST /api/transfers`
  Body: `{ beneficiaryId, amountFrom, sourceCurrency, targetCurrency }`
  → stores `fxRate`, `amountTo`, `fee` (fixed + %), `status: Completed`
* `GET /api/transfers?from=YYYY-MM-DD&to=YYYY-MM-DD&q=beneficiary&page=1&pageSize=20`
* `GET /api/transfers/summary?from=...&to=...&q=...`
  → `{ totalSent, totalFees, totalDebit, avgRate, count }`

### Admin (JWT + admin role)

* `GET /api/admin/users` → users with counts (`_count.beneficiaries`, `_count.transactions`)
* `GET /api/admin/transactions?from=...&to=...&q=...&page=1&pageSize=50`
  → each item includes `{ usdEquivalent, highRisk }` (threshold `$10,000`)

### KYC (JWT required; mock)

* `POST /api/kyc/check`
  Body: `{ fullName, email, country }`
  → `{ status: 'APPROVED'|'REVIEW'|'REJECTED', details }`
  (Hits ReqRes as a mock and returns deterministic pseudo-logic.)

### Receipts / Export (JWT required)

* `GET /api/receipts/transactions.csv?from=...&to=...&q=...`
  → CSV export for authenticated user (applies filters)
* `GET /api/receipts/transactions/:id.csv`
* `GET /api/receipts/transactions/:id.pdf`
  → Single transaction receipt as CSV/PDF (simple server-generated PDF)

---

## 6) CORS

CORS is implemented **manually** in `src/app.js` (Express 5-safe).
Default allowed origin: `http://localhost:3000` (React client).
If you deploy, update that origin accordingly.

---

## 10) Scripts reference

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

