/**
 * server/src/routes/adminStatsRouter.ts
 *
 * Routes for admin-level statistics
 */

import express from "express";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import {
  getAdminStats,
  getAdminDailyStats,
  getAdminUserStats,
  getAdminModelStats,
} from "../controllers/adminStatsController";

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Admin statistics endpoints
router.get("/stats", getAdminStats);
router.get("/daily", getAdminDailyStats);
router.get("/users", getAdminUserStats);
router.get("/models", getAdminModelStats);

export default router;
