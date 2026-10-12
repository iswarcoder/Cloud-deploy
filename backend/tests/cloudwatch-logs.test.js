import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";
import { getLogEvents, resetClientForTests, setClientForTests } from "../src/services/cloudwatch-logs.service.js";
import { validateMonitoringQuery } from "../src/services/monitoring.service.js";

test("CloudWatch integration behavior", async t => {
  await t.test("endpoints require Cognito authentication", async () => {
    const response = await request(app).get("/api/logs");
    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, "AUTH_REQUIRED");
  });

  await t.test("missing allowlist is explicit", async () => {
    const previous = process.env.CLOUDWATCH_LOG_GROUPS;
    delete process.env.CLOUDWATCH_LOG_GROUPS;
    await assert.rejects(
      () => getLogEvents(),
      error => error.code === "CLOUDWATCH_NOT_CONFIGURED" && error.statusCode === 503
    );
    if (previous === undefined) delete process.env.CLOUDWATCH_LOG_GROUPS;
    else process.env.CLOUDWATCH_LOG_GROUPS = previous;
  });

  test("monitoring query validation accepts supported ranges and rejects invalid filters", () => {
    assert.equal(validateMonitoringQuery({ range: "7d", limit: "999" }).limit, 500);
    assert.throws(() => validateMonitoringQuery({ range: "30d" }), error => error.code === "INVALID_MONITORING_RANGE");
    assert.throws(() => validateMonitoringQuery({ severity: "DEBUG" }), error => error.code === "INVALID_MONITORING_SEVERITY");
  });

  await t.test("events are bounded and normalized", async () => {
    const previousGroups = process.env.CLOUDWATCH_LOG_GROUPS;
    process.env.CLOUDWATCH_LOG_GROUPS = "/cloud-deploy/app";
    setClientForTests({
      send: async command => {
        assert.equal(command.input.limit, 100);
        assert.equal(command.input.logGroupName, "/cloud-deploy/app");
        return { events: [{ eventId: "1", timestamp: 1700000000000, message: "ERROR failed", logStreamName: "stream-a" }] };
      }
    });
    const result = await getLogEvents({ limit: 600 });
    assert.equal(result.events.length, 1);
    assert.equal(result.events[0].message, "ERROR failed");
    assert.equal(result.logGroups[0], "/cloud-deploy/app");
    resetClientForTests();
    if (previousGroups === undefined) delete process.env.CLOUDWATCH_LOG_GROUPS;
    else process.env.CLOUDWATCH_LOG_GROUPS = previousGroups;
  });

  await t.test("singular log-group configuration is supported", async () => {
    const previousGroups = process.env.CLOUDWATCH_LOG_GROUPS;
    const previousGroup = process.env.CLOUDWATCH_LOG_GROUP;
    delete process.env.CLOUDWATCH_LOG_GROUPS;
    process.env.CLOUDWATCH_LOG_GROUP = "/cloud-deploy/backend";
    setClientForTests({
      send: async command => {
        assert.equal(command.input.logGroupName, "/cloud-deploy/backend");
        return { events: [] };
      }
    });
    const result = await getLogEvents({ limit: 1 });
    assert.deepEqual(result.logGroups, ["/cloud-deploy/backend"]);
    resetClientForTests();
    if (previousGroups === undefined) delete process.env.CLOUDWATCH_LOG_GROUPS;
    else process.env.CLOUDWATCH_LOG_GROUPS = previousGroups;
    if (previousGroup === undefined) delete process.env.CLOUDWATCH_LOG_GROUP;
    else process.env.CLOUDWATCH_LOG_GROUP = previousGroup;
  });

  await t.test("access-denied errors are actionable", async () => {
    const previousGroups = process.env.CLOUDWATCH_LOG_GROUPS;
    process.env.CLOUDWATCH_LOG_GROUPS = "/cloud-deploy/app";
    setClientForTests({
      send: async () => {
        const error = new Error("denied");
        error.name = "AccessDeniedException";
        throw error;
      }
    });
    await assert.rejects(
      () => getLogEvents(),
      error => error.code === "CLOUDWATCH_ACCESS_DENIED_LOGS_FILTERLOGEVENTS"
        && error.statusCode === 403
        && error.message.includes("logs:FilterLogEvents")
    );
    resetClientForTests();
    if (previousGroups === undefined) delete process.env.CLOUDWATCH_LOG_GROUPS;
    else process.env.CLOUDWATCH_LOG_GROUPS = previousGroups;
  });
});
