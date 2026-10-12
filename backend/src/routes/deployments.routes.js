import { Router } from "express";
import { createDeployment, getDeployment, getDeploymentLogs, listDeployments } from "../controllers/deployments.controller.js";
import { developmentAuthGuard } from "../middleware/auth.js";
import { validateDeployment, validateId } from "../middleware/validate-request.js";

const router = Router();
router.use(developmentAuthGuard);
router.get("/", listDeployments);
router.post("/", validateDeployment, createDeployment);
router.get("/:id", validateId, getDeployment);
router.get("/:id/logs", validateId, getDeploymentLogs);
export default router;
