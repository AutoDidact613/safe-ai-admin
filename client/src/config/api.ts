// API Configuration
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  auth: {
    login: `${API_BASE_URL}/auth/login`,
    register: `${API_BASE_URL}/auth/register`,
    verifyEmail: (token: string) =>
      `${API_BASE_URL}/auth/verify-email/${token}`,
    forgotPassword: `${API_BASE_URL}/auth/forgot-password`,
    resetPassword: `${API_BASE_URL}/auth/reset-password`,
    googleLogin: `${API_BASE_URL}/auth/google`,
    googleCallback: `${API_BASE_URL}/auth/google/callback`,
    me: `${API_BASE_URL}/auth/me`,
  },
  // Resource endpoints
  profiles: `${API_BASE_URL}/profiles`,
  users: `${API_BASE_URL}/users`,
  filter: `${API_BASE_URL}/filter`,
  providerKeys: `${API_BASE_URL}/provider-keys`,
  organizations: `${API_BASE_URL}/organizations`,
  adminOrganizations: {
    pending: `${API_BASE_URL}/organizations/pending`, 
  },
  // Proxy key endpoints (user's own proxy key)
  proxyKey: {
    info: `${API_BASE_URL}/proxy-key`,
    regenerate: `${API_BASE_URL}/proxy-key/regenerate`,
    toggle: `${API_BASE_URL}/proxy-key/toggle`,
  },
  // Usage endpoints
  usage: {
    stats: `${API_BASE_URL}/usage/stats`,
    daily: `${API_BASE_URL}/usage/daily`,
    byModel: `${API_BASE_URL}/usage/by-model`,
    limits: `${API_BASE_URL}/usage/limits`,
    costs: `${API_BASE_URL}/usage/costs`,
  },
  // Admin statistics endpoints
  adminStats: {
    stats: `${API_BASE_URL}/admin/stats/stats`,
    daily: `${API_BASE_URL}/admin/stats/daily`,
    users: `${API_BASE_URL}/admin/stats/users`,
    models: `${API_BASE_URL}/admin/stats/models`,
  },
  // Contact form endpoint
  contact: `${API_BASE_URL}/contact`,

  // Agents Marketplace endpoints
  agents: {
    list:                `${API_BASE_URL}/agents`,
    byId:                (id: string) => `${API_BASE_URL}/agents/${id}`,
    create:              `${API_BASE_URL}/agents`,
    fetchManifest:       `${API_BASE_URL}/agents/fetch-manifest`,
    validateDownloadUrl: `${API_BASE_URL}/agents/validate-download-url`,
    generateIcon:        `${API_BASE_URL}/agents/generate-icon`,
    recordDownload:      (id: string) => `${API_BASE_URL}/agents/${id}/download`,
    stats:               `${API_BASE_URL}/agents/stats`,
  },
} as const;

// Helper function for API calls
export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  // Get access token from localStorage
  const accessToken = localStorage.getItem("accessToken");

  const makeRequest = async (token: string | null) => {
    return fetch(endpoint, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });
  };

  let response = await makeRequest(accessToken);

  // If we get a 401 and have a refresh token, try to refresh
  if (response.status === 401 && accessToken) {
    const refreshToken = localStorage.getItem("refreshToken");
    
    if (refreshToken) {
      try {
        // Try to refresh the token
        const refreshResponse = await fetch(API_ENDPOINTS.auth.login.replace('/login', '/refresh'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          
          if (refreshData.success && refreshData.accessToken) {
            // Update tokens
            localStorage.setItem('accessToken', refreshData.accessToken);
            localStorage.setItem('refreshToken', refreshData.refreshToken);
            
            // Retry the original request with new token
            response = await makeRequest(refreshData.accessToken);
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Clear tokens and let the error handling below take care of it
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        localStorage.removeItem("userRole");
      }
    }
  }

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));

    if (response.status === 401) {
      // Token refresh failed or no refresh token - clear everything
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("userRole");
      
      // Redirect to home page
      window.location.href = '/';
    }

    const error = new Error(
      errorData.message || errorData.error || `HTTP ${response.status}`,
    ) as Error & {
      status?: number;
      code?: string;
    };

    error.status = response.status;
    error.code = errorData.code;

    throw error;
  }

  return response.json();
}
