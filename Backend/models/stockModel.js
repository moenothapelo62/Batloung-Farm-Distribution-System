const { pool } = require("../config/db");

const Stock = {
  async all() {
    const [rows] = await pool.query(
      `SELECT st.stock_id, st.fruit_id, f.fruit_name, st.packaging_size, st.available_quantity
       FROM stock st JOIN fruits f ON f.fruit_id = st.fruit_id
       ORDER BY f.fruit_name, FIELD(st.packaging_size,'small','medium','large')`
    );
    return rows;
  },
  async byFruit(fruitId) {
    const [rows] = await pool.query(
      `SELECT st.stock_id, st.fruit_id, f.fruit_name, st.packaging_size, st.available_quantity
       FROM stock st JOIN fruits f ON f.fruit_id = st.fruit_id
       WHERE st.fruit_id=? ORDER BY FIELD(st.packaging_size,'small','medium','large')`,
      [fruitId]
    );
    return rows;
  },
  async low(threshold = 10) {
    const [rows] = await pool.query(
      `SELECT st.stock_id, st.fruit_id, f.fruit_name, st.packaging_size, st.available_quantity
       FROM stock st JOIN fruits f ON f.fruit_id = st.fruit_id
       WHERE st.available_quantity <= ?
       ORDER BY st.available_quantity ASC, f.fruit_name`,
      [threshold]
    );
    return rows;
  },
  async getQty(fruitId, size) {
    const [rows] = await pool.query(
      "SELECT available_quantity FROM stock WHERE fruit_id=? AND packaging_size=?",
      [fruitId, size]
    );
    return rows[0] ? Number(rows[0].available_quantity) : 0;
  },
};
module.exports = Stock;
