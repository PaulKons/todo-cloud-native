const express = require("express");
const Task = require("../models/Task");
const requireAuth = require("../middleware/requireAuth");
const router = express.Router();

// All notification endpoints require login
router.use(requireAuth);


// GET reminders that should be shown now
router.get("/", async (req, res) => {
  try {
    const now = new Date();

    const tasks = await Task.find({
      userId: req.user.userId,          // ✅ only this user's tasks
      remindAt: { $ne: null, $lte: now },
      completed: false,
      notifiedInApp: false,
    }).sort({ remindAt: 1 });

    return res.json(tasks);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});
// Mark reminder as seen
router.post("/:id/ack", async (req, res) => {
  try {
    const updated = await Task.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.userId },  // ✅ ownership check
        { $set: { notifiedInApp: true, completed: true } },
        { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Task not found" });
    return res.json(updated);
  } catch (err) {
    return res.status(400).json({ message: "Update error", error: err.message });
  }
});

module.exports = router;


