// routes/serviceCategories.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/serviceCategoryController");
const auth = require("../middleware/authMiddleware");

// you can wrap with auth & role check if needed
router.get("/", auth, controller.getAllCategories);
router.get("/:id", auth, controller.getCategoryById);
router.post("/", auth, controller.createCategory);
router.put("/:id", auth, controller.updateCategory);
router.delete("/:id", auth, controller.deleteCategory);

module.exports = router;
