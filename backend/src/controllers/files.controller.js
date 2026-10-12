import * as s3Service from "../services/s3.service.js";

export async function listFiles(req, res) {
  res.json({ data: await s3Service.listFiles(req.user.sub) });
}

export async function uploadFile(req, res) {
  const file = await s3Service.uploadFile(req.user.sub, req.file);
  res.status(201).json({ data: file });
}

export async function downloadFile(req, res) {
  const file = await s3Service.getFile(req.user.sub, req.query.key || "");
  res.setHeader("Content-Type", file.ContentType || "application/octet-stream");
  if (file.ContentLength !== undefined) res.setHeader("Content-Length", file.ContentLength);
  if (file.ContentDisposition) res.setHeader("Content-Disposition", file.ContentDisposition);
  file.Body.pipe(res);
}

export async function deleteFile(req, res) {
  await s3Service.deleteFile(req.user.sub, req.query.key || "");
  res.status(204).end();
}
