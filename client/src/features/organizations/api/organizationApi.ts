import { apiCall, API_ENDPOINTS } from "../../../config/api";

interface OrganizationStatusResponse {
  data?: unknown;
}

export const getPendingOrganizations = async (): Promise<OrganizationStatusResponse> => {
    return apiCall<OrganizationStatusResponse>(API_ENDPOINTS.adminOrganizations.pending, { method: "GET" });
}

export const updateOrganizationStatus = async (id: string, status: "approved" | "rejected"): Promise<OrganizationStatusResponse> => {
    return apiCall<OrganizationStatusResponse>(`${API_ENDPOINTS.adminOrganizations.pending}/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
    });
}

export interface OrganizationOwner {
  _id: string;
  email?: string;
  name?: string;
}

export interface AdminOrganization {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  status: string;
  walletBalance: number;
  userCount: number;
  ownerId?: OrganizationOwner;
  createdAt: string;
}

export interface OrganizationUser {
  _id: string;
  email: string;
  name?: string;
  role: string;
  isActive: boolean;
  mode?: string;
  createdAt: string;
}

export interface OrganizationUsageSummary {
  userCount: number;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  walletBalance: number;
}

// רשימת כל הארגונים (Admin בלבד)
export const getAllOrganizations = async (): Promise<AdminOrganization[]> => {
  return apiCall<AdminOrganization[]>(API_ENDPOINTS.adminOrganizations.all, { method: "GET" });
};

// פרטי ארגון בודד
export const getOrganizationDetail = async (id: string): Promise<AdminOrganization> => {
  return apiCall<AdminOrganization>(API_ENDPOINTS.adminOrganizations.detail(id), { method: "GET" });
};

// משתמשי הארגון
export const getOrganizationUsers = async (id: string): Promise<OrganizationUser[]> => {
  return apiCall<OrganizationUser[]>(API_ENDPOINTS.adminOrganizations.users(id), { method: "GET" });
};

// סיכום שימוש + יתרת ארנק
export const getOrganizationStats = async (id: string): Promise<OrganizationUsageSummary> => {
  return apiCall<OrganizationUsageSummary>(API_ENDPOINTS.adminOrganizations.stats(id), { method: "GET" });
};

// השעיית ארגון
export const suspendOrganization = async (id: string): Promise<{ success: boolean }> => {
  return apiCall<{ success: boolean }>(API_ENDPOINTS.adminOrganizations.suspend(id), { method: "PATCH" });
};

// הפעלה מחדש של ארגון
export const activateOrganization = async (id: string): Promise<{ success: boolean }> => {
  return apiCall<{ success: boolean }>(API_ENDPOINTS.adminOrganizations.activate(id), { method: "PATCH" });
};