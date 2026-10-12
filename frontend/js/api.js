/**
 * Shared API client. The browser never receives AWS credentials.
 * Set window.CLOUD_DEPLOY_API_URL before this file to override the local backend.
 */
const CloudDeployApi = (() => {
  const baseUrl = String(window.CLOUD_DEPLOY_API_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

  async function request(path, options = {}, retry = true) {
    const token = await window.CloudDeployAuth?.getAccessToken?.();
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    const headers = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: ["Bearer", token].join(" ") } : {}),
      ...options.headers
    };
    let response;
    try {
      response = await fetch(`${baseUrl}${path}`, { ...options, headers });
    } catch (cause) {
      const error = new Error(`The backend is unavailable at ${baseUrl}. Start it with "cd backend; npm start" and try again.`);
      error.code = "BACKEND_UNAVAILABLE";
      error.cause = cause;
      throw error;
    }

    const payload = await response.json().catch(() => ({}));
    if (response.status === 401 && retry && window.CloudDeployAuth?.refreshAccessToken) {
      const refreshed = await window.CloudDeployAuth.refreshAccessToken();
      if (refreshed) return request(path, options, false);
      window.CloudDeployAuth.clearSession?.();
      if (!location.pathname.endsWith("/login.html")) {
        location.replace(`login.html?returnTo=${encodeURIComponent(location.pathname + location.search)}`);
      }
    }
    if (!response.ok) {
      const error = new Error(payload.error?.message || `API request failed with status ${response.status}.`);
      error.status = response.status;
      error.details = payload.error?.details;
      throw error;
    }
    return payload.data;
  }

  return Object.freeze({
    mode: baseUrl ? "backend" : "local",
    isConfigured: Boolean(baseUrl),
    getProjects: () => request("/api/projects"),
    createProject: project => request("/api/projects", { method: "POST", body: JSON.stringify(project) }),
    updateProject: (id, project) => request(`/api/projects/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(project) }),
    deleteProject: id => request(`/api/projects/${encodeURIComponent(id)}`, { method: "DELETE" }),
    getDeployments: () => request("/api/deployments"),
    createDeployment: deployment => request("/api/deployments", { method: "POST", body: JSON.stringify(deployment) }),
    getDeployment: id => request(`/api/deployments/${encodeURIComponent(id)}`),
    getDeploymentLogs: id => request(`/api/deployments/${encodeURIComponent(id)}/logs`),
    getCloudWatchLogGroups: () => request("/api/logs/groups"),
    getCloudWatchLogs: options => {
      const params = new URLSearchParams();
      Object.entries(options || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") params.set(key, value);
      });
      return request(`/api/logs${params.toString() ? `?${params}` : ""}`);
    },
    getMonitoringOverview: options => request(`/api/monitoring/overview?${new URLSearchParams(options || {})}`),
    getMonitoringLogs: options => request(`/api/monitoring/logs?${new URLSearchParams(options || {})}`),
    getMonitoringHealth: options => request(`/api/monitoring/health?${new URLSearchParams(options || {})}`),
    getMonitoringDeployments: options => request(`/api/monitoring/deployments?${new URLSearchParams(options || {})}`),
    getProfile: () => request("/api/profile"),
    updateProfile: profile => request("/api/profile", { method: "PATCH", body: JSON.stringify(profile) }),
    listFiles: () => request("/api/files"),
    uploadFile: file => {
      const formData = new FormData();
      formData.append("file", file);
      return request("/api/files", { method: "POST", body: formData });
    },
    downloadFile: async key => {
      const token = await window.CloudDeployAuth?.getAccessToken?.();
      const response = await fetch(`${baseUrl}/api/files/download?key=${encodeURIComponent(key)}`, {
        headers: token ? { Authorization: ["Bearer", token].join(" ") } : {}
      });
      if (!response.ok) throw new Error("The file could not be downloaded.");
      return response.blob();
    },
    deleteFile: key => request(`/api/files?key=${encodeURIComponent(key)}`, { method: "DELETE" }),
    integrations: { s3: "server-only", dynamodb: "server-only" }
  });
})();

window.CloudDeployApi = CloudDeployApi;
