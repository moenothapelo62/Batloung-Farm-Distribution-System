function errorHandler(err, _req, res, _next) {
  console.error(err);
  if (err && err.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({ message: "Invalid reference: related record does not exist." });
  }
  if (err && err.code === "ER_ROW_IS_REFERENCED_2") {
    return res.status(400).json({ message: "Cannot delete: record is referenced by other data." });
  }
  if (err && err.code === "ER_DUP_ENTRY") {
    return res.status(400).json({ message: "Duplicate entry: a record with this value already exists." });
  }
  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Internal server error" });
}

function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFound };
