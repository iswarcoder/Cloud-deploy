import test from "node:test";
import assert from "node:assert/strict";
import { clearMemoryProfiles } from "../src/services/profile.service.js";
import { getUserProfile, updateUserProfile } from "../src/services/profile.service.js";
import { updateProfile } from "../src/controllers/profile.controller.js";

test.beforeEach(() => {
  clearMemoryProfiles();
});

test("profiles are isolated by Cognito subject", async () => {
  await updateUserProfile("user-a", { fullName: "User A", email: "a@example.com" });
  await updateUserProfile("user-b", { fullName: "User B", phone: "+91 98765 43210", email: "b@example.com" });

  assert.equal((await getUserProfile("user-a")).fullName, "User A");
  assert.equal((await getUserProfile("user-b")).fullName, "User B");
  assert.equal((await getUserProfile("user-b")).phone, "+91 98765 43210");
});

test("profile API saves name and phone and returns the persisted record", async () => {
  const response = {};
  response.json = body => { response.body = body; return response; };
  await updateProfile(
    { user: { sub: "profile-user" }, body: { fullName: "Raja Kumar", phone: "+91 98765 43210" } },
    response,
    error => { throw error; }
  );

  assert.equal(response.body.data.fullName, "Raja Kumar");
  assert.equal(response.body.data.phone, "+91 98765 43210");
  assert.equal((await getUserProfile("profile-user")).phone, "+91 98765 43210");
});

test("profile API rejects invalid phone numbers", async () => {
  const response = {
    statusCode: 0,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  await updateProfile(
    { user: { sub: "profile-user" }, body: { fullName: "Raja Kumar", phone: "not-a-phone" } },
    response,
    error => { throw error; }
  );

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error.code, "INVALID_PROFILE");
});
