import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/profile.controller.js";
import { requireCognitoAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireCognitoAuth);
router.get("/", getProfile);
router.patch("/", updateProfile);
export default router;
