const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const requiredRole = require("../middleware/adminMiddleware");
const doctorScheduleController = require("../controllers/doctorScheduleController");

router.get(
  "/",
  auth,
  requiredRole(["admin", "reception", "doctor"]),
  doctorScheduleController.getSchedules,
);
router.post(
  "/",
  auth,
  requiredRole(["admin", "reception", "doctor"]),
  doctorScheduleController.createSchedule,
);
router.delete(
  "/:id",
  auth,
  requiredRole(["admin", "reception", "doctor"]),
  doctorScheduleController.deleteSchedule,
);

module.exports = router;
