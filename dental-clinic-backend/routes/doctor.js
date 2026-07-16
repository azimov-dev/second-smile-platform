// routes/doctor.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const requiredRole = require("../middleware/adminMiddleware");
const doctorController = require("../controllers/doctorController");

/**
 * @swagger
 * tags:
 *   name: Doctor
 *   description: Doctor dashboard & calendar
 */

/**
 * @swagger
 * /api/doctor/dashboard:
 *   get:
 *     summary: Get dashboard statistics for the logged-in doctor
 *     tags: [Doctor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
router.get(
  "/dashboard",
  auth,
  requiredRole(["doctor", "admin", "reception"]),
  doctorController.getDashboardStats,
);

/**
 * @swagger
 * /api/doctor/calendar:
 *   get:
 *     summary: Get appointment count per day for doctor
 *     tags: [Doctor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: from
 *         in: query
 *         required: true
 *         schema: { type: string, format: date }
 *       - name: to
 *         in: query
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: List of days with appointment counts
 */
router.get(
  "/calendar",
  auth,
  requiredRole(["doctor", "admin", "reception"]),
  doctorController.getCalendarSummary,
);

/**
 * @swagger
 * /api/doctor/calendar/{date}/appointments:
 *   get:
 *     summary: Get list of appointments for selected day (drawer)
 *     tags: [Doctor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: date
 *         in: path
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Appointments of that date
 */
router.get(
  "/calendar/:date/appointments",
  auth,
  requiredRole(["doctor", "admin", "reception"]),
  doctorController.getDayAppointments,
);

module.exports = router;
