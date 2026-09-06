/**
 * server/src/models/prompt.ts
 *
 * Mongoose model for stored prompt templates or canned text used in the system.
 */

import mongoose from "mongoose";

export interface PromptDoc extends mongoose.Document {
  code: string;
  category?: string;
  content: string;
  description?: string;
  status: "pending" | "active" | "deprecated";
  isActive: boolean;
  order?: number;
}

const PromptSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    category: { type: String, trim: true },
    content: { type: String, required: true },
    description: { type: String },
    status: { 
      type: String, 
      enum: ["pending", "active", "deprecated"],
      default: "active"
    },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

PromptSchema.index({ category: 1 });
PromptSchema.index({ isActive: 1, status: 1 });
PromptSchema.index({ order: 1 });

export const Prompt = mongoose.model<PromptDoc>("Prompt", PromptSchema);
