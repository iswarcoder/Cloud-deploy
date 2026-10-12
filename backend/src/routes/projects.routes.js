import { Router } from "express";
import { createProject, deleteProject, getProject, listProjects, updateProject } from "../controllers/projects.controller.js";
import { developmentAuthGuard } from "../middleware/auth.js";
import { validateId, validateProject, validateProjectUpdate } from "../middleware/validate-request.js";

const router = Router();
router.use(developmentAuthGuard);
router.get("/", listProjects);
router.post("/", validateProject, createProject);
router.get("/:id", validateId, getProject);
router.patch("/:id", validateId, validateProjectUpdate, updateProject);
router.delete("/:id", validateId, deleteProject);
export default router;
