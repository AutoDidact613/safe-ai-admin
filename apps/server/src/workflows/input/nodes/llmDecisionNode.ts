/**
 * server/src/workflows/input/nodes/llmDecisionNode.ts
 *
 * ה-node היחיד שפעיל כרגע ב-Input workflow.
 * עוטף את getLLMDecision הקיים — בלי לשנות את הלוגיקה שלו.
 */

import logger from "../../../logger";
import { getLLMDecision } from "../../../services/llmService";
import { GuardNode } from "../../types";

/** בונה את תיאור הפרופיל ל-LLM (הועבר לכאן מתוך evaluateText). */
function buildProfileDesc(profile: any): string {
  return (
    "allowed categories:" +
    (profile.allowedCategories ?? []).join(", ") +
    " " +
    "blocked categories:" +
    (profile.blockedCategories ?? []).join(", ")
  );
}

export const llmDecisionNode: GuardNode = {
  name: "llm-decision",

  async run(ctx) {
    const profileDesc = buildProfileDesc(ctx.profile);
    logger.info("profileDesc: " + profileDesc);

    const isSafe = await getLLMDecision(
      ctx.text,
      ctx.profile.name,
      profileDesc,
    );

    return {
      verdict: isSafe ? "allow" : "block",
      reason: isSafe ? "allowed-by-llm" : "blocked-by-llm",
      metadata: { profileDesc },
    };
  },
};

/* ------------------------------------------------------------
 * נקודות הרחבה עתידיות (לדוגמה בלבד — לא פעילות):
 *
 *   export const embeddingGuardNode: GuardNode = {
 *     name: "embedding-guardrail",
 *     async run(ctx) { ... cosineSimilarity מול allowed/blocked categories ... }
 *   };
 *
 *   export const promptInjectionNode: GuardNode = {
 *     name: "prompt-injection-guardrail",
 *     async run(ctx) { ... }
 *   };
 *
 * מוסיפים אותן פשוט למערך ב-inputFilterWorkflow.ts לפי הסדר הרצוי.
 * ------------------------------------------------------------ */