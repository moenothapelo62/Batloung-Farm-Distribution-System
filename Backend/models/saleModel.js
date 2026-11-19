const { pool } = require("../config/db");

const Sales = {
  async all() {
    const [rows] = await pool.query(
      `SELECT s.sale_id, s.vendor_id, v.vendor_name, s.sale_date, s.payment_status, s.payment_method, s.paid_amount, s.total_amount
       FROM sales s JOIN vendors v ON v.vendor_id = s.vendor_id
       ORDER BY s.sale_date DESC, s.sale_id DESC`
    );
    for (const sale of rows) {
      const [items] = await pool.query(
        `SELECT sd.sales_detail_id, sd.fruit_id, f.fruit_name, sd.packaging_size, sd.quantity, sd.unit_price
         FROM sales_details sd JOIN fruits f ON f.fruit_id = sd.fruit_id WHERE sd.sale_id=?`,
        [sale.sale_id]
      );
      sale.items = items;
      sale.outstanding_balance = Number(sale.total_amount) - Number(sale.paid_amount);
    }
    return rows;
  },
  async findById(id) {
    const [rows] = await pool.query(
      `SELECT s.sale_id, s.vendor_id, v.vendor_name, s.sale_date, s.payment_status, s.payment_method, s.paid_amount, s.total_amount
       FROM sales s JOIN vendors v ON v.vendor_id = s.vendor_id WHERE s.sale_id=?`,
      [id]
    );
    if (!rows[0]) return null;
    const [items] = await pool.query(
      `SELECT sd.sales_detail_id, sd.fruit_id, f.fruit_name, sd.packaging_size, sd.quantity, sd.unit_price
       FROM sales_details sd JOIN fruits f ON f.fruit_id = sd.fruit_id WHERE sd.sale_id=?`,
      [id]
    );
    rows[0].items = items;
    rows[0].outstanding_balance = Number(rows[0].total_amount) - Number(rows[0].paid_amount);
    return rows[0];
  },
  async unpaid() {
    const [rows] = await pool.query(
      `SELECT s.sale_id, s.vendor_id, v.vendor_name, s.sale_date, s.payment_status, s.payment_method, s.paid_amount, s.total_amount,
              (s.total_amount - s.paid_amount) AS outstanding_balance
       FROM sales s JOIN vendors v ON v.vendor_id = s.vendor_id
       WHERE s.payment_status IN ('UNPAID','PARTIALLY_PAID')
       ORDER BY s.sale_date DESC`
    );
    return rows;
  },
};
module.exports = Sales;
