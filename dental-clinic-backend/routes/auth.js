const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and get JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login
 *       401:
 *         description: Invalid credentials
 */

/**
 * @swagger
 * /api/auth/getme:
 *   get:
 *     summary: Get profile of authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User data returned
 *       401:
 *         description: Unauthorized
 */

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/getme", authMiddleware, authController.getMe);
// Password reset endpoints
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
// Change password endpoint (requires authentication)
router.post("/change-password", authMiddleware, authController.changePassword);

module.exports = router;
