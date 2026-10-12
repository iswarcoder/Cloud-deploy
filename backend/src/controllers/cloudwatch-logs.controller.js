import { getLogEvents, listLogGroups } from "../services/cloudwatch-logs.service.js";

function queryNumber(value) {
  return value === undefined ? undefined : Number(value);
}

export async function getLogGroups(_req, res, next) {
  try {
    res.json({ data: await listLogGroups() });
  } catch (error) {
    next(error);
  }
}

export async function getLogs(req, res, next) {
  try {
    res.json({
      data: await getLogEvents({
        startTime: queryNumber(req.query.startTime),
        endTime: queryNumber(req.query.endTime),
        limit: queryNumber(req.query.limit)
      })
    });
  } catch (error) {
    next(error);
  }
}
