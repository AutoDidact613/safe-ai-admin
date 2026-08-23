/**
 * server/src/logger.ts
 *
 * Winston logger configuration used by the backend service.
 * It includes JSON output with timestamps and error stacks.
 * Logs are also saved to MongoDB for audit and analysis.
 */

import winston from "winston";
import Transport from "winston-transport";
import { ApplicationLog } from "./models/applicationLog";

const isProd = process.env.NODE_ENV === "production";

// Custom MongoDB transport
class MongoDBTransport extends Transport {
  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts);
  }

  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    const { level, message, timestamp, stack, userId, requestId, context, ...rest } = info;
    void timestamp; // intentionally excluded from `context`; logEntry below sets its own insertion-time timestamp

    // Save to MongoDB asynchronously
    const logEntry = new ApplicationLog({
      level,
      message,
      context: { ...rest, ...context }, // ✅ גמיש לשני המקרים
      userId,
      requestId,
      stack,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    logEntry.save().catch((err) => {
      // Don't throw - logging should never crash the app
      console.error("Failed to save log to MongoDB:", err);
    });

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

export default logger;
