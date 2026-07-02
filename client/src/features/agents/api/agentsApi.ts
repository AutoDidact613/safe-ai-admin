/**
 * client/src/features/agents/api/agentsApi.ts
 *
 * All API calls for the Agents Marketplace.
 * Uses API_ENDPOINTS from config/api.ts.
 */

import { API_ENDPOINTS, apiCall } from "../../../config/api";
import {
  Agent,
  AgentFilters,
  AgentManifest,
  AgentsListResponse,
  AgentStatsResponse,
} from "../types/agent.types";

export async function fetchAgents(
  filters: Partial<AgentFilters> & { page?: number }
): Promise<AgentsListResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.professional_field) params.set("professional_field", filters.professional_field);
  if (filters.task) params.set("task", filters.task);
  if (filters.framework) params.set("framework", filters.framework);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.page) params.set("page", String(filters.page));

  const url = `${API_ENDPOINTS.agents.list}?${params.toString()}`;
  return apiCall<AgentsListResponse>(url);
}

export async function fetchAgentById(id: string): Promise<{ success: boolean; agent: Agent }> {
  return apiCall<{ success: boolean; agent: Agent }>(API_ENDPOINTS.agents.byId(id));
}

export async function fetchManifest(
  repositoryUrl: string
): Promise<{ success: boolean; manifest: AgentManifest; urlValidation: { valid: boolean; error?: string } }> {
  return apiCall(API_ENDPOINTS.agents.fetchManifest, {
    method: "POST",
    body: JSON.stringify({ repository_url: repositoryUrl }),
  });
}

export async function validateDownloadUrl(
  url: string
): Promise<{ success: boolean; valid: boolean; error?: string }> {
  return apiCall(API_ENDPOINTS.agents.validateDownloadUrl, {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function generateIcon(
  name: string,
  description: string
): Promise<{ success: boolean; svg: string }> {
  return apiCall(API_ENDPOINTS.agents.generateIcon, {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

export async function submitAgent(
  repositoryUrl: string,
  icon: string
): Promise<{ success: boolean; agent: Agent }> {
  return apiCall(API_ENDPOINTS.agents.create, {
    method: "POST",
    body: JSON.stringify({ repository_url: repositoryUrl, icon }),
  });
}

export async function recordDownload(id: string): Promise<void> {
  await apiCall(API_ENDPOINTS.agents.recordDownload(id), { method: "POST" });
}

export async function fetchStats(): Promise<AgentStatsResponse> {
  return apiCall<AgentStatsResponse>(API_ENDPOINTS.agents.stats);
}
