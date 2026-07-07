// API Configuration
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  auth: {
    login: `${API_BASE_URL}/auth/login`,
    refresh: `${API_BASE_URL}/auth/refresh`,
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
    all: `${API_BASE_URL}/organizations/admin/all`,
    detail: (id: string) => `${API_BASE_URL}/organizations/${id}`,
    users: (id: string) => `${API_BASE_URL}/organizations/${id}/users`,
    members: (id: string) => `${API_BASE_URL}/organizations/${id}/members`,
    stats: (id: string) => `${API_BASE_URL}/organizations/${id}/stats`,
    suspend: (id: string) => `${API_BASE_URL}/organizations/${id}/suspend`,
    activate: (id: string) => `${API_BASE_URL}/organizations/${id}/activate`,
    approve: (id: string) => `${API_BASE_URL}/organizations/${id}/approve`,
    reject: (id: string) => `${API_BASE_URL}/organizations/${id}/reject`,
    publicRequest: `${API_BASE_URL}/organizations/public-request`,
    my: `${API_BASE_URL}/organizations/my`,
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
  contactTypes: `${API_BASE_URL}/contact-types`,
  myRequests: `${API_BASE_URL}/contact/my-requests`,
  allRequests: `${API_BASE_URL}/contact/all`,
  // AI News endpoints
  news: `${API_BASE_URL}/api/news`,
  // Tender board endpoints
  tenders: {
    list: `${API_BASE_URL}/tender-board`,
    create: `${API_BASE_URL}/tender-board`,
    smartCreate: `${API_BASE_URL}/tender-board/smart-create`,
    smartSearch: `${API_BASE_URL}/tender-board/smart-search`,
    getAIApplicationTypes: `${API_BASE_URL}/tender-board/ai-application-types`,
    getProductTypes: `${API_BASE_URL}/tender-board/product-types`,
    update: (id: string) => `${API_BASE_URL}/tender-board/${id}`,
    close:  (id: string) => `${API_BASE_URL}/tender-board/${id}/close`,
    delete: (id: string) => `${API_BASE_URL}/tender-board/${id}`,
    apply: (id: string) => `${API_BASE_URL}/tender-board/${id}/apply`,
  },
  // Articles / Docs endpoints
  articles: {
    list: `${API_BASE_URL}/articles`,
    all: `${API_BASE_URL}/articles/all`,
    bySlug: (slug: string) => `${API_BASE_URL}/articles/${slug}`,
  },
} as const;

// Helper function for API calls
export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit & { signal?: AbortSignal },
): Promise<T> {
  // Get access token from localStorage
  const accessToken = localStorage.getItem("accessToken");

  // If a relative endpoint is provided (starts with '/'), prepend the API base URL
  const resolveUrl = (ep: string) =>
    ep.startsWith("http") ? ep : `${API_BASE_URL}${ep}`;

  const makeRequest = async (token: string | null) => {
    const url = resolveUrl(endpoint);
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });
  };

  const hadToken = !!accessToken;

  let response = await makeRequest(accessToken);

  // If we get a 401 and have a refresh token, try to refresh
  if (response.status === 401 && accessToken) {
    const refreshToken = localStorage.getItem("refreshToken");

    if (refreshToken) {
      try {
        // Try to refresh the token
        const refreshResponse = await fetch(API_ENDPOINTS.auth.refresh, {
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

    if (response.status === 401 && hadToken) {
      // We had a session that the server no longer accepts (expired/invalid token) -
      // clear it and send the user to log in again. A 401 from an unauthenticated
      // call (e.g. wrong email/password on /auth/login) must NOT trigger this: there
      // was no session to expire, and redirecting would just interrupt the login form.
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("userRole");

      window.location.href = '/login';
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