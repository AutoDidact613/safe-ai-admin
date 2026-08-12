/**
 * server/src/models/evaluationLog.ts
 *
 * Mongoose model that records each evaluation of a text input.
 * Used for audit/logging purposes and future analysis.
 */

import mongoose from "mongoose";

export interface EvaluationLogDoc extends mongoose.Document {
  profileId: mongoose.Types.ObjectId;
  text: string;
  vectorScores: {
    bestAllowed: number;
    bestBlocked: number;
  };
  initialDecision: string;
  llmFinalDecision: string;
  isManuallyReviewed: boolean;
  blockedBy?: string;
  trace?: Record<string, unknown>[];
}

const EvaluationLogSchema = new mongoose.Schema(
  {
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: "AIProfile" },
    text: String,
    vectorScores: {
      bestAllowed: Number,
      bestBlocked: Number,
    },
    initialDecision: String,
    llmFinalDecision: String,
    isManuallyReviewed: { type: Boolean, default: false },
    blockedBy: { type: String },
    trace: { type: [mongoose.Schema.Types.Mixed] },
  },
  { timestamps: true },
);

export const EvaluationLog = mongoose.model<EvaluationLogDoc>(
  "EvaluationLog",
  EvaluationLogSchema,
);
