// routes/payments.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const requiredRole = require("../middleware/adminMiddleware");
const paymentController = require("../controllers/paymentController");

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payments, payment history, and debt management
 */

/**
 * @swagger
 * /api/payments/my:
 *   get:
 *     summary: Get payment history of logged-in doctor
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (inclusive)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (inclusive)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Payment type (cash, card, etc.)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by patient name or phone
 *     responses:
 *       200:
 *         description: List of payments
 */
router.get(
  "/my",
  auth,
  requiredRole(["doctor", "admin", "reception"]),
  paymentController.getMyPayments,
);

/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Create a payment for a treatment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - treatment_id
 *               - amount
 *               - payment_type
 *             properties:
 *               treatment_id:
 *                 type: integer
 *               amount:
 *                 type: integer
 *               payment_type:
 *                 type: string
 *                 example: cash
 *               paid_at:
 *                 type: string
 *                 format: date-time
 *                 description: If missing, current time will be used
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment created
 *       400:
 *         description: Validation error
 *       404:
 *         description: Treatment not found
 *       403:
 *         description: Forbidden
 */
router.post(
  "/",
  auth,
  requiredRole(["doctor", "admin", "reception"]),
  paymentController.createPayment,
);

/**
 * @swagger
 * /api/payments/debts:
 *   get:
 *     summary: Get list of treatments with outstanding debt
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of treatments with debt > 0
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   treatment_id:
 *                     type: integer
 *                   patient_name:
 *                     type: string
 *                   patient_phone:
 *                     type: string
 *                   doctor_name:
 *                     type: string
 *                   appointment_date:
 *                     type: string
 *                     format: date
 *                   total_amount:
 *                     type: integer
 *                   paid_amount:
 *                     type: integer
 *                   debt_amount:
 *                     type: integer
 */
router.get(
  "/debts",
  auth,
  requiredRole(["doctor", "admin", "reception"]),
  paymentController.getDebts,
);

module.exports = router;
