import { Router } from "express";
import { monitoringDeployments, monitoringHealth, monitoringLogs, monitoringOverview } from "../controllers/monitoring.controller.js";
import { requireCognitoAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireCognitoAuth);
router.get("/overview", monitoringOverview);
router.get("/logs", monitoringLogs);
router.get("/health", monitoringHealth);
router.get("/deployments", monitoringDeployments);
export default router;
