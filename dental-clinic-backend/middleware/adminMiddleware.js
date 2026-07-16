// middleware/adminMiddleware.js
function requiredRole(allowedRoles) {
  // Agar string bo‘lsa, massivga o‘giramiz
  if (typeof allowedRoles === "string") {
    allowedRoles = [allowedRoles];
  }

  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Agar allowedRoles ko‘rsatilmagan bo‘lsa, avtomatik ruxsat beramiz
      if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
        return next();
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden: insufficient role" });
      }

      next();
    } catch (error) {
      console.error("Role check error:", error);
      res.status(500).json({ message: "Server error during role check" });
    }
  };
}

module.exports = requiredRole;
