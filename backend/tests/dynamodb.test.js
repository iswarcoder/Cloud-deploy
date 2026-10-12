import test from "node:test";
import assert from "node:assert/strict";
import { getEntity, putEntity, tableName } from "../src/db/dynamodb.js";

test("DynamoDB adapter defaults to the existing table", () => {
  assert.equal(tableName(), "CloudDeployData");
});

test("DynamoDB writes require the existing composite key", async () => {
  await assert.rejects(
    () => putEntity({ entityType: "profile" }),
    /StudentId and studentname/
  );
  await assert.rejects(
    () => getEntity("", "PROFILE"),
    /StudentId and studentname/
  );
});
