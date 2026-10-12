import { createId, memoryStore, storageMode } from "../db/storage.js";
import { deleteEntity, getEntity, putEntity, queryEntities, updateEntity } from "../db/dynamodb.js";

const PREFIX = "PROJECT#";

export async function listProjects(ownerId) {
  return storageMode() === "aws" ? queryEntities(ownerId, PREFIX) : [...memoryStore.projects.values()].filter(item => item.ownerId === ownerId);
}

export async function getProject(id, ownerId) {
  const project = storageMode() === "aws" ? await getEntity(ownerId, `${PREFIX}${id}`) : memoryStore.projects.get(id) || null;
  return project?.ownerId === ownerId ? project : null;
}

export async function createProject(input, ownerId) {
  const project = {
    id: createId("project"),
    ownerId,
    name: input.name,
    description: input.description,
    repositoryUrl: input.repositoryUrl || null,
    branch: input.branch || null,
    applicationType: input.applicationType,
    environment: input.environment,
    deploymentTarget: input.deploymentTarget,
    buildCommand: input.buildCommand || null,
    outputDirectory: input.outputDirectory || null,
    status: "Ready",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (storageMode() === "aws") return putEntity({ ...project, StudentId: ownerId, studentname: `${PREFIX}${project.id}`, entityType: "project" });
  memoryStore.projects.set(project.id, project);
  return project;
}

export async function updateProject(id, updates, ownerId) {
  const existing = await getProject(id, ownerId);
  if (!existing) return null;
  const updated = { ...updates, updatedAt: new Date().toISOString() };
  if (storageMode() === "aws") return updateEntity(ownerId, `${PREFIX}${id}`, updated);
  const project = { ...existing, ...updated };
  memoryStore.projects.set(id, project);
  return project;
}

export async function deleteProject(id, ownerId) {
  if (storageMode() === "aws") {
    const existing = await getProject(id, ownerId);
    if (!existing) return false;
    await deleteEntity(ownerId, `${PREFIX}${id}`);
    return true;
  }
  const existing = memoryStore.projects.get(id);
  return Boolean(existing?.ownerId === ownerId && memoryStore.projects.delete(id));
}

export function clearMemoryProjects() {
  memoryStore.projects.clear();
}
