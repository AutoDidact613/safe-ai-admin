/**
 * client/src/features/agents/types/agent.types.ts
 *
 * Client-side interfaces reflecting API response shapes.
 * Not imported from server — defined independently to match JSON responses.
 */

export interface AgentTechnicalSpecs {
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
}

export interface Agent {
  _id: string;
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
  icon: string;
  downloads: number;
  rating: number;
  ratingCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentManifest {
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
}

export interface AgentFilters {
  search: string;
  professional_field: string;
  task: string;
  framework: string;
  sortBy: "downloads" | "rating" | "newest";
}

export interface AgentsListResponse {
  success: boolean;
  agents: Agent[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AgentStatsResponse {
  success: boolean;
  totalAgents: number;
  totalDownloads: number;
  topByDownloads: Agent[];
  newest: Agent[];
  topByRating: Agent[];
  frameworkStats: { _id: string; count: number }[];
}
