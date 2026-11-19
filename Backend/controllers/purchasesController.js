const Purchases = require("../models/purchaseModel");
const { pool, asyncHandler, badRequest, notFoundErr, toPosInt, toMoney, isISODate, calculateTotal, SIZES } = require("../utils/helpers");

exports.list = asyncHandler(async (_req, res) => {
  const rows = await Purchases.all();
  res.status(200).json(rows);
});

exports.get = asyncHandler(async (req, res) => {
  const row = await Purchases.findById(req.params.id);
  if (!row) throw notFoundErr("Purchase not found");
  res.status(200).json(row);
});

exports.create = asyncHandler(async (req, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    throw badRequest("Request body must be an object");
  }
  const { supplier_id, purchase_date, items } = req.body;
  if (!supplier_id || !purchase_date) throw badRequest("supplier_id and purchase_date are required");
  const supplierId = toPosInt(supplier_id, "supplier_id");
  if (!isISODate(purchase_date)) throw badRequest("purchase_date must be a valid date in YYYY-MM-DD format");
  if (!Array.isArray(items) || items.length === 0) throw badRequest("items must be a non-empty array");

  // validate all items before transaction
  const normalized = items.map((it, idx) => {
    if (!it || typeof it !== "object" || Array.isArray(it)) throw badRequest(`Item ${idx + 1} must be an object`);
    if (!it.fruit_id || !it.packaging_size) throw badRequest(`Item ${idx + 1}: fruit_id and packaging_size are required`);
    if (!SIZES.includes(it.packaging_size)) throw badRequest(`Item ${idx + 1}: invalid packaging_size`);
    const fruit_id = toPosInt(it.fruit_id, `items[${idx}].fruit_id`);
    const quantity = toPosInt(it.quantity, `items[${idx}].quantity`);
    const unit_cost = toMoney(it.unit_cost, `items[${idx}].unit_cost`, 99999999.99);
    return { fruit_id, packaging_size: it.packaging_size, quantity, unit_cost };
  });
  const total = calculateTotal(normalized, "unit_cost");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // verify supplier exists
    const [sup] = await conn.query("SELECT supplier_id FROM suppliers WHERE supplier_id=?", [supplierId]);
    if (!sup.length) throw notFoundErr("Supplier not found");

    const [r] = await conn.query(
      "INSERT INTO purchases (supplier_id, purchase_date, total_amount) VALUES (?,?,?)",
      [supplierId, purchase_date, total]
    );
    const purchaseId = r.insertId;

    for (const it of normalized) {
      const [f] = await conn.query("SELECT fruit_id FROM fruits WHERE fruit_id=?", [it.fruit_id]);
      if (!f.length) throw badRequest(`Fruit not found for fruit_id ${it.fruit_id}`);
      await conn.query(
        "INSERT INTO purchase_details (purchase_id, fruit_id, quantity, unit_cost, packaging_size) VALUES (?,?,?,?,?)",
        [purchaseId, it.fruit_id, it.quantity, it.unit_cost, it.packaging_size]
      );
      // increase stock for specific fruit+packaging (upsert-safe)
      await conn.query(
        `INSERT INTO stock (fruit_id, packaging_size, available_quantity) VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE available_quantity = available_quantity + VALUES(available_quantity)`,
        [it.fruit_id, it.packaging_size, it.quantity]
      );
    }

    await conn.commit();
    const created = await Purchases.findById(purchaseId);
    res.status(201).json({ message: "Purchase recorded successfully", purchase: created });
  } catch (e) {
    try { await conn.rollback(); } catch (rollbackError) {
      console.error("Purchase transaction rollback failed:", rollbackError);
    }
    throw e;
  } finally {
    conn.release();
  }
});
