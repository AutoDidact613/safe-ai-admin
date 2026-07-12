# SafeAI — מפת ה-API (REST)

בסיס בפיתוח: `http://localhost:3001`. הרשמת ה-routers ב-`server/src/index.ts`.
שתי שיטות אימות: **JWT** (פאנל) ו-**Proxy key** (`/v1`). ראה [02-backend-architecture.md].

## `/auth` — ציבורי (authRouter)
| Method | Path | תיאור |
|--------|------|-------|
| POST | `/auth/register` | הרשמה (יוצר user + proxy key + מייל אימות) |
| POST | `/auth/login` | התחברות → JWT access+refresh |
| POST | `/auth/refresh` | חידוש access token |
| GET | `/auth/verify-email/:token` | אימות מייל |
| POST | `/auth/forgot-password` | שליחת מייל איפוס |
| POST | `/auth/reset-password` | איפוס סיסמה |
| GET | `/auth/google` | התחלת Google OAuth |
| GET | `/auth/google/callback` | callback של OAuth |
| POST | `/auth/logout` | (JWT) ביטול refresh token |
| GET | `/auth/me` | (JWT) המשתמש הנוכחי |

## `/v1` — Proxy ל-LLM (openaiRouter, אימות: proxyAuth)
| Method | Path | תיאור |
|--------|------|-------|
| POST | `/v1/chat/completions` | OpenAI Chat Completions (+ rateLimiter) |
| POST | `/v1/responses` | OpenAI Responses API |
| POST | `/v1/images/generations` | יצירת תמונה |
| POST | `/v1/messages` | **Anthropic Messages** (תאימות ל-Claude Code) |
| POST | `/v1/messages/count_tokens` | ספירת טוקנים (Anthropic) |
| GET | `/v1/models` | רשימת מודלים (Anthropic-style) |

> audio/transcriptions ו-audio/speech קיימים אך **מוערים** (disabled) כרגע. multer מוגדר לקבצי audio עד 25MB.

## `/profiles` — פרופילי סינון (JWT)
| Method | Path | תיאור |
|--------|------|-------|
| POST | `/profiles` | יצירת פרופיל |
| GET | `/profiles` | רשימת פרופילים (זמינים למשתמש) |
| GET | `/profiles/admin/all` | **admin** — כל הפרופילים |
| GET | `/profiles/admin/full` | **admin** — כל הפרופילים עם פרטים מלאים (prompts/categories) |
| GET | `/profiles/:id` | פרופיל בודד |
| PUT | `/profiles/:id` | עדכון |
| DELETE | `/profiles/:id` | מחיקה |

## `/organizations` — ארגונים (organizationRouter)
ציבורי: `GET /organizations` (list). השאר דורש JWT.
| Method | Path | תיאור |
|--------|------|-------|
| GET | `/organizations/pending` | (admin) ארגונים ממתינים לאישור |
| PATCH | `/organizations/pending/:id` | עדכון סטטוס ארגון ממתין |
| POST | `/organizations` | יצירה (admin) |
| GET/PUT/PATCH/DELETE | `/organizations/:id` | admin או owner |
| GET | `/organizations/:id/users` | משתמשי הארגון |
| POST | `/organizations/:id/users` | הוספת משתמש |
| POST | `/organizations/:id/users/by-email` | הוספת משתמש לפי אימייל |
| DELETE | `/organizations/users/:userId` | הסרת משתמש |

## שאר ה-routers
| Mount | אימות | תיאור |
|-------|-------|-------|
| `/users` | JWT + **admin** | ניהול משתמשים (userRouter) |
| `/users/:id` (PATCH) | JWT | עדכון פרופיל עצמי |
| `/usage` | JWT (בראוטר) | נתוני שימוש המשתמש |
| `/admin/stats` | (בראוטר) | סטטיסטיקות admin |
| `/provider-keys` | JWT | מפתחות ספק (BYOK) |
| `/proxy-key` | — | ניהול ה-proxy key של המשתמש |
| `/prompts` | JWT (admin בראוטר) | תבניות prompt |
| `/contact` | JWT | טופס צור קשר |
| `/filter` | **ציבורי** | הערכת סינון ישירה (evaluateText) |
| `/health` | ציבורי | health check |

> קבצי `.http` לדוגמאות בקשות נמצאים תחת `server/http/`.
