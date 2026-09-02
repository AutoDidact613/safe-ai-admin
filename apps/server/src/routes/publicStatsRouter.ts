/**
 * server/src/routes/publicStatsRouter.ts
 *
 * Public route for landing page counts — no authentication required.
 */

import express from "express";
import { getPublicStats } from "../controllers/publicStatsController";

const router = express.Router();

router.get("/", getPublicStats);

export default router;
