// backend/src/middleware/requireAuth.js
const jwt = require("jsonwebtoken");

/**
 * requireAuth middleware
 * - Reads JWT token from cookie: req.cookies.token
 * - Verifies it using JWT_SECRET
 * - If valid: attaches payload to req.user and continues
 * - If invalid/missing: returns 401 Unauthorized
 */
module.exports = function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ message: "Not logged in" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Attach to request so routes can use it
    //req.user = { userId: payload.userId, email: payload.email };
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Not logged in" });
  }
};
