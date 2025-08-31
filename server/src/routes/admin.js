import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { z } from "zod";
import { getFxRate } from "../utils/fx.js";

const prisma = new PrismaClient();
const router = Router();

// GET /api/admin/users  -> list users (basic info + counts)
router.get("/users", requireAuth, requireAdmin, async (_req, res) => {
  const usersRaw = await prisma.user.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        // 👇 use your actual relation field names on User
        select: {
          Beneficiary: true,
          Transaction: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  // Normalize to the shape the UI expects
  const users = usersRaw.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    _count: {
      beneficiaries: u._count?.Beneficiary ?? 0,
      transactions: u._count?.Transaction ?? 0,
    },
  }));

  res.json(users);
});

// GET /api/admin/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD&q=ali&page=1&pageSize=50
const listSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(), // beneficiary or user name/email (basic)
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});

router.get("/transactions", requireAuth, requireAdmin, async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "Invalid query", details: parsed.error.flatten() });

  const { from, to, q } = parsed.data;
  const page = parsed.data.page ?? 1;
  const pageSize = parsed.data.pageSize ?? 50;

  let createdAt;
  if (from || to) {
    createdAt = {};
    if (from) createdAt.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) createdAt.lte = new Date(`${to}T23:59:59.999Z`);
  }

  const where = {
    ...(createdAt ? { createdAt } : {}),
    ...(q
      ? {
          OR: [
            { beneficiary: { name: { contains: q, mode: "insensitive" } } },
            { user: { fullName: { contains: q, mode: "insensitive" } } },
            { user: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        beneficiary: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ]);

  // Compute USD equivalent (High-Risk > $10,000 equivalent)
  // If source is USD, use amountFrom; else convert with live cached FX to USD.
  const enriched = await Promise.all(
    items.map(async (t) => {
      let usdEq =
        t.sourceCurrency.toUpperCase() === "USD"
          ? t.amountFrom
          : t.amountFrom * (await getFxRate(t.sourceCurrency, "USD"));

      const highRisk = usdEq > 10000;
      return { ...t, usdEquivalent: usdEq, highRisk };
    }),
  );

  res.json({
    items: enriched,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
});

export default router;
