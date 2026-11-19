const { pool } = require("../config/db");

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const badRequest = (message) => { const e = new Error(message); e.status = 400; return e; };
const notFoundErr = (message) => { const e = new Error(message); e.status = 404; return e; };

const toNum = (v, name) => {
  if ((typeof v !== "number" && typeof v !== "string") || (typeof v === "string" && v.trim() === "")) {
    throw badRequest(`Invalid number for ${name}`);
  }
  const n = Number(v);
  if (!Number.isFinite(n)) throw badRequest(`Invalid number for ${name}`);
  return n;
};
const toPosInt = (v, name) => {
  const n = toNum(v, name);
  if (!Number.isInteger(n) || n <= 0) throw badRequest(`${name} must be a positive integer`);
  return n;
};
const toMoney = (v, name, maximum = 9999999999.99) => {
  const n = toNum(v, name);
  if (n < 0) throw badRequest(`${name} must be >= 0`);
  if (n > maximum) throw badRequest(`${name} exceeds the maximum supported amount`);
  return Math.round(n * 100) / 100;
};

const isISODate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const calculateTotal = (items, priceField) => {
  const cents = items.reduce((sum, item) => sum + item.quantity * Math.round(item[priceField] * 100), 0);
  if (!Number.isSafeInteger(cents) || cents > 999999999999) {
    throw badRequest("Transaction total exceeds the maximum supported amount");
  }
  return cents / 100;
};

const aggregateStockDemand = (items) => {
  const demand = new Map();
  for (const item of items) {
    const key = `${item.fruit_id}:${item.packaging_size}`;
    const current = demand.get(key);
    if (current) current.quantity += item.quantity;
    else demand.set(key, { fruit_id: item.fruit_id, packaging_size: item.packaging_size, quantity: item.quantity });
  }
  return [...demand.values()].sort(
    (a, b) => a.fruit_id - b.fruit_id || SIZES.indexOf(a.packaging_size) - SIZES.indexOf(b.packaging_size)
  );
};

const SIZES = ["small", "medium", "large"];

module.exports = {
  pool,
  asyncHandler,
  badRequest,
  notFoundErr,
  toNum,
  toPosInt,
  toMoney,
  isISODate,
  calculateTotal,
  aggregateStockDemand,
  SIZES,
};
