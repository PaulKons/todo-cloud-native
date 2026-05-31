const amqp = require("amqplib");

let connection = null;
let channel = null;

async function getChannel(retries = 10, delayMs = 3000) {
  if (channel) return channel;

  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    throw new Error("RABBITMQ_URL is not defined");
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      connection = await amqp.connect(rabbitUrl);
      channel = await connection.createChannel();

      const reminderQueue = process.env.REMINDER_QUEUE || "reminder.jobs";
      const attachmentQueue = process.env.ATTACHMENT_QUEUE || "attachment.uploaded";

      await channel.assertQueue(reminderQueue, { durable: true });
      await channel.assertQueue(attachmentQueue, { durable: true });

      console.log("✅ Connected to RabbitMQ");
      return channel;
    } catch (err) {
      console.error(`❌ RabbitMQ connection attempt ${attempt}/${retries} failed: ${err.message}`);

      if (attempt === retries) {
        throw err;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
async function publishToQueue(queueName, payload) {
  const ch = await getChannel();

  const message = Buffer.from(JSON.stringify(payload));

  return ch.sendToQueue(queueName, message, {
    persistent: true,
    contentType: "application/json"
  });
}

module.exports = {
  getChannel,
  publishToQueue
};