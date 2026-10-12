import * as deploymentsService from "../services/deployments.service.js";
import * as projectsService from "../services/projects.service.js";

export async function listDeployments(req, res, next) {
  try {
    res.json({ data: await deploymentsService.listDeployments(req.user.sub) });
  } catch (error) {
    next(error);
  }
}

export async function getDeployment(req, res, next) {
  try {
    const deployment = await deploymentsService.getDeployment(req.params.id, req.user.sub);
    if (!deployment) return res.status(404).json({ error: { code: "DEPLOYMENT_NOT_FOUND", message: "Deployment not found." } });
    return res.json({ data: deployment });
  } catch (error) {
    return next(error);
  }
}

export async function createDeployment(req, res, next) {
  try {
    const project = await projectsService.getProject(req.body.projectId, req.user.sub);
    if (!project) return res.status(404).json({ error: { code: "PROJECT_NOT_FOUND", message: "The deployment project was not found." } });
    const deployment = await deploymentsService.createDeployment(req.body, req.user.sub);
    return res.status(202).json({ data: deployment });
  } catch (error) {
    return next(error);
  }
}

export async function getDeploymentLogs(req, res, next) {
  try {
    const deployment = await deploymentsService.getDeployment(req.params.id, req.user.sub);
    if (!deployment) return res.status(404).json({ error: { code: "DEPLOYMENT_NOT_FOUND", message: "Deployment not found." } });
    return res.json({ data: { available: Boolean(deployment.logs?.length), logs: deployment.logs || [] } });
  } catch (error) {
    return next(error);
  }
}
