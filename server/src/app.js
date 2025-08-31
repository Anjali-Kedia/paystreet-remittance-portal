// server/src/app.js
import "dotenv/config";
import express from "express";
import { PrismaClient } from "@prisma/client";

// Routers
import authRouter from "./routes/auth.js";
import benRouter from "./routes/beneficiaries.js";
import fxRouter from "./routes/fx.js";
import transfersRouter from "./routes/transfers.js";
import adminRouter from "./routes/admin.js";
import kycRouter from "./routes/kyc.js";
import receiptsRouter from "./routes/receipts.js";

export const prisma = new PrismaClient();

export function createApp() {
  const app = express();

  // 🔒 Manual CORS (works well with Express 5 & preflight)
  const allowList = (process.env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((s) => s.trim());

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowList.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    const reqHeaders = req.headers["access-control-request-headers"];
    res.setHeader(
      "Access-Control-Allow-Headers",
      reqHeaders || "Content-Type, Authorization"
    );
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.use(express.json());

  // Health
  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Routes
  app.use("/api/auth", authRouter);
  app.use("/api/beneficiaries", benRouter);
  app.use("/api/fx", fxRouter);
  app.use("/api/transfers", transfersRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/kyc", kycRouter);
  app.use("/api/receipts", receiptsRouter);

  // Error handler
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  });

  return app;
}
