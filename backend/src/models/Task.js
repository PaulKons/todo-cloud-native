const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  
    },
  
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000 },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    dueAt: { type: Date },
    remindAt: { type: Date },
    completed: { type: Boolean, default: false },
    notifiedInApp: { type: Boolean, default: false },
    notificationGenerated: { type: Boolean, default: false },
    notificationGeneratedAt: { type: Date },
    notificationText: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
