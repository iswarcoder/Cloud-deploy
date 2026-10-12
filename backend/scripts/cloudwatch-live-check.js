import "dotenv/config";
import { cloudWatchConfiguration, getLogEvents } from "../src/services/cloudwatch-logs.service.js";

const configuration = cloudWatchConfiguration();
try {
  const result = await getLogEvents({ range: "1h", limit: 1 });
  console.log(JSON.stringify({
    status: "connected",
    region: result.region,
    logGroups: result.logGroups,
    startTime: result.startTime,
    endTime: result.endTime,
    eventCount: result.events.length
  }));
} catch (error) {
  console.error(JSON.stringify({
    status: "failed",
    region: configuration.region,
    logGroups: configuration.logGroups,
    code: error.code || "CLOUDWATCH_REQUEST_FAILED",
    httpStatus: error.statusCode || 500,
    message: error.message || "CloudWatch integration check failed."
  }));
  process.exitCode = 1;
}
