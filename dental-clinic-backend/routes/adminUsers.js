const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const requiredRole = require("../middleware/adminMiddleware");
const { checkDoctorLimit } = require("../middleware/planLimits");
const adminUserController = require("../controllers/adminUserController");

/**
 * @swagger
 * tags:
 *   name: AdminUsers
 *   description: Manage clinic staff (admin only)
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all staff users
 *     tags: [AdminUsers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get(
  "/",
  auth,
  requiredRole(["admin", "reception"]),
  adminUserController.getUsers,
);

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Create a new staff user
 *     tags: [AdminUsers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [full_name, phone, password, role]
 *             properties:
 *               full_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, doctor, reception]
 *     responses:
 *       201:
 *         description: Created
 */
router.post("/", auth, requiredRole(["admin"]), checkDoctorLimit, adminUserController.createUser);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     summary: Update a staff user
 *     tags: [AdminUsers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Updated user
 */
router.put(
  "/:id",
  auth,
  requiredRole(["admin"]),
  adminUserController.updateUser,
);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete a staff user
 *     tags: [AdminUsers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete(
  "/:id",
  auth,
  requiredRole(["admin"]),
  adminUserController.deleteUser,
);

module.exports = router;
