const router = require("express").Router();
const c = require("../controllers/paymentsController");
router.get("/", c.allSales);
router.get("/outstanding", c.list);
router.get("/balances", c.vendorBalances);
router.get("/balances/:id", c.vendorBalance);
router.post("/", c.recordPayment);
module.exports = router;
