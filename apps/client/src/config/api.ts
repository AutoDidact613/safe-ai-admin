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
    changePassword: `${API_BASE_URL}/auth/change-password`,
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
  // Public statistics endpoint (no auth — landing page counts)
  publicStats: `${API_BASE_URL}/public-stats`,
  // Admin statistics endpoints
  adminStats: {
    stats: `${API_BASE_URL}/admin/stats/stats`,
    daily: `${API_BASE_URL}/admin/stats/daily`,
    users: `${API_BASE_URL}/admin/stats/users`,
    models: `${API_BASE_URL}/admin/stats/models`,
  },
  // Direct-to-S3 upload endpoint (generic, used for post/comment attachments and screen captures)
  upload: {
    getUrl: `${API_BASE_URL}/api/upload/get-url`,
  },
  // Contact form endpoint
  contact: `${API_BASE_URL}/contact`,
  contactTypes: `${API_BASE_URL}/contact-types`,
  contactAttachments: `${API_BASE_URL}/contact/attachments`,
  myRequests: `${API_BASE_URL}/contact/my-requests`,
  allRequests: `${API_BASE_URL}/contact/all`,
  // AI News endpoints
  news: `${API_BASE_URL}/api/news`,
  // Forum endpoints
  posts: `${API_BASE_URL}/api/posts`,
  // Tender board endpoints
  tenders: {
    list: `${API_BASE_URL}/tender-board`,
    create: `${API_BASE_URL}/tender-board`,
    smartCreate: `${API_BASE_URL}/tender-board/smart-create`,
    smartSearch: `${API_BASE_URL}/tender-board/smart-search`,
    getAIApplicationTypes: `${API_BASE_URL}/tender-board/ai-application-types`,
    getProductTypes: `${API_BASE_URL}/tender-board/product-types`,
    getOne: (id: string) => `${API_BASE_URL}/tender-board/${id}`,
    update: (id: string) => `${API_BASE_URL}/tender-board/${id}`,
    close:  (id: string) => `${API_BASE_URL}/tender-board/${id}/close`,
    viewOffers: (id: string) => `${API_BASE_URL}/tender-board/${id}/view-offers`,
    delete: (id: string) => `${API_BASE_URL}/tender-board/${id}`,
    apply: (id: string) => `${API_BASE_URL}/tender-board/${id}/apply`,
    generateSpecification: (id: string) => `${API_BASE_URL}/tender-board/${id}/generate-specification-request`,
    cancelSpecification: (id: string) => `${API_BASE_URL}/tender-board/${id}/cancel-specification-request`,
    publishSpecification: (id: string) => `${API_BASE_URL}/tender-board/${id}/specification/publish`,
  },
  // Professional profile endpoints (tender board)
  professionalProfile: {
    me: `${API_BASE_URL}/professional-profile/me`,
    create: `${API_BASE_URL}/professional-profile`,
    update: `${API_BASE_URL}/professional-profile`,
    addResume: `${API_BASE_URL}/professional-profile/resume`,
    removeResume: (fileKey: string) =>
      `${API_BASE_URL}/professional-profile/resume/${encodeURIComponent(fileKey)}`,
  },
  // Articles / Docs endpoints
  articles: {
    list: `${API_BASE_URL}/articles`,
    all: `${API_BASE_URL}/articles/all`,
    bySlug: (slug: string) => `${API_BASE_URL}/articles/${slug}`,
  },
  // PayMe wallet top-up endpoints
  payme: {
    initiate: (organizationId: string) =>
      `${API_BASE_URL}/organizations/${organizationId}/wallet/payme/initiate`,
    status: (organizationId: string, transactionId: string) =>
      `${API_BASE_URL}/organizations/${organizationId}/wallet/payme/status/${transactionId}`,
  },
} as const;

type RefreshedTokens = { accessToken: string; refreshToken: string };

// Actually calls the refresh endpoint once. Returns null on any failure
// (network error, non-2xx response, or a malformed body) instead of
// throwing - the caller decides what a failed refresh means.
async function performTokenRefresh(refreshToken: string): Promise<RefreshedTokens | null> {
  try {
    const res = await fetch(API_ENDPOINTS.auth.refresh, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.accessToken && data.refreshToken) {
      return { accessToken: data.accessToken, refreshToken: data.refreshToken };
    }
    return null;
  } catch (err) {
    console.error("Token refresh failed:", err);
    return null;
  }
}

// Shared by every concurrent caller so only one real refresh request is ever
// in flight at a time. The server rotates refresh tokens - the old one stops
// working the instant the first refresh succeeds - so if several requests
// each independently 401 around the same moment (e.g. a page mounting
// several components that all fetch data at once) and each tried its own
// refresh, only the first would succeed; every other one would present the
// now-already-rotated old refresh token, get rejected, and wipe out the
// valid tokens the first call just stored - logging the user out despite a
// perfectly good session having existed a moment earlier. Sharing this
// promise means every 401 waits for and reuses the one real attempt.
let inFlightRefresh: Promise<RefreshedTokens | null> | null = null;

function refreshTokensOnce(refreshToken: string): Promise<RefreshedTokens | null> {
  if (!inFlightRefresh) {
    inFlightRefresh = performTokenRefresh(refreshToken).finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

// Helper function for API calls
export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit & { signal?: AbortSignal },
): Promise<T> {
  // Get access token from localStorage
  const accessToken = localStorage.getItem("accessToken");

  // Most callers pass an API_ENDPOINTS.* value, which already has API_BASE_URL
  // baked in (e.g. "/api/auth/register") — prepending it again here would
  // double it up. Only bare relative paths that don't already carry the base
  // (e.g. "/contact/my-requests/123") need it added.
  const resolveUrl = (ep: string) => {
    if (ep.startsWith("http")) return ep;
    if (API_BASE_URL && ep.startsWith(API_BASE_URL)) return ep;
    return `${API_BASE_URL}${ep}`;
  };

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
      // Concurrent 401s (e.g. several components fetching on mount) share
      // this single in-flight refresh instead of each racing their own -
      // see refreshTokensOnce for why that race silently logs users out.
      const refreshed = await refreshTokensOnce(refreshToken);

      if (refreshed) {
        localStorage.setItem("accessToken", refreshed.accessToken);
        localStorage.setItem("refreshToken", refreshed.refreshToken);

        // Retry the original request with new token
        response = await makeRequest(refreshed.accessToken);
      } else {
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