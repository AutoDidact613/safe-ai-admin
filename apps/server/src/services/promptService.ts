/**
 * server/src/services/promptService.ts
 *
 * Service layer for managing system prompts
 */

import {
  createPrompt,
  getAllPrompts,
  getPromptById,
  getPromptByCode,
  getActivePrompts,
  updatePrompt,
  deletePrompt,
} from "../repositories/promptRepository";
import { PromptDoc } from "../models/prompt";

export class PromptService {
  /**
   * Get all prompts (for admin management)
   */
  static async getAllPrompts() {
    return getAllPrompts();
  }

  /**
   * Get a specific prompt by ID
   */
  static async getPromptById(promptId: string) {
    const prompt = await getPromptById(promptId);
    if (!prompt) {
      throw new Error("Prompt not found");
    }
    return prompt;
  }

  /**
   * Get a specific prompt by code
   */
  static async getPromptByCode(code: string) {
    const prompt = await getPromptByCode(code);
    if (!prompt) {
      throw new Error(`Prompt with code '${code}' not found`);
    }
    return prompt;
  }

  /**
   * Get active prompts, optionally filtered by category
   * Returns prompts sorted by order
   */
  static async getActivePrompts(category?: string) {
    return getActivePrompts(category);
  }

  /**
   * Get active system prompts as a combined string
   */
  static async getSystemPromptsAsString(category?: string): Promise<string> {
    const prompts = await getActivePrompts(category);
    return prompts.map((p) => p.content).join("\n");
  }

  /**
   * Create a new prompt
   */
  static async createPrompt(data: Partial<PromptDoc>) {
    // Validate required fields
    if (!data.code || !data.content) {
      throw new Error("Code and content are required");
    }

    // Check if code already exists
    const existing = await getPromptByCode(data.code);
    if (existing) {
      throw new Error(`Prompt with code '${data.code}' already exists`);
    }

    return createPrompt(data);
  }

  /**
   * Update an existing prompt
   */
  static async updatePrompt(promptId: string, data: Partial<PromptDoc>) {
    // Check if prompt exists
    await this.getPromptById(promptId);

    // If updating code, check for duplicates
    if (data.code) {
      const existing = await getPromptByCode(data.code);
      if (existing && existing._id.toString() !== promptId) {
        throw new Error(`Prompt with code '${data.code}' already exists`);
      }
    }

    const updated = await updatePrompt(promptId, data);
    if (!updated) {
      throw new Error("Failed to update prompt");
    }
    return updated;
  }

  /**
   * Delete a prompt
   */
  static async deletePrompt(promptId: string) {
    // Check if prompt exists
    await this.getPromptById(promptId);

    const deleted = await deletePrompt(promptId);
    if (!deleted) {
      throw new Error("Failed to delete prompt");
    }
    return deleted;
  }
}
