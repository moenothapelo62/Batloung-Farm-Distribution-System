const router = require("express").Router();
const c = require("../controllers/reportsController");
router.get("/summary", c.summary);
router.get("/top-fruits", c.topFruits);
router.get("/revenue", c.revenue);
router.get("/top-vendor", c.topVendor);
router.get("/stock-levels", c.stockLevels);
module.exports = router;
