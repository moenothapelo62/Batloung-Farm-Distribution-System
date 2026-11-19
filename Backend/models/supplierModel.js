const { pool } = require("../config/db");

const Suppliers = {
  async all() {
    const [rows] = await pool.query("SELECT supplier_id, business_name, contact_person, phone, province, address FROM suppliers ORDER BY supplier_id DESC");
    return rows;
  },
  async findById(id) {
    const [rows] = await pool.query("SELECT supplier_id, business_name, contact_person, phone, province, address FROM suppliers WHERE supplier_id = ?", [id]);
    return rows[0] || null;
  },
  async create(data) {
    const { business_name, contact_person, phone, province, address } = data;
    const [r] = await pool.query(
      "INSERT INTO suppliers (business_name, contact_person, phone, province, address) VALUES (?,?,?,?,?)",
      [business_name, contact_person, phone, province, address]
    );
    return this.findById(r.insertId);
  },
  async update(id, data) {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged = { ...existing, ...data };
    await pool.query(
      "UPDATE suppliers SET business_name=?, contact_person=?, phone=?, province=?, address=? WHERE supplier_id=?",
      [merged.business_name, merged.contact_person, merged.phone, merged.province, merged.address, id]
    );
    return this.findById(id);
  },
  async hasPurchases(id) {
    const [rows] = await pool.query("SELECT 1 FROM purchases WHERE supplier_id=? LIMIT 1", [id]);
    return rows.length > 0;
  },
  async remove(id) {
    const [r] = await pool.query("DELETE FROM suppliers WHERE supplier_id=?", [id]);
    return r.affectedRows > 0;
  },
};
module.exports = Suppliers;
