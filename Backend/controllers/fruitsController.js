const Fruits = require("../models/fruitModel");
const Stock = require("../models/stockModel");
const { asyncHandler, badRequest, notFoundErr, toPosInt } = require("../utils/helpers");

const VALID_STATUS = ["Available", "Unavailable", "Seasonal"];
const MAX_FRUIT_NAME_LENGTH = 50;

exports.list = asyncHandler(async (_req, res) => {
  const rows = await Fruits.all();
  res.status(200).json(rows);
});

exports.get = asyncHandler(async (req, res) => {
  const fruitId = toPosInt(req.params.id, "fruit_id");
  const row = await Fruits.findById(fruitId);
  if (!row) throw notFoundErr("Fruit not found");
  res.status(200).json(row);
});

exports.create = asyncHandler(async (req, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    throw badRequest("Request body must be an object");
  }
  const { fruit_name, description, status } = req.body;
  if (typeof fruit_name !== "string" || !fruit_name.trim()) throw badRequest("fruit_name is required");
  const fruitName = fruit_name.trim();
  if (fruitName.length > MAX_FRUIT_NAME_LENGTH) throw badRequest(`fruit_name must be ${MAX_FRUIT_NAME_LENGTH} characters or fewer`);
  if (status && !VALID_STATUS.includes(status)) throw badRequest("Invalid status");
  if (description !== undefined && description !== null && typeof description !== "string") {
    throw badRequest("description must be a string");
  }
  try {
    const row = await Fruits.create({ fruit_name: fruitName, description: description?.trim() || null, status });
    res.status(201).json({ message: "Fruit registered successfully", fruit: row });
  } catch (e) {
    if (e && e.code === "ER_DUP_ENTRY") throw badRequest("Fruit type already exists");
    throw e;
  }
});

exports.update = asyncHandler(async (req, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    throw badRequest("Request body must be an object");
  }
  const fruitId = toPosInt(req.params.id, "fruit_id");
  const existing = await Fruits.findById(fruitId);
  if (!existing) throw notFoundErr("Fruit not found");
  const updates = {};
  if (req.body.fruit_name !== undefined) {
    if (typeof req.body.fruit_name !== "string" || !req.body.fruit_name.trim()) throw badRequest("fruit_name must be a non-empty string");
    const fruitName = req.body.fruit_name.trim();
    if (fruitName.length > MAX_FRUIT_NAME_LENGTH) throw badRequest(`fruit_name must be ${MAX_FRUIT_NAME_LENGTH} characters or fewer`);
    updates.fruit_name = fruitName;
  }
  if (req.body.status !== undefined) {
    if (!VALID_STATUS.includes(req.body.status)) throw badRequest("Invalid status");
    updates.status = req.body.status;
  }
  if (req.body.description !== undefined) {
    if (req.body.description !== null && typeof req.body.description !== "string") {
      throw badRequest("description must be a string");
    }
    updates.description = req.body.description?.trim() || null;
  }
  if (Object.keys(updates).length === 0) throw badRequest("Provide at least one valid fruit field to update");
  try {
    const row = await Fruits.update(fruitId, updates);
    res.status(200).json({ message: "Fruit updated successfully", fruit: row });
  } catch (e) {
    if (e && e.code === "ER_DUP_ENTRY") throw badRequest("Fruit type already exists");
    throw e;
  }
});

exports.remove = asyncHandler(async (req, res) => {
  const fruitId = toPosInt(req.params.id, "fruit_id");
  const existing = await Fruits.findById(fruitId);
  if (!existing) throw notFoundErr("Fruit not found");
  if (await Fruits.hasUsage(fruitId)) {
    throw badRequest("Cannot delete fruit with existing purchase/sale records (business constraint). Remove related records first if data reset is required.");
  }
  await Fruits.remove(fruitId);
  res.status(200).json({ message: "Fruit deleted successfully" });
});

exports.stock = asyncHandler(async (req, res) => {
  const fruitId = req.params.id ? toPosInt(req.params.id, "fruit_id") : null;
  const rows = fruitId ? await Stock.byFruit(fruitId) : await Stock.all();
  res.status(200).json(rows);
});

exports.lowStock = asyncHandler(async (req, res) => {
  const threshold = req.query.threshold === undefined ? 10 : Number(req.query.threshold);
  if (!Number.isInteger(threshold) || threshold < 0) {
    throw badRequest("threshold must be a non-negative integer");
  }
  const rows = await Stock.low(threshold);
  res.status(200).json(rows);
});
