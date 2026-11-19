const { pool } = require("../config/db");

const Purchases = {
  async all() {
    const [rows] = await pool.query(
      `SELECT p.purchase_id, p.supplier_id, s.business_name AS supplier_name, p.purchase_date, p.total_amount
       FROM purchases p JOIN suppliers s ON s.supplier_id = p.supplier_id
       ORDER BY p.purchase_date DESC, p.purchase_id DESC`
    );
    for (const p of rows) {
      const [items] = await pool.query(
        `SELECT pd.purchase_detail_id, pd.fruit_id, f.fruit_name, pd.packaging_size, pd.quantity, pd.unit_cost
         FROM purchase_details pd JOIN fruits f ON f.fruit_id = pd.fruit_id WHERE pd.purchase_id=?`,
        [p.purchase_id]
      );
      p.items = items;
    }
    return rows;
  },
  async findById(id) {
    const [rows] = await pool.query(
      `SELECT p.purchase_id, p.supplier_id, s.business_name AS supplier_name, p.purchase_date, p.total_amount
       FROM purchases p JOIN suppliers s ON s.supplier_id = p.supplier_id WHERE p.purchase_id=?`,
      [id]
    );
    if (!rows[0]) return null;
    const [items] = await pool.query(
      `SELECT pd.purchase_detail_id, pd.fruit_id, f.fruit_name, pd.packaging_size, pd.quantity, pd.unit_cost
       FROM purchase_details pd JOIN fruits f ON f.fruit_id = pd.fruit_id WHERE pd.purchase_id=?`,
      [id]
    );
    rows[0].items = items;
    return rows[0];
  },
};
module.exports = Purchases;
