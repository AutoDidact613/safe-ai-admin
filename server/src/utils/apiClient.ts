// utils/apiClient.ts
//
// עוטף fetch רגיל, ומטפל אוטומטית בתוקף הטוקן:
// - שולח את ה-accessToken בכותרת Authorization בכל בקשה.
// - אם השרת מחזיר 401/403 (הטוקן פג תוקף - כפי שראינו, תוקפו 15 דקות בלבד),
//   מנסה לרענן אותו פעם אחת בעזרת ה-refreshToken, ואז שולח את הבקשה המקורית שוב.
// - אם גם הרענון נכשל (למשל refreshToken פג תוקף אחרי 7 ימים), מנקה את
//   פרטי ההתחברות מ-localStorage כדי שהמשתמשת תתחבר מחדש.
//
// הערה: השם המדויק של השדות בתשובת /auth/refresh (accessToken/refreshToken)
// הוא הנחה סבירה לפי המבנה הקיים - חשוב לאמת בפועל (Network tab) ולעדכן אם צריך.

const API_BASE_URL = 'http://localhost:5000';

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
  } catch (err) {
    console.warn('[authFetch] לא הצלחתי לפענח את תוקף הטוקן:', err);
    return null;
  }
}

/**
 * בודק אם הטוקן כבר פג, או עומד לפוג בתוך חלון הזמן הקרוב (buffer).
 * ה-buffer מונע מצב שבו הטוקן פג בדיוק באמצע הבקשה עצמה.
 */
function isTokenExpiringSoon(token: string | null, bufferMs = 30_000): boolean {
  if (!token) return true;
  const expMs = decodeJwtExpiry(token);
  if (expMs === null) return false; // אם לא ניתן לפענח, לא נכפה רענון - נסמוך על הרשת הביטחון (401)
  return Date.now() >= (expMs - bufferMs);
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    console.warn('[authFetch] אין refreshToken ב-localStorage - לא ניתן לרענן, צריך להתחבר מחדש.');
    return null;
  }

  try {
    console.log('[authFetch] שולח בקשת רענון ל-/auth/refresh...');
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const rawText = await res.text();
    console.log(`[authFetch] תשובת /auth/refresh - סטטוס: ${res.status}, גוף:`, rawText);

    if (!res.ok) {
      console.error('[authFetch] הרענון נכשל - השרת דחה את הבקשה. בדקי אם authController.ts מצפה לשם שדה אחר מ-refreshToken.');
      return null;
    }

    const data = JSON.parse(rawText);

    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      console.log('[authFetch] accessToken חדש נשמר בהצלחה.');
    } else {
      console.warn('[authFetch] תשובת הרענון לא הכילה שדה accessToken. שדות שהתקבלו בפועל:', Object.keys(data));
    }
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }

    return data.accessToken || null;
  } catch (err) {
    console.error('[authFetch] שגיאת רשת בזמן ניסיון הרענון:', err);
    return null;
  }
}

/**
 * גרסה מאומתת של fetch:
 * 1. רענון מונע - בודקת מראש אם ה-accessToken כבר פג/עומד לפוג, ומרעננת לפני השליחה.
 * 2. רשת ביטחון תגובתית - אם בכל זאת מתקבל 401/403 (למשל אי-סנכרון שעון), מרעננת ומנסה שוב פעם אחת.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // === בדיקה זמנית - למחוק אחרי שמאשרים שהקוד רץ ===
  alert('authFetch גרסה עם לוגים רצה כרגע! הולכת ל: ' + url);
  // ===================================================

  const buildOptions = (token: string | null): RequestInit => ({
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let accessToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
  console.log(`[authFetch] ${url} - accessToken קיים? ${!!accessToken}`);

  // שלב 1: רענון מונע - לפני שהבקשה נשלחת בכלל
  if (isTokenExpiringSoon(accessToken)) {
    console.log('[authFetch] הטוקן פג/עומד לפוג - מנסה רענון מונע לפני השליחה...');
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      accessToken = refreshed;
    }
  }

  let response = await fetch(url, buildOptions(accessToken));
  console.log(`[authFetch] ${url} - סטטוס תשובה: ${response.status}`);

  // שלב 2: רשת ביטחון - אם בכל זאת נכשל על אימות, ננסה רענון תגובתי פעם אחת
  if (response.status === 401 || response.status === 403) {
    console.log('[authFetch] התקבל 401/403 - מנסה רענון תגובתי כרשת ביטחון...');
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await fetch(url, buildOptions(newToken));
      console.log(`[authFetch] ${url} - סטטוס אחרי ניסיון חזרה: ${response.status}`);
    } else {
      console.error('[authFetch] גם הרענון התגובתי נכשל - מנקה טוקנים מ-localStorage. צריך להתחבר מחדש.');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  }

  return response;
}