import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  FilterLogEventsCommand
} from "@aws-sdk/client-cloudwatch-logs";

let client;

function configurationError(message, code = "CLOUDWATCH_NOT_CONFIGURED") {
  const error = new Error(message);
  error.statusCode = 503;
  error.code = code;
  return error;
}

function region() {
  return process.env.CLOUDWATCH_REGION || "us-east-1";
}

function permittedLogGroups() {
  const configured = process.env.CLOUDWATCH_LOG_GROUP || process.env.CLOUDWATCH_LOG_GROUPS;
  return String(configured || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
}

export function cloudWatchConfiguration() {
  return { region: region(), logGroups: permittedLogGroups() };
}

function getClient() {
  if (!client) client = new CloudWatchLogsClient({ region: region() });
  return client;
}

function ensureConfigured() {
  const groups = permittedLogGroups();
  if (!groups.length) {
    throw configurationError("CloudWatch is not configured. Set CLOUDWATCH_LOG_GROUP=/cloud-deploy/backend.");
  }
  return groups;
}

export function cloudWatchConfigurationWarnings() {
  const warnings = [];
  if (!permittedLogGroups().length) warnings.push("CLOUDWATCH_LOG_GROUP is not set.");
  if (!process.env.CLOUDWATCH_REGION) warnings.push("CLOUDWATCH_REGION is not set; CloudWatch will use the safe us-east-1 default.");
  return warnings;
}

function cloudWatchRequestError(error, action) {
  const errorName = String(error?.name || error?.Code || "");
  if (errorName.toLowerCase().includes("accessdenied")
    || errorName.toLowerCase().includes("unauthorized")
    || error?.$metadata?.httpStatusCode === 403
    || String(error?.message || "").includes("not authorized to perform")) {
    const wrapped = new Error(`CloudWatch access was denied. Grant ${action} to the backend identity for the configured log group.`);
    wrapped.statusCode = 403;
    wrapped.code = `CLOUDWATCH_ACCESS_DENIED_${action.replaceAll(":", "_").toUpperCase()}`;
    return wrapped;
  }
  if (errorName === "ResourceNotFoundException") {
    const wrapped = new Error("The configured CloudWatch log group was not found in the configured region.");
    wrapped.statusCode = 404;
    wrapped.code = "CLOUDWATCH_LOG_GROUP_NOT_FOUND";
    return wrapped;
  }
  if (["CredentialsProviderError", "UnrecognizedClientException", "InvalidClientTokenId", "ExpiredTokenException"].includes(errorName)) {
    const wrapped = new Error("AWS credentials are unavailable or invalid. Configure the AWS credential provider chain for the backend.");
    wrapped.statusCode = 503;
    wrapped.code = "CLOUDWATCH_CREDENTIALS_UNAVAILABLE";
    return wrapped;
  }
  const wrapped = new Error("CloudWatch could not be reached. Check AWS credentials, region, and network access.");
  wrapped.statusCode = 502;
  wrapped.code = "CLOUDWATCH_REQUEST_FAILED";
  return wrapped;
}

export function boundedWindow({ startTime, endTime, range = "1h" } = {}) {
  const end = Number.isFinite(Number(endTime)) ? Number(endTime) : Date.now();
  const durations = { "1h": 60 * 60 * 1000, "24h": 24 * 60 * 60 * 1000, "7d": 7 * 24 * 60 * 60 * 1000 };
  const duration = durations[range] || durations["1h"];
  const requestedStart = Number.isFinite(Number(startTime)) ? Number(startTime) : end - duration;
  const maxWindow = durations["7d"];
  return {
    startTime: Math.max(requestedStart, end - maxWindow),
    endTime: Math.max(end, requestedStart)
  };
}

export async function listLogGroups() {
  const groups = ensureConfigured();
  const result = [];
  for (const name of groups) {
    let response;
    try {
      response = await getClient().send(new DescribeLogGroupsCommand({
        logGroupNamePrefix: name,
        limit: 50
      }));
    } catch (error) {
      throw cloudWatchRequestError(error, "logs:DescribeLogGroups");
    }
    const match = (response.logGroups || []).find(group => group.logGroupName === name);
    if (match) result.push({
      name,
      arn: match.arn || null,
      storedBytes: match.storedBytes ?? null,
      creationTime: match.creationTime ?? null
    });
  }
  return { region: region(), groups: result };
}

export async function getLogEvents({ startTime, endTime, range = "1h", limit = 200 } = {}) {
  const groups = ensureConfigured();
  const window = boundedWindow({ startTime, endTime, range });
  const boundedLimit = Math.min(Math.max(Number(limit) || 200, 1), 500);
  const events = [];
  for (const group of groups) {
    let nextToken;
    do {
      let response;
      try {
        response = await getClient().send(new FilterLogEventsCommand({
          logGroupName: group,
          startTime: window.startTime,
          endTime: window.endTime,
          limit: Math.min(boundedLimit - events.length, 100),
          nextToken
        }));
      } catch (error) {
        throw cloudWatchRequestError(error, "logs:FilterLogEvents");
      }
      for (const event of response.events || []) {
        events.push({
          id: event.eventId || `${event.logStreamName || "stream"}-${event.timestamp}-${events.length}`,
          timestamp: event.timestamp || null,
          message: event.message || "",
          logStreamName: event.logStreamName || null,
          logGroupName: event.logGroupName || group
        });
      }
      nextToken = response.nextToken;
    } while (nextToken && events.length < boundedLimit);
    if (events.length >= boundedLimit) break;
  }

  return {
    source: "Amazon CloudWatch Logs",
    region: region(),
    logGroups: groups,
    startTime: window.startTime,
    endTime: window.endTime,
    events: events.slice(0, boundedLimit)
  };
}

export function resetClientForTests() {
  client = null;
}

export function setClientForTests(value) {
  client = value;
}
