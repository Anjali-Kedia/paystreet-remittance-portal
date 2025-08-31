// server/src/routes/receipts.js
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import PDFDocument from "pdfkit";

const prisma = new PrismaClient();
const router = Router();

function csvEscape(v) {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ---------- Per-transaction CSV ----------
router.get("/transactions/:id.csv", requireAuth, async (req, res) => {
  const { id } = req.params;
  const t = await prisma.transaction.findFirst({
    where: { id, userId: req.user.id },
    include: { beneficiary: true },
  });
  if (!t) return res.status(404).send("Not found");

  const rows = [
    [
      "Date",
      "Beneficiary",
      "From Amount",
      "From Currency",
      "To Amount",
      "To Currency",
      "FX Rate",
      "Fee",
      "Status",
    ],
    [
      t.createdAt.toISOString(),
      t.beneficiary.name,
      t.amountFrom,
      t.sourceCurrency,
      t.amountTo,
      t.targetCurrency,
      t.fxRate,
      t.fee,
      t.status,
    ],
  ];
  const body = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="receipt-${id}.csv"`,
  );
  res.send(body);
});

// ---------- Per-transaction PDF ----------
router.get("/transactions/:id.pdf", requireAuth, async (req, res) => {
  const { id } = req.params;
  const t = await prisma.transaction.findFirst({
    where: { id, userId: req.user.id },
    include: {
      beneficiary: true,
      user: { select: { fullName: true, email: true, accountNumber: true } },
    },
  });
  if (!t) return res.status(404).send("Not found");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="receipt-${id}.pdf"`,
  );

  const doc = new PDFDocument({ margin: 48 });
  doc.pipe(res);

  // Header
  doc.fontSize(18).text("PayStreet Transfer Receipt", { align: "center" });
  doc.moveDown(0.5);
  doc
    .fontSize(10)
    .fillColor("#666")
    .text(`Receipt ID: ${id}`, { align: "center" });
  doc.moveDown(1.0);
  doc.moveTo(48, doc.y).lineTo(564, doc.y).strokeColor("#ddd").stroke();

  // Account
  doc.moveDown();
  doc.fillColor("#000").fontSize(12).text("Account");
  doc.fontSize(11).fillColor("#333");
  doc.text(`Name: ${t.user.fullName}`);
  doc.text(`Email: ${t.user.email}`);
  doc.text(`Account Number: ${t.user.accountNumber}`);

  // Beneficiary
  doc.moveDown();
  doc.fillColor("#000").fontSize(12).text("Beneficiary");
  doc.fontSize(11).fillColor("#333");
  doc.text(`Name: ${t.beneficiary.name}`);
  doc.text(`Bank Account: ${t.beneficiary.bankAccount}`);
  doc.text(`Country: ${t.beneficiary.country}`);
  doc.text(`Currency: ${t.beneficiary.currency}`);

  // Transaction
  doc.moveDown();
  doc.fillColor("#000").fontSize(12).text("Transaction");
  doc.fontSize(11).fillColor("#333");
  doc.text(`Date: ${t.createdAt.toISOString()}`);
  doc.text(`Status: ${t.status}`);
  doc.text(`From: ${t.amountFrom} ${t.sourceCurrency}`);
  doc.text(`To: ${t.amountTo.toFixed(2)} ${t.targetCurrency}`);
  doc.text(`FX Rate: ${t.fxRate}`);
  doc.text(`Fee: ${t.fee} ${t.sourceCurrency}`);
  doc.text(
    `Total Debit: ${(t.amountFrom + t.fee).toFixed(2)} ${t.sourceCurrency}`,
  );

  doc.moveDown(1.5);
  doc
    .fillColor("#666")
    .fontSize(10)
    .text("Thank you for using PayStreet.", { align: "center" });

  doc.end();
});

// ---------- Bulk CSV (uses same filters as list) ----------
router.get("/transactions.csv", requireAuth, async (req, res) => {
  const { from, to, q } = req.query;

  let createdAt;
  if (from || to) {
    createdAt = {};
    if (from) createdAt.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) createdAt.lte = new Date(`${to}T23:59:59.999Z`);
  }

  const where = {
    userId: req.user.id,
    ...(createdAt ? { createdAt } : {}),
    ...(q
      ? { beneficiary: { name: { contains: String(q), mode: "insensitive" } } }
      : {}),
  };

  const items = await prisma.transaction.findMany({
    where,
    include: { beneficiary: true },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "Date",
    "Beneficiary",
    "From Amount",
    "From Currency",
    "To Amount",
    "To Currency",
    "FX Rate",
    "Fee",
    "Status",
  ];
  const rows = [header].concat(
    items.map((t) => [
      t.createdAt.toISOString(),
      t.beneficiary.name,
      t.amountFrom,
      t.sourceCurrency,
      t.amountTo,
      t.targetCurrency,
      t.fxRate,
      t.fee,
      t.status,
    ]),
  );

  const body = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="transactions.csv"',
  );
  res.send(body);
});

export default router;
