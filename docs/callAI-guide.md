# מדריך שימוש ב-`callAI` — פונקציית התממשקות גנרית ל-AI

## תוכן עניינים
1. [מה זה callAI](#מה-זה-callai)
2. [מה את צריכה ליצור](#מה-את-צריכה-ליצור)
3. [מה את לא צריכה ליצור](#מה-את-לא-צריכה-ליצור)
4. [שימוש בסיסי](#שימוש-בסיסי)
5. [דוגמאות מלאות](#דוגמאות-מלאות)
6. [טיפול בשגיאות](#טיפול-בשגיאות)
7. [מגבלות ידועות](#מגבלות-ידועות)
8. [מעקב עם LangSmith](#מעקב-עם-langsmith)

---

## מה זה callAI

`callAI` היא פונקציה גנרית ב-TypeScript המאפשרת לכל מפתח בצוות לפנות ל-AI (OpenAI) בקלות.

היא מטפלת עבורך ב:
- התחברות ל-OpenAI API
- שליחת ה-prompt
- קבלת תגובת JSON
- אימות הפלט מול סכמת Zod
- fallback אוטומטי במקרה של Rate Limit (429) או שגיאת שרת (503)
- מעקב אוטומטי דרך LangSmith (אופציונלי)

**מיקום הקבצים בפרויקט:**
```
server/src/
├── config/
│   └── openaiclient.ts     ← אובייקט החיבור (לא נוגעים!)
└── services/
    └── aiService.ts        ← הפונקציה callAI (לא נוגעים!)
```

---

## מה את צריכה ליצור

### 1. משתנה סביבה — OPENAI_API_KEY

בקובץ `server/.env` (לא מועלה ל-GitHub):
```env
OPENAI_API_KEY=your_api_key_here
```

קבלת מפתח: [platform.openai.com](https://platform.openai.com) → **API keys** → **Create new secret key**

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
| אובייקט התחברות ל-OpenAI | כבר קיים ב-`openaiclient.ts` |
| טיפול ב-Rate Limit (429) | מובנה ב-`callAI` עם fallback אוטומטי |
| טיפול ב-503 | מובנה ב-`callAI` עם fallback אוטומטי |
| `JSON.parse` על התגובה | `callAI` עושה את זה בפנים |
| קריאה ישירה ל-`openai.chat.completions.create` | זה מה ש-`callAI` עושה עבורך |
| הגדרת מודל OpenAI | ברירת מחדל היא `gpt-4o`, fallback הוא `gpt-4o-mini` |

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
  callName: "analyzeFoo", // שם שיופיע ב-LangSmith (אופציונלי)
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
    callName: "analyzeSentiment", // ← ייראה כך ב-LangSmith
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
    callName: "buildSearchQuery",
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
  callName: "generateProductDescription",
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
| `model` | `string` | ❌ | `gpt-4o` | מודל OpenAI |
| `callName` | `string` | ❌ | `"callAI"` | שם ה-run שיופיע ב-LangSmith |

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

**תלוי בחבילה שנרכשה ב-OpenAI:**
- מגבלות ה-Rate Limit משתנות לפי tier
- פרטים עדכניים: [platform.openai.com/docs/guides/rate-limits](https://platform.openai.com/docs/guides/rate-limits)

**המלצה לפיתוח:** כל מפתח יפתח מפתח API משלו ב-[platform.openai.com](https://platform.openai.com) — כך לא "מתאבקים" על מכסה משותפת.

---

## מעקב עם LangSmith

הפונקציה `callAI` משולבת עם [LangSmith](https://smith.langchain.com) לצורך ניטור, דיבאג, ומדידת ביצועים של קריאות ל-AI.

### מה LangSmith מספק?

- **היסטוריית runs** — כל קריאה ל-`callAI` נשמרת עם ה-prompt, התגובה, זמן ריצה, וכמות טוקנים
- **דיבאג נוח** — ניתן לראות בדיוק מה נשלח ל-OpenAI ומה חזר
- **מעקב לפי שם** — הפרמטר `callName` מאפשר לזהות כל קריאה לפי שמה ב-dashboard

### התקנה

החבילה כבר מותקנת בפרויקט. אם צריך להתקין מחדש:

```bash
npm install langsmith
```

### יצירת מפתח API

1. היכנסי ל-[smith.langchain.com](https://smith.langchain.com) וצרי חשבון
2. עברי ל-**Settings** ← **API Keys**
3. לחצי על **Create API Key**, תני לו שם תיאורי, ושמרי את המפתח במקום בטוח (לא יוצג שוב)

### משתני סביבה

הוסיפי לקובץ `server/.env`:

```env
# חובה — מפתח LangSmith
LANGSMITH_API_KEY=your_langsmith_api_key_here

# חובה — הפעלת המעקב
LANGSMITH_TRACING=true

# אופציונלי — שם הפרויקט שתחתיו יקובצו כל ה-runs (ברירת מחדל: "default")
LANGSMITH_PROJECT=my-project-name

# אופציונלי — רק אם חשבונך מכסה יותר מ-workspace אחד
# LANGSMITH_WORKSPACE_ID=your_workspace_id
```

> **שים לב:** אם `LANGSMITH_TRACING` לא מוגדר או מוגדר כ-`false`, הקוד ימשיך לעבוד כרגיל — המעקב פשוט לא יישלח.

### שימוש עם `callName`

הפרמטר `callName` קובע את השם שתחתיו ה-run יופיע ב-LangSmith. מומלץ לתת שם שמתאר את הפונקציה הקוראת:

```typescript
// ב-LangSmith יופיע run בשם "analyzeSentiment"
const result = await callAI({
  userPrompt: text,
  systemPrompt: "...",
  schema: SentimentSchema,
  callName: "analyzeSentiment",
});
```

אם לא מעבירים `callName`, ה-run יופיע בשם הברירת מחדל `"callAI"`.

### מה רואים ב-Dashboard?

לאחר הגדרת המשתנים וביצוע קריאה, ניתן לראות ב-[smith.langchain.com](https://smith.langchain.com) תחת הפרויקט שהגדרת:

- שם ה-run (לפי `callName`)
- ה-system prompt וה-user prompt שנשלחו
- התגובה הגולמית שחזרה מ-OpenAI
- זמן ריצה וכמות טוקנים
- האם הייתה שגיאה (כולל ZodError)