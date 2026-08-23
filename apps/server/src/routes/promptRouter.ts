/**
 * server/src/routes/promptRouter.ts
 *
 * Routes for prompt management
 */

import express from "express";
import { requireAdmin } from "../middleware/auth";
import {
  getAllPromptsHandler,
  getActivePromptsHandler,
  getPromptByIdHandler,
  createPromptHandler,
  updatePromptHandler,
  deletePromptHandler,
} from "../controllers/promptController";

const router = express.Router();

// Health check
router.get("/health", (_req, res) => {
  res.send("OK");
});

// Public route - get active prompts
router.get("/active", getActivePromptsHandler);

// Admin routes - require admin authentication
router.get("/", requireAdmin, getAllPromptsHandler);
router.get("/:id", requireAdmin, getPromptByIdHandler);
router.post("/", requireAdmin, createPromptHandler);
router.put("/:id", requireAdmin, updatePromptHandler);
router.delete("/:id", requireAdmin, deletePromptHandler);

export default router;
