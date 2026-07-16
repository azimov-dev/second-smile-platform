const jwt = require("jsonwebtoken");
require("dotenv").config();
const { SuperAdmin } = require("../models");

async function superAdminAuth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.SUPER_ADMIN_JWT_SECRET || "super-admin-secret");

    const admin = await SuperAdmin.findByPk(decoded.id);
    if (!admin || !admin.is_active) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.superAdmin = {
      id: admin.id,
      username: admin.username,
      full_name: admin.full_name,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = superAdminAuth;
