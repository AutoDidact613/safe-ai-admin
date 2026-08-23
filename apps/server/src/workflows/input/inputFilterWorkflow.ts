/**
 * server/src/workflows/input/inputFilterWorkflow.ts
 *
 * ה-Input workflow: רשימת ה-guard nodes לפי סדר ריצה.
 * כרגע יש רק llm-decision. כדי להוסיף שלב — מוסיפים node למערך.
 */

import { runGuardPipeline } from "../runner";
import { GuardContext, GuardWorkflowResult } from "../types";
import { llmDecisionNode } from "./nodes/llmDecisionNode";

/**
 * סדר ה-nodes = סדר הסינון. ה-pipeline עוצר בראשון שחוסם (fail-fast),
 * אז כדאי לשים שלבים זולים/ודאיים קודם.
 *
 * עתידי:
 *   import { embeddingGuardNode, promptInjectionNode } from "./nodes/llmDecisionNode";
 *   export const INPUT_NODES = [promptInjectionNode, embeddingGuardNode, llmDecisionNode];
 */
export const INPUT_NODES = [llmDecisionNode];

export async function runInputWorkflow (
  ctx: GuardContext,
): Promise<GuardWorkflowResult> {
  return runGuardPipeline("input-filter", INPUT_NODES, ctx);
}