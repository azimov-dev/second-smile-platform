const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const requiredRole = require("../middleware/adminMiddleware");
const treatmentPlanController = require("../controllers/treatmentPlanController");

router.get(
  "/",
  auth,
  requiredRole(["doctor", "reception", "admin"]),
  treatmentPlanController.getTreatmentPlans,
);

router.post(
  "/",
  auth,
  requiredRole(["doctor", "reception", "admin"]),
  treatmentPlanController.createTreatmentPlan,
);

router.get(
  "/:id/summary",
  auth,
  requiredRole(["doctor", "reception", "admin"]),
  treatmentPlanController.getTreatmentPlanSummary,
);

module.exports = router;
