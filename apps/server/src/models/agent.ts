/**
 * server/src/models/agent.ts
 *
 * Mongoose model for the Agents Marketplace.
 * Stores all manifest.json fields + system-generated data (icon, downloads, rating).
 */

import mongoose from "mongoose";
import { AgentTechnicalSpecs } from "../types/agentTypes";

export interface IAgent extends mongoose.Document {
  // manifest.json fields
  name: string;
  version: string;
  description: string;
  creator_name: string;
  contact_information: string;
  release_date: string;
  repository_url: string;
  download_url: string;
  target_audience: string;
  professional_fields: string[];
  tasks_capable_of_performing: string[];
  examples_of_suitable_questions: string[];
  technical_specifications: AgentTechnicalSpecs;

  // system-generated
  icon: string;
  downloads: number;
  rating: number;
  ratingCount: number;
  isActive: boolean;
}

const TechnicalSpecsSchema = new mongoose.Schema(
  {
    framework: { type: String, default: "" },
    llm_provider: { type: String, default: "" },
    supported_models: [String],
    features_enabled: {
      rag: { type: Boolean, default: false },
      web_search: { type: Boolean, default: false },
      code_execution: { type: Boolean, default: false },
      mcp_support: { type: Boolean, default: false },
    },
    required_permissions: [String],
  },
  { _id: false }
);

const AgentSchema = new mongoose.Schema<IAgent>(
  {
    name: { type: String, required: true, trim: true },
    version: { type: String, default: "1.0.0" },
    description: { type: String, required: true },
    creator_name: { type: String, required: true, trim: true },
    contact_information: { type: String, default: "" },
    release_date: { type: String, default: "" },
    repository_url: { type: String, required: true, unique: true, trim: true },
    download_url: { type: String, required: true },
    target_audience: { type: String, default: "" },
    professional_fields: [String],
    tasks_capable_of_performing: [String],
    examples_of_suitable_questions: [String],
    technical_specifications: {
      type: TechnicalSpecsSchema,
      default: {},
    },
    icon: { type: String, default: "" },
    downloads: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Index for search and filtering
AgentSchema.index({ name: "text", description: "text" });
AgentSchema.index({ professional_fields: 1 });
AgentSchema.index({ "technical_specifications.framework": 1 });
AgentSchema.index({ downloads: -1 });

export const Agent = mongoose.model<IAgent>("Agent", AgentSchema);
