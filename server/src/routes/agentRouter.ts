/**
 * server/src/routes/agentRouter.ts
 *
 * Routes for the Agents Marketplace.
 * Registered in index.ts as: app.use("/agents", agentRouter)
 *
 * NOTE: /stats and /validate-download-url and /fetch-manifest and /generate-icon
 * must be defined BEFORE /:id to avoid Express matching them as id params.
 */

import express from "express";
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

router.post("/validate-download-url", validateUrlHandler);
router.post("/fetch-manifest", fetchManifestHandler);
router.post("/generate-icon", generateIconHandler);

router.get("/:id", getAgentByIdHandler);
router.post("/", createAgentHandler);
router.post("/:id/download", recordDownloadHandler);

export default router;
