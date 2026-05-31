require("dotenv").config();

const express = require("express");
const app = express();

const PORT = process.env.PORT || 7000;

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "notification-function",
    timestamp: new Date().toISOString()
  });
});

app.post("/notify", (req, res) => {
  const { taskId, userId, title, remindAt } = req.body;

  if (!taskId || !userId || !title) {
    return res.status(400).json({
      status: "error",
      message: "taskId, userId and title are required"
    });
  }

  const notification = {
    taskId,
    userId,
    title,
    remindAt,
    notificationText: `Reminder: ${title}`,
    generatedAt: new Date().toISOString()
  };

  console.log("🔔 Notification generated:", notification);

  res.status(200).json({
    status: "created",
    notification
  });
});

app.listen(PORT, () => {
  console.log(`✅ Notification function running on port ${PORT}`);
});
