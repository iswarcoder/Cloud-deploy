import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

let s3Client;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "text/plain",
  "application/json",
  "application/zip"
]);

function bucketName() {
  return process.env.S3_BUCKET || process.env.S3_BUCKET_NAME;
}

export function client() {
  if (!s3Client) {
    s3Client = new S3Client({ region: process.env.S3_REGION || "ap-south-1" });
  }
  return s3Client;
}

export function assertS3Configured() {
  if (!bucketName()) {
    const error = new Error("S3_BUCKET_NAME is required for file operations.");
    error.statusCode = 503;
    error.code = "S3_NOT_CONFIGURED";
    throw error;
  }
}

export function validateUpload(file) {
  const details = [];
  if (!file) details.push({ field: "file", message: "A file is required." });
  if (file && file.size > MAX_FILE_SIZE) details.push({ field: "file", message: "Files must be 10 MB or smaller." });
  if (file && !ALLOWED_TYPES.has(file.mimetype)) details.push({ field: "file", message: "This file type is not allowed." });
  if (details.length) {
    const error = new Error("File validation failed.");
    error.statusCode = 400;
    error.code = "FILE_VALIDATION_ERROR";
    error.details = details;
    throw error;
  }
}

function userPrefix(userId) {
  return `users/${encodeURIComponent(userId).replace(/%/g, "_")}/`;
}

function objectKey(userId, fileId, originalName) {
  const safeName = String(originalName || "file")
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .slice(0, 120) || "file";
  return `${userPrefix(userId)}${fileId}-${safeName}`;
}

function fileFromObject(object) {
  return {
    key: object.Key,
    name: object.Metadata?.originalname || object.Key.split("/").pop(),
    size: Number(object.Size || 0),
    contentType: object.ContentType || "application/octet-stream",
    lastModified: object.LastModified || null,
    etag: object.ETag || null
  };
}

export async function uploadFile(userId, file) {
  assertS3Configured();
  validateUpload(file);
  const key = objectKey(userId, randomUUID(), file.originalname);
  await client().send(new PutObjectCommand({
    Bucket: bucketName(),
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    Metadata: { originalname: file.originalname.slice(0, 120) }
  }));
  return {
    key,
    name: file.originalname,
    size: file.size,
    contentType: file.mimetype
  };
}

export async function listFiles(userId) {
  assertS3Configured();
  const result = await client().send(new ListObjectsV2Command({
    Bucket: bucketName(),
    Prefix: userPrefix(userId)
  }));
  return (result.Contents || []).map(fileFromObject);
}

export async function getFile(userId, key) {
  assertS3Configured();
  if (!isOwnedKey(userId, key)) {
    const error = new Error("The requested file does not belong to the authenticated user.");
    error.statusCode = 404;
    error.code = "FILE_NOT_FOUND";
    throw error;
  }
  const result = await client().send(new GetObjectCommand({ Bucket: bucketName(), Key: key }));
  return { ...result, key };
}

export async function deleteFile(userId, key) {
  assertS3Configured();
  if (!isOwnedKey(userId, key)) {
    const error = new Error("The requested file does not belong to the authenticated user.");
    error.statusCode = 404;
    error.code = "FILE_NOT_FOUND";
    throw error;
  }
  await client().send(new HeadObjectCommand({ Bucket: bucketName(), Key: key }));
  await client().send(new DeleteObjectCommand({ Bucket: bucketName(), Key: key }));
}

export { ALLOWED_TYPES, MAX_FILE_SIZE };

function isOwnedKey(userId, key) {
  return typeof key === "string"
    && key.length <= 1024
    && !/[\u0000-\u001f\u007f]/.test(key)
    && key.startsWith(userPrefix(userId));
}
