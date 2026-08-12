/**
 * server/src/models/aiProfile.ts
 *
 * Mongoose model representing an AI profile for filtering.
 * Profiles define allowed/blocked categories and thresholds for embeddings.
 */

import mongoose from "mongoose";

export interface AIProfileDoc extends mongoose.Document {
  name: string;
  allowedCategories?: string[];
  blockedCategories?: string[];
  thresholdAllowed: number;
  thresholdBlocked: number;
  similarityMargin: number;
  createdBy: string;
  creatorEmail: string;
  contentPrompts?: string[];
  behaviorPrompts?: string[];
  knowledgePrompts?: string[];
  approvalStatus: 'pending' | 'approved' | 'rejected';
  visibility: 'public' | 'internal';
}

const AIProfileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    allowedCategories: [{ type: String, lowercase: true, trim: true, select: false }],
    blockedCategories: [{ type: String, lowercase: true, trim: true, select: false }],
    thresholdAllowed: { type: Number, default: 0.25 },
    thresholdBlocked: { type: Number, default: 0.25 },
    similarityMargin: { type: Number, default: 0.05 },
    createdBy: { type: String, required: true },
    creatorEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    contentPrompts:  { type: [String], select: false },
    behaviorPrompts:  { type: [String], select: false },
    knowledgePrompts:  { type: [String], select: false },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    visibility: {
      type: String,
      enum: ['public', 'internal'],
      default: 'public',
    },
  },
  { timestamps: true },
);

AIProfileSchema.index({ creatorEmail: 1 });
AIProfileSchema.index({ name: 1 });
AIProfileSchema.index({ approvalStatus: 1, visibility: 1 });


export const AIProfile = mongoose.model<AIProfileDoc>("AIProfile", AIProfileSchema, "ai-profiles");
