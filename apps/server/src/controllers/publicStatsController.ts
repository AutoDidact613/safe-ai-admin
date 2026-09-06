/**
 * server/src/controllers/publicStatsController.ts
 *
 * Public, unauthenticated counts for the landing page stats banner.
 * Returns counts only — no user, organization or tender content.
 */

import { Request, Response } from "express";
import { User } from "../models/user";
import { Organization } from "../models/organization";
import { Tender } from "../models/tender";
import logger from "../logger";

/**
 * Get public system-wide counts for the landing page
 */
export async function getPublicStats(req: Request, res: Response) {
  try {
    const [userCount, organizationCount, tenderCount] = await Promise.all([
      User.countDocuments(),
      Organization.countDocuments({ status: "approved", isActive: true }),
      Tender.countDocuments({ isActive: true }),
    ]);

    res.json({
      userCount,
      organizationCount,
      tenderCount,
    });
  } catch (error) {
    logger.error("Failed to get public stats", { error });
    res.status(500).json({ error: "Failed to retrieve public statistics" });
  }
}
