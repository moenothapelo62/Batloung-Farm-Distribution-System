const assert = require("node:assert/strict");
const test = require("node:test");
const {
  aggregateStockDemand,
  calculateTotal,
  isISODate,
  toMoney,
  toPosInt,
} = require("../utils/helpers");

test("aggregates duplicate sale lines by fruit and package before stock validation", () => {
  assert.deepEqual(
    aggregateStockDemand([
      { fruit_id: 2, packaging_size: "large", quantity: 4 },
      { fruit_id: 1, packaging_size: "small", quantity: 3 },
      { fruit_id: 2, packaging_size: "large", quantity: 5 },
      { fruit_id: 2, packaging_size: "small", quantity: 2 },
    ]),
    [
      { fruit_id: 1, packaging_size: "small", quantity: 3 },
      { fruit_id: 2, packaging_size: "small", quantity: 2 },
      { fruit_id: 2, packaging_size: "large", quantity: 9 },
    ]
  );
});

test("calculates transaction totals in cents", () => {
  assert.equal(
    calculateTotal([
      { quantity: 1, unit_price: 0.1 },
      { quantity: 1, unit_price: 0.2 },
    ], "unit_price"),
    0.3
  );
});

test("accepts only real ISO calendar dates", () => {
  assert.equal(isISODate("2026-11-21"), true);
  assert.equal(isISODate("2026-02-29"), false);
  assert.equal(isISODate("2026-13-01"), false);
  assert.equal(isISODate("21-11-2026"), false);
});

test("rejects blank and malformed numbers in API payloads", () => {
  assert.throws(() => toPosInt("", "quantity"), { status: 400 });
  assert.throws(() => toPosInt(1.5, "quantity"), { status: 400 });
  assert.throws(() => toMoney("", "unit_price"), { status: 400 });
});
