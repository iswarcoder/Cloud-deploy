import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import request from "supertest";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import app from "../src/app.js";
import { memoryStore } from "../src/db/storage.js";
import { resetClientForTests, setClientForTests } from "../src/services/cloudwatch-logs.service.js";
import { clearMemoryDeployments } from "../src/services/deployments.service.js";

const originalEnv = {};
const envKeys = ["AUTH_REQUIRED", "COGNITO_APP_CLIENT_ID", "COGNITO_ISSUER", "CLOUDWATCH_LOG_GROUP", "CLOUDWATCH_LOG_GROUPS", "CLOUDWATCH_REGION", "STORAGE_MODE"];
let authToken;
let expiredToken;
let privateKeyForTest;
let server;
let issuer;
let filterInputs = [];
let events = [];

function fakeCloudWatch() {
  setClientForTests({
    send: async command => {
      if (command.input.logGroupName) {
        filterInputs.push(command.input);
        return { events };
      }
      if (command.input.logGroupNamePrefix) {
        return { logGroups: [{ logGroupName: command.input.logGroupNamePrefix, arn: "arn:aws:logs:us-east-1:000000000000:log-group:/cloud-deploy/backend" }] };
      }
      throw new Error("Unexpected CloudWatch operation in test.");
    }
  });
}

before(async () => {
  for (const key of envKeys) originalEnv[key] = process.env[key];
  process.env.AUTH_REQUIRED = "true";
  process.env.COGNITO_APP_CLIENT_ID = "monitoring-test-client";
  process.env.CLOUDWATCH_REGION = "us-east-1";
  process.env.CLOUDWATCH_LOG_GROUP = "/cloud-deploy/backend";
  process.env.STORAGE_MODE = "memory";

  const { publicKey, privateKey } = await generateKeyPair("RS256");
  privateKeyForTest = privateKey;
  const jwk = await exportJWK(publicKey);
  jwk.kid = "monitoring-test-key";
  jwk.use = "sig";
  jwk.alg = "RS256";
  server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  issuer = `http://127.0.0.1:${server.address().port}`;
  process.env.COGNITO_ISSUER = issuer;
  authToken = await new SignJWT({ token_use: "access", client_id: process.env.COGNITO_APP_CLIENT_ID })
    .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
    .setIssuer(issuer)
    .setSubject("monitoring-test-user")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
  expiredToken = await new SignJWT({ token_use: "access", client_id: process.env.COGNITO_APP_CLIENT_ID })
    .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
    .setIssuer(issuer)
    .setSubject("monitoring-test-user")
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
    .sign(privateKeyForTest);
  events = [
    { eventId: "event-info", timestamp: Date.now() - 1000, message: "INFO request complete", logStreamName: "api/instance-1", logGroupName: "/cloud-deploy/backend" },
    { eventId: "event-warning", timestamp: Date.now() - 2000, message: "WARN queue delay", logStreamName: "worker/instance-2", logGroupName: "/cloud-deploy/backend" },
    { eventId: "event-error", timestamp: Date.now() - 3000, message: "ERROR deployment deploy-123 failed", logStreamName: "api/instance-3", logGroupName: "/cloud-deploy/backend" }
  ];
  filterInputs = [];
  fakeCloudWatch();
  clearMemoryDeployments();
  memoryStore.deployments.set("own-deployment", {
    id: "own-deployment", ownerId: "monitoring-test-user", status: "queued", createdAt: new Date().toISOString(), logs: []
  });
  memoryStore.deployments.set("other-deployment", {
    id: "other-deployment", ownerId: "another-user", status: "succeeded", createdAt: new Date().toISOString(), logs: []
  });
});

after(async () => {
  resetClientForTests();
  clearMemoryDeployments();
  for (const key of envKeys) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  if (server?.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test("monitoring APIs enforce auth, validation, real client contracts, and user scoping", async t => {
  const authorized = path => request(app).get(path).set("Authorization", `Bearer ${authToken}`);

  await t.test("application health and protected monitoring routes have expected contracts", async () => {
    const appHealth = await request(app).get("/api/health");
    assert.equal(appHealth.status, 200);
    assert.equal(appHealth.body.data.status, "ok");
    assert.equal(appHealth.body.data.storageMode, "memory");

    for (const endpoint of ["/health?range=1h", "/overview?range=1h", "/logs?range=1h", "/deployments?range=1h"]) {
      const response = await authorized(`/api/monitoring${endpoint}`);
      assert.equal(response.status, 200, endpoint);
      assert.ok(response.body.data);
      assert.equal(response.body.error, undefined);
    }
    const health = await authorized("/api/monitoring/health?range=1h");
    assert.equal(health.body.data.cloudwatch.status, "available");
    assert.equal(health.body.data.cloudwatch.region, "us-east-1");
    assert.deepEqual(health.body.data.cloudwatch.logGroups, ["/cloud-deploy/backend"]);
  });

  await t.test("missing and invalid tokens are rejected by every protected route", async () => {
    const routes = ["/health", "/overview", "/logs", "/deployments"];
    for (const route of routes) {
      const missing = await request(app).get(`/api/monitoring${route}`);
      assert.equal(missing.status, 401, route);
      assert.equal(missing.body.error.code, "AUTH_REQUIRED");
      const invalid = await request(app).get(`/api/monitoring${route}`).set("Authorization", "Bearer invalid-token");
      assert.equal(invalid.status, 401, route);
      assert.equal(invalid.body.error.code, "INVALID_TOKEN");
      const expired = await request(app).get(`/api/monitoring${route}`).set("Authorization", `Bearer ${expiredToken}`);
      assert.equal(expired.status, 401, route);
      assert.equal(expired.body.error.code, "INVALID_TOKEN");
    }
  });

  await t.test("1h, 24h, and 7d ranges are bounded and all log filters work", async () => {
    for (const [range, duration] of [["1h", 3600000], ["24h", 86400000], ["7d", 604800000]]) {
      filterInputs = [];
      const response = await authorized(`/api/monitoring/logs?range=${range}`);
      assert.equal(response.status, 200);
      assert.equal(response.body.data.filters.range, range);
      assert.equal(filterInputs.length, 1);
      assert.ok(Math.abs((filterInputs[0].endTime - filterInputs[0].startTime) - duration) < 1000);
      assert.equal(filterInputs[0].logGroupName, "/cloud-deploy/backend");
    }

    const searched = await authorized("/api/monitoring/logs?range=24h&search=deploy-123&severity=ERROR&service=api&deploymentId=deploy-123");
    assert.equal(searched.status, 200);
    assert.deepEqual(searched.body.data.events.map(event => event.id), ["event-error"]);
    const warning = await authorized("/api/monitoring/logs?range=1h&severity=WARN");
    assert.deepEqual(warning.body.data.events.map(event => event.id), ["event-warning"]);
  });

  await t.test("empty results, excessive limits, and invalid parameters are handled", async () => {
    const previousEvents = events;
    events = [];
    const empty = await authorized("/api/monitoring/logs?range=1h");
    assert.equal(empty.status, 200);
    assert.deepEqual(empty.body.data.events, []);
    events = previousEvents;

    const excessive = await authorized("/api/monitoring/logs?range=1h&limit=9999");
    assert.equal(excessive.status, 200);
    assert.equal(excessive.body.data.filters.limit, 500);

    for (const route of ["/health", "/overview", "/logs", "/deployments"]) {
      const invalidRange = await authorized(`/api/monitoring${route}?range=30d`);
      assert.equal(invalidRange.status, 400, route);
      assert.equal(invalidRange.body.error.code, "INVALID_MONITORING_RANGE");
    }
    const invalidLimit = await authorized("/api/monitoring/logs?limit=not-a-number");
    assert.equal(invalidLimit.status, 400);
    assert.equal(invalidLimit.body.error.code, "INVALID_MONITORING_LIMIT");
    const invalidSeverity = await authorized("/api/monitoring/logs?severity=DEBUG");
    assert.equal(invalidSeverity.status, 400);
    assert.equal(invalidSeverity.body.error.code, "INVALID_MONITORING_SEVERITY");
    const oversizedFilter = await authorized(`/api/monitoring/logs?search=${"a".repeat(121)}`);
    assert.equal(oversizedFilter.status, 400);
    assert.equal(oversizedFilter.body.error.code, "INVALID_MONITORING_QUERY");
  });

  await t.test("CloudWatch pagination stops at the requested bounded event limit", async () => {
    const pageInputs = [];
    setClientForTests({
      send: async command => {
        pageInputs.push(command.input);
        return command.input.nextToken
          ? { events: [{ eventId: "page-two", timestamp: Date.now(), message: "INFO page two" }] }
          : { events: [{ eventId: "page-one", timestamp: Date.now(), message: "INFO page one" }], nextToken: "test-page-token" };
      }
    });
    const response = await authorized("/api/monitoring/logs?range=1h&limit=2");
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.events.map(event => event.id), ["page-one", "page-two"]);
    assert.equal(pageInputs.length, 2);
    assert.equal(pageInputs[1].nextToken, "test-page-token");
    fakeCloudWatch();
  });

  await t.test("deployment results remain scoped to the verified Cognito subject", async () => {
    const response = await authorized("/api/monitoring/deployments?range=24h");
    assert.equal(response.status, 200);
    assert.equal(response.body.data.total, 1);
    assert.deepEqual(response.body.data.deployments.map(item => item.id), ["own-deployment"]);
    const attemptedOtherUser = await authorized("/api/monitoring/deployments?range=24h&userId=another-user");
    assert.deepEqual(attemptedOtherUser.body.data.deployments.map(item => item.id), ["own-deployment"]);
    const overview = await authorized("/api/monitoring/overview?range=24h");
    assert.equal(overview.body.data.deployments.total, 1);
    assert.equal(overview.body.data.deployments.successful, 0);
  });

  await t.test("log-group metadata is allowlisted and access denial names only the required action", async () => {
    const groups = await authorized("/api/logs/groups");
    assert.equal(groups.status, 200);
    assert.equal(groups.body.data.region, "us-east-1");
    assert.deepEqual(groups.body.data.groups.map(group => group.name), ["/cloud-deploy/backend"]);

    setClientForTests({
      send: async () => {
        const error = new Error("AWS internal message omitted");
        error.name = "AccessDeniedException";
        error.$metadata = { httpStatusCode: 403 };
        throw error;
      }
    });
    const denied = await authorized("/api/monitoring/logs?range=1h");
    assert.equal(denied.status, 403);
    assert.equal(denied.body.error.code, "CLOUDWATCH_ACCESS_DENIED_LOGS_FILTERLOGEVENTS");
    assert.match(denied.body.error.message, /logs:FilterLogEvents/);
    assert.doesNotMatch(JSON.stringify(denied.body), /AWS internal message omitted|stack|credentials/i);
    const healthDenied = await authorized("/api/monitoring/health?range=1h");
    assert.equal(healthDenied.status, 403);
    assert.match(healthDenied.body.error.message, /logs:FilterLogEvents/);
    const overviewUnavailable = await authorized("/api/monitoring/overview?range=1h");
    assert.equal(overviewUnavailable.status, 200);
    assert.equal(overviewUnavailable.body.data.cloudwatch.status, "unavailable");
    assert.equal(overviewUnavailable.body.data.deployments.total, 1);
    setClientForTests({
      send: async () => {
        const error = new Error("Metadata permission denied.");
        error.name = "AccessDeniedException";
        throw error;
      }
    });
    const metadataDenied = await authorized("/api/logs/groups");
    assert.equal(metadataDenied.status, 403);
    assert.match(metadataDenied.body.error.message, /logs:DescribeLogGroups/);
    setClientForTests({
      send: async () => {
        const error = new Error("Sensitive upstream detail");
        error.name = "ServiceUnavailableException";
        throw error;
      }
    });
    const unavailable = await authorized("/api/monitoring/logs?range=1h");
    assert.equal(unavailable.status, 502);
    assert.equal(unavailable.body.error.code, "CLOUDWATCH_REQUEST_FAILED");
    assert.doesNotMatch(JSON.stringify(unavailable.body), /Sensitive upstream detail|stack/i);
    fakeCloudWatch();
  });

  await t.test("missing CloudWatch configuration is an explicit unavailable response", async () => {
    const previousGroup = process.env.CLOUDWATCH_LOG_GROUP;
    const previousGroups = process.env.CLOUDWATCH_LOG_GROUPS;
    delete process.env.CLOUDWATCH_LOG_GROUP;
    delete process.env.CLOUDWATCH_LOG_GROUPS;
    const response = await authorized("/api/monitoring/logs?range=1h");
    assert.equal(response.status, 503);
    assert.equal(response.body.error.code, "CLOUDWATCH_NOT_CONFIGURED");
    if (previousGroup === undefined) delete process.env.CLOUDWATCH_LOG_GROUP;
    else process.env.CLOUDWATCH_LOG_GROUP = previousGroup;
    if (previousGroups === undefined) delete process.env.CLOUDWATCH_LOG_GROUPS;
    else process.env.CLOUDWATCH_LOG_GROUPS = previousGroups;
  });
});
