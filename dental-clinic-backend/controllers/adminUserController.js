const bcrypt = require("bcrypt");

const ALLOWED_ROLES = ["admin", "doctor", "reception"];

exports.getUsers = async (req, res) => {
  try {
    const User = req.models.User;
    const users = await User.findAll({
      attributes: ["id", "full_name", "phone", "role"],
      order: [["id", "ASC"]],
    });
    res.json(users);
  } catch (err) {
    console.error("getUsers error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

exports.createUser = async (req, res) => {
  try {
    const User = req.models.User;
    const { full_name, phone, password, role } = req.body;

    if (!full_name || !phone || !password || !role) {
      return res.status(400).json({ message: "full_name, phone, password, role are required" });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existing = await User.findOne({ where: { phone } });
    if (existing) {
      return res.status(409).json({ message: "User with this phone already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      clinic_id: req.clinicId,
      full_name,
      phone,
      password: hashed,
      role,
    });

    const { password: _pw, ...safeUser } = user.toJSON();
    res.status(201).json(safeUser);
  } catch (err) {
    console.error("createUser error:", err);
    res.status(500).json({ message: "Failed to create user" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const User = req.models.User;
    const { id } = req.params;
    const { full_name, phone, role, password } = req.body;

    const user = await User.findOne({ where: { id } });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (role && !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (phone && phone !== user.phone) {
      const exists = await User.findOne({ where: { phone } });
      if (exists) {
        return res.status(409).json({ message: "User with this phone already exists" });
      }
      user.phone = phone;
    }

    if (full_name) user.full_name = full_name;
    if (role) user.role = role;
    if (password && password.trim().length > 0) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();
    const { password: _pw, ...safeUser } = user.toJSON();
    res.json(safeUser);
  } catch (err) {
    console.error("updateUser error:", err);
    res.status(500).json({ message: "Failed to update user" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const User = req.models.User;
    const { id } = req.params;

    const user = await User.findOne({ where: { id } });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (req.user && req.user.id === user.id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    await user.destroy();
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
};
