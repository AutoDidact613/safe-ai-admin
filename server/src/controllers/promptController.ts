/**
 * server/src/controllers/promptController.ts
 *
 * Controller for prompt management endpoints
 */

import { Request, Response } from "express";
import { PromptService } from "../services/promptService";
import logger from "../logger";

/**
 * GET /api/prompts
 * Get all prompts (admin only)
 */
export async function getAllPromptsHandler(req: Request, res: Response) {
  try {
    const prompts = await PromptService.getAllPrompts();
    res.json(prompts);
  } catch (error: any) {
    logger.error("Error getting all prompts:", error);
    res.status(500).json({ error: error.message || "Failed to get prompts" });
  }
}


/**
 * GET /api/prompts/active
 * Get active prompts, optionally filtered by category
 */
export async function getActivePromptsHandler(req: Request, res: Response) {
  try {
   const category = req.query.category as string | undefined;
const prompts = await PromptService.getActivePrompts(category);
    res.json(prompts);
  } catch (error: any) {
    logger.error("Error getting active prompts:", error);
    res.status(500).json({ error: error.message || "Failed to get active prompts" });
  }
}

/**
 * GET /api/prompts/:id
 * Get a specific prompt by ID
 */
export async function getPromptByIdHandler(req: Request, res: Response) {
  try {
    const { id } = req.params ;
    const prompt = await PromptService.getPromptById(id?.toString()||"");
    res.json(prompt);
  } catch (error: any) {
    logger.error("Error getting prompt by ID:", error);
    const status = error.message.includes("not found") ? 404 : 500;
    res.status(status).json({ error: error.message || "Failed to get prompt" });
  }
}

/**
 * POST /api/prompts
 * Create a new prompt (admin only)
 */
export async function createPromptHandler(req: Request, res: Response) {
  try {
    const prompt = await PromptService.createPrompt(req.body);
    res.status(201).json(prompt);
  } catch (error: any) {
    logger.error("Error creating prompt:", error);
    const status = error.message.includes("already exists") ? 409 : 400;
    res.status(status).json({ error: error.message || "Failed to create prompt" });
  }
}

/**
 * PUT /api/prompts/:id
 * Update an existing prompt (admin only)
 */
export async function updatePromptHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const prompt = await PromptService.updatePrompt(id?.toString()||"", req.body);
    res.json(prompt);
  } catch (error: any) {
    logger.error("Error updating prompt:", error);
    const status = error.message.includes("not found") ? 404 : 
                   error.message.includes("already exists") ? 409 : 400;
    res.status(status).json({ error: error.message || "Failed to update prompt" });
  }
}

/**
 * DELETE /api/prompts/:id
 * Delete a prompt (admin only)
 */
export async function deletePromptHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await PromptService.deletePrompt(id?.toString()||"");
    res.status(204).send();
  } catch (error: any) {
    logger.error("Error deleting prompt:", error);
    const status = error.message.includes("not found") ? 404 : 500;
    res.status(status).json({ error: error.message || "Failed to delete prompt" });
  }
}
