const Vendors = require("../models/vendorModel");
const { asyncHandler, badRequest, notFoundErr, isISODate, toPosInt } = require("../utils/helpers");

exports.list = asyncHandler(async (req, res) => {
  const { search, q } = req.query;
  const term = search || q;
  const rows = term ? await Vendors.search(term) : await Vendors.all();
  res.status(200).json(rows);
});

exports.get = asyncHandler(async (req, res) => {
  const vendorId = toPosInt(req.params.id, "vendor_id");
  const row = await Vendors.findById(vendorId);
  if (!row) throw notFoundErr("Vendor not found");
  res.status(200).json(row);
});

exports.create = asyncHandler(async (req, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    throw badRequest("Request body must be an object");
  }
  const { vendor_name, phone_number, location, registration_date } = req.body;
  if (!vendor_name || !phone_number || !location || !registration_date) {
    throw badRequest("Missing required fields: vendor_name, phone_number, location, registration_date");
  }
  if ([vendor_name, phone_number, location].some((value) => typeof value !== "string" || !value.trim())) {
    throw badRequest("vendor_name, phone_number and location must be non-empty strings");
  }
  if (!isISODate(registration_date)) throw badRequest("registration_date must be a valid date in YYYY-MM-DD format");
  const row = await Vendors.create({
    vendor_name: vendor_name.trim(),
    phone_number: phone_number.trim(),
    location: location.trim(),
    registration_date,
  });
  res.status(201).json({ message: "Vendor registered successfully", vendor: row });
});

exports.update = asyncHandler(async (req, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    throw badRequest("Request body must be an object");
  }
  const vendorId = toPosInt(req.params.id, "vendor_id");
  const existing = await Vendors.findById(vendorId);
  if (!existing) throw notFoundErr("Vendor not found");
  const allowedFields = ["vendor_name", "phone_number", "location"];
  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] === undefined) continue;
    if (typeof req.body[field] !== "string" || !req.body[field].trim()) {
      throw badRequest(`${field} must be a non-empty string`);
    }
    updates[field] = req.body[field].trim();
  }
  if (req.body.registration_date !== undefined) {
    if (!isISODate(req.body.registration_date)) {
      throw badRequest("registration_date must be a valid date in YYYY-MM-DD format");
    }
    updates.registration_date = req.body.registration_date;
  }
  if (Object.keys(updates).length === 0) throw badRequest("Provide at least one valid vendor field to update");
  const row = await Vendors.update(vendorId, updates);
  res.status(200).json({ message: "Vendor updated successfully", vendor: row });
});

exports.remove = asyncHandler(async (req, res) => {
  const vendorId = toPosInt(req.params.id, "vendor_id");
  const existing = await Vendors.findById(vendorId);
  if (!existing) throw notFoundErr("Vendor not found");
  if (await Vendors.hasSales(vendorId)) {
    throw badRequest("Cannot delete vendor with existing sales records (business constraint).");
  }
  await Vendors.remove(vendorId);
  res.status(200).json({ message: "Vendor deleted successfully" });
});

exports.balances = asyncHandler(async (_req, res) => {
  const rows = await Vendors.balances();
  res.status(200).json(rows);
});

exports.balance = asyncHandler(async (req, res) => {
  const vendorId = toPosInt(req.params.id, "vendor_id");
  const row = await Vendors.balanceById(vendorId);
  if (!row) throw notFoundErr("Vendor not found");
  res.status(200).json(row);
});
