const applicationTypes = new Set(["Static HTML", "Node.js", "Docker"]);
const environments = new Set(["Development", "Staging", "Production"]);

function validationError(details) {
  const error = new Error("Request validation failed.");
  error.statusCode = 400;
  error.code = "VALIDATION_ERROR";
  error.details = details;
  return error;
}

export function validateId(req, _res, next) {
  if (!/^[A-Za-z0-9_-]{3,100}$/.test(req.params.id)) {
    return next(validationError([{ field: "id", message: "The identifier is invalid." }]));
  }
  return next();
}

export function validateProject(req, _res, next) {
  const body = req.body || {};
  const details = [];
  const allowed = new Set(["name", "description", "repositoryUrl", "branch", "applicationType", "environment", "deploymentTarget", "buildCommand", "outputDirectory"]);
  const unknown = Object.keys(body).filter(key => !allowed.has(key));
  if (unknown.length) details.push({ field: "body", message: `Unsupported fields: ${unknown.join(", ")}.` });
  if (!String(body.name || "").trim()) details.push({ field: "name", message: "Project name is required." });
  if (!String(body.description || "").trim()) details.push({ field: "description", message: "Description is required." });
  if (body.repositoryUrl && !/^https:\/\/(www\.)?github\.com\/[^/]+\/[^/]+\/?$/.test(body.repositoryUrl)) {
    details.push({ field: "repositoryUrl", message: "Repository URL must be a GitHub HTTPS URL." });
  }
  if (body.applicationType && !applicationTypes.has(body.applicationType)) details.push({ field: "applicationType", message: "Application type is invalid." });
  if (body.environment && !environments.has(body.environment)) details.push({ field: "environment", message: "Environment is invalid." });
  if (!String(body.deploymentTarget || "").trim()) details.push({ field: "deploymentTarget", message: "Deployment target is required." });
  if (details.length) return next(validationError(details));
  return next();
}

export function validateProjectUpdate(req, _res, next) {
  const body = req.body || {};
  const allowed = new Set(["name", "description", "repositoryUrl", "branch", "applicationType", "environment", "deploymentTarget", "buildCommand", "outputDirectory"]);
  const unknown = Object.keys(body).filter(key => !allowed.has(key));
  const details = [];
  if (!Object.keys(body).length) details.push({ field: "body", message: "At least one project field is required." });
  if (unknown.length) details.push({ field: "body", message: `Unsupported fields: ${unknown.join(", ")}.` });
  if (body.repositoryUrl && !/^https:\/\/(www\.)?github\.com\/[^/]+\/[^/]+\/?$/.test(body.repositoryUrl)) details.push({ field: "repositoryUrl", message: "Repository URL must be a GitHub HTTPS URL." });
  if (body.applicationType && !applicationTypes.has(body.applicationType)) details.push({ field: "applicationType", message: "Application type is invalid." });
  if (body.environment && !environments.has(body.environment)) details.push({ field: "environment", message: "Environment is invalid." });
  if (details.length) return next(validationError(details));
  return next();
}

export function validateDeployment(req, _res, next) {
  const body = req.body || {};
  const details = [];
  const allowed = new Set(["projectId", "branch", "applicationType", "environment", "region", "buildCommand", "environmentVariableNames"]);
  const unknown = Object.keys(body).filter(key => !allowed.has(key));
  if (unknown.length) details.push({ field: "body", message: `Unsupported fields: ${unknown.join(", ")}.` });
  if (!String(body.projectId || "").trim()) details.push({ field: "projectId", message: "Project ID is required." });
  if (body.environment && !environments.has(body.environment)) details.push({ field: "environment", message: "Environment is invalid." });
  if (body.branch !== undefined && !/^[A-Za-z0-9._/-]{1,120}$/.test(String(body.branch))) details.push({ field: "branch", message: "Branch name is invalid." });
  if (body.region !== undefined && !/^[a-z]{2,}(?:-[a-z0-9]+)+$/.test(String(body.region))) details.push({ field: "region", message: "AWS region is invalid." });
  if (body.applicationType !== undefined && !applicationTypes.has(body.applicationType)) details.push({ field: "applicationType", message: "Application type is invalid." });
  if (details.length) return next(validationError(details));
  return next();
}
