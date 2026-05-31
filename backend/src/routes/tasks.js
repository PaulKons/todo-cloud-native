const express = require("express");
const Task = require("../models/Task");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

const { publishToQueue } = require("../services/rabbitmq"); //publish to rabbitmq
const { tasksCreatedTotal } = require("../services/metrics");

router.use(requireAuth);

/**
 * GET /api/tasks
 * Optional query filters:
 *   ?completed=true|false
 *   ?priority=low|medium|high
 */
router.get("/", async (req, res) => {
  try {
    const filter = {userId: req.user.userId};

    if (req.query.completed !== undefined) {
      filter.completed = req.query.completed === "true";
    }
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    return res.json(tasks);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * POST /api/tasks
 * Body: { title, description?, priority?, dueAt?, remindAt? }
 */
router.post("/", async (req, res) => {
  try {
    const { title, description, priority, dueAt, remindAt } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const task = await Task.create({
      userId: req.user.userId,   // ✅ link task to logged-in user
      title: title.trim(),
      description: description || "",
      priority,
      dueAt,
      remindAt,
      completed: false,
      notifiedInApp: false,
    });
    try {
      await publishToQueue(process.env.REMINDER_QUEUE || "reminder.jobs", {
        type: "REMINDER_CREATED",
        taskId: task._id.toString(),
        userId: task.user?.toString() || task.userId?.toString() || req.user?._id?.toString(),
        remindAt: task.remindAt || task.reminderAt || task.reminderDateTime,
        dueDate: task.dueDate,
        title: task.title,
        createdAt: new Date().toISOString()
      });

  console.log("Published reminder job:", task._id.toString());
} catch (err) {
  console.error("Failed to publish reminder job:", err.message);
}
    tasksCreatedTotal.inc();
    return res.status(201).json(task);
  } catch (err) {
    return res.status(400).json({ message: "Validation error", error: err.message });
  }
});

/**
 * PATCH /api/tasks/:id
 * Body can include fields like: { completed, title, priority, dueAt, remindAt, notifiedInApp }
 */
router.patch("/:id", async (req, res) => {
  try {
    const { title, description, priority, dueAt, remindAt, completed } = req.body;

    // Build an update object only with allowed fields
    const update = {};

    // ---- Title (optional update) ----
    if (title !== undefined) {
      if (!title || !title.trim()) {
        return res.status(400).json({ message: "Title cannot be empty" });
      }
      update.title = title.trim();
    }

    // ---- Description (optional update) ----
    if (description !== undefined) {
      update.description = description ? description.toString() : "";
    }

    // ---- Priority (optional update) ----
    if (priority !== undefined) {
      update.priority = priority;
    }

    // ---- Completed (optional update) ----
    if (completed !== undefined) {
      update.completed = Boolean(completed);
    }

    // ---- Dates validation (optional update) ----
    const now = new Date();

    if (dueAt !== undefined) {
      if (dueAt === null || dueAt === "") {
        update.dueAt = null; // allow clearing
      } else {
        const due = new Date(dueAt);
        if (Number.isNaN(due.getTime())) {
          return res.status(400).json({ message: "Invalid dueAt date/time" });
        }
        if (due < now) {
          return res.status(400).json({ message: "Due date/time must be in the future" });
        }
        update.dueAt = due;
      }
    }

    if (remindAt !== undefined) {
      if (remindAt === null || remindAt === "") {
        update.remindAt = null; // allow clearing
      } else {
        const remind = new Date(remindAt);
        if (Number.isNaN(remind.getTime())) {
          return res.status(400).json({ message: "Invalid remindAt date/time" });
        }
        if (remind < now) {
          return res.status(400).json({ message: "Remind date/time must be in the future" });
        }
        update.remindAt = remind;
      }
    }

    /**
     * Optional rule: reminder must be before due date.
     * If user edits only one of them, we need the existing values too.
     */
    if (dueAt !== undefined || remindAt !== undefined) {
      const existing = await Task.findOne({
        _id: req.params.id,
        userId: req.user.userId,
      });

      if (!existing) return res.status(404).json({ message: "Task not found" });

      const finalDue = dueAt !== undefined ? update.dueAt : existing.dueAt;
      const finalRemind = remindAt !== undefined ? update.remindAt : existing.remindAt;

      if (finalDue && finalRemind && finalRemind > finalDue) {
        return res
          .status(400)
          .json({ message: "Reminder must be before the due date/time" });
      }
    }

    // Ownership check is inside the query:
    const updated = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: update },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Task not found" });

    return res.json(updated);
  } catch (err) {
    return res.status(400).json({ message: "Update error", error: err.message });
  }
});
/**
 * DELETE /api/tasks/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Task.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.json({ message: "Deleted" });
  } catch (err) {
    return res.status(400).json({ message: "Delete error", error: err.message });
  }
});

module.exports = router;
