const Vendors = require("../models/vendorModel");
const Sales = require("../models/saleModel");
const { pool, asyncHandler, badRequest, notFoundErr, toMoney, toPosInt } = require("../utils/helpers");

exports.list = asyncHandler(async (_req, res) => {
  const rows = await Sales.unpaid(); // unpaid/partial sales view
  res.status(200).json(rows);
});

exports.allSales = asyncHandler(async (_req, res) => {
  const rows = await Sales.all();
  res.status(200).json(rows);
});

exports.vendorBalances = asyncHandler(async (_req, res) => {
  const rows = await Vendors.balances();
  res.status(200).json(rows);
});

exports.vendorBalance = asyncHandler(async (req, res) => {
  const row = await Vendors.balanceById(req.params.id);
  if (!row) throw notFoundErr("Vendor not found");
  res.status(200).json(row);
});

// Record a payment against a vendor's outstanding sales (oldest first)
exports.recordPayment = asyncHandler(async (req, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    throw badRequest("Request body must be an object");
  }
  const { vendor_id, amount, payment_method } = req.body;
  if (!vendor_id) throw badRequest("vendor_id is required");
  const vendorId = toPosInt(vendor_id, "vendor_id");
  const payAmt = toMoney(amount, "amount");
  if (payAmt <= 0) throw badRequest("amount must be greater than 0");
  const method = payment_method || "Cash";
  if (!["Cash", "Mobile Money", "Credit"].includes(method)) throw badRequest("Invalid payment_method");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [ven] = await conn.query("SELECT vendor_id FROM vendors WHERE vendor_id=? FOR UPDATE", [vendorId]);
    if (!ven.length) throw notFoundErr("Vendor not found");

    const [sales] = await conn.query(
      "SELECT sale_id, total_amount, paid_amount FROM sales WHERE vendor_id=? AND payment_status IN ('UNPAID','PARTIALLY_PAID') ORDER BY sale_date ASC, sale_id ASC FOR UPDATE",
      [vendorId]
    );
    const balanceCents = sales.reduce(
      (sum, sale) => sum + Math.max(0, Math.round((Number(sale.total_amount) - Number(sale.paid_amount)) * 100)),
      0
    );
    const paymentCents = Math.round(payAmt * 100);
    if (paymentCents > balanceCents) {
      throw badRequest(`Payment amount exceeds outstanding balance of ${(balanceCents / 100).toFixed(2)}`);
    }

    let remaining = paymentCents;
    for (const s of sales) {
      if (remaining <= 0) break;
      const due = Math.max(0, Math.round((Number(s.total_amount) - Number(s.paid_amount)) * 100));
      if (due <= 0) continue;
      const apply = Math.min(due, remaining);
      remaining -= apply;
      const newPaid = Math.round(Number(s.paid_amount) * 100) + apply;
      const newStatus = newPaid >= Math.round(Number(s.total_amount) * 100) ? "PAID" : "PARTIALLY_PAID";
      await conn.query(
        "UPDATE sales SET paid_amount=?, payment_status=?, payment_method=? WHERE sale_id=?",
        [newPaid / 100, newStatus, method, s.sale_id]
      );
    }

    await conn.commit();
    const updated = await Vendors.balanceById(vendorId);
    res.status(200).json({ message: "Payment recorded successfully", balance: updated });
  } catch (e) {
    try { await conn.rollback(); } catch (rollbackError) {
      console.error("Payment transaction rollback failed:", rollbackError);
    }
    throw e;
  } finally {
    conn.release();
  }
});
