/**
 * server/src/routes/usageRouter.ts
 *
 * Routes for usage statistics and cost tracking.
 */

import express from "express";
import { authenticateToken } from "../middleware/auth";
import {
  getUsageStats,
  getDailyUsage,
  getUsageByModel,
  getLimitsStatus,
  getCostBreakdown,
  updateUserLimits,
} from "../controllers/usageController";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// User endpoints
router.get("/stats", getUsageStats);
router.get("/daily", getDailyUsage);
router.get("/by-model", getUsageByModel);
router.get("/limits", getLimitsStatus);
router.get("/costs", getCostBreakdown);

// Admin endpoints
router.patch("/users/:userId/limits", updateUserLimits);

export default router;
