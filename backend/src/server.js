import "dotenv/config";
import app from "./app.js";
import { assertStorageConfigured } from "./db/storage.js";
import { cloudWatchConfigurationWarnings } from "./services/cloudwatch-logs.service.js";

const port = Number(process.env.PORT || 3000);
assertStorageConfigured();
const configurationWarnings = [
  ...cloudWatchConfigurationWarnings(),
  ...(!process.env.AWS_REGION ? ["AWS_REGION is not set; resource-specific AWS clients use their own region defaults."] : []),
  ...(!process.env.DYNAMODB_REGION ? ["DYNAMODB_REGION is not set; DynamoDB will use ap-south-1."] : []),
  ...(!process.env.S3_REGION ? ["S3_REGION is not set; S3 will use ap-south-1."] : []),
  ...(!(process.env.S3_BUCKET || process.env.S3_BUCKET_NAME) ? ["S3_BUCKET is not set; private file operations will be unavailable."] : [])
];
if (configurationWarnings.length) {
  console.warn(`Cloud Deploy configuration warning: ${configurationWarnings.join(" ")}`);
}
app.listen(port, () => console.log(`Cloud Deploy API listening on ${port} (${process.env.STORAGE_MODE || "memory"} storage)`));
