# SafeAI — מודלי נתונים (Mongoose / MongoDB)

כל הסכמות תחת `server/src/models/`. ריכוז ב-`models/index.ts`.

## User (`models/user.ts`)
משתמש המערכת. `toJSON` מוחק שדות רגישים (password, proxyKeyHash, litellmKeyEncrypted, litellmToken, tokens...).
- `email` (unique), `password` (bcrypt), `name`
- `organization` (string, **deprecated**) + `organizationId` (ref → Organization)
- `role`: `"admin" | "user" | "org_owner"` (default `user`)
- **Auth:** `emailVerified`, `verificationToken(+Expires)`, `passwordResetToken(+Expires)`, `lastLogin`
- **Google OAuth:** `googleId` (unique sparse)
- **Proxy key (App level):** `proxyKeyHash` (unique, index), `proxyKeyPrefix` (index) — המפתח שהמשתמש מקבל
- **LiteLLM (Infra level):** `litellmKeyEncrypted`, `litellmPrefix`, `litellmToken`
- **פרופיל/מצב:** `profileId` (ref → AIProfile), `mode`: `"BYOK" | "MANAGED"` (default BYOK), `isActive`
- **Rate limits:** `requestsPerMinute` (60), `requestsPerDay` (10000)
- **Cost limits (MANAGED):** `monthlyBudget` ($1), `currentMonthSpent`, `lastResetDate`
- `freeProviderKeys: string[]`, `refreshTokens: string[]`

## Organization (`models/organization.ts`)
- `name` (unique), `description`, `ownerId` (ref → User, required)
- `isActive`, `status`: `"pending" | "approved" | "rejected"` (default pending — דורש אישור admin)
- `settings`: `{ maxUsers (10), allowedDomains: string[] }` — דומיינים לרישום אוטומטי

## AIProfile (`models/aiProfile.ts`, collection: `ai-profiles`)
פרופיל סינון. שים לב: שדות רגישים מסומנים `select: false` ולא נשלפים כברירת מחדל
(משתמשים ב-`getFullProfileById` כדי לקבל אותם למנוע הסינון).
- `name`
- `allowedCategories[]` / `blockedCategories[]` — `select:false`, lowercase
- `thresholdAllowed` (0.25), `thresholdBlocked` (0.25), `similarityMargin` (0.05) — לסינון embeddings
- `createdBy`, `creatorEmail`
- `contentPrompts[]` / `behaviorPrompts[]` / `knowledgePrompts[]` — `select:false`, הנחיות ל-LLM filtering
- `approvalStatus`: `"pending" | "approved" | "rejected"`
- `visibility`: `"public" | "internal"`

## Prompt (`models/prompt.ts`)
תבניות prompt/טקסט מאוחסן.
- `code` (unique), `category`, `content`, `description`
- `status`: `"pending" | "active" | "deprecated"`, `isActive`, `order`

## EvaluationLog (`models/evaluationLog.ts`)
אודיט לכל הערכת סינון.
- `profileId`, `text`
- `vectorScores`: `{ bestAllowed, bestBlocked }`
- `initialDecision` (string), `llmFinalDecision` ("allowed"/"blocked")
- `isManuallyReviewed`, `blockedBy?`, `trace[]` — ה-trace המלא של ה-nodes

## UsageLog (`models/usageLog.ts`)
מעקב שימוש/עלות. **TTL: נמחק אוטומטית אחרי 60 יום** (index על `expiresAt`).
- `userId`, `profileId?`
- `provider`: `"openai" | "anthropic" | "google" | "groq"`, `modelName`, `mode`
- טוקנים: `promptTokens`, `completionTokens`, `totalTokens`
- עלות: `cost` (מ-LiteLLM או fallback אפליקטיבי), `isFree`
- מטא: `requestId`, `timestamp`, `responseTime` (ms), `success`, `errorMessage`
- אינדקסים מורכבים נפוצים: `{userId, timestamp}`, `{userId, provider, timestamp}`, `{userId, modelName, timestamp}`

## נוספים
- **Embedding** (`models/embedding.ts`) + `cache/embeddingCache.ts` — מטמון embeddings להפחתת עלויות OpenAI.
- **ProviderKey** (`models/providerKey.ts`) — מפתחות ספק (BYOK), מוצפנים.
- **ApplicationLog** (`models/applicationLog.ts`) — לוג אפליקטיבי כללי.
