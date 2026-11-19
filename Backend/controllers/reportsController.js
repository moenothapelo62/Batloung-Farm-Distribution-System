const { pool, asyncHandler, badRequest, isISODate } = require("../utils/helpers");

exports.topFruits = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT f.fruit_id, f.fruit_name, SUM(sd.quantity) AS total_boxes_sold
     FROM sales_details sd JOIN fruits f ON f.fruit_id = sd.fruit_id
     GROUP BY f.fruit_id, f.fruit_name
     ORDER BY total_boxes_sold DESC
     LIMIT 5`
  );
  res.status(200).json(rows);
});

exports.revenue = asyncHandler(async (req, res) => {
  const { start, end, start_date, end_date } = req.query;
  const from = start || start_date;
  const to = end || end_date;
  if (!from || !to) throw badRequest("start and end date query parameters are required (YYYY-MM-DD)");
  if (!isISODate(from) || !isISODate(to)) {
    throw badRequest("start and end must be valid dates in YYYY-MM-DD format");
  }
  if (from > to) throw badRequest("start date must be on or before end date");
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(total_amount),0) AS total_revenue, COUNT(*) AS sales_count
     FROM sales WHERE sale_date BETWEEN ? AND ?`,
    [from, to]
  );
  res.status(200).json({ start: from, end: to, ...rows[0] });
});

exports.topVendor = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT v.vendor_id, v.vendor_name, v.phone_number, SUM(sd.quantity) AS total_boxes_purchased
     FROM sales s
     JOIN vendors v ON v.vendor_id = s.vendor_id
     JOIN sales_details sd ON sd.sale_id = s.sale_id
     GROUP BY v.vendor_id, v.vendor_name, v.phone_number
     ORDER BY total_boxes_purchased DESC
     LIMIT 1`
  );
  if (!rows.length) return res.status(200).json({ message: "No sales data available", vendor: null });
  res.status(200).json(rows[0]);
});

exports.stockLevels = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT f.fruit_id, f.fruit_name, st.packaging_size, st.available_quantity
     FROM stock st JOIN fruits f ON f.fruit_id = st.fruit_id
     ORDER BY f.fruit_name, FIELD(st.packaging_size,'small','medium','large')`
  );
  res.status(200).json(rows);
});

exports.summary = asyncHandler(async (_req, res) => {
  const [[{ suppliers }]] = await pool.query("SELECT COUNT(*) AS suppliers FROM suppliers");
  const [[{ fruits }]] = await pool.query("SELECT COUNT(*) AS fruits FROM fruits");
  const [[{ vendors }]] = await pool.query("SELECT COUNT(*) AS vendors FROM vendors");
  const [[sales]] = await pool.query("SELECT COALESCE(SUM(total_amount),0) AS total, COALESCE(SUM(paid_amount),0) AS received, COUNT(*) AS count FROM sales");
  const [[purchases]] = await pool.query("SELECT COALESCE(SUM(total_amount),0) AS total, COUNT(*) AS count FROM purchases");
  const [[stock]] = await pool.query("SELECT COALESCE(SUM(available_quantity),0) AS qty FROM stock");
  const [[low]] = await pool.query("SELECT COUNT(*) AS low FROM stock WHERE available_quantity <= 10");
  res.status(200).json({
    suppliers, fruits, vendors,
    sales_total: Number(sales.total), sales_received: Number(sales.received),
    sales_outstanding: Number(sales.total) - Number(sales.received), sales_count: Number(sales.count),
    purchases_total: Number(purchases.total), purchases_count: Number(purchases.count),
    stock_qty: Number(stock.qty), low_stock_rows: Number(low.low),
  });
});
