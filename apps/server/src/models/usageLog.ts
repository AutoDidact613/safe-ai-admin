/**
 * server/src/models/usageLog.ts
 *
 * Mongoose model for tracking API usage, costs, and token consumption.
 * Logs are automatically deleted after 60 days using TTL index.
 */

import mongoose from "mongoose";

export interface UsageLogDoc extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  profileId?: mongoose.Types.ObjectId;
  provider: string;
  modelName: string;
  mode: "BYOK" | "MANAGED";

  // Token usage
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;

  // Cost tracking
  cost: number; // Final calculated cost (LiteLLM or app fallback)
  isFree: boolean; // Whether this is a free provider key

  // Request metadata
  requestId?: string;
  timestamp: Date;
  responseTime: number; // milliseconds
  success: boolean;
  errorMessage?: string;

  // TTL - auto-delete after 60 days
  expiresAt: Date;
}

const UsageLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AIProfile",
    },
    provider: {
      type: String,
      required: true,
      enum: ["openai", "anthropic", "google", "groq"],
      index: true,
    },
    modelName: {
      type: String,
      required: true,
      index: true,
    },
    mode: {
      type: String,
      enum: ["BYOK", "MANAGED"],
      required: true,
      index: true,
    },

    // Token usage
    promptTokens: {
      type: Number,
      default: 0,
    },
    completionTokens: {
      type: Number,
      default: 0,
    },
    totalTokens: {
      type: Number,
      default: 0,
      index: true,
    },

    // Cost tracking
    cost: {
      type: Number,
      default: 0,
      index: true,
    },
    isFree: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Request metadata
    requestId: String,
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    responseTime: {
      type: Number,
      default: 0,
    },
    success: {
      type: Boolean,
      default: true,
      index: true,
    },
    errorMessage: String,

    // TTL - auto-delete after 60 days
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

// TTL index - MongoDB will automatically delete documents after expiresAt
UsageLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes for common queries
UsageLogSchema.index({ userId: 1, timestamp: -1 });
UsageLogSchema.index({ userId: 1, provider: 1, timestamp: -1 });
UsageLogSchema.index({ userId: 1, modelName: 1, timestamp: -1 });

export const UsageLog = mongoose.model<UsageLogDoc>("UsageLog", UsageLogSchema);
