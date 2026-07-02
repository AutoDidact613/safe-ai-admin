# מדריך שימוש ב-`callAI` — פונקציית התממשקות גנרית ל-AI

## תוכן עניינים
1. [מה זה callAI](#מה-זה-callai)
2. [מה את צריכה ליצור](#מה-את-צריכה-ליצור)
3. [מה את לא צריכה ליצור](#מה-את-לא-צריכה-ליצור)
4. [שימוש בסיסי](#שימוש-בסיסי)
5. [דוגמאות מלאות](#דוגמאות-מלאות)
6. [טיפול בשגיאות](#טיפול-בשגיאות)
7. [מגבלות ידועות](#מגבלות-ידועות)

---

## מה זה callAI

`callAI` היא פונקציה גנרית ב-TypeScript המאפשרת לכל מפתח בצוות לפנות ל-AI (Gemini) בקלות.

היא מטפלת עבורך ב:
- התחברות ל-Gemini API
- שליחת ה-prompt
- קבלת תגובת JSON
- אימות הפלט מול סכמת Zod
- fallback אוטומטי במקרה של Rate Limit (429) או שגיאת שרת (503)

**מיקום הקבצים בפרויקט:**
```
server/src/
├── config/
│   └── geminiclient.ts     ← אובייקט החיבור (לא נוגעים!)
└── services/
    └── aiService.ts        ← הפונקציה callAI (לא נוגעים!)
```

---

## מה את צריכה ליצור

### 1. משתנה סביבה — GEMINI_API_KEY

בקובץ `server/.env` (לא מועלה ל-GitHub):
```env
GEMINI_API_KEY=your_api_key_here
```

קבלת מפתח: [aistudio.google.com](https://aistudio.google.com) → **Get API Key** → **Create API key**

> ⚠️ אם רואים את האזהרה הבאה בלוג — זה תקין, זה בגלל הגדרות ה-SSL של הסביבה:
> ```
> Warning: Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to '0'
> ```
> אין צורך לעשות שום דבר — זה מוגדר כבר בשרת.

---

### 2. סכמת Zod

עליך להגדיר סכמת Zod שמתארת את מבנה ה-JSON שאת מצפה לקבל מה-AI.

**התקנה** (כבר מותקן בפרויקט):
```bash
npm install zod
```

**דוגמה לסכמה:**
```typescript
import { z } from 'zod';

const MySchema = z.object({
  title: z.string(),
  score: z.number(),
  tags: z.array(z.string()),
  isActive: z.boolean(),
});

// טיפוס TypeScript נגזר אוטומטית מהסכמה
type MyType = z.infer<typeof MySchema>;
```

**כללים לכתיבת סכמה טובה:**
- השתמשי ב-`.describe("...")` על כל שדה — זה עוזר ל-AI להבין מה למלא
- לשדות עם ערכים מוגדרים מראש — השתמשי ב-`z.enum([...])`
- ערכי enum בעברית — כתבי אותם בעברית גם בסכמה וגם ב-system prompt

---

### 3. System Prompt

טקסט שמסביר ל-AI מה תפקידו ואיך להחזיר את ה-JSON.

**כללים חשובים:**
- ציני בפירוש את מבנה ה-JSON הצפוי
- אם יש enum — רשמי את הערכים המותרים בעברית
- בקשי תמיד JSON בלבד, ללא הסברים

**דוגמה לprompt טוב:**
```typescript
const MY_SYSTEM_PROMPT = `אתה עוזר לניתוח בקשות.
החזר JSON בלבד במבנה הבא:
{"title":"...","score":0,"tags":[],"isActive":true}
ערכי isActive: true אם הבקשה פעילה, false אחרת.`;
```

---

## מה את לא צריכה ליצור

| מה | למה לא |
|----|--------|
| אובייקט התחברות ל-Gemini | כבר קיים ב-`geminiclient.ts` |
| טיפול ב-Rate Limit (429) | מובנה ב-`callAI` עם fallback אוטומטי |
| טיפול ב-503 | מובנה ב-`callAI` עם fallback אוטומטי |
| `JSON.parse` על התגובה | `callAI` עושה את זה בפנים |
| קריאה ישירה ל-`openai.chat.completions.create` | זה מה ש-`callAI` עושה עבורך |
| הגדרת מודל Gemini | ברירת מחדל היא `gemini-2.5-flash`, fallback הוא `gemini-2.0-flash-lite` |

---

## שימוש בסיסי

```typescript
import { callAI } from '../services/aiService';
import { z } from 'zod';

// 1. הגדירי סכמה
const MySchema = z.object({
  title: z.string().describe("כותרת"),
  score: z.number().describe("ציון בין 0 ל-100"),
});

// 2. קראי ל-callAI
const result = await callAI({
  userPrompt: "הטקסט שהמשתמש שלח",
  systemPrompt: `אתה עוזר. החזר JSON בלבד:
{"title":"...","score":0}`,
  schema: MySchema,
});

// 3. result מוקלד אוטומטית לפי הסכמה
console.log(result.title);  // string
console.log(result.score);  // number
```

---

## דוגמאות מלאות

### דוגמה 1 — ניתוח פשוט

```typescript
import { callAI } from '../services/aiService';
import { z } from 'zod';

const SentimentSchema = z.object({
  sentiment: z.enum(["חיובי", "שלילי", "ניטרלי"])
    .describe("סנטימנט הטקסט"),
  confidence: z.number()
    .describe("רמת הביטחון בין 0 ל-1"),
  summary: z.string()
    .describe("סיכום קצר של הטקסט"),
});

export async function analyzeSentiment(text: string) {
  return await callAI({
    userPrompt: text,
    systemPrompt: `אתה מנתח סנטימנט. החזר JSON בלבד:
{"sentiment":"חיובי","confidence":0.9,"summary":"..."}
ערכי sentiment המותרים: "חיובי", "שלילי", "ניטרלי"`,
    schema: SentimentSchema,
    temperature: 0.1, // נמוך = תשובות עקביות יותר
  });
}
```

### דוגמה 2 — שאילתת MongoDB

```typescript
import { callAI } from '../services/aiService';
import { z } from 'zod';

const QuerySchema = z.object({
  query: z.record(z.string(), z.any())
    .describe("שאילתת MongoDB תקנית"),
});

export async function buildSearchQuery(userText: string) {
  const result = await callAI({
    userPrompt: `בקשת החיפוש: "${userText}"`,
    systemPrompt: `אתה מומחה MongoDB. תרגם לשאילתת filter.
השדות הזמינים: title, description, status.
חובה לעטוף ב-"query":
{"query": {"title": {"$regex": "foo", "$options": "i"}}}`,
    schema: z.record(z.string(), z.any()),
    temperature: 0.1,
  });

  // fallback אם ה-AI לא עטף ב-query
  const normalized = (result as any).query !== undefined
    ? result as any
    : { query: result };

  return QuerySchema.parse(normalized);
}
```

### דוגמה 3 — עם טמפרטורה גבוהה (יצירתי)

```typescript
const result = await callAI({
  userPrompt: "צרי תיאור למוצר: כיסא משרדי ארגונומי",
  systemPrompt: `אתה קופירייטר. החזר JSON בלבד:
{"headline":"...","body":"...","cta":"..."}`,
  schema: z.object({
    headline: z.string(),
    body: z.string(),
    cta: z.string(),
  }),
  temperature: 0.8, // גבוה = תשובות יצירתיות יותר
});
```

---

## פרמטרים של callAI

| פרמטר | טיפוס | חובה | ברירת מחדל | תיאור |
|--------|--------|-------|-------------|-------|
| `userPrompt` | `string` | ✅ | — | הטקסט שמגיע מהמשתמש |
| `systemPrompt` | `string` | ✅ | — | הנחיות לAI + מבנה JSON צפוי |
| `schema` | `ZodSchema<T>` | ✅ | — | סכמה לאימות הפלט |
| `temperature` | `number` | ❌ | `0.2` | 0 = עקבי, 1 = יצירתי |
| `model` | `string` | ❌ | `gemini-2.5-flash` | מודל Gemini |

---

## טיפול בשגיאות

`callAI` זורקת שגיאה במקרים הבאים:

```typescript
try {
  const result = await callAI({ ... });
} catch (error: any) {
  if (error?.status === 429) {
    // Rate Limit — גם ה-fallback נכשל
    // הציגי למשתמש הודעת "נסה שוב בעוד כמה דקות"
  }
  if (error?.name === 'ZodError') {
    // ה-AI החזיר JSON שלא תואם את הסכמה
    // בדקי את ה-system prompt
  }
  // שגיאה אחרת — זרקי הלאה
  throw error;
}
```

---

## מגבלות ידועות

**Free Tier של Gemini:**
- 10 בקשות לדקה
- 500 בקשות ליום למפתח

**המלצה לפיתוח:** כל מפתח יפתח מפתח API משלו ב-[aistudio.google.com](https://aistudio.google.com) — כך לא "מתאבקים" על מכסה משותפת.