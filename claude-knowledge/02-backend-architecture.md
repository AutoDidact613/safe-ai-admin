# SafeAI — ארכיטקטורת השרת

## שכבות (layered architecture)
זרימה אחידה לכל פיצ'ר:
```
route → controller → service → repository → model (Mongoose) → MongoDB
```
- **routes/** — מגדירים נתיב + middleware + קושרים ל-handler ב-controller.
- **controllers/** — שכבת HTTP בלבד: קוראים `req`, מפעילים service, מחזירים `res`. בלי לוגיקה עסקית כבדה.
- **services/** — הלוגיקה העסקית (authService, userService, profileService, proxyService, filterService, usageTracker, organizationService, llmService...).
- **repositories/** — כל גישה ל-DB עוברת כאן (userRepository, profileRepository, organizationRepository, embeddingRepository, evaluationRepository...).
- **models/** — סכמות Mongoose.

> כשמוסיפים פיצ'ר חדש — שומרים על אותה שרשרת. לא ניגשים ל-Model ישירות מ-controller.

## נקודת הכניסה — `server/src/index.ts`
- מפעיל `dotenv`, יוצר `express()`.
- **CORS:** origin מוגבל ל-`http://localhost:5173` ו-`http://localhost:3000`, `credentials: true`. (ב-production מוסיפים את ה-origin של ה-console — ראה [07-deployment-and-env.md].)
- `express.json({ limit: "50mb" })` — מאפשר payloads גדולים.
- `requestLogger` (Winston) על כל בקשה.
- `GET /health` → `"OK"`.
- בסוף: `errorHandler`, ואז `connectDatabase()` ו-`app.listen(PORT)`.

## הרשמת ה-routers ורמות ההגנה
מתוך `index.ts` — שימו לב לאיזה middleware עוטף כל קבוצה:

| Mount | Router | הגנה |
|-------|--------|------|
| `/auth` | authRouter | **ציבורי** (login/register/refresh/verify/reset) |
| `/users/:id` (PATCH) | updateOwnProfileHandler | `authenticateToken` (עדכון פרופיל עצמי) |
| `/usage` | usageRouter | auth בתוך הראוטר |
| `/users` | userRouter | `authenticateToken` + **`requireAdmin`** |
| `/profiles` | profileRouter | `authenticateToken` |
| `/provider-keys` | providerKeyRouter | `authenticateToken` |
| `/proxy-key` | proxyKeyRouter | ניהול ה-proxy key של המשתמש עצמו |
| `/admin/stats` | adminStatsRouter | auth בתוך הראוטר |
| `/prompts` | promptRouter | `authenticateToken` (admin-routes מוגנים בראוטר) |
| `/organizations` | organizationRouter | auth בתוך הראוטר (חלק ציבורי) |
| `/contact` | contactRouter | דורש auth |
| `/filter` | filterRouter | **ציבורי** — הערכת סינון ישירה |
| `/v1` | openaiRouter | **`proxyAuth`** (מפתח proxy, לא JWT) — נתיב ה-proxy ל-LLM |

## שני סוגי אימות
1. **JWT** (`middleware/auth.ts`: `authenticateToken`, `requireAdmin`) — לפאנל הניהול. Access + refresh tokens.
2. **Proxy API key** (`middleware/proxyAuth.ts`) — לנתיב `/v1`. מאמת את ה-`sk-safeai-...` של המשתמש מול `proxyKeyHash`, וטוען את הפרופיל שלו לסינון.

## Middleware נוסף
- `rateLimiter.ts` — הגבלת קצב (express-rate-limit).
- `requestLogger.ts` — לוג מובנה לכל בקשה.
- `errorHandler.ts` — מטפל שגיאות מרכזי (בסוף ה-stack).

## נתיב ה-proxy (`/v1`) בקצרה
`openaiRouter` → `proxyAuth` → `proxyService` → `guardInput` (סינון) → אם מאושר: העברה ל-LiteLLM → `usageTracker` רושם שימוש/עלות. אם נחסם: מוחזרת **תשובת דמה** בפורמט ה-API המתאים (chat / responses / anthropic), כולל תמיכה ב-streaming (SSE). ראה [05-safety-filter-engine.md].

תמיכה במספר פורמטי API: OpenAI Chat Completions, OpenAI Responses API, ו-Anthropic Messages (דרך `anthropicAdapter.ts`).
