// server/src/models/agent.ts

import mongoose, { Schema, Document } from "mongoose";

export interface IAgent extends Document {
  // metadata ישירות מ-manifest.json
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
  technical_specifications: {
    framework: string;
    llm_provider: string;
    supported_models: string[];
    features_enabled: {
      rag: boolean;
      web_search: boolean;
      code_execution: boolean;
      mcp_support: boolean;
    };
    required_permissions: string[];
  };

  // נתונים שנוצרים ע"י המערכת
  icon: string;
  downloads: number;
  rating: number;
  ratingCount: number;
  isActive: boolean;
}

const TechSpecsSchema = new Schema({
  framework:          { type: String, default: "" },
  llm_provider:       { type: String, default: "" },
  supported_models:   [String],
  features_enabled: {
    rag:            { type: Boolean, default: false },
    web_search:     { type: Boolean, default: false },
    code_execution: { type: Boolean, default: false },
    mcp_support:    { type: Boolean, default: false },
  },
  required_permissions: [String],
}, { _id: false });

const AgentSchema = new Schema<IAgent>(
  {
    name:              { type: String, required: true },
    version:           { type: String, default: "1.0.0" },
    description:       { type: String, required: true },
    creator_name:      { type: String, required: true },
    contact_information: { type: String, default: "" },
    release_date:      { type: String, default: "" },
    repository_url:    { type: String, required: true, unique: true },
    download_url:      { type: String, required: true },
    target_audience:   { type: String, default: "" },
    professional_fields:           [String],
    tasks_capable_of_performing:   [String],
    examples_of_suitable_questions:[String],
    technical_specifications:      { type: TechSpecsSchema, default: {} },

    icon:        { type: String, default: "" },
    downloads:   { type: Number, default: 0 },
    rating:      { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Agent = mongoose.model<IAgent>("Agent", AgentSchema);