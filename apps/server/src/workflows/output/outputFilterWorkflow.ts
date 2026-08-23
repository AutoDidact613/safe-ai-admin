/**
 * server/src/workflows/output/outputFilterWorkflow.ts
 *
 * ה-Output workflow: ריק כרגע (אין nodes), כך שתמיד עובר.
 * כשנרצה לסנן את תשובת ה-LLM (PII redaction, toxicity, policy) —
 * מוסיפים GuardNode-ים למערך OUTPUT_NODES והכול כבר מחווט.
 */

import { runGuardPipeline } from "../runner";
import { GuardContext, GuardNode, GuardWorkflowResult } from "../types";

/** ריק בכוונה — נקודת ההרחבה העתידית. */
export const OUTPUT_NODES: GuardNode[] = [];

export async function runOutputWorkflow (
  ctx: GuardContext,
): Promise<GuardWorkflowResult> {
  // pipeline ריק → תמיד allowed, אבל כבר מייצר trace ולוגים עקביים.
  return runGuardPipeline("output-filter", OUTPUT_NODES, ctx);
}