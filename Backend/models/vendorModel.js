const { pool } = require("../config/db");

const Vendors = {
  async all() {
    const [rows] = await pool.query(
      "SELECT vendor_id, vendor_name, phone_number, location, registration_date FROM vendors ORDER BY vendor_id DESC"
    );
    return rows;
  },
  async findById(id) {
    const [rows] = await pool.query(
      "SELECT vendor_id, vendor_name, phone_number, location, registration_date FROM vendors WHERE vendor_id=?",
      [id]
    );
    return rows[0] || null;
  },
  async search(q) {
    const like = `%${q}%`;
    const [rows] = await pool.query(
      "SELECT vendor_id, vendor_name, phone_number, location, registration_date FROM vendors WHERE vendor_name LIKE ? OR phone_number LIKE ? ORDER BY vendor_id DESC",
      [like, like]
    );
    return rows;
  },
  async create(data) {
    const { vendor_name, phone_number, location, registration_date } = data;
    const [r] = await pool.query(
      "INSERT INTO vendors (vendor_name, phone_number, location, registration_date) VALUES (?,?,?,?)",
      [vendor_name, phone_number, location, registration_date]
    );
    return this.findById(r.insertId);
  },
  async update(id, data) {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged = { ...existing, ...data };
    if (merged.registration_date instanceof Date) merged.registration_date = merged.registration_date.toISOString().slice(0, 10);
    await pool.query(
      "UPDATE vendors SET vendor_name=?, phone_number=?, location=?, registration_date=? WHERE vendor_id=?",
      [merged.vendor_name, merged.phone_number, merged.location, merged.registration_date, id]
    );
    return this.findById(id);
  },
  async hasSales(id) {
    const [rows] = await pool.query("SELECT 1 FROM sales WHERE vendor_id=? LIMIT 1", [id]);
    return rows.length > 0;
  },
  async remove(id) {
    const [result] = await pool.query("DELETE FROM vendors WHERE vendor_id=?", [id]);
    return result.affectedRows > 0;
  },
  async balances() {
    const [rows] = await pool.query(
      `SELECT v.vendor_id, v.vendor_name, v.phone_number,
              COALESCE(SUM(s.total_amount),0) AS total_sales,
              COALESCE(SUM(s.paid_amount),0) AS total_paid,
              COALESCE(SUM(s.total_amount - s.paid_amount),0) AS outstanding_balance
       FROM vendors v
       LEFT JOIN sales s ON s.vendor_id = v.vendor_id
       GROUP BY v.vendor_id, v.vendor_name, v.phone_number
       ORDER BY outstanding_balance DESC`
    );
    return rows;
  },
  async balanceById(id) {
    const [rows] = await pool.query(
      `SELECT v.vendor_id, v.vendor_name,
              COALESCE(SUM(s.total_amount),0) AS total_sales,
              COALESCE(SUM(s.paid_amount),0) AS total_paid,
              COALESCE(SUM(s.total_amount - s.paid_amount),0) AS outstanding_balance
       FROM vendors v
       LEFT JOIN sales s ON s.vendor_id = v.vendor_id
       WHERE v.vendor_id=?
       GROUP BY v.vendor_id, v.vendor_name`,
      [id]
    );
    return rows[0] || null;
  },
};
module.exports = Vendors;
