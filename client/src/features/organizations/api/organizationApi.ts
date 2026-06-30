import { apiCall, API_ENDPOINTS } from "../../../config/api";

interface OrganizationStatusResponse {
  data?: unknown;
}

interface CreateOrganizationRequest {
  name: string;
  description?: string;
}

export const createOrganization = async (
  organization: CreateOrganizationRequest
): Promise<OrganizationStatusResponse> => {
  return apiCall<OrganizationStatusResponse>(API_ENDPOINTS.organizations, {
    method: "POST",
    body: JSON.stringify(organization),
  });
};

export const getPendingOrganizations = async (): Promise<OrganizationStatusResponse> => {
    return apiCall<OrganizationStatusResponse>(API_ENDPOINTS.adminOrganizations.pending, { method: "GET" });
}

export const updateOrganizationStatus = async (id: string, status: "approved" | "rejected"): Promise<OrganizationStatusResponse> => {
    return apiCall<OrganizationStatusResponse>(`${API_ENDPOINTS.adminOrganizations.pending}/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
    });
}