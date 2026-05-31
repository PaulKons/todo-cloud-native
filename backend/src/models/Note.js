const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
    text: { type: String, required: true, trim: true },
    attachments: [
      {
        originalName: { type: String, required: true },
        objectKey: { type: String, required: true },
        bucket: { type: String, required: true },
        mimeType: { type: String },
        size: { type: Number },
        uploadedAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ["uploaded", "processed", "failed"],
          default: "uploaded",
        },
        processedAt: { type: Date },
        processorMessage: { type: String, trim: true },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Note", noteSchema);
