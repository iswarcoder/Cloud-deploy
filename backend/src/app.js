import cors from "cors";
import express from "express";
import helmet from "helmet";
import deploymentsRouter from "./routes/deployments.routes.js";
import projectsRouter from "./routes/projects.routes.js";
import profileRouter from "./routes/profile.routes.js";
import filesRouter from "./routes/files.routes.js";
import cloudwatchLogsRouter from "./routes/cloudwatch-logs.routes.js";
import monitoringRouter from "./routes/monitoring.routes.js";
import { notFound, errorHandler } from "./middleware/error-handler.js";
import { storageMode } from "./db/storage.js";
import { checkDynamoDbConnection } from "./db/dynamodb.js";

const app = express();
const origins = (process.env.CORS_ORIGINS || "http://127.0.0.1:5500")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({ origin: origins.length ? origins : false }));
app.use(express.json({ limit: "256kb" }));
app.get("/api/health", (_req, res) => res.json({
  data: {
    status: "ok",
    storageMode: storageMode(),
    awsConfigured: storageMode() === "aws",
    dynamoDbTable: process.env.DYNAMODB_TABLE || process.env.DYNAMODB_TABLE_NAME || "CloudDeployData"
  }
}));
app.get("/api/health/dynamodb", async (_req, res, next) => {
  try {
    res.json({ data: await checkDynamoDbConnection() });
  } catch (error) {
    next(error);
  }
});
app.use("/api/projects", projectsRouter);
app.use("/api/deployments", deploymentsRouter);
app.use("/api/profile", profileRouter);
app.use("/api/files", filesRouter);
app.use("/api/logs", cloudwatchLogsRouter);
app.use("/api/monitoring", monitoringRouter);
app.use(notFound);
app.use(errorHandler);

export default app;
