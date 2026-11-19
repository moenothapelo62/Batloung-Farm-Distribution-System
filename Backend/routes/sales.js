const router = require("express").Router();
const c = require("../controllers/salesController");
router.post("/", c.create);
router.get("/", c.list);
router.get("/unpaid", c.unpaid);
router.get("/:id", c.get);
module.exports = router;
