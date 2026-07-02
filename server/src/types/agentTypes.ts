/**
 * server/src/types/agent.types.ts
 *
 * TypeScript interfaces for the Agents Marketplace feature.
 * Used by: agent model, agentService, agentController.
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
  search?: string;
  professional_field?: string;
  task?: string;
  framework?: string;
  sortBy?: "downloads" | "rating" | "newest";
  page?: number;
  limit?: number;
}

export interface ValidateUrlResult {
  valid: boolean;
  error?: string;
}

export interface GenerateIconResult {
  svg: string;
}
