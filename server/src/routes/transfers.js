import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { getFxRate } from "../utils/fx.js";

const prisma = new PrismaClient();
const router = Router();

// ---------- Create (confirm transfer) ----------
const createSchema = z.object({
  beneficiaryId: z.string().uuid(),
  amountFrom: z.number().positive(),
  sourceCurrency: z.string().length(3),
  targetCurrency: z.string().length(3),
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "Invalid input", details: parsed.error.flatten() });

  const { beneficiaryId, amountFrom, sourceCurrency, targetCurrency } =
    parsed.data;
  const userId = req.user.id;

  // ensure beneficiary belongs to this user
  const ben = await prisma.beneficiary.findFirst({
    where: { id: beneficiaryId, userId },
  });
  if (!ben) return res.status(404).json({ error: "Beneficiary not found" });

  // live rate + conversion
  const rate = await getFxRate(sourceCurrency, targetCurrency);
  const amountTo = amountFrom * rate;

  // fee (in source currency)
  const fixedFee = 5;
  const percent = 0.02;
  const fee = fixedFee + amountFrom * percent;

  const tx = await prisma.transaction.create({
    data: {
      userId,
      beneficiaryId,
      amountFrom,
      amountTo,
      sourceCurrency: sourceCurrency.toUpperCase(),
      targetCurrency: targetCurrency.toUpperCase(),
      fxRate: rate,
      fee,
      status: "Completed",
    },
    include: { beneficiary: true },
  });

  res.status(201).json(tx);
});

// ---------- List with filters + pagination ----------
const listSchema = z.object({
  from: z.string().optional(), // ISO date (yyyy-mm-dd)
  to: z.string().optional(), // ISO date
  q: z.string().optional(), // beneficiary name search
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

// GET /api/transfers?from=2025-08-01&to=2025-08-31&q=ali&page=1&pageSize=20
router.get("/", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "Invalid query", details: parsed.error.flatten() });

  const { from, to, q } = parsed.data;
  const page = parsed.data.page ?? 1;
  const pageSize = parsed.data.pageSize ?? 20;

  // Date range (inclusive day)
  let createdAt;
  if (from || to) {
    createdAt = {};
    if (from) createdAt.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) createdAt.lte = new Date(`${to}T23:59:59.999Z`);
  }

  const where = {
    userId,
    ...(createdAt ? { createdAt } : {}),
    ...(q
      ? { beneficiary: { name: { contains: q, mode: "insensitive" } } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { beneficiary: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
});

// ---------- Summary (totals for current filters) ----------
const sumSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
});

// GET /api/transfers/summary?from=...&to=...&q=...
router.get("/summary", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const parsed = sumSchema.safeParse(req.query);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "Invalid query", details: parsed.error.flatten() });

  const { from, to, q } = parsed.data;

  let createdAt;
  if (from || to) {
    createdAt = {};
    if (from) createdAt.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) createdAt.lte = new Date(`${to}T23:59:59.999Z`);
  }

  const where = {
    userId,
    ...(createdAt ? { createdAt } : {}),
    ...(q
      ? { beneficiary: { name: { contains: q, mode: "insensitive" } } }
      : {}),
  };

  const [agg, count] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amountFrom: true, fee: true },
      _avg: { fxRate: true },
      where,
    }),
    prisma.transaction.count({ where }),
  ]);

  const totalSent = agg._sum.amountFrom ?? 0;
  const totalFees = agg._sum.fee ?? 0;
  const totalDebit = totalSent + totalFees;
  const avgRate = agg._avg.fxRate ?? null;

  res.json({ totalSent, totalFees, totalDebit, avgRate, count });
});

export default router;
