import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";
import { clearMemoryProjects } from "../src/services/projects.service.js";

beforeEach(() => {
  clearMemoryProjects();
});

const validProject = {
  name: "Manual project",
  description: "Created by an API test.",
  applicationType: "Node.js",
  environment: "Development",
  deploymentTarget: "ECS Fargate"
};

test("projects start empty and create returns a persisted record", async () => {
  const empty = await request(app).get("/api/projects");
  assert.deepEqual(empty.body.data, []);

  const created = await request(app).post("/api/projects").send(validProject);
  assert.equal(created.status, 201);
  assert.equal(created.body.data.name, validProject.name);

  const listed = await request(app).get("/api/projects");
  assert.equal(listed.body.data.length, 1);
});

test("project validation rejects missing name and invalid repository", async () => {
  const missingName = await request(app).post("/api/projects").send({ ...validProject, name: "" });
  assert.equal(missingName.status, 400);
  assert.equal(missingName.body.error.code, "VALIDATION_ERROR");

  const invalidRepo = await request(app).post("/api/projects").send({ ...validProject, repositoryUrl: "http://example.com" });
  assert.equal(invalidRepo.status, 400);
});

test("project update, retrieval, deletion, and unknown IDs are handled", async () => {
  const created = await request(app).post("/api/projects").send(validProject);
  const id = created.body.data.id;
  const updated = await request(app).patch(`/api/projects/${id}`).send({ description: "Updated" });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.description, "Updated");

  const retrieved = await request(app).get(`/api/projects/${id}`);
  assert.equal(retrieved.status, 200);
  assert.equal(retrieved.body.data.id, id);

  assert.equal((await request(app).delete(`/api/projects/${id}`)).status, 204);
  assert.equal((await request(app).get(`/api/projects/${id}`)).status, 404);
  assert.equal((await request(app).get("/api/projects/!bad")).status, 400);
});
