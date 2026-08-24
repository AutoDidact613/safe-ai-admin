// utils/apiClient.ts
//
// עוטף fetch רגיל, ומטפל אוטומטית בתוקף הטוקן.
//
// חשוב: הרענון עצמו (refreshAccessToken) מיובא מ-tokenManager.ts ולא ממומש
// כאן מחדש. tokenManager.ts כבר מריץ רענון פרואקטיבי ברקע (טיימר כל 10 דקות)
// ומכיל נעילת isRefreshing שמונעת שתי בקשות רענון מקבילות. אם apiClient.ts
// היה מממש רענון נפרד משלו, שתי הקריאות היו יכולות "להתנגש" מול ה-refreshToken
// המסתובב (rotating) של השרת - רענון אחד היה מבטל את הטוקן שהשני בדיוק קיבל.

import { refreshAccessToken } from './tokenManager';

/**
 * מפענח את חלק ה-Payload של JWT (בלי אימות חתימה - זה נעשה בשרת בלבד).
 * מחזיר את זמן התפוגה (exp) במילישניות, או null אם לא ניתן לפענח.
 */
function decodeJwtExpiry(token: string): number | null {
  try {
    const payloadBase64 = token.split('.')[1];
    // JWT מקודד ב-base64url, לא ב-base64 רגיל - יש להמיר את התווים המיוחדים
    // (- ו-_) לפני שמשתמשים ב-atob, אחרת הפענוח נכשל בשקט על טוקנים מסוימים
    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(normalized));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * בודק אם הטוקן כבר פג, או עומד לפוג בתוך חלון הזמן הקרוב (buffer).
 */
function isTokenExpiringSoon(token: string | null, bufferMs = 30_000): boolean {
  if (!token) return true;
  const expMs = decodeJwtExpiry(token);
  if (expMs === null) return false;
  return Date.now() >= (expMs - bufferMs);
}

/**
 * גרסה מאומתת של fetch:
 * 1. רענון מונע - בודקת מראש אם ה-accessToken כבר פג/עומד לפוג, ומרעננת לפני השליחה.
 * 2. רשת ביטחון תגובתית - אם בכל זאת מתקבל 401/403, מרעננת ומנסה שוב פעם אחת.
 * בשני המקרים משתמשת ב-refreshAccessToken המשותף מ-tokenManager.ts.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const buildOptions = (token: string | null): RequestInit => ({
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let accessToken = localStorage.getItem('accessToken');

  if (isTokenExpiringSoon(accessToken)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      accessToken = refreshed;
    }
  }

  let response = await fetch(url, buildOptions(accessToken));

  if (response.status === 401 || response.status === 403) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await fetch(url, buildOptions(newToken));
    }
    // לא מוחקים טוקנים כאן בעצמנו - tokenManager.handleSessionExpired()
    // כבר עושה את זה בתוך refreshAccessToken אם הרענון נכשל לחלוטין.
  }

  return response;
}