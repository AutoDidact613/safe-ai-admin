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
    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    
    // פיענוח בטוח שתומך בתווים מיוחדים, בעברית ובכל קידוד אונברסלי
    const jsonPayload = decodeURIComponent(
      atob(normalized)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload);
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
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();

    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
    }
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }

    return data.accessToken || null;
  } catch (err) {
    console.error('Token refresh failed:', err);
    return null;
  }
}

/**
 * גרסה מאומתת של fetch:
 * 1. רענון מונע - בודקת מראש אם ה-accessToken כבר פג/עומד לפוג, ומרעננת לפני השליחה.
 * 2. רשת ביטחון תגובתית - אם בכל זאת מתקבל 401/403 (למשל אי-סנכרון שעון), מרעננת ומנסה שוב פעם אחת.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const buildOptions = (token: string | null): RequestInit => ({
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let accessToken = localStorage.getItem('accessToken') || localStorage.getItem('token');

  // שלב 1: רענון מונע - לפני שהבקשה נשלחת בכלל
  if (isTokenExpiringSoon(accessToken)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      accessToken = refreshed;
    }
  }

  let response = await fetch(url, buildOptions(accessToken));

  // שלב 2: רשת ביטחון - אם בכל זאת נכשל על אימות, ננסה רענון תגובתי פעם אחת
  if (response.status === 401 || response.status === 403) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await fetch(url, buildOptions(newToken));
    } else {
      // גם הרענון נכשל - כנראה שגם ה-refreshToken פג תוקף
      localStorage.removeItem('accessToken');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  }

  return response;
}