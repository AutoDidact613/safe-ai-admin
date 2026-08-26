/**
 * server/src/controllers/adminReportsController.ts
 *
 * Controller for admin-triggered reports
 */

import { Request, Response } from "express";
import { sendNewUsersReport } from "../services/newUsersReportService";
import logger from "../logger";

const MAX_LOOKBACK_DAYS = 90;

/**
 * Trigger the "new users" report: scans users created within the requested
 * lookback window (default: last 24 hours) and emails a summary to every
 * admin user.
 */
export async function postNewUsersReport(req: Request, res: Response) {
  try {
    const adminUser = (req as any).user;

    if (adminUser.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const requestedDays = parseInt(req.query.days as string, 10);
    const days = Math.min(
      Math.max(Number.isFinite(requestedDays) ? requestedDays : 1, 1),
      MAX_LOOKBACK_DAYS,
    );

    const result = await sendNewUsersReport(days);

    res.json({
      newUsersCount: result.newUsersCount,
      adminsNotified: result.adminsNotified,
      periodDays: days,
    });
  } catch (error) {
    logger.error("Failed to generate new users report", { error });
    res.status(500).json({ error: "Failed to generate new users report" });
  }
}
