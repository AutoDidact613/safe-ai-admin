# SafeAI — סקירה כללית

## מה זה
**SafeAI** היא פלטפורמת **proxy/gateway ל-AI** עם שכבת **סינון בטיחות**. משתמשים שולחים
בקשות LLM דרך SafeAI → המערכת מסננת את התוכן (לפי פרופיל) → מעבירה ל-**LiteLLM** → ספקי
ה-AI (OpenAI / Anthropic / Google / Groq). לצד ה-proxy יש **פאנל ניהול** למשתמשים, פרופילי
סינון, מעקב שימוש/עלויות, מפתחות API וארגונים.

מוצר מסחרי, לא צעצוע — נדרשת איכות production.

## סטאק טכנולוגי
- **Client:** React 19 + Vite 7 + TypeScript + React Router 7 + Redux Toolkit. פורט dev `5173`. (`client/`)
- **Server:** Node 18+ / Express 5 + TypeScript + Mongoose 9 (MongoDB Atlas). פורט `3001`. (`server/`)
- **LiteLLM proxy:** Docker, פורט `4000`. מנהל גישה למודלים ומפתחות ספק. DB משלו: PostgreSQL.
- **DB ראשי:** MongoDB (משתמשים, פרופילים, ארגונים, לוגים, embeddings cache).
- **Embeddings/LLM לסינון:** OpenAI.

## מבנה Monorepo
```
/
├─ client/                # React SPA (פאנל הניהול + landing)
├─ server/                # Express API + proxy + מנוע סינון
│  └─ src/
│     ├─ routes/          # הגדרת endpoints
│     ├─ controllers/     # שכבת HTTP (req/res)
│     ├─ services/        # לוגיקה עסקית
│     ├─ repositories/    # גישה ל-DB
│     ├─ models/          # סכמות Mongoose
│     ├─ middleware/      # auth, proxyAuth, rateLimiter, errorHandler, logger
│     ├─ workflows/       # מנוע הסינון (input/output/instructions + runner)
│     ├─ utils/           # crypto, jwt, costs, email, validation, streamHandler
│     └─ index.ts         # נקודת כניסה (רישום routes + CORS + DB)
├─ docs/                  # אפיון, מדריכים, GIT rules, litellm config
└─ ecosystem.config.js    # PM2
```

## תפקידים (roles)
- **`admin`** — מנהל מערכת: סטטיסטיקות גלובליות, ניהול משתמשים/פרופילים/ארגונים, אישור ארגונים ממתינים.
- **`org_owner`** — בעל ארגון: ניהול המשתמשים של הארגון שלו בלבד.
- **`user`** — משתמש קצה: דשבורד אישי (פרופיל, תקציב, שימוש), מפתחות API משלו.

## מצבי תפעול (mode)
- **`BYOK`** (Bring Your Own Key) — המשתמש מספק מפתחות ספק משלו.
- **`MANAGED`** — SafeAI מנהל את המפתחות; כולל תקציב חודשי (ברירת מחדל $1) ומעקב עלויות.

## רעיון מפתח לזכור
לכל משתמש יש **שני סוגי מפתחות**:
1. **proxy key** (`sk-safeai-...`) — מה שהמשתמש מקבל וׁשולח אלינו. נשמר כ-hash (`proxyKeyHash` + `proxyKeyPrefix`).
2. **LiteLLM key** — המפתח הפנימי מול LiteLLM, מוצפן (`litellmKeyEncrypted` / `litellmToken`).

ראה [03-data-models.md] לפרטי הסכמות ו-[05-safety-filter-engine.md] למנוע הסינון.
