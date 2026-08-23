/**
 * Token Manager Utility
 * Handles token refresh, expiration detection, and session management
 */

import { API_ENDPOINTS } from '../config/api';

interface TokenRefreshResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
}

// Track if we're currently refreshing to avoid multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

// Track user activity
let lastActivityTime = Date.now();
let activityCheckInterval: number | null = null;
let sessionWarningTimeout: number | null = null;

// Configuration
const INACTIVITY_WARNING_TIME = 14 * 60 * 1000; // 14 minutes (before 15min token expiry)
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'];

/**
 * Subscribe to token refresh completion
 */
function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

/**
 * Notify all subscribers when token is refreshed
 */
function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!refreshToken) {
    console.error('No refresh token available');
    return null;
  }

  if (isRefreshing) {
    // Wait for the ongoing refresh to complete
    return new Promise((resolve) => {
      subscribeTokenRefresh((token: string) => {
        resolve(token);
      });
    });
  }

  isRefreshing = true;

  try {
    const response = await fetch(API_ENDPOINTS.auth.login.replace('/login', '/refresh'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data: TokenRefreshResponse = await response.json();

    if (data.success && data.accessToken) {
      // Update tokens in localStorage
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      
      // Notify subscribers
      onTokenRefreshed(data.accessToken);
      
      return data.accessToken;
    }

    throw new Error('Invalid refresh response');
  } catch (error) {
    console.error('Token refresh error:', error);
    
    // Clear tokens and redirect to login
    handleSessionExpired();
    
    return null;
  } finally {
    isRefreshing = false;
  }
}

/**
 * Handle session expiration - show warning or logout
 */
export function handleSessionExpired() {
  // Clear all auth data
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('userRole');
  
  // Stop activity tracking
  stopActivityTracking();
  
  // Redirect to home page
  window.location.href = '/';
}

/**
 * Show session expiration warning dialog
 */
function showSessionWarning() {
  const shouldStayLoggedIn = window.confirm(
    'הפעילות שלך הסתיימה. האם ברצונך להישאר מחובר?\n\n' +
    'לחץ "אישור" כדי להישאר מחובר, או "ביטול" כדי להתנתק.'
  );

  if (shouldStayLoggedIn) {
    // User wants to stay logged in - refresh the token
    updateActivity();
    refreshAccessToken().then(token => {
      if (token) {
        // Successfully refreshed - reset activity tracking
        resetActivityTimer();
      } else {
        // Failed to refresh - logout
        handleSessionExpired();
      }
    });
  } else {
    // User chose to logout
    handleSessionExpired();
  }
}

/**
 * Update last activity time
 */
function updateActivity() {
  lastActivityTime = Date.now();
}

/**
 * Reset activity timer and schedule next warning
 */
function resetActivityTimer() {
  // Clear existing timeout
  if (sessionWarningTimeout) {
    clearTimeout(sessionWarningTimeout);
  }

  // Schedule warning before token expires
  sessionWarningTimeout = setTimeout(() => {
    showSessionWarning();
  }, INACTIVITY_WARNING_TIME);
}

/**
 * Check if user has been active and refresh token if needed
 */
function checkActivityAndRefresh() {
  const timeSinceActivity = Date.now() - lastActivityTime;
  
  // If user has been active in the last 10 minutes, refresh the token
  if (timeSinceActivity < TOKEN_REFRESH_INTERVAL) {
    refreshAccessToken();
  }
}

/**
 * Start tracking user activity
 */
export function startActivityTracking() {
  // Update activity on user interactions
  ACTIVITY_EVENTS.forEach(event => {
    document.addEventListener(event, updateActivity, { passive: true });
  });

  // Initial activity timestamp
  updateActivity();

  // Set up periodic token refresh check (every 10 minutes)
  activityCheckInterval = setInterval(checkActivityAndRefresh, TOKEN_REFRESH_INTERVAL);

  // Set up initial warning timer
  resetActivityTimer();
}

/**
 * Stop tracking user activity
 */
export function stopActivityTracking() {
  // Remove event listeners
  ACTIVITY_EVENTS.forEach(event => {
    document.removeEventListener(event, updateActivity);
  });

  // Clear intervals and timeouts
  if (activityCheckInterval) {
    clearInterval(activityCheckInterval);
    activityCheckInterval = null;
  }

  if (sessionWarningTimeout) {
    clearTimeout(sessionWarningTimeout);
    sessionWarningTimeout = null;
  }
}

/**
 * Initialize token management for authenticated users
 */
export function initializeTokenManager() {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');

  if (accessToken && refreshToken) {
    startActivityTracking();
  }
}

/**
 * Cleanup token manager (call on logout)
 */
export function cleanupTokenManager() {
  stopActivityTracking();
}
