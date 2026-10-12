import * as projectsService from "../services/projects.service.js";

export async function listProjects(req, res, next) {
  try {
    res.json({ data: await projectsService.listProjects(req.user.sub) });
  } catch (error) {
    next(error);
  }
}

export async function getProject(req, res, next) {
  try {
    const project = await projectsService.getProject(req.params.id, req.user.sub);
    if (!project) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found." } });
    return res.json({ data: project });
  } catch (error) {
    return next(error);
  }
}

export async function createProject(req, res, next) {
  try {
    res.status(201).json({ data: await projectsService.createProject(req.body, req.user.sub) });
  } catch (error) {
    next(error);
  }
}

export async function updateProject(req, res, next) {
  try {
    const project = await projectsService.updateProject(req.params.id, req.body, req.user.sub);
    if (!project) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found." } });
    return res.json({ data: project });
  } catch (error) {
    return next(error);
  }
}

export async function deleteProject(req, res, next) {
  try {
    const deleted = await projectsService.deleteProject(req.params.id, req.user.sub);
    if (!deleted) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found." } });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
}
