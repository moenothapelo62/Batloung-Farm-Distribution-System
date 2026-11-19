const { pool } = require("../config/db");

const Fruits = {
  async all() {
    const [rows] = await pool.query("SELECT fruit_id, fruit_name, description, status FROM fruits ORDER BY fruit_id ASC");
    return rows;
  },
  async findById(id) {
    const [rows] = await pool.query("SELECT fruit_id, fruit_name, description, status FROM fruits WHERE fruit_id=?", [id]);
    return rows[0] || null;
  },
  async create(data) {
    const { fruit_name, description, status } = data;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query(
        "INSERT INTO fruits (fruit_name, description, status) VALUES (?,?,?)",
        [fruit_name, description || null, status || "Available"]
      );
      for (const size of ["small", "medium", "large"]) {
        await conn.query(
          "INSERT INTO stock (fruit_id, packaging_size, available_quantity) VALUES (?,?,0)",
          [result.insertId, size]
        );
      }
      const [rows] = await conn.query(
        "SELECT fruit_id, fruit_name, description, status FROM fruits WHERE fruit_id=?",
        [result.insertId]
      );
      await conn.commit();
      return rows[0];
    } catch (error) {
      try { await conn.rollback(); } catch (rollbackError) {
        console.error("Fruit transaction rollback failed:", rollbackError);
      }
      throw error;
    } finally {
      conn.release();
    }
  },
  async update(id, data) {
    const existing = await this.findById(id);
    if (!existing) return null;
    const merged = { ...existing, ...data };
    await pool.query(
      "UPDATE fruits SET fruit_name=?, description=?, status=? WHERE fruit_id=?",
      [merged.fruit_name, merged.description, merged.status, id]
    );
    return this.findById(id);
  },
  async hasUsage(id) {
    const [p] = await pool.query("SELECT 1 FROM purchase_details WHERE fruit_id=? LIMIT 1", [id]);
    if (p.length) return true;
    const [s] = await pool.query("SELECT 1 FROM sales_details WHERE fruit_id=? LIMIT 1", [id]);
    return s.length > 0;
  },
  async remove(id) {
    // stock has ON DELETE CASCADE via fruit FK; details are RESTRICT, so block if used
    const [r] = await pool.query("DELETE FROM fruits WHERE fruit_id=?", [id]);
    return r.affectedRows > 0;
  },
};
module.exports = Fruits;
