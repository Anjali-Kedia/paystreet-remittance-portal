import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { signupSchema, loginSchema } from "../utils/validation.js";
import { hashPassword, verifyPassword, signToken } from "../utils/crypto.js";

const prisma = new PrismaClient();
const router = Router();

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.flatten() });
    }
    const { fullName, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      return res.status(409).json({ error: "Email already in use" });

    const passwordHash = await hashPassword(password);
    const accountNumber = uuidv4();

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        accountNumber /* role defaults to USER */,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        accountNumber: true,
        role: true,
        createdAt: true,
        kycStatus: true,
        kycCheckedAt: true,
      },
    });

    const token = signToken({ sub: user.id, role: user.role }); // role is 'USER' or 'ADMIN'
    return res.status(201).json({ user, token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid input", details: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const publicUser = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      accountNumber: user.accountNumber,
      role: user.role,
      createdAt: user.createdAt,
      kycStatus: user.kycStatus,
      kycCheckedAt: user.kycCheckedAt,
    };
    const token = signToken({ sub: user.id, role: user.role });
    return res.json({ user: publicUser, token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
