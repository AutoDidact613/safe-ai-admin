/**
 * server/src/routes/agentRouter.ts
 *
 * Routes for the Agents Marketplace.
 * Registered in index.ts as: app.use("/agents", agentRouter)
 *
 * Reads (list/detail/stats) are public. Writes and AI-backed calls
 * (submit, fetch-manifest, generate-icon) require an authenticated user
 * to prevent anonymous abuse of the AI icon generator and spam listings.
 *
 * NOTE: /stats and /validate-download-url and /fetch-manifest and /generate-icon
 * must be defined BEFORE /:id to avoid Express matching them as id params.
 */

import express from "express";
import { authenticateToken } from "../middleware/auth";
import {
  getAgentsHandler,
  getAgentByIdHandler,
  createAgentHandler,
  validateUrlHandler,
  fetchManifestHandler,
  generateIconHandler,
  recordDownloadHandler,
  getStatsHandler,
} from "../controllers/agentController";

const router = express.Router();

router.get("/", getAgentsHandler);
router.get("/stats", getStatsHandler);

router.post("/validate-download-url", authenticateToken, validateUrlHandler);
router.post("/fetch-manifest", authenticateToken, fetchManifestHandler);
router.post("/generate-icon", authenticateToken, generateIconHandler);

router.get("/:id", getAgentByIdHandler);
router.post("/", authenticateToken, createAgentHandler);
router.post("/:id/download", recordDownloadHandler);

export default router;
