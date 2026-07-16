const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
require("dotenv").config();

exports.getMe = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.register = async (req, res, next) => {
  try {
    const User = req.models.User;
    const { password, full_name, phone, role } = req.body;

    if (!phone || !password) return res.status(400).json({ message: "phone and password required" });

    const existing = await User.findOne({ where: { phone } });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      clinic_id: req.clinicId,
      phone,
      password: hashed,
      full_name: full_name || null,
      role: role || "reception",
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: { id: user.id, phone: user.phone, full_name: user.full_name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const User = req.models.User;
    const { phone, password } = req.body;

    if (!phone || !password) return res.status(400).json({ message: "phone and password required" });

    const user = await User.findOne({ where: { phone } });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, role: user.role, full_name: user.full_name, clinic_id: req.clinicId },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    const { password: _, ...safeUser } = user.toJSON();
    res.json({ success: true, token, user: safeUser });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { User } = require("../models");
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: "currentPassword and newPassword required" });

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return res.status(400).json({ message: "Current password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashed });
    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const User = req.models.User;
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: "phone required" });

    const user = await User.findOne({ where: { phone } });
    if (!user) return res.status(400).json({ message: "User not found" });

    const token = crypto.randomBytes(20).toString("hex");
    const expires = Date.now() + 3600000;
    await user.update({ resetPasswordToken: token, resetPasswordExpires: expires });

    res.json({ success: true, message: "Password reset token generated", token });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { User } = require("../models");
    const { Op } = require("sequelize");
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: "token and password required" });

    const user = await User.findOne({
      where: { resetPasswordToken: token, resetPasswordExpires: { [Op.gt]: Date.now() } },
    });
    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    const hashed = await bcrypt.hash(password, 10);
    await user.update({ password: hashed, resetPasswordToken: null, resetPasswordExpires: null });
    res.json({ success: true, message: "Password has been reset" });
  } catch (err) {
    next(err);
  }
};
