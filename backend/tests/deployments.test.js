import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";
import { clearMemoryDeployments } from "../src/services/deployments.service.js";
import { clearMemoryProjects } from "../src/services/projects.service.js";

beforeEach(() => {
  clearMemoryProjects();
  clearMemoryDeployments();
});

test("deployment creation requires an existing project", async () => {
  const response = await request(app).post("/api/deployments").send({
    projectId: "project-does-not-exist",
    environment: "Development"
  });
  assert.equal(response.status, 404);
});

test("deployment is queued and logs report unavailable when empty", async () => {
  const project = await request(app).post("/api/projects").send({
    name: "Deployment project",
    description: "For deployment tests.",
    applicationType: "Docker",
    environment: "Staging",
    deploymentTarget: "ECS Fargate"
  });
  const response = await request(app).post("/api/deployments").send({
    projectId: project.body.data.id,
    branch: "main",
    applicationType: "Docker",
    environment: "Staging",
    region: "ap-south-1",
    buildCommand: "npm run build",
    environmentVariableNames: ["API_URL"]
  });
  assert.equal(response.status, 202);
  assert.equal(response.body.data.status, "queued");
  assert.equal(response.body.data.projectId, project.body.data.id);
  assert.equal(response.body.data.region, "ap-south-1");
  assert.deepEqual(response.body.data.environmentVariableNames, ["API_URL"]);

  const logs = await request(app).get(`/api/deployments/${response.body.data.id}/logs`);
  assert.equal(logs.status, 200);
  assert.equal(logs.body.data.available, false);
  assert.equal((await request(app).get("/api/deployments/unknown-id")).status, 404);
});

test("deployment validation rejects unsupported configuration", async () => {
  const response = await request(app).post("/api/deployments").send({
    projectId: "project-id",
    environment: "Production",
    region: "not a region",
    unsupported: true
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});
