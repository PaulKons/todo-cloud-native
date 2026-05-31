// Only allow admins to access certain routes.
// Assumes requireAuth already ran and set req.user (from JWT).
module.exports = function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};
