const Suppliers = require("../models/supplierModel");
const { asyncHandler, badRequest, notFoundErr, toPosInt } = require("../utils/helpers");

const PROVINCES = ['Gauteng','Free State','KwaZulu-Natal','Western Cape','Eastern Cape','Limpopo','Mpumalanga','North West'];

exports.list = asyncHandler(async (_req, res) => {
  const rows = await Suppliers.all();
  res.status(200).json(rows);
});

exports.get = asyncHandler(async (req, res) => {
  const supplierId = toPosInt(req.params.id, "supplier_id");
  const row = await Suppliers.findById(supplierId);
  if (!row) throw notFoundErr("Supplier not found");
  res.status(200).json(row);
});

exports.create = asyncHandler(async (req, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    throw badRequest("Request body must be an object");
  }
  const { business_name, contact_person, phone, province, address } = req.body;
  if (!business_name || !contact_person || !phone || !province || !address) {
    throw badRequest("Missing required fields: business_name, contact_person, phone, province, address");
  }
  if ([business_name, contact_person, phone, address].some((value) => typeof value !== "string" || !value.trim())) {
    throw badRequest("business_name, contact_person, phone and address must be non-empty strings");
  }
  if (!PROVINCES.includes(province)) throw badRequest("Invalid province");
  const row = await Suppliers.create({
    business_name: business_name.trim(),
    contact_person: contact_person.trim(),
    phone: phone.trim(),
    province,
    address: address.trim(),
  });
  res.status(201).json({ message: "Supplier registered successfully", supplier: row });
});

exports.update = asyncHandler(async (req, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    throw badRequest("Request body must be an object");
  }
  const supplierId = toPosInt(req.params.id, "supplier_id");
  const existing = await Suppliers.findById(supplierId);
  if (!existing) throw notFoundErr("Supplier not found");
  const updates = {};
  for (const field of ["business_name", "contact_person", "phone", "address"]) {
    if (req.body[field] === undefined) continue;
    if (typeof req.body[field] !== "string" || !req.body[field].trim()) {
      throw badRequest(`${field} must be a non-empty string`);
    }
    updates[field] = req.body[field].trim();
  }
  if (req.body.province !== undefined) {
    if (!PROVINCES.includes(req.body.province)) throw badRequest("Invalid province");
    updates.province = req.body.province;
  }
  if (Object.keys(updates).length === 0) throw badRequest("Provide at least one valid supplier field to update");
  const row = await Suppliers.update(supplierId, updates);
  res.status(200).json({ message: "Supplier updated successfully", supplier: row });
});

exports.remove = asyncHandler(async (req, res) => {
  const supplierId = toPosInt(req.params.id, "supplier_id");
  const existing = await Suppliers.findById(supplierId);
  if (!existing) throw notFoundErr("Supplier not found");
  if (await Suppliers.hasPurchases(supplierId)) {
    throw badRequest("Cannot delete supplier with existing purchase records (business constraint).");
  }
  await Suppliers.remove(supplierId);
  res.status(200).json({ message: "Supplier deleted successfully" });
});
