const express = require("express");
const User = require("../models/User");
const requireAuth = require("../middleware/requireAuth");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

// First: must be logged in
router.use(requireAuth);

// Second: must be admin
router.use(requireAdmin);

/**
 * GET /api/admin/users
 * Admin-only: list all registered users (emails only)
 */
router.get("/users", async (req, res) => {
  try {
    // Select only safe fields (never passwordHash)
    const users = await User.find().select("email role createdAt").sort({ createdAt: -1 });
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
