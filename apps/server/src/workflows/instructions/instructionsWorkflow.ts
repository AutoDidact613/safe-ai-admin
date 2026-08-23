/**
 * server/src/workflows/instructions/instructionsWorkflow.ts
 *
 * ה-Instructions workflow: בונה את ה-system prompt שנשלח לפרוקסי.
 * מחזיר את ה-prompt + trace, כדי שיהיה אפשר לעקוב מה כל node הוסיף.
 */

import { runTransformPipeline } from "../runner";
import { InstructionsContext } from "../types";
import { systemPromptNode } from "./nodes/systemPromptNode";

export const INSTRUCTIONS_NODES = [systemPromptNode];

export async function runInstructionsWorkflow (profile: any): Promise<string> {
  const { context } = await runTransformPipeline<InstructionsContext>(
    "instructions",
    INSTRUCTIONS_NODES,
    { profile, systemPrompt: "" },
  );

  return context.systemPrompt;
}