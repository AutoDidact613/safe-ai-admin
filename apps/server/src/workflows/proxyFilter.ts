/**
 * server/src/workflows/proxyFilter.ts
 *
 * Glue בין שכבת הפרוקסי ל-workflows, כדי לחסל את הכפילות
 * שחזרה ב-6 פונקציות ה-proxy (extract → evaluateText → throw).
 *
 * שימוש בכל פונקציית proxy:
 *
 *   const blocked = await guardInput({
 *     profile, text: userQuery, model, api: "chat", stream: body.stream,
 *   });
 *   if (blocked) return blocked;   // תשובת דמה, לא Error
 */

import logger from "../logger";
import {
  buildBlockedAnthropicMessage,
  buildBlockedChatCompletion,
  buildBlockedResponsesApi,
  toSSEStream,
} from "./blockedResponse";
import { evaluateText } from "./input/evaluate";

export type ProxyApi = "chat" | "responses" | "anthropic";

interface GuardInputArgs {
  profile: any;
  text: string;
  model: string;
  api: ProxyApi;
  stream?: boolean;
}

/**
 * מפעיל את הערכת הקלט דרך evaluateText
 * (= input workflow + כתיבת EvaluationLog).
 * אושר → null (המשך רגיל). נחסם → תשובת דמה לפי ה-API.
 */
export async function guardInput(
  args: GuardInputArgs,
): Promise<object | ReadableStream | null> {
  const { profile, text, model, api, stream } = args;

  const result = await evaluateText({
    profileId: profile?._id?.toString() ?? "",
    text,
  });

  if (result.allowed) {
    return null;
  }

  const reason = result.reason || "Unknown reason";
  logger.info(
    JSON.stringify({
      event: "proxy.blocked",
      api,
      model,
      reason,
      blockedBy: result.blockedBy,
    }),
  );

  const payload =
    api === "anthropic"
      ? buildBlockedAnthropicMessage(model, reason)
      : api === "responses"
        ? buildBlockedResponsesApi(model, reason)
        : buildBlockedChatCompletion(model, reason);

  return stream ? toSSEStream(payload) : payload;
}