# PayStreet Remittance Portal 💸

A **full-stack cross-border payments platform** demo built with  
**React + Tailwind + shadcn/ui** (client) and **Express + Prisma + PostgreSQL + Redis** (server).  

It includes **user onboarding, beneficiary management, money transfers with live FX rates, transaction dashboards, admin view, KYC checks, and receipts (CSV/PDF).**

---

## ✨ Features

- **User Onboarding** – Signup/Login with JWT, auto account number  
- **Beneficiaries** – Add/Edit/Delete with per-user scope  
- **Transfers** – Source → Target currency with live FX (Open Exchange Rates)  
- **Fees** – Fixed + % mock fee included in each transaction  
- **FX Caching** – Redis-backed, 15-min TTL  
- **Dashboard** – Transactions list + summaries + filters + CSV export  
- **Admin Panel** – View all users, flag high-risk transactions (> $10k USD)  
- **KYC (Bonus)** – Mock KYC check API (ReqRes)  
- **Receipts (Bonus)** – Download per-transaction CSV/PDF  
- **Tests (Bonus)** – Jest + Supertest for key API routes & React components  

---

## 🛠 Tech Stack

### Frontend (client)
- React 18 + TypeScript  
- TailwindCSS + shadcn/ui (Sonner for toasts)  
- React Router DOM  
- React Hook Form + Zod  

### Backend (server)
- Node.js + Express 5  
- Prisma ORM + PostgreSQL  
- Redis (FX cache)  
- JWT auth  
- Jest + Supertest  

### 3rd-party APIs
- **[Open Exchange Rates](https://openexchangerates.org/)** → live FX rates  
- **ReqRes** → mock KYC service  

---

## 🚀 Quickstart

### 1. Clone & install
```bash
git clone https://github.com/your-username/paystreet-remittance-portal.git
cd paystreet-remittance-portal
```

### 2. Start backend
```bash
cd server
cp .env.example .env   # fill in Postgres, Redis, OXR App ID
docker compose up -d   # starts postgres + redis
npm install
npm run prisma:push
npm run dev
```
Backend runs at: [http://localhost:5050](http://localhost:5050)

### 3. Start frontend
```bash
cd client
npm install
npm start
```
Frontend runs at: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Testing

### Server tests (Jest + Supertest)
```bash
cd server
npm run prisma:test:push
npm test
```

### Client tests (React Testing Library)
```bash
cd client
npm test
```

---

## 📂 Documentation

- [Server README](./server/README.md) – API routes, Docker, testing, Prisma setup  
- [Client README](./client/README.md) – React pages/components overview  

---

Made with ❤️ for the **PayStreet Full-Stack Assignment**.
