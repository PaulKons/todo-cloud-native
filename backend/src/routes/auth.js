// backend/src/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

/**
 * Helper: create a JWT token for a user
 * We put only the minimum info inside: userId + email
 */
function signToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      role: user.role || "user", // include role
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/**
 * Helper: set the token cookie
 * httpOnly: JS cannot read it (more secure)
 * sameSite: helps protect against CSRF
 * secure: true only in production (https)
 */
function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });
}

/**
 * POST /api/auth/register
 * Body: { email, password }
 * Creates a new user and logs them in (sets cookie).
 */
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 chars" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists already
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    // Hash the password (never store plaintext)
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({ email: normalizedEmail, passwordHash });

    // Create token + set cookie (auto login after register)
    const token = signToken(user);
    setAuthCookie(res, token);

    // Return safe user info (never return passwordHash)
    return res.status(201).json({
      user: { id: user._id, email: user.email, role: user.role || "user" },
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Checks credentials, sets cookie.
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !email.trim() || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken(user);
    setAuthCookie(res, token);

    return res.json({
      user: { id: user._id, email: user.email, role: user.role || "user" },
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * POST /api/auth/logout
 * Clears the token cookie.
 */
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  return res.json({ ok: true });
});

/**
 * GET /api/auth/me
 * If logged in (cookie token valid), returns user info.
 * If not logged in, returns 401.
 */
router.get("/me", async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: "Not logged in" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // payload contains { userId, email }
    return res.json({
      user: { id: payload.userId, email: payload.email, role: payload.role || "user" },
    });
  } catch (err) {
    return res.status(401).json({ message: "Not logged in" });
  }
});

module.exports = router;
