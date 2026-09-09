/**
 * server/src/logger.ts
 *
 * Winston logger configuration used by the backend service.
 * It includes JSON output with timestamps and error stacks.
 * Logs are also saved to MongoDB for audit and analysis.
 */

import winston from "winston";
import Transport from "winston-transport";
import { AsyncLocalStorage } from "node:async_hooks";
import { ApplicationLog } from "./models/applicationLog";

const isProd = process.env.NODE_ENV === "production";

// Populated once per request by the middleware registered in index.ts, so that
// every logger.* call made anywhere during that request's async chain — without
// having to thread requestId through every function signature — can attach it.
export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

// Custom MongoDB transport
class MongoDBTransport extends Transport {
  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts);
  }

  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    const { level, message, timestamp, stack, userId, organizationId, requestId, context, ...rest } = info;
    void timestamp; // intentionally excluded from `context`; logEntry below sets its own insertion-time timestamp

    // Save to MongoDB asynchronously
    try {
      const logEntry = new ApplicationLog({
        level,
        message,
        context: { ...rest, ...context }, // ✅ גמיש לשני המקרים
        userId,
        organizationId,
        requestId,
        stack,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });

      logEntry.save().catch((err) => {
        // Don't throw - logging should never crash the app
        console.error("Failed to save log to MongoDB:", err);
      });
    } catch (err) {
      // Constructing the document can throw synchronously (e.g. an invalid
      // ObjectId in userId/organizationId) - never let that crash the caller.
      console.error("Failed to save log to MongoDB:", err);
    }

    callback();
  }
}

const logger = winston.createLogger({
  level: isProd ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new MongoDBTransport(), // Save all logs to MongoDB
  ],
});

// Wrap the leveled log methods so every call site automatically picks up the
// current request's requestId from AsyncLocalStorage, instead of every caller
// across the codebase having to pass it in explicitly.
const originalInfo = logger.info.bind(logger);
const originalWarn = logger.warn.bind(logger);
const originalError = logger.error.bind(logger);

logger.info = ((message: string, meta: any = {}) => {
  const ctx = requestContext.getStore();
  return originalInfo(message, ctx ? { ...meta, requestId: ctx.requestId } : meta);
}) as typeof logger.info;

logger.warn = ((message: string, meta: any = {}) => {
  const ctx = requestContext.getStore();
  return originalWarn(message, ctx ? { ...meta, requestId: ctx.requestId } : meta);
}) as typeof logger.warn;

logger.error = ((message: string, meta: any = {}) => {
  const ctx = requestContext.getStore();
  return originalError(message, ctx ? { ...meta, requestId: ctx.requestId } : meta);
}) as typeof logger.error;

export default logger;
