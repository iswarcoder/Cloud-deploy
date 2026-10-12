import { getMonitoringDeployments, getMonitoringLogs, getMonitoringOverview, validateMonitoringQuery } from "../services/monitoring.service.js";

export async function monitoringOverview(req, res, next) {
  try {
    res.json({ data: await getMonitoringOverview(req.user.sub, req.query) });
  } catch (error) {
    next(error);
  }
}

export async function monitoringLogs(req, res, next) {
  try {
    res.json({ data: await getMonitoringLogs(req.query) });
  } catch (error) {
    next(error);
  }
}

export async function monitoringHealth(req, res, next) {
  try {
    const query = validateMonitoringQuery(req.query);
    const logs = await getMonitoringLogs({ range: query.range, limit: 1 });
    res.json({
      data: {
        status: "ok",
        service: "cloud-deploy-backend",
        checkedAt: new Date().toISOString(),
        range: query.range,
        cloudwatch: {
          status: "available",
          region: logs.region,
          logGroups: logs.logGroups,
          eventCount: logs.events.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function monitoringDeployments(req, res, next) {
  try {
    res.json({ data: await getMonitoringDeployments(req.user.sub, req.query) });
  } catch (error) {
    next(error);
  }
}
