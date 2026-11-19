const router = require("express").Router();
const c = require("../controllers/purchasesController");
router.post("/", c.create);
router.get("/", c.list);
router.get("/:id", c.get);
module.exports = router;
