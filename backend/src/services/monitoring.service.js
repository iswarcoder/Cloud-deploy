import { getLogEvents } from "./cloudwatch-logs.service.js";
import { listDeployments } from "./deployments.service.js";

const validRanges = new Set(["1h", "24h", "7d"]);

export function validateMonitoringQuery(query = {}) {
  const stringParam = (name, maxLength) => {
    const value = query[name];
    if (value === undefined) return "";
    if (typeof value !== "string" || value.length > maxLength) {
      const error = new Error(`${name} must be a string no longer than ${maxLength} characters.`);
      error.statusCode = 400;
      error.code = "INVALID_MONITORING_QUERY";
      throw error;
    }
    return value.trim();
  };
  const range = String(query.range || "1h");
  if (!validRanges.has(range)) {
    const error = new Error("range must be one of: 1h, 24h, 7d.");
    error.statusCode = 400;
    error.code = "INVALID_MONITORING_RANGE";
    throw error;
  }
  const rawLimit = query.limit === undefined ? 200 : Number(query.limit);
  if (!Number.isInteger(rawLimit) || rawLimit < 1) {
    const error = new Error("limit must be a positive integer.");
    error.statusCode = 400;
    error.code = "INVALID_MONITORING_LIMIT";
    throw error;
  }
  const limit = Math.min(rawLimit, 500);
  const severity = stringParam("severity", 10).toUpperCase();
  if (severity && !["INFO", "WARN", "ERROR"].includes(severity)) {
    const error = new Error("severity must be INFO, WARN, or ERROR.");
    error.statusCode = 400;
    error.code = "INVALID_MONITORING_SEVERITY";
    throw error;
  }
  return {
    range,
    limit,
    search: stringParam("search", 120),
    severity,
    service: stringParam("service", 80),
    deploymentId: stringParam("deploymentId", 120)
  };
}

function severity(message) {
  return /\b(error|fatal|critical)\b/i.test(message) ? "ERROR" : /\b(warn|warning)\b/i.test(message) ? "WARN" : "INFO";
}

function filterEvents(events, query) {
  return events.filter(event => {
    const message = String(event.message || "");
    const haystack = `${message} ${event.logStreamName || ""} ${event.logGroupName || ""} ${event.timestamp || ""}`.toLowerCase();
    return (!query.search || haystack.includes(query.search.toLowerCase()))
      && (!query.severity || severity(message) === query.severity)
      && (!query.service || haystack.includes(query.service.toLowerCase()))
      && (!query.deploymentId || haystack.includes(query.deploymentId.toLowerCase()));
  });
}

export async function getMonitoringLogs(query) {
  const normalized = validateMonitoringQuery(query);
  const result = await getLogEvents({ range: normalized.range, limit: normalized.limit });
  const events = filterEvents(result.events, normalized);
  return { ...result, events, filters: normalized };
}

export async function getMonitoringDeployments(ownerId, query) {
  const normalized = validateMonitoringQuery(query);
  const deployments = await listDeployments(ownerId);
  const end = Date.now();
  const start = end - ({ "1h": 3600000, "24h": 86400000, "7d": 604800000 }[normalized.range]);
  const recordsWithoutTimestamp = deployments.filter(deployment => !Number.isFinite(Date.parse(deployment.createdAt || ""))).length;
  const filtered = deployments.filter(deployment => {
    const created = Date.parse(deployment.createdAt || "");
    return Number.isFinite(created) && created >= start && created <= end;
  });
  return {
    range: normalized.range,
    deployments: filtered,
    total: filtered.length,
    complete: recordsWithoutTimestamp === 0,
    recordsWithoutTimestamp
  };
}

export async function getMonitoringOverview(ownerId, query) {
  const deployments = await getMonitoringDeployments(ownerId, query);
  let logs = null;
  let cloudwatchError = null;
  try {
    logs = await getMonitoringLogs(query);
  } catch (error) {
    cloudwatchError = { code: error.code, message: error.message, status: error.statusCode || 500 };
  }
  const records = deployments.deployments;
  return {
    range: deployments.range,
    deployments: {
      total: deployments.complete ? records.length : null,
      successful: deployments.complete ? records.filter(item => ["success", "succeeded"].includes(String(item.status).toLowerCase())).length : null,
      failed: deployments.complete ? records.filter(item => ["failed", "error"].includes(String(item.status).toLowerCase())).length : null,
      executionAvailable: records.some(item => item.status !== "queued" || item.logs?.length),
      complete: deployments.complete,
      recordsWithoutTimestamp: deployments.recordsWithoutTimestamp
    },
    logs: logs ? {
      total: logs.events.length,
      errors: logs.events.filter(item => severity(item.message) === "ERROR").length,
      warnings: logs.events.filter(item => severity(item.message) === "WARN").length
    } : { total: null, errors: null, warnings: null },
    cloudwatch: logs ? { status: "available", region: logs.region, logGroups: logs.logGroups, startTime: logs.startTime, endTime: logs.endTime } : { status: "unavailable", error: cloudwatchError }
  };
}
