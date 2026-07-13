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

    // Save to MongoDB asynchronously
    const logEntry = new ApplicationLog({
      level: info.level,
      message: info.message,
      context: info.context || {},
      userId: info.userId,
      requestId: info.requestId,
      stack: info.stack,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
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
