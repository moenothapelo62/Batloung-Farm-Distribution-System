const router = require("express").Router();
const c = require("../controllers/stockController");
router.get("/", c.list);
router.get("/low", c.low);
module.exports = router;
