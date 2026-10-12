import { DescribeTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";

let documentClient;

function client() {
  if (!documentClient) {
    documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({
      region: process.env.DYNAMODB_REGION || "ap-south-1"
    }));
  }
  return documentClient;
}

export function tableName() {
  return process.env.DYNAMODB_TABLE || process.env.DYNAMODB_TABLE_NAME || "CloudDeployData";
}

function key(ownerId, recordKey) {
  if (typeof ownerId !== "string" || !ownerId.trim() || typeof recordKey !== "string" || !recordKey.trim()) {
    const error = new Error("DynamoDB records require StudentId and studentname values.");
    error.statusCode = 400;
    throw error;
  }
  return { StudentId: ownerId, studentname: recordKey };
}

export async function checkDynamoDbConnection() {
  const result = await client().send(new DescribeTableCommand({ TableName: tableName() }));
  const table = result.Table;
  return {
    connected: true,
    tableName: table?.TableName || tableName(),
    status: table?.TableStatus || "UNKNOWN",
    keySchema: table?.KeySchema || []
  };
}

export async function getEntity(ownerId, recordKey) {
  const result = await client().send(new GetCommand({
    TableName: tableName(),
    Key: key(ownerId, recordKey)
  }));
  return result.Item || null;
}

export async function putEntity(entity) {
  key(entity?.StudentId, entity?.studentname);
  await client().send(new PutCommand({
    TableName: tableName(),
    Item: entity
  }));
  return entity;
}

export async function queryEntities(ownerId, prefix) {
  const result = await client().send(new QueryCommand({
    TableName: tableName(),
    KeyConditionExpression: "StudentId = :ownerId AND begins_with(studentname, :prefix)",
    ExpressionAttributeValues: {
      ":ownerId": ownerId,
      ":prefix": prefix
    }
  }));
  return result.Items || [];
}

export async function updateEntity(ownerId, recordKey, updates) {
  const entries = Object.entries(updates);
  if (!entries.length) return getEntity(ownerId, recordKey);
  if (entries.some(([field]) => field === "StudentId" || field === "studentname")) {
    const error = new Error("DynamoDB key fields cannot be updated.");
    error.statusCode = 400;
    throw error;
  }
  const names = Object.fromEntries(entries.map(([field], index) => [`#field${index}`, field]));
  const values = Object.fromEntries(entries.map(([field, value], index) => [`:value${index}`, value]));
  const expression = entries.map(([,], index) => `#field${index} = :value${index}`).join(", ");
  const result = await client().send(new UpdateCommand({
    TableName: tableName(),
    Key: key(ownerId, recordKey),
    UpdateExpression: `SET ${expression}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: "ALL_NEW"
  }));
  return result.Attributes;
}

export async function deleteEntity(ownerId, recordKey) {
  await client().send(new DeleteCommand({
    TableName: tableName(),
    Key: key(ownerId, recordKey)
  }));
}
