import { createId, memoryStore, storageMode } from "../db/storage.js";
import { getEntity, putEntity, queryEntities } from "../db/dynamodb.js";

const PREFIX = "DEPLOYMENT#";

export async function listDeployments(ownerId) {
  return storageMode() === "aws" ? queryEntities(ownerId, PREFIX) : [...memoryStore.deployments.values()].filter(item => item.ownerId === ownerId);
}

export async function getDeployment(id, ownerId) {
  const deployment = storageMode() === "aws" ? await getEntity(ownerId, `${PREFIX}${id}`) : memoryStore.deployments.get(id) || null;
  return deployment?.ownerId === ownerId ? deployment : null;
}

export async function createDeployment(input, ownerId) {
  const deployment = {
    id: createId("deployment"),
    ownerId,
    projectId: input.projectId,
    branch: input.branch || null,
    applicationType: input.applicationType || null,
    environment: input.environment,
    region: input.region || null,
    buildCommand: input.buildCommand || null,
    environmentVariableNames: Array.isArray(input.environmentVariableNames) ? input.environmentVariableNames : [],
    status: "queued",
    logs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (storageMode() === "aws") return putEntity({ ...deployment, StudentId: ownerId, studentname: `${PREFIX}${deployment.id}`, entityType: "deployment" });
  memoryStore.deployments.set(deployment.id, deployment);
  return deployment;
}

export function clearMemoryDeployments() {
  memoryStore.deployments.clear();
}
