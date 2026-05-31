const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const tasksRouter = require("./routes/tasks");
const authRouter = require("./routes/auth");
const adminRouter = require("./routes/admin");

const {
  metricsMiddleware,
  metricsHandler,
} = require("./services/metrics");

const app = express();
const notificationsRouter = require("./routes/notifications");
const notesRouter = require("./routes/notes");
const { getChannel } = require("./services/rabbitmq");

const PORT = process.env.PORT || 5000;

const { ensureBucket } = require("./services/minioClient"); //load Minio on startup

app.use(express.json());
app.use(metricsMiddleware);

// Parse cookies attached to requests (needed for JWT-in-cookie auth)
app.use(cookieParser());
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);

// Allow requests from the frontend dev server (Vite)
// credentials:true is REQUIRED when sending cookies
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN, // e.g. http://localhost:5173
    credentials: true,
  })
);
app.use("/api/notes", notesRouter);

app.use("/api/notifications", notificationsRouter);

//Disable caching
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
// API routes
app.use("/api/tasks", tasksRouter);
// test route
app.get("/", (req, res) => {
  res.send("Backend is running!");
});
getChannel().catch((err) => {
  console.error("❌ RabbitMQ connection failed:", err.message);
});

ensureBucket().catch((err) => {
  console.error("❌ MinIO bucket check failed:", err.message);
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas");
    app.get("/metrics", metricsHandler);
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "todo-backend",
    timestamp: new Date().toISOString()
  });
});
