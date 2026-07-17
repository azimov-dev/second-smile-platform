const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const requiredRole = require("../middleware/adminMiddleware"); // assuming this accepts roles array
const { checkAppointmentLimit } = require("../middleware/planLimits");
const appointmentController = require("../controllers/appointmentController");

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     summary: Get all appointments (filtered by date/status if provided)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of appointments
 */
router.get(
  "/",
  auth,
  requiredRole(["reception", "doctor", "admin"]),
  appointmentController.getAppointments,
);

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Create a new appointment (reception/admin only)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/",
  auth,
  requiredRole(["reception", "admin", "doctor"]),
  checkAppointmentLimit,
  appointmentController.createAppointment,
);

/**
 * @swagger
 * /api/appointments/queue:
 *   get:
 *     summary: Get doctor's current queue (today or specific date)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/queue",
  auth,
  requiredRole(["doctor", "admin", "reception"]),
  appointmentController.getMyQueue,
);

/**
 * @swagger
 * /api/appointments/{id}:
 *   get:
 *     summary: Get single appointment by ID
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:id",
  auth,
  requiredRole(["reception", "doctor", "admin"]),
  appointmentController.getAppointmentById,
);

/**
 * @swagger
 * /api/appointments/{id}/start-treatment:
 *   post:
 *     summary: Start treatment for an appointment (add services → create Treatment)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     description: Doctor starts treatment and adds performed services
 */
router.post(
  "/:id/start-treatment",
  auth,
  requiredRole(["doctor", "admin"]),
  appointmentController.startTreatment,
);

router.post(
  "/:id/add-services",
  auth,
  requiredRole(["doctor", "admin"]),
  appointmentController.addServices,
);

router.put(
  "/:id/services",
  auth,
  requiredRole(["doctor", "reception", "admin"]),
  appointmentController.syncServices,
);

router.patch(
  "/:id",
  auth,
  requiredRole(["doctor", "reception", "admin"]),
  appointmentController.updateAppointment,
);

/**
 * @swagger
 * /api/appointments/{id}/status:
 *   patch:
 *     summary: Update appointment status (e.g. cancel)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  "/:id/status",
  auth,
  requiredRole(["doctor", "reception", "admin"]),
  appointmentController.updateStatus,
);

router.patch(
  "/:id/notes",
  auth,
  requiredRole(["doctor", "reception", "admin"]),
  appointmentController.updateAppointmentNotes,
);

router.delete(
  "/:id",
  auth,
  requiredRole(["doctor", "admin", "reception"]),
  appointmentController.deleteAppointment,
);

module.exports = router;
