const jwt = require("jsonwebtoken");
require("dotenv").config();
const { User } = require("../models");

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Validate that the token's clinic_id matches the current request's clinic
    if (req.clinicId && decoded.clinic_id && decoded.clinic_id !== req.clinicId) {
      return res.status(401).json({ message: "Token does not belong to this clinic" });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(401).json({ message: "User not found" });

    // Verify user belongs to this clinic
    if (req.clinicId && user.clinic_id !== req.clinicId) {
      return res.status(401).json({ message: "User does not belong to this clinic" });
    }

    req.user = {
      id: user.id,
      role: user.role,
      full_name: user.full_name,
      phone: user.phone,
      clinic_id: user.clinic_id,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = auth;
