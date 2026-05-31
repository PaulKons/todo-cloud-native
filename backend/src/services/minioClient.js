const Minio = require("minio");

const bucketName = process.env.MINIO_BUCKET || "note-attachments";

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "minio",
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

async function ensureBucket() {
  const exists = await minioClient.bucketExists(bucketName);

  if (!exists) {
    await minioClient.makeBucket(bucketName);
    console.log(`✅ MinIO bucket created: ${bucketName}`);
  } else {
    console.log(`✅ MinIO bucket exists: ${bucketName}`);
  }
}

module.exports = {
  minioClient,
  bucketName,
  ensureBucket,
};