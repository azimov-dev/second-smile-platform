const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const requiredRole = require("../middleware/adminMiddleware");

const serviceController = require("../controllers/serviceController");

/**
 * @swagger
 * tags:
 *   name: Services
 *   description: Dental clinic service management
 */

/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Get all services (filter by category or active status)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: integer
 *         description: Filter services by category ID
 *       - in: query
 *         name: active
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of services
 */

/**
 * @swagger
 * /api/services:
 *   post:
 *     summary: Create a new service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category_id
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *               category_id:
 *                 type: integer
 *               price:
 *                 type: integer
 *               material_cost:
 *                 type: integer
 *               is_active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Service created
 */

/**
 * @swagger
 * /api/services/{id}:
 *   put:
 *     summary: Update a service
 *     tags: [Services]
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
 *     responses:
 *       200:
 *         description: Updated
 */

/**
 * @swagger
 * /api/services/{id}:
 *   delete:
 *     summary: Delete a service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Deleted
 */

router.get(
  "/",
  auth,
  requiredRole(["reception", "doctor", "admin"]),
  serviceController.getAllServices,
);

router.get(
  "/:id",
  auth,
  requiredRole(["reception", "doctor", "admin"]),
  serviceController.getServiceById,
);

router.post(
  "/",
  auth,
  requiredRole(["admin"]),
  serviceController.createService,
);

router.put(
  "/:id",
  auth,
  requiredRole(["admin"]),
  serviceController.updateService,
);

router.delete(
  "/:id",
  auth,
  requiredRole(["admin"]),
  serviceController.deleteService,
);

module.exports = router;
