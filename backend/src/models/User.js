// backend/src/models/User.js
const mongoose = require("mongoose");

/**
 * User schema
 * - email: used for login (unique)
 * - passwordHash: stores the hashed password (NOT the plain password!)
 *
 * Why "passwordHash" and not "password"?
 * Because we never want to save real passwords in the database.
 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true, // normalize so "A@B.com" becomes "a@b.com"
      unique: true,    // MongoDB will enforce uniqueness (1 user per email)
    },

    passwordHash: {
      type: String,
      required: true,
    },
  
      // role: controls permissions inside the app
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },

  { timestamps: true } // adds createdAt and updatedAt automatically
);

module.exports = mongoose.model("User", userSchema);
