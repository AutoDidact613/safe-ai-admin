/**
 * server/src/workflows/instructions/nodes/systemPromptNode.ts
 *
 * Transform node שבונה את ה-system prompt מתוך הפרופיל.
 * עוטף את buildSystemPrompt הקיים.
 */

import { buildSystemPrompt } from "../../../services/promptBuilder";
import { InstructionsContext, TransformNode } from "../../types";

export const systemPromptNode: TransformNode<InstructionsContext> = {
  name: "system-prompt",

  async run(ctx) {
    const prompt = await buildSystemPrompt(ctx.profile);
    return {
      ...ctx,
      systemPrompt: prompt ?? "",
    };
  },
};

/* ------------------------------------------------------------
 * נקודות הרחבה עתידיות:
 *   - guardrailsNode: מוסיף הוראות בטיחות קבועות ל-system prompt
 *   - localeNode: מזריק שפה/טון לפי הפרופיל
 *   - policyNode: מצרף מדיניות ארגונית
 * כל אחד מהם מקבל ctx ומחזיר ctx עם systemPrompt מועשר.
 * ------------------------------------------------------------ */