import { Router } from "express";
import { getLogGroups, getLogs } from "../controllers/cloudwatch-logs.controller.js";
import { requireCognitoAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireCognitoAuth);
router.get("/groups", getLogGroups);
router.get("/", getLogs);
export default router;
