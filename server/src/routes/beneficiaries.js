import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = Router();

const benSchema = z.object({
  name: z.string().min(2),
  bankAccount: z.string().min(4),
  country: z.string().min(2),
  currency: z.string().min(3).max(3), // ISO 4217 (e.g., USD, INR, AED)
});

// List (with optional search by name: ?q=...)
router.get("/", requireAuth, async (req, res) => {
  const qRaw = (req.query.q || "").toString().trim();
  const q = qRaw.length ? qRaw : undefined;
  const userId = req.user.id;

  if (!q) {
    const items = await prisma.beneficiary.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return res.json(items);
  }

  // Strategy: fetch startsWith first (top 10), then contains (next 20) excluding dupes
  const starts = await prisma.beneficiary.findMany({
    where: {
      userId,
      name: { startsWith: q, mode: "insensitive" },
    },
    orderBy: { name: "asc" },
    take: 10,
  });

  const contains = await prisma.beneficiary.findMany({
    where: {
      userId,
      name: { contains: q, mode: "insensitive" },
      // avoid duplicates
      NOT: { id: { in: starts.map((s) => s.id) } },
    },
    orderBy: { name: "asc" },
    take: 20,
  });

  res.json([...starts, ...contains]);
});

// Create
router.post("/", requireAuth, async (req, res) => {
  const parsed = benSchema.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "Invalid input", details: parsed.error.flatten() });

  const userId = req.user.id;
  const data = await prisma.beneficiary.create({
    data: { userId, ...parsed.data },
  });
  res.status(201).json(data);
});

// Update
router.put("/:id", requireAuth, async (req, res) => {
  const parsed = benSchema.partial().safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "Invalid input", details: parsed.error.flatten() });

  const userId = req.user.id;
  const { id } = req.params;

  // ensure ownership
  const existing = await prisma.beneficiary.findFirst({
    where: { id, userId },
  });
  if (!existing) return res.status(404).json({ error: "Not found" });

  const updated = await prisma.beneficiary.update({
    where: { id },
    data: parsed.data,
  });
  res.json(updated);
});

// Delete
router.delete("/:id", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const existing = await prisma.beneficiary.findFirst({
    where: { id, userId },
  });
  if (!existing) return res.status(404).json({ error: "Not found" });

  await prisma.beneficiary.delete({ where: { id } });
  res.status(204).send();
});

export default router;
