const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const requiredRole = require("../middleware/adminMiddleware");

const treatmentItemController = require("../controllers/treatmentItemController");

// List treatment items for an appointment (used by frontend to preselect services)
router.get(
  "/",
  auth,
  requiredRole(["doctor", "reception", "admin"]),
  treatmentItemController.getTreatmentItems,
);

router.delete(
  "/:id",
  auth,
  requiredRole(["doctor", "reception", "admin"]),
  treatmentItemController.deleteTreatmentItem,
);

module.exports = router;
