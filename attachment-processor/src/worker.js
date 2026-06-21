require("dotenv").config();

const amqp = require("amqplib");
const mongoose = require("mongoose");

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://todo:todo@rabbitmq:5672";

const ATTACHMENT_QUEUE =
  process.env.ATTACHMENT_QUEUE || "attachment.uploaded";

const MONGODB_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const noteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    attachments: [
      {
        originalName: String,
        objectKey: String,
        bucket: String,
        mimeType: String,
        size: Number,
        uploadedAt: Date,
        status: String,
        processedAt: Date,
        processorMessage: String,
      },
    ],
  },
  { strict: false }
);

const Note = mongoose.model("Note", noteSchema);

async function connectRabbitMQ(retries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const connection = await amqp.connect(RABBITMQ_URL);
      const channel = await connection.createChannel();

      await channel.assertQueue(ATTACHMENT_QUEUE, { durable: true });

      console.log("--> Attachment processor connected to RabbitMQ");

      return { connection, channel };
    } catch (err) {
      console.error(
        `--> RabbitMQ connection attempt ${attempt}/${retries} failed: ${err.message}`
      );

      if (attempt === retries) {
        throw err;
      }

      await sleep(delayMs);
    }
  }
}

async function start() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI or MONGO_URI is not defined");
  }

  await mongoose.connect(MONGODB_URI);
  console.log("✅ Attachment processor connected to MongoDB Atlas");

  const { channel } = await connectRabbitMQ();

  console.log(`--> Listening on queue: ${ATTACHMENT_QUEUE}`);

  channel.consume(
    ATTACHMENT_QUEUE,
    async (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString());

        console.log(
          "📨 Received attachment event:",
          JSON.stringify(payload, null, 2)
        );

        const note = await Note.findById(payload.noteId);

        if (!note) {
          throw new Error(`Note not found: ${payload.noteId}`);
        }

        if (note.userId?.toString() !== payload.userId) {
          throw new Error(`User mismatch for note: ${payload.noteId}`);
        }

        const attachment = note.attachments.find(
          (a) => a.objectKey === payload.objectKey
        );

        if (!attachment) {
          throw new Error(
            `Attachment not found for objectKey: ${payload.objectKey}`
          );
        }

        if (attachment.status === "processed") {
              console.log(`Attachment already processed. Skipping: ${payload.objectKey}`);
              channel.ack(msg);
              return;
            }

            attachment.status = "processed";
            attachment.processedAt = new Date();
            attachment.processorMessage =
              "Attachment metadata processed successfully";

            await note.save();

            console.log(`✅ Attachment processed: ${payload.objectKey}`);

        channel.ack(msg);
      } catch (err) {
        console.error("❌ Attachment processing failed:", err.message);

        // Do not requeue failed messages for now.
        // Later we can add a dead-letter queue.
        channel.nack(msg, false, false);
      }
    },
    { noAck: false }
  );
}

start().catch((err) => {
  console.error("❌ Attachment processor failed:", err.message);
  process.exit(1);
});