/**
 * server/src/repositories/promptRepository.ts
 *
 * Repository for Prompt model operations
 */

import { Prompt, PromptDoc } from "../models/prompt";

export async function createPrompt(data: Partial<PromptDoc>) {
  return Prompt.create(data);
}

export async function getAllPrompts() {
  return Prompt.find().sort({ order: 1, createdAt: -1 }).lean();
}

export async function getPromptById(promptId: string) {
  return Prompt.findById(promptId).lean();
}

export async function getPromptByCode(code: string) {
  return Prompt.findOne({ code }).lean();
}

export async function getActivePrompts(category?: string) {
  const query: any = { isActive: true, status: "active" };
  if (category) {
    query.category = category;
  }
  return Prompt.find(query).sort({ order: 1, createdAt: -1 }).lean();
}

export async function updatePrompt(promptId: string, data: Partial<PromptDoc>) {
  return Prompt.findByIdAndUpdate(promptId, data, {
    new: true,
    runValidators: true,
  }).lean();
}

export async function deletePrompt(promptId: string) {
  return Prompt.findByIdAndDelete(promptId).lean();
}
