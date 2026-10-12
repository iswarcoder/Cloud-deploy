export function notFound(_req, _res, next) {
  const error = new Error("Route not found.");
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, _req, res, _next) {
  const status = error.code === "LIMIT_FILE_SIZE" ? 413 : Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const safeError = error.code === "LIMIT_FILE_SIZE"
    ? { code: "FILE_TOO_LARGE", message: "Files must be 10 MB or smaller." }
    : { code: error.code || (status === 404 ? "NOT_FOUND" : "REQUEST_FAILED"), message: error.message };
  const safeCloudWatchError = String(error.code || "").startsWith("CLOUDWATCH_");
  const message = status >= 500 && !safeCloudWatchError ? "The server could not complete the request." : error.message;
  if (status >= 500 && !safeCloudWatchError) console.error(error);
  res.status(status).json({
    error: {
      code: status === 413 ? safeError.code : safeError.code,
      message: status === 413 ? safeError.message : message,
      ...(error.details ? { details: error.details } : {})
    }
  });
}
