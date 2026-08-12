/**
 * server/src/models/applicationLog.ts
 *
 * Mongoose model for storing application logs in MongoDB.
 * Captures errors, warnings, info, and debug logs for audit and analysis.
 * Logs are automatically deleted after 60 days using TTL index.
 */

import mongoose from "mongoose";

export interface ApplicationLogDoc extends mongoose.Document {
  level: "error" | "warn" | "info" | "debug";
  message: string;
  context?: Record<string, any>;
  userId?: mongoose.Types.ObjectId;
  requestId?: string;
  stack?: string;
  timestamp: Date;
  expiresAt: Date;
}

const ApplicationLogSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      required: true,
      enum: ["error", "warn", "info", "debug"],
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    context: {
      type: mongoose.Schema.Types.Mixed,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    requestId: {
      type: String,
      index: true,
    },
    stack: String,
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// TTL index - MongoDB will automatically delete documents after expiresAt
ApplicationLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes for common queries
ApplicationLogSchema.index({ level: 1, timestamp: -1 });
ApplicationLogSchema.index({ userId: 1, timestamp: -1 });
ApplicationLogSchema.index({ requestId: 1, timestamp: -1 });

export const ApplicationLog = mongoose.model<ApplicationLogDoc>(
  "ApplicationLog",
  ApplicationLogSchema
);
