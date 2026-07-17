const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const requiredRole = require("../middleware/adminMiddleware");
const { checkPatientLimit } = require("../middleware/planLimits");
const patientController = require("../controllers/patientController");

/**
 * @swagger
 * /api/patients:
 *   get:
 *     summary: Get all patients
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of patients
 */

/**
 * @swagger
 * /api/patients:
 *   post:
 *     summary: Create a new patient
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name: { type: string }
 *               last_name: { type: string }
 *               phone: { type: string }
 *               birth_date: { type: string }
 *               address: { type: string }
 *               medical_history: { type: string, description: "Patient's medical history or disease notes" }
 *     responses:
 *       201:
 *         description: Patient created
 */

/**
 * @swagger
 * /api/patients/{id}:
 *   get:
 *     summary: Get patient by ID
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Single patient
 *       404:
 *         description: Not found
 */

/**
 * @swagger
 * /api/patients/{id}:
 *   put:
 *     summary: Update a patient
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name: { type: string }
 *               last_name: { type: string }
 *               phone: { type: string }
 *               birth_date: { type: string }
 *               address: { type: string }
 *               medical_history: { type: string, description: "Patient's medical history or disease notes" }
 *     responses:
 *       200:
 *         description: Updated successfully
 */

/**
 * @swagger
 * /api/patients/{id}:
 *   delete:
 *     summary: Delete a patient
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Deleted
 */

router.post(
  "/",
  auth,
  requiredRole(["reception", "admin", "doctor"]),
  checkPatientLimit,
  patientController.createPatient,
);
router.get(
  "/",
  auth,
  requiredRole(["reception", "doctor", "admin"]),
  patientController.getPatients,
);
router.get(
  "/:id",
  auth,
  requiredRole(["reception", "doctor", "admin"]),
  patientController.getPatientById,
);
router.put(
  "/:id",
  auth,
  requiredRole(["reception", "admin", "doctor"]),
  patientController.updatePatient,
);
router.delete(
  "/:id",
  auth,
  requiredRole(["admin", "reception", "doctor"]),
  patientController.deletePatient,
);

module.exports = router;
