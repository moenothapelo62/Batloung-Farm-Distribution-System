const Stock = require("../models/stockModel");
const { asyncHandler, badRequest } = require("../utils/helpers");

exports.list = asyncHandler(async (_req, res) => {
  const rows = await Stock.all();
  res.status(200).json(rows);
});

exports.low = asyncHandler(async (req, res) => {
  const threshold = req.query.threshold === undefined ? 10 : Number(req.query.threshold);
  if (!Number.isInteger(threshold) || threshold < 0) {
    throw badRequest("threshold must be a non-negative integer");
  }
  const rows = await Stock.low(threshold);
  res.status(200).json(rows);
});
