/**
 * server/src/routes/adminReportsRouter.ts
 *
 * Routes for admin-triggered reports
 */

import express from "express";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { postNewUsersReport } from "../controllers/adminReportsController";

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

router.post("/new-users", postNewUsersReport);

export default router;
