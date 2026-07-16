const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const requiredRole = require("../middleware/adminMiddleware");
const treatmentController = require("../controllers/treatmentController");

/**
 * @swagger
 * tags:
 *   name: Treatments
 *   description: Dental treatments management (doctor creates, admin views all)
 */

/**
 * @swagger
 * /api/treatments:
 *   get:
 *     summary: Get all treatments (admin & reception only)
 *     tags: [Treatments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by patient name or phone
 *     responses:
 *       200:
 *         description: List of all treatments
 */
router.get(
  "/",
  auth,
  requiredRole(["admin", "reception"]),
  treatmentController.getAllTreatments,
);

/**
 * @swagger
 * /api/treatments/my:
 *   get:
 *     summary: Get treatments of the logged-in doctor
 *     tags: [Treatments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of doctor's own treatments
 */
router.get(
  "/my",
  auth,
  requiredRole(["doctor", "admin", "reception"]),
  treatmentController.getMyTreatments,
);

/**
 * @swagger
 * /api/treatments/my-debts:
 *   get:
 *     summary: Get treatments with remaining debt for the logged-in doctor
 *     tags: [Treatments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of treatments with debt
 */
router.get(
  "/my-debts",
  auth,
  requiredRole(["doctor", "admin", "reception"]),
  treatmentController.getMyDebtTreatments,
);

/**
 * @swagger
 * /api/treatments:
 *   post:
 *     summary: Create a new treatment (usually via appointment/start-treatment flow)
 *     tags: [Treatments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patient_id
 *               - treatment_date
 *               - total_amount
 *             properties:
 *               patient_id:
 *                 type: integer
 *               appointment_id:
 *                 type: integer
 *                 nullable: true
 *               treatment_date:
 *                 type: string
 *                 format: date-time
 *               total_amount:
 *                 type: number
 *               discount_amount:
 *                 type: number
 *                 default: 0
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Treatment created successfully
 */
router.post(
  "/",
  auth,
  requiredRole(["doctor", "admin", "reception"]), // admin can create if needed
  treatmentController.createTreatment,
);

/**
 * @swagger
 * /api/treatments/{id}:
 *   patch:
 *     summary: Update a treatment (only own for doctor, full for admin)
 *     tags: [Treatments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               treatment_date:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *               total_amount:
 *                 type: number
 *               discount_amount:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Treatment updated
 *       403:
 *         description: Forbidden (not your treatment)
 *       404:
 *         description: Treatment not found
 */
router.patch(
  "/:id",
  auth,
  requiredRole(["doctor", "admin", "reception"]), // admin can update any
  treatmentController.updateTreatment,
);

module.exports = router;
