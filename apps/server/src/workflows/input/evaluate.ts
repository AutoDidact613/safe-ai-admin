/**
 * server/src/workflows/input/evaluate.ts
 *
 * evaluateText — נקודת הכניסה לשכבת האורקסטרציה של סינון הקלט.
 * מביא את הפרופיל, מריץ את ה-input workflow (runInputWorkflow ), ושומר אודיט.
 *
 * נקרא משני מקומות:
 *   - הפרוקסי, דרך guardInput (proxyFilter) — שמתרגם חסימה לתשובת דמה.
 *   - ה-endpoint הישיר /evaluate (evaluateHandler) — שמחזיר את הוורדיקט כ-JSON.
 *
 * runInputWorkflow עצמו (inputFilterWorkflow.ts) נשאר טהור וללא DB.
 * כאן נוספת שכבת האודיט בלבד.
 */

import logger from "../../logger";
import { getFullProfileById } from "../../repositories/profileRepository";
import { EvaluateRequest, EvaluateResponse } from "../../types/proxyTypes";
import { runInputWorkflow  } from "./inputFilterWorkflow";
import { NodeTrace } from "../types";

export async function evaluateText(
  req: EvaluateRequest,
): Promise<EvaluateResponse & { blockedBy?: string; trace?: NodeTrace[] }> {
  const { profileId, text, auditDisabled } = req;

  if (!profileId || !text) {
    throw new Error("profileId and text are required");
  }

  const { EvaluationLog } = await import("../../models");

  const profile = await getFullProfileById(profileId);
  if (!profile) {
    throw new Error("AIProfile not found");
  }

  // הרצת ה-Input workflow (כרגע: llm-decision בלבד).
  const result = await runInputWorkflow({
    text,
    profile,
    profileId: profile._id?.toString() ?? profileId,
  });

  // אודיט — כולל ה-trace המלא של ה-nodes.
  if (!auditDisabled) {
    try {
      await EvaluationLog.create({
        profileId: profile._id,
        text,
        vectorScores: {},
        initialDecision: result.reason,
        llmFinalDecision: result.allowed ? "allowed" : "blocked",
        trace: result.trace as unknown as Record<string, unknown>[],
        ...(result.blockedBy !== undefined ? { blockedBy: result.blockedBy } : {}),
      });
    } catch (err: any) {
      logger.error("Failed to write EvaluationLog: " + err?.message);
    }
  }

  const ret: EvaluateResponse & { blockedBy?: string; trace?: NodeTrace[] } = {
    allowed: result.allowed,
    reason: result.reason,
    trace: result.trace,
  };
  if (result.blockedBy !== undefined) ret.blockedBy = result.blockedBy;
  return ret;
}