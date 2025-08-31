import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import fetch from "node-fetch";
import { requireAuth } from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = Router();

/**
 * POST /api/kyc/check
 * Body: { fullName, email, country }
 * Returns: { status, checkedAt }
 *
 * Mock logic:
 * - Calls ReqRes to simulate an external dependency.
 * - Deterministic decision:
 *    - If email includes "admin" => APPROVED
 *    - If country is "US" or "IN" => APPROVED
 *    - If email ends with ".test" => REVIEW
 *    - Otherwise => REJECTED
 */
router.post("/check", requireAuth, async (req, res) => {
  const { fullName, email, country } = req.body || {};
  if (!fullName || !email || !country) {
    return res
      .status(400)
      .json({ error: "fullName, email, and country are required" });
  }

  // hit ReqRes (mock API) just to simulate external IO
  try {
    await fetch("https://reqres.in/api/users/2"); // ignore response; just ensures 200
  } catch {
    // ignore failures — keep KYC deterministic
  }

  const em = String(email).toLowerCase();
  const ctry = String(country).toUpperCase();

  let status = "REJECTED";
  if (em.includes("admin") || ["US", "IN"].includes(ctry)) status = "APPROVED";
  else if (em.endsWith(".test")) status = "REVIEW";

  const now = new Date();
  // persist on user
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { kycStatus: status, kycCheckedAt: now },
    select: { id: true, kycStatus: true, kycCheckedAt: true },
  });

  res.json({ status: user.kycStatus, checkedAt: user.kycCheckedAt });
});

export default router;
