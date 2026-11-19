const Sales = require("../models/saleModel");
const { pool, asyncHandler, badRequest, notFoundErr, toPosInt, toMoney, isISODate, calculateTotal, aggregateStockDemand, SIZES } = require("../utils/helpers");

exports.list = asyncHandler(async (_req, res) => {
  const rows = await Sales.all();
  res.status(200).json(rows);
});

exports.get = asyncHandler(async (req, res) => {
  const row = await Sales.findById(req.params.id);
  if (!row) throw notFoundErr("Sale not found");
  res.status(200).json(row);
});

exports.create = asyncHandler(async (req, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    throw badRequest("Request body must be an object");
  }
  const { vendor_id, sale_date, items, payment_status, payment_method, paid_amount } = req.body;
  if (!vendor_id || !sale_date) throw badRequest("vendor_id and sale_date are required");
  const vendorId = toPosInt(vendor_id, "vendor_id");
  if (!isISODate(sale_date)) throw badRequest("sale_date must be a valid date in YYYY-MM-DD format");
  if (!Array.isArray(items) || items.length === 0) throw badRequest("items must be a non-empty array");

  const status = payment_status || "UNPAID";
  if (!["PAID", "PARTIALLY_PAID", "UNPAID"].includes(status)) throw badRequest("Invalid payment_status");
  const method = payment_method || "Cash";
  if (!["Cash", "Mobile Money", "Credit"].includes(method)) throw badRequest("Invalid payment_method");

  const normalized = items.map((it, idx) => {
    if (!it || typeof it !== "object" || Array.isArray(it)) throw badRequest(`Item ${idx + 1} must be an object`);
    if (!it.fruit_id || !it.packaging_size) throw badRequest(`Item ${idx + 1}: fruit_id and packaging_size are required`);
    if (!SIZES.includes(it.packaging_size)) throw badRequest(`Item ${idx + 1}: invalid packaging_size`);
    const fruit_id = toPosInt(it.fruit_id, `items[${idx}].fruit_id`);
    const quantity = toPosInt(it.quantity, `items[${idx}].quantity`);
    const unit_price = toMoney(it.unit_price, `items[${idx}].unit_price`, 99999999.99);
    return { fruit_id, packaging_size: it.packaging_size, quantity, unit_price };
  });

  const total = calculateTotal(normalized, "unit_price");
  let paid = 0;
  if (status === "PAID") paid = total;
  else if (status === "UNPAID") paid = 0;
  else paid = toMoney(paid_amount, "paid_amount");
  if (status === "PARTIALLY_PAID" && (paid <= 0 || paid >= total)) {
    throw badRequest("For PARTIALLY_PAID, paid_amount must be > 0 and < total amount");
  }
  if (paid > total) throw badRequest("paid_amount cannot exceed total amount");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [ven] = await conn.query("SELECT vendor_id FROM vendors WHERE vendor_id=?", [vendorId]);
    if (!ven.length) throw notFoundErr("Vendor not found");

    // Validate the combined quantity for each fruit and size before writing any sale rows.
    for (const it of aggregateStockDemand(normalized)) {
      const [rows] = await conn.query(
        "SELECT st.available_quantity FROM stock st JOIN fruits f ON f.fruit_id=st.fruit_id WHERE st.fruit_id=? AND st.packaging_size=? FOR UPDATE",
        [it.fruit_id, it.packaging_size]
      );
      if (!rows.length) {
        const [fruit] = await conn.query("SELECT fruit_id FROM fruits WHERE fruit_id=?", [it.fruit_id]);
        if (!fruit.length) throw badRequest(`Fruit not found for fruit_id ${it.fruit_id}`);
      }
      const available = rows.length ? Number(rows[0].available_quantity) : 0;
      if (it.quantity > available) {
        throw badRequest(`Insufficient stock for fruit_id ${it.fruit_id} (${it.packaging_size}). Requested ${it.quantity}, available ${available}. Sale rejected.`);
      }
    }

    const [r] = await conn.query(
      "INSERT INTO sales (vendor_id, sale_date, payment_status, payment_method, paid_amount, total_amount) VALUES (?,?,?,?,?,?)",
      [vendorId, sale_date, status, method, paid, total]
    );
    const saleId = r.insertId;

    for (const it of normalized) {
      await conn.query(
        "INSERT INTO sales_details (sale_id, fruit_id, packaging_size, quantity, unit_price) VALUES (?,?,?,?,?)",
        [saleId, it.fruit_id, it.packaging_size, it.quantity, it.unit_price]
      );
      await conn.query(
        "UPDATE stock SET available_quantity = available_quantity - ? WHERE fruit_id=? AND packaging_size=?",
        [it.quantity, it.fruit_id, it.packaging_size]
      );
    }

    await conn.commit();
    const created = await Sales.findById(saleId);
    res.status(201).json({ message: "Sale recorded successfully", sale: created });
  } catch (e) {
    try { await conn.rollback(); } catch (rollbackError) {
      console.error("Sale transaction rollback failed:", rollbackError);
    }
    throw e;
  } finally {
    conn.release();
  }
});

exports.unpaid = asyncHandler(async (_req, res) => {
  const rows = await Sales.unpaid();
  res.status(200).json(rows);
});
