require("dotenv").config();
const amqp = require("amqplib");
const mongoose = require("mongoose");
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://todo:todo@rabbitmq:5672";
const REMINDER_QUEUE = process.env.REMINDER_QUEUE || "reminder.jobs";
const NOTIFICATION_FUNCTION_URL =
  process.env.NOTIFICATION_FUNCTION_URL || "http://notification-function:7000/notify";
const MONGODB_URI = process.env.MONGODB_URI;

const taskSchema = new mongoose.Schema(
  {
    notificationGenerated: Boolean,
    notificationGeneratedAt: Date,
    notificationText: String
  },
  { strict: false }
);

const Task = mongoose.model("Task", taskSchema);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const http = require("http");
const https = require("https");

function callNotificationFunction(payload) {
  return new Promise((resolve, reject) => {
    const targetUrl = new URL(process.env.NOTIFICATION_FUNCTION_URL);
    const body = JSON.stringify(payload);

    const headers = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    };

    if (process.env.NOTIFICATION_FUNCTION_HOST_HEADER) {
      headers.Host = process.env.NOTIFICATION_FUNCTION_HOST_HEADER;
    }

    const client = targetUrl.protocol === "https:" ? https : http;

    const req = client.request(
      {
        method: "POST",
        hostname: targetUrl.hostname,
        port: targetUrl.port || 80,
        path: targetUrl.pathname,
        headers,
      },
      (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(
              new Error(
                `Notification function failed with status ${res.statusCode}: ${data}`
              )
            );
          }

          try {
            resolve(JSON.parse(data));
          } catch {
            resolve({ status: "ok", raw: data });
          }
        });
      }
    );

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function startWorker() {
  let connection;
  let channel;

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      if (!MONGODB_URI) {
        throw new Error("MONGODB_URI is not defined");
      }

      await mongoose.connect(MONGODB_URI);
      console.log("✅ Reminder worker connected to MongoDB Atlas");

      connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();

      await channel.assertQueue(REMINDER_QUEUE, { durable: true });

      console.log("✅ Reminder worker connected to RabbitMQ");
      console.log(` Listening on queue: ${REMINDER_QUEUE}`);
      console.log("🚀 Worker is ready and waiting for messages...");  
      channel.consume(
        REMINDER_QUEUE,
        async (msg) => {
          if (!msg) return;

          try {
            const payload = JSON.parse(msg.content.toString());

            console.log("📨 Received reminder job:", JSON.stringify(payload, null, 2));

            const remindAt = payload.remindAt ? new Date(payload.remindAt) : null;
            const now = new Date();

            if (remindAt && remindAt > now) {
            const delayMs = remindAt.getTime() - now.getTime();

            console.log(
                `⏳ Reminder ${payload.taskId} is not due yet. Waiting ${Math.round(delayMs / 1000)} seconds...`
            );

            await sleep(delayMs);
            }

console.log(`🔔 Reminder is due now: ${payload.taskId} - ${payload.title}`);

const result = await callNotificationFunction(payload, 3);

await Task.findByIdAndUpdate(payload.taskId, {
  $set: {
    notificationGenerated: true,
    notificationGeneratedAt: new Date(),
    notificationText:
      result.notification?.notificationText || `Reminder: ${payload.title}`
  }
});

console.log(`Task updated with generated notification: ${payload.taskId}`);

console.log("✅ Notification function response:", JSON.stringify(result, null, 2));

channel.ack(msg);
            
          } catch (err) {
            console.error("❌ Failed to process message:", err.message);
            channel.nack(msg, false, false);
          }
        },
        { noAck: false }
      );

      return;
    } catch (err) {
      console.error(`❌ Worker RabbitMQ connection attempt ${attempt}/10 failed: ${err.message}`);
      await sleep(3000);
    }
  }

  console.error("❌ Worker failed to connect to RabbitMQ after 10 attempts");
  process.exit(1);
}

startWorker();