/**
 * server/src/utils/streamHandler.ts
 *
 * Small helper to stream JSON responses in a consistent way.
 */

import { Response } from "express";

export function streamJson(res: Response, data: unknown) {
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}
