const router = require("express").Router();
const clickController = require("../controllers/clickController");

router.post("/prepare", clickController.prepare);
router.post("/complete", clickController.complete);

module.exports = router;
