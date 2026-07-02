/**
 * server/src/controllers/agentController.ts
 *
 * Request handlers for the Agents Marketplace API.
 */

import { Request, Response } from "express";
import logger from "../logger";
import {
  createAgent,
  getAgents,
  getAgentById,
  incrementDownloads,
  validateDownloadUrl,
  generateAgentIcon,
  getMarketplaceStats,
  fetchManifestFromRepo,
} from "../services/agentService";
import { AgentFilters } from "../types/agentTypes";

// GET /api/agents
export async function getAgentsHandler(req: Request, res: Response) {
  try {
    const filters: AgentFilters = {
      search: req.query.search as string,
      professional_field: req.query.professional_field as string,
      task: req.query.task as string,
      framework: req.query.framework as string,
      sortBy: req.query.sortBy as AgentFilters["sortBy"],
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 12,
    };

    const result = await getAgents(filters);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error("getAgentsHandler error:", err);
    res.status(500).json({ success: false, error: "שגיאה בטעינת האייג'נטים" });
  }
}

// GET /api/agents/stats
export async function getStatsHandler(_req: Request, res: Response) {
  try {
    const stats = await getMarketplaceStats();
    res.json({ success: true, ...stats });
  } catch (err) {
    logger.error("getStatsHandler error:", err);
    res.status(500).json({ success: false, error: "שגיאה בטעינת הסטטיסטיקות" });
  }
}

// GET /api/agents/:id
export async function getAgentByIdHandler(req: Request, res: Response) {
  try {
    const agent = await getAgentById(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, error: "האייג'נט לא נמצא" });
    }
    res.json({ success: true, agent });
  } catch (err) {
    logger.error("getAgentByIdHandler error:", err);
    res.status(500).json({ success: false, error: "שגיאה בטעינת האייג'נט" });
  }
}

// POST /api/agents
// body: { repository_url, icon }
export async function createAgentHandler(req: Request, res: Response) {
  try {
    const { repository_url, icon } = req.body;

    if (!repository_url) {
      return res.status(400).json({ success: false, error: "repository_url הוא שדה חובה" });
    }

    const agent = await createAgent(repository_url, icon || "");
    res.status(201).json({ success: true, agent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "שגיאה ביצירת האייג'נט";
    logger.error("createAgentHandler error:", err);
    res.status(400).json({ success: false, error: message });
  }
}

// POST /api/agents/validate-download-url
// body: { url }
export async function validateUrlHandler(req: Request, res: Response) {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: "url הוא שדה חובה" });
    }

    const result = await validateDownloadUrl(url);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error("validateUrlHandler error:", err);
    res.status(500).json({ success: false, error: "שגיאה בבדיקת הקישור" });
  }
}

// POST /api/agents/fetch-manifest
// body: { repository_url }
export async function fetchManifestHandler(req: Request, res: Response) {
  try {
    const { repository_url } = req.body;
    if (!repository_url) {
      return res.status(400).json({ success: false, error: "repository_url הוא שדה חובה" });
    }

    const manifest = await fetchManifestFromRepo(repository_url);
    const urlValidation = await validateDownloadUrl(manifest.download_url);

    res.json({ success: true, manifest, urlValidation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "שגיאה בטעינת ה-manifest";
    logger.error("fetchManifestHandler error:", err);
    res.status(400).json({ success: false, error: message });
  }
}

// POST /api/agents/generate-icon
// body: { name, description }
export async function generateIconHandler(req: Request, res: Response) {
  try {
    const { name, description } = req.body;
    if (!name || !description) {
      return res.status(400).json({ success: false, error: "name ו-description הם שדות חובה" });
    }

    const svg = await generateAgentIcon(name, description);
    res.json({ success: true, svg });
  } catch (err) {
    const message = err instanceof Error ? err.message : "שגיאה ביצירת האייקון";
    logger.error("generateIconHandler error:", err);
    res.status(500).json({ success: false, error: message });
  }
}

// POST /api/agents/:id/download
export async function recordDownloadHandler(req: Request, res: Response) {
  try {
    await incrementDownloads(req.params.id);
    res.json({ success: true });
  } catch (err) {
    logger.error("recordDownloadHandler error:", err);
    res.status(500).json({ success: false, error: "שגיאה ברישום ההורדה" });
  }
}
