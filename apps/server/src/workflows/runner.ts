/**
 * server/src/workflows/runner.ts
 *
 * ה-runners הגנריים. שני סוגים:
 *  - runGuardPipeline     → עוצר ב-node הראשון שחוסם (fail-fast). מחזיר verdict + trace מלא.
 *  - runTransformPipeline → מריץ את כל ה-nodes ברצף וצובר context (בניית הנחיות / output).
 *
 * שני ה-runners מודדים זמן ומוציאים structured JSON log לכל שלב.
 */

import logger from "../logger";
import {
  GuardContext,
  GuardNode,
  GuardWorkflowResult,
  NodeStatus,
  NodeTrace,
  TransformNode,
} from "./types";

/** קיצור טקסט ל-log line כדי לא להציף; ה-trace המוחזר שומר את המלא. */
function preview(value: unknown, max = 300): unknown {
  if (typeof value === "string") {
    return value.length > max ? value.slice(0, max) + "…" : value;
  }
  return value;
}

function logStep(
  workflow: string,
  trace: NodeTrace,
  extra: Record<string, unknown> = {},
): void {
  // structured JSON — שורה אחת לכל node, קל לפרסר ב-log aggregator.
  const line = JSON.stringify({
    workflow,
    event: "node.completed",
    node: trace.node,
    status: trace.status,
    reason: trace.reason,
    durationMs: trace.durationMs,
    input: preview(trace.input),
    output: trace.output,
    ...extra,
  });

  if (trace.status === "error") logger.error(line);
  else logger.info(line);
}

/* ============================================================
 * Guard pipeline (Input / Output filtering)
 * ============================================================ */

export async function runGuardPipeline(
  workflowName: string,
  nodes: GuardNode[],
  ctx: GuardContext,
): Promise<GuardWorkflowResult> {
  const trace: NodeTrace[] = [];

  logger.info(
    JSON.stringify({
      workflow: workflowName,
      event: "workflow.start",
      profileId: ctx.profileId,
      nodeCount: nodes.length,
    }),
  );

  for (const node of nodes) {
    const start = Date.now();

    try {
      const result = await node.run(ctx);
      const durationMs = Date.now() - start;

      const entry: NodeTrace = {
        node: node.name,
        status: result.verdict as NodeStatus,
        reason: result.reason,
        durationMs,
        input: ctx.text,
        output: { verdict: result.verdict, reason: result.reason },
        metadata: result.metadata ?? {},
      };
      trace.push(entry);
      logStep(workflowName, entry, { profileId: ctx.profileId });

      // fail-fast: ה-node הראשון שחוסם עוצר את ה-pipeline.
      if (result.verdict === "block") {
        logger.info(
          JSON.stringify({
            workflow: workflowName,
            event: "workflow.blocked",
            blockedBy: node.name,
            reason: result.reason,
            profileId: ctx.profileId,
          }),
        );
        return {
          allowed: false,
          reason: result.reason,
          blockedBy: node.name,
          trace,
        };
      }
    } catch (err: any) {
      // fail-closed: שגיאה ב-node נחשבת חסימה (כמו getLLMDecision שמחזיר false בכשל).
      const durationMs = Date.now() - start;
      const entry: NodeTrace = {
        node: node.name,
        status: "error",
        reason: err?.message ?? "node-error",
        durationMs,
        input: ctx.text,
      };
      trace.push(entry);
      logStep(workflowName, entry, {
        profileId: ctx.profileId,
        stack: err?.stack,
      });

      return {
        allowed: false,
        reason: `error-in-${node.name}`,
        blockedBy: node.name,
        trace,
      };
    }
  }

  logger.info(
    JSON.stringify({
      workflow: workflowName,
      event: "workflow.passed",
      profileId: ctx.profileId,
    }),
  );

  return { allowed: true, reason: "passed-all-nodes", trace };
}

/* ============================================================
 * Transform pipeline (Instructions building)
 * ============================================================ */

export async function runTransformPipeline<TCtx>(
  workflowName: string,
  nodes: TransformNode<TCtx>[],
  initial: TCtx,
): Promise<{ context: TCtx; trace: NodeTrace[] }> {
  const trace: NodeTrace[] = [];
  let ctx = initial;

  for (const node of nodes) {
    const start = Date.now();
    const before = ctx;

    try {
      ctx = await node.run(ctx);
      const durationMs = Date.now() - start;

      const entry: NodeTrace = {
        node: node.name,
        status: "ok",
        durationMs,
        input: before,
        output: ctx,
      };
      trace.push(entry);
      logStep(workflowName, entry);
    } catch (err: any) {
      const durationMs = Date.now() - start;
      const entry: NodeTrace = {
        node: node.name,
        status: "error",
        reason: err?.message ?? "node-error",
        durationMs,
        input: before,
      };
      trace.push(entry);
      logStep(workflowName, entry, { stack: err?.stack });
      throw err; // בניית הנחיות שנכשלת — לא בולעים בשקט.
    }
  }

  return { context: ctx, trace };
}