import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";
import { getFile, validateUpload } from "../src/services/s3.service.js";

test("file endpoints require a Cognito bearer token", async () => {
  const response = await request(app).get("/api/files");
  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "AUTH_REQUIRED");
});

test("file validation rejects missing, oversized, and unsupported files", () => {
  assert.throws(() => validateUpload(), error => error.code === "FILE_VALIDATION_ERROR");
  assert.throws(() => validateUpload({
    size: 10 * 1024 * 1024 + 1,
    mimetype: "text/plain",
    originalname: "large.txt"
  }), error => error.details[0].message.includes("10 MB"));
  assert.throws(() => validateUpload({
    size: 10,
    mimetype: "application/x-msdownload",
    originalname: "unsafe.exe"
  }), error => error.details[0].message.includes("not allowed"));
});

test("file reads reject keys outside the authenticated user's prefix", async () => {
  process.env.S3_BUCKET_NAME = "cloud-deploy-files-72195591065";
  await assert.rejects(
    () => getFile("user-a", "users/user-b/file.txt"),
    error => error.code === "FILE_NOT_FOUND" && error.statusCode === 404
  );
});

test("S3 operations report missing configuration instead of faking success", async () => {
  const previous = process.env.S3_BUCKET_NAME;
  delete process.env.S3_BUCKET_NAME;
  await assert.rejects(
    () => getFile("user-a", "users/user-a/file.txt"),
    error => error.code === "S3_NOT_CONFIGURED" && error.statusCode === 503
  );
  if (previous === undefined) delete process.env.S3_BUCKET_NAME;
  else process.env.S3_BUCKET_NAME = previous;
});
