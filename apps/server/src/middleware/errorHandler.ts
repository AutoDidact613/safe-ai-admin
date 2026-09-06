import { Request, Response, NextFunction } from "express";
import logger from "../logger";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  logger.error("Unhandled error:", err);

  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
}