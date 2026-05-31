const express = require("express");
const Note = require("../models/Note");
const requireAuth = require("../middleware/requireAuth");
const router = express.Router();
const multer = require("multer");
const { minioClient, bucketName } = require("../services/minioClient");
const { publishToQueue } = require("../services/rabbitmq");
const crypto = require("crypto");
const { attachmentsUploadedTotal } = require("../services/metrics");

router.use(requireAuth);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});
// GET all notes
router.get("/", async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// POST create note
router.post("/", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Text is required" });
    }

    const note = await Note.create({
        userId: req.user.userId,
        text,
    });
    res.status(201).json(note);
  } catch (err) {
    res.status(400).json({ message: "Validation error", error: err.message });
  }
});
// PATCH update note (edit)
router.patch("/:id", async (req, res) => {
  try {
    const { text } = req.body;

    // If client didn't send a text field at all
    if (text === undefined) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    // Reject empty updates
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Text cannot be empty" });
    }

    // ✅ Ownership enforced: must match both _id and userId
    const updated = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: { text: text.trim() } },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Note not found" });

    return res.json(updated);
  } catch (err) {
    return res.status(400).json({ message: "Update error", error: err.message });
  }
});

// DELETE note (secure per-user)
router.delete("/:id", async (req, res) => {
  try {
    // ✅ Ownership enforced: must match both _id and userId
    const deleted = await Note.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!deleted) return res.status(404).json({ message: "Note not found" });

    return res.json({ ok: true });
  } catch (err) {
    return res.status(400).json({ message: "Delete error", error: err.message });
  }
});

/**
 * POST /api/notes/:id/attachments
 * Upload attachment for a note.
 */
router.post("/:id/attachments", upload.single("file"), async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    const safeOriginalName = req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const uniqueId = crypto.randomUUID();

    const objectKey = `users/${req.user.userId}/notes/${note._id}/${uniqueId}-${safeOriginalName}`;

    await minioClient.putObject(
      bucketName,
      objectKey,
      req.file.buffer,
      req.file.size,
      {
        "Content-Type": req.file.mimetype,
      }
    );

    const attachment = {
      originalName: req.file.originalname,
      objectKey,
      bucket: bucketName,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date(),
      status: "uploaded",
    };

    note.attachments.push(attachment);
    await note.save();

    try {
      await publishToQueue(process.env.ATTACHMENT_QUEUE || "attachment.uploaded", {
        type: "ATTACHMENT_UPLOADED",
        noteId: note._id.toString(),
        userId: req.user.userId,
        bucket: bucketName,
        objectKey,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedAt: new Date().toISOString(),
      });

      console.log("📩 Published attachment uploaded event:", objectKey);
    } catch (err) {
      console.error("Failed to publish attachment event:", err.message);
    }
    attachmentsUploadedTotal.inc();
    return res.status(201).json({
      message: "Attachment uploaded",
      attachment,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Attachment upload failed",
      error: err.message,
    });
  }
});

/**
 * GET /api/notes/:noteId/attachments/:attachmentId/url
 * Generate temporary download URL for an attachment.
 */
router.get("/:noteId/attachments/:attachmentId/url", async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.noteId,
      userId: req.user.userId,
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    const attachment = note.attachments.id(req.params.attachmentId);

    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    const url = await minioClient.presignedGetObject(
      attachment.bucket,
      attachment.objectKey,
      60 * 5 // 5 minutes
    );

    return res.json({
      url,
      expiresInSeconds: 300,
      attachment: {
        id: attachment._id,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        size: attachment.size,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Could not generate download URL",
      error: err.message,
    });
  }
});

/**
 * DELETE /api/notes/:noteId/attachments/:attachmentId
 * Delete attachment from MinIO and remove metadata from MongoDB.
 */
router.delete("/:noteId/attachments/:attachmentId", async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.noteId,
      userId: req.user.userId,
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    const attachment = note.attachments.id(req.params.attachmentId);

    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    await minioClient.removeObject(attachment.bucket, attachment.objectKey);

    note.attachments.pull(req.params.attachmentId);
    await note.save();

    return res.json({
      message: "Attachment deleted",
      attachmentId: req.params.attachmentId,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Could not delete attachment",
      error: err.message,
    });
  }
});

module.exports = router;
