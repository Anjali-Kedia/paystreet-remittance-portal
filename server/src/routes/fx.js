import { Router } from "express";
import { z } from "zod";
import { getFxRate } from "../utils/fx.js";
import { requireAuth } from "../middleware/auth.js";
import { getFxMeta, getFxPairMeta } from "../utils/fx.js";

const router = Router();

const qSchema = z.object({
  from: z.string().length(3),
  to: z.string().length(3),
  amount: z.coerce.number().positive(),
});

// GET /api/fx/quote?from=USD&to=INR&amount=100
router.get("/quote", requireAuth, async (req, res) => {
  const parsed = qSchema.safeParse(req.query);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: "Invalid query", details: parsed.error.flatten() });

  const { from, to, amount } = parsed.data;
  try {
    const rate = await getFxRate(from, to);
    const converted = amount * rate;
    const pairMeta = await getFxPairMeta(from, to);
    const fxMeta = getFxMeta();

    // Mock fees: $5 + 2% of source amount (fee in source currency)
    const fixedFee = 5;
    const percent = 0.02;
    const fee = fixedFee + amount * percent;

    res.json({
      success: true,
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      amount,
      rate,
      result: converted,
      fee, // fee in source currency
      totalDebit: amount + fee,
      meta: {
        provider: fxMeta.provider,
        cached: pairMeta.cached,
        asOfMs: pairMeta.at, // timestamp when this pair was cached
      },
    });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: "FX service unavailable" });
  }
});

router.get("/health", async (_req, res) => {
  try {
    const rate = await getFxRate("USD", "INR");
    res.json({
      ok: true,
      provider: process.env.FX_PROVIDER || "openexchangerates",
      rate,
    });
  } catch (e) {
    res.status(502).json({ ok: false, error: e?.message || "unknown" });
  }
});

router.get("/status", (_req, res) => {
  const meta = getFxMeta();
  res.json({
    ok: true,
    provider: meta.provider,
    cached: meta.latestAgeMs !== null && meta.latestAgeMs < meta.cacheTtlMs,
    cacheAgeMs: meta.latestAgeMs,
    cacheTtlMs: meta.cacheTtlMs,
  });
});

export default router;
