# מסמך אפיון פרויקט SafeAI

## 1. סקירה כללית

### 1.1 תיאור הפרויקט
**SafeAI** הוא פרויקט מונורפו (Monorepo) המספק פלטפורמה מתקדמת לניהול ובקרה של שירותי בינה מלאכותית (AI). המערכת מאפשרת למשתמשים לגשת למודלי AI שונים דרך ממשק אחיד, תוך הפעלת מנגנוני סינון ובקרה מתקדמים להבטחת שימוש בטוח ואחראי בטכנולוגיות AI.

הפרויקט בנוי כמערכת Client-Server מלאה עם ארכיטקטורה מודרנית המבוססת על:
- **Client**: React + Vite + TypeScript
- **Server**: Node.js + Express + TypeScript
- **Database**: MongoDB (ניהול משתמשים ופרופילים) + PostgreSQL (LiteLLM)
- **AI Proxy**: LiteLLM (ניהול גישה למודלי AI)

### 1.2 מטרות הפרויקט
1. **בטיחות AI**: מניעת שימוש לרעה במודלי AI באמצעות מנגנוני סינון מתקדמים
2. **ניהול מרכזי**: ממשק אחיד לניהול גישה למודלי AI מספקים שונים (OpenAI, Anthropic, Google, Groq)
3. **בקרת עלויות**: מעקב אחר שימוש ועלויות, הגבלת תקציבים
4. **גמישות**: תמיכה במצבי BYOK (Bring Your Own Key) ו-MANAGED
5. **אבטחה**: אימות משתמשים, הצפנת מפתחות, ניהול הרשאות

### 1.3 משתמשי היעד
- **מנהלי מערכת (Admins)**: ניהול פרופילי סינון, משתמשים, וסטטיסטיקות
- **משתמשים רגילים (Users)**: שימוש במודלי AI דרך API מאובטח
- **מפתחים**: אינטגרציה של SafeAI באפליקציות צד שלישי

---

## 2. ארכיטקטורה טכנית

### 2.1 מבנה המערכת

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Landing Page │  │  Auth Pages  │  │ SafeAI UI    │      │
│  │              │  │ Login/Register│  │ Dashboard    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                    Server (Express + TS)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Service │  │Filter Service│  │ Proxy Service│      │
│  │ JWT + OAuth  │  │ AI Filtering │  │ LiteLLM Mgmt │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   MongoDB    │    │  Embeddings  │    │   LiteLLM    │
│   Users      │    │   Cache      │    │   Proxy      │
│   Profiles   │    │              │    │ PostgreSQL   │
└──────────────┘    └──────────────┘    └──────────────┘
                                                ↓
                                    ┌──────────────────────┐
                                    │  AI Providers        │
                                    │  OpenAI, Anthropic,  │
                                    │  Google, Groq        │
                                    └──────────────────────┘
```

### 2.2 טכנולוגיות עיקריות

#### Client Side
- **React 19.2.4**: ספריית UI מודרנית
- **TypeScript 5.9.3**: טיפוסים סטטיים
- **Vite 7.2.4**: כלי בנייה מהיר
- **React Router 7.13.0**: ניתוב
- **Redux Toolkit 2.11.2**: ניהול state
- **Recharts 3.8.0**: תרשימים וויזואליזציה
- **XLSX + File-Saver**: ייצוא נתונים

#### Server Side
- **Node.js 18+**: סביבת ריצה
- **Express 5.2.1**: framework לשרת
- **TypeScript 5.9.3**: פיתוח מאובטח
- **Mongoose 9.2.2**: ODM למונגו
- **JWT (jsonwebtoken 9.0.3)**: אימות
- **Google Auth Library 10.6.2**: OAuth
- **Bcrypt 3.0.3**: הצפנת סיסמאות
- **Winston 3.19.0**: logging
- **Zod 4.3.6**: ולידציה

#### Infrastructure
- **Docker + Docker Compose**: קונטיינריזציה
- **MongoDB 7**: בסיס נתונים ראשי
- **PostgreSQL 16**: בסיס נתונים ל-LiteLLM
- **LiteLLM**: proxy למודלי AI
- **Nginx**: reverse proxy (production)

### 2.3 מודלי נתונים

#### User Model
```typescript
{
  email: string;              // אימייל ייחודי
  password: string;           // סיסמה מוצפנת
  name: string;               // שם מלא
  organization: string;       // ארגון
  role: "admin" | "user";     // תפקיד
  
  // Authentication
  emailVerified: boolean;
  verificationToken: string;
  googleId: string;           // OAuth
  
  // API Keys
  proxyKeyHash: string;       // מפתח המשתמש (מוצפן)
  proxyKeyPrefix: string;     // prefix למפתח
  litellmKeyEncrypted: string;// מפתח פנימי
  litellmToken: string;       // token ניהול
  
  // Configuration
  profileId: ObjectId;        // פרופיל סינון
  mode: "BYOK" | "MANAGED";   // מצב תפעול
  
  // Limits
  rateLimits: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  costLimits: {
    monthlyBudget: number;
    currentMonthSpent: number;
  };
}
```

#### AI Profile Model
```typescript
{
  name: string;                    // שם הפרופיל
  allowedCategories: string[];     // קטגוריות מותרות
  blockedCategories: string[];     // קטגוריות חסומות
  thresholdAllowed: number;        // סף דמיון למותר (0.25)
  thresholdBlocked: number;        // סף דמיון לחסום (0.25)
  similarityMargin: number;        // מרווח בטיחות (0.05)
  createdBy: string;               // מזהה יוצר
  creatorEmail: string;            // אימייל יוצר
  
  // Prompts for LLM filtering
  contentPrompts: string[];        // הנחיות תוכן
  behaviorPrompts: string[];       // הנחיות התנהגות
  knowledgePrompts: string[];      // הנחיות ידע
}
```

---

## 3. תכונות ויכולות

### 3.1 מערכת אימות (Authentication)

#### הרשמה (Registration)
- טופס הרשמה מקיף עם ולידציה
- אימות חוזק סיסמה (8+ תווים, אותיות גדולות/קטנות, ספרות)
- בחירת פרופיל AI ומצב תפעול (BYOK/MANAGED)
- יצירת מפתח API אוטומטית
- שליחת מייל אימות
- הצגת מפתח API חד-פעמית

#### התחברות (Login)
- התחברות עם אימייל וסיסמה
- Google OAuth 2.0
- JWT tokens (access + refresh)
- שמירת session ב-localStorage
- ניתוב אוטומטי לדשבורד

#### אבטחה
- הצפנת סיסמאות עם bcrypt
- JWT עם תוקף מוגבל
- Refresh tokens לחידוש גישה
- Rate limiting למניעת brute force
- CORS מוגדר
- HTTPS בייצור

### 3.2 ממשק ניהול (Admin Dashboard)

#### ניהול פרופילים
- יצירת פרופילי סינון חדשים
- עריכת פרופילים קיימים
- הגדרת קטגוריות מותרות/חסומות
- קביעת סף דמיון (threshold)
- הוספת prompts מותאמים אישית
- מחיקת פרופילים

#### ניהול משתמשים
- צפייה ברשימת משתמשים
- עריכת הרשאות משתמש
- שינוי תפקידים (admin/user)
- הקצאת פרופילים למשתמשים
- חסימת/הפעלת משתמשים
- מעקב אחר שימוש

#### סטטיסטיקות
- תרשימי שימוש לפי זמן
- פילוח לפי מודלים
- מעקב עלויות
- ניתוח בקשות חסומות/מאושרות
- ייצוא נתונים ל-Excel
- סינון לפי תאריכים

### 3.3 ממשק משתמש (User Dashboard)

#### לוח בקרה אישי
- סטטיסטיקות שימוש אישיות
- היסטוריית בקשות
- מידע על פרופיל AI מוקצה
- מצב חשבון (BYOK/MANAGED)

#### ניהול מפתחות API
- צפייה במפתח API נוכחי (prefix בלבד)
- יצירת מפתח חדש
- ביטול מפתח ישן
- הורדת מפתח כקובץ
- דוגמאות שימוש (Python, cURL)

### 3.4 מנגנון סינון AI

#### Embedding-Based Filtering
- המרת prompts ל-embeddings (OpenAI)
- חישוב דמיון קוסינוס
- השוואה לקטגוריות מותרות/חסומות
- החלטה אוטומטית (allow/block/uncertain)

#### LLM-Based Filtering
- שימוש ב-GPT לניתוח prompts מורכבים
- הנחיות מותאמות אישית לפי פרופיל
- החלטה מבוססת הקשר
- תמיכה במקרי edge

#### Caching
- שמירת embeddings במטמון
- הפחתת עלויות API
- שיפור ביצועים
- ניקוי אוטומטי

### 3.5 Proxy למודלי AI

#### תמיכה במודלים
**OpenAI**: GPT-5.4, GPT-5.4-mini, GPT-5.4-nano, O3-pro, O3, O3-mini
**Anthropic**: Claude Opus 4-6, Claude Sonnet 4-6, Claude Haiku 4-5
**Google**: Gemini 3.1 Pro, Gemini 3 Flash, Gemini 2.5 Pro/Flash
**Groq**: Llama 3.1/3.3/4, GPT-OSS, Qwen3

#### ניהול מפתחות
- BYOK: משתמש מספק מפתחות ספק
- MANAGED: SafeAI מנהל מפתחות
- הצפנת מפתחות במנוחה
- ניהול מפתחות דרך LiteLLM

#### מעקב שימוש
- לוגים מפורטים לכל בקשה
- מעקב עלויות בזמן אמת
- הגבלת תקציב חודשי
- Rate limiting

---

## 4. זרימות עבודה (Workflows)

### 4.1 זרימת הרשמה
```
1. משתמש נכנס ל-Landing Page (/)
2. לוחץ "הרשמה" → /register
3. ממלא טופס:
   - שם מלא
   - אימייל
   - סיסמה (עם ולידציה)
   - ארגון (אופציונלי)
   - בחירת פרופיל AI
   - מצב: BYOK/MANAGED
4. שרת:
   - יוצר משתמש ב-MongoDB
   - יוצר מפתח API ב-LiteLLM
   - שולח מייל אימות
   - מחזיר JWT tokens
5. משתמש מועבר ל-/api-key-display
6. רואה מפתח API (פעם אחת בלבד!)
7. מעתיק/מוריד מפתח
8. לוחץ "המשך" → /safeai-ui
```

### 4.2 זרימת שימוש ב-API
```
1. משתמש שולח בקשה ל-SafeAI Proxy:
   POST https://api.safeai.com/v1/chat/completions
   Headers:
     Authorization: Bearer sk-safeai-xxx...
     Content-Type: application/json
   Body:
     {
       "model": "gpt-5.4",
       "messages": [{"role": "user", "content": "..."}]
     }

2. Server מאמת מפתח API
3. טוען פרופיל AI של המשתמש
4. מריץ סינון:
   a. Embedding-based check
   b. אם uncertain → LLM-based check
5. אם חסום → מחזיר 403
6. אם מאושר:
   a. מעביר ל-LiteLLM
   b. LiteLLM קורא למודל (OpenAI/Anthropic/etc)
   c. מחזיר תשובה למשתמש
7. רושם log ב-MongoDB
8. מעדכן usage statistics
```

### 4.3 זרימת ניהול פרופיל
```
1. Admin נכנס ל-/safeai-ui
2. בוחר "ניהול פרופילים"
3. לוחץ "צור פרופיל חדש"
4. ממלא:
   - שם פרופיל
   - קטגוריות מותרות (למשל: "education, science")
   - קטגוריות חסומות (למשל: "violence, hate")
   - סף דמיון (0.25)
   - prompts מותאמים
5. שומר → נשמר ב-MongoDB
6. מקצה פרופיל למשתמשים
7. משתמשים מקבלים סינון לפי הפרופיל החדש
```

---

## 5. פריסה (Deployment)

> המבנה, הדוקר, ותהליכי ה-CI/CD המלאים מתועדים כעת ב-[docs/DEPLOYMENT.md](./DEPLOYMENT.md). הסעיף הזה נשאר כתקציר בלבד.

### 5.1 סביבת פיתוח (Development)
```bash
cp .env.example .env
cp apps/server/.env.example apps/server/.env
docker compose up --build
# client: http://localhost:8080 | server: http://localhost:3001 | litellm: http://localhost:4000
```

### 5.2 סביבת ייצור (Production)
```yaml
# docker-compose.prod.yml
services:
  - LiteLLM Proxy (port 4000, פנימי)
  - SafeAI Server (port 3001, פנימי)
  - Nginx (ports 80/443, השער היחיד שנחשף החוצה, מגיש גם את ה-client)
  # MongoDB (Atlas) ו-Postgres (מנוהל, למשל Neon) הם שירותים חיצוניים —
  # לא רצים כקונטיינר על ה-EC2.
```

**תהליך פריסה (מבוצע אוטומטית ע"י `cd-staging.yml`/`cd-production.yml`, בשלב זה עדיין מדומה — ראו docs/DEPLOYMENT.md):**
1. CI בונה ובודק client/server
2. בניית ודחיפת Docker images ל-GHCR
3. Pull ב-production server
4. `docker compose -f docker-compose.prod.yml up -d`
5. הגדרת SSL certificates (Let's Encrypt) — עדיין לא מוגדר
6. הגדרת DNS

### 5.3 משתני סביבה

#### Client (.env)
```
VITE_API_URL=https://api.safeai.com
VITE_GOOGLE_CLIENT_ID=xxx
```

#### Server (.env)
```
NODE_ENV=production
PORT=3001
MONGO_URI=mongodb://mongodb:27017/safeai
JWT_SECRET=xxx
JWT_REFRESH_SECRET=xxx
LITELLM_PROXY_URL=http://litellm:4000
LITELLM_MASTER_KEY=xxx
OPENAI_API_KEY=sk-xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=noreply@safeai.com
EMAIL_PASS=xxx
ENCRYPTION_KEY=xxx (32 bytes hex)
```

---

## 6. אבטחה ופרטיות

### 6.1 אבטחת נתונים
- **הצפנה במנוחה**: מפתחות API מוצפנים ב-MongoDB
- **הצפנה בתנועה**: HTTPS בלבד בייצור
- **הצפנת סיסמאות**: bcrypt עם salt
- **JWT**: חתימה דיגיטלית, תוקף מוגבל

### 6.2 בקרת גישה
- **Role-Based Access Control (RBAC)**: admin vs user
- **API Key Authentication**: כל בקשה דורשת מפתח תקף
- **Rate Limiting**: הגבלת בקשות למניעת abuse
- **CORS**: רשימת domains מאושרים

### 6.3 Logging ו-Monitoring
- **Winston Logger**: לוגים מובנים
- **Request Logging**: כל בקשה נרשמת
- **Error Tracking**: שגיאות נשמרות ומדווחות
- **Usage Logs**: מעקב אחר כל שימוש ב-AI

### 6.4 תאימות ל-GDPR
- **זכות למחיקה**: משתמש יכול למחוק חשבון
- **זכות לגישה**: משתמש רואה את כל הנתונים שלו
- **הסכמה**: הסכמה מפורשת בהרשמה
- **מינימיזציה**: איסוף נתונים מינימלי בלבד

---

## 7. תחזוקה ותמיכה

### 7.1 גיבויים (Backups)
- MongoDB: גיבוי יומי אוטומטי
- PostgreSQL: גיבוי יומי אוטומטי
- שמירת 30 ימים אחרונים
- בדיקת שחזור חודשית

### 7.2 עדכונים
- תלויות: בדיקה שבועית (npm audit)
- Security patches: עדכון מיידי
- Feature updates: גרסה חדשה כל חודש
- Breaking changes: תיעוד מפורט

### 7.3 תמיכה טכנית
- **דוקומנטציה**: README, API docs, User guides
- **FAQ**: שאלות נפוצות
- **Support Email**: support@safeai.com
- **Issue Tracking**: GitHub Issues

---

## 8. מפת דרכים (Roadmap)

### גרסה 2.1 (Q2 2026)
- [ ] Forgot Password flow מלא
- [ ] Two-Factor Authentication (2FA)
- [ ] Webhook notifications
- [ ] Advanced analytics dashboard

### גרסה 2.2 (Q3 2026)
- [ ] Multi-language support (אנגלית, עברית, ערבית)
- [ ] Mobile app (React Native)
- [ ] Team management (organizations)
- [ ] Custom model fine-tuning

### גרסה 3.0 (Q4 2026)
- [ ] On-premise deployment option
- [ ] Advanced AI safety features
- [ ] Compliance certifications (SOC 2, ISO 27001)
- [ ] Enterprise SLA

---

**מסמך זה עודכן לאחרונה: 13/04/2026**  
**גרסה: 2.0**  
**מחבר: SafeAI Development Team**
