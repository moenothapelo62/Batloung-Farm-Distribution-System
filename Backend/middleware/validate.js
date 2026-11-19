function requireFields(fields) {
  return (req, res, next) => {
    for (const f of fields) {
      const v = req.body[f];
      if (v === undefined || v === null || v === "") {
        return res.status(400).json({ message: `Missing required field: ${f}` });
      }
    }
    next();
  };
}

function isPositiveNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
}

module.exports = { requireFields, isPositiveNumber };
