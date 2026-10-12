import { randomUUID } from "node:crypto";

export const memoryStore = {
  projects: new Map(),
  deployments: new Map(),
  profiles: new Map()
};

export function storageMode() {
  return process.env.STORAGE_MODE || "memory";
}

export function createId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

export function assertStorageConfigured() {
  if (storageMode() === "aws" && !(process.env.DYNAMODB_TABLE || process.env.DYNAMODB_TABLE_NAME)) {
    const error = new Error("DYNAMODB_TABLE is required when STORAGE_MODE=aws.");
    error.statusCode = 503;
    error.code = "DYNAMODB_NOT_CONFIGURED";
    throw error;
  }
}
