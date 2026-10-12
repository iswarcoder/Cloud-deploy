import { memoryStore, storageMode } from "../db/storage.js";
import { getEntity, putEntity } from "../db/dynamodb.js";

const PROFILE_KEY = "PROFILE";
const fields = ["fullName", "phone", "email", "bio", "company", "location", "website", "githubUrl", "instagramUrl", "facebookUrl", "linkedinUrl", "avatarUrl"];

function clean(value) {
  return String(value ?? "").trim().slice(0, 500);
}

export function normalizeProfile(input, userId) {
  return {
    userId,
    ...Object.fromEntries(fields.map(field => [field, clean(input[field])])),
    updatedAt: new Date().toISOString()
  };
}

export async function getUserProfile(userId) {
  if (storageMode() === "aws") return getEntity(userId, PROFILE_KEY);
  return memoryStore.profiles.get(userId) || null;
}

export async function updateUserProfile(userId, input) {
  const existing = await getUserProfile(userId);
  const profile = normalizeProfile({ ...existing, ...input }, userId);
  if (storageMode() === "aws") return putEntity({
    ...profile,
    StudentId: userId,
    studentname: PROFILE_KEY,
    entityType: "profile"
  });
  memoryStore.profiles.set(userId, profile);
  return profile;
}

export function clearMemoryProfiles() {
  memoryStore.profiles.clear();
}
