# agentsLogger

הממשק היחיד שדרכו כותבים לוגים של קריאות AI שמבצעים אייג'נטים.
אין לייבא את המודל `AgentLog` ישירות בשום מקום אחר בקוד — כל כתיבה
ל-collection הזה עוברת דרך הקובץ `server/src/agentsLogger.ts`.

## למה זה קיים

כל קריאה בודדת ל-AI שהאייג'נט מבצע נרשמת כך שנוכל:
- לחשב **latency** של כל קריאה (`durationMs`).
- לדעת מה אחוז ההצלחה/כשל של כל node.
- לזהות קריאות **תקועות** — קריאות שהתחילו אבל לא הסתיימו מעולם, בגלל timeout, ניתוק רשת, או קריסת התהליך.

## ארכיטקטורה

`agentsLogger.ts` בנוי באותו מבנה בדיוק כמו `logger.ts` הקיים: winston logger עם JSON format, ו-Transport מותאם אישית (`AgentLogTransport`) ששומר כל שורת לוג ל-MongoDB. בדיוק כמו ב-`logger.ts`, ה-Transport **תמיד יוצר רשומה חדשה** (insert בלבד) — הוא לעולם לא מעדכן רשומה קיימת.

## מחזור החיים

מכיוון שה-Transport הוא insert-only, כל invocation מייצר **שתי רשומות נפרדות** ב-MongoDB, מקושרות ביניהן דרך `invocationId` משותף:

1. **לפני** שליחת הבקשה ל-AI — נכתבת רשומה עם `phase: "start"`.
2. **אחרי** שהתקבלה תשובה (הצלחה או שגיאה) — נכתבת רשומה **נוספת** עם `phase: "end"`, `status: "success"` או `"error"`, ו-`durationMs` המחושב מזמן ההתחלה שנשמר בזיכרון התהליך.
3. אם הקריאה נופלת באמצע (timeout / ניתוק / קריסת תהליך) — רשומת ה-`"end"` פשוט לא נכתבת לעולם, ורשומת ה-`"start"` נשארת ללא זוג. זה בכוונה: כך אפשר לזהות קריאות תקועות בעזרת שאילתה שמחפשת רשומות `phase: "start"` שאין להן רשומת `phase: "end"` תואמת (לפי `invocationId`) בטווח זמן סביר.

## דרך השימוש המומלצת: `withAgentLog`

ברוב המקרים עדיף להשתמש ב-`withAgentLog` במקום לקרוא ל-`startAgentLog`/`endAgentLog` ידנית. הפונקציה פותחת לוג, מריצה את הקריאה בפועל, וסוגרת את הלוג בהתאם לתוצאה — כולל זריקה מחדש (rethrow) של השגיאה המקורית, כך שהטיפול בשגיאות בקוד הקורא ממשיך לעבוד כרגיל.

```ts
import { withAgentLog } from "./agentsLogger";

const result = await withAgentLog(
  {
    runId: "foo-run-123",
    agentName: "fooAgent",
    node: "generateSummary",
    nodeType: "llm",
    systemPrompt: "lorem ipsum dolor sit amet",
    userPrompt: "lorem ipsum dolor sit amet consectetur",
  },
  () => callSomeAiProvider(/* ... */)
);
```

## שימוש ידני: `startAgentLog` + `endAgentLog`

להשתמש רק כאשר תחילת הקריאה וסיומה לא קורים באותה פונקציה (למשל streaming, או כשההתחלה והסיום מטופלים בשני מקומות שונים בקוד).

```ts
import { startAgentLog, endAgentLog } from "./agentsLogger";

const invocationId = startAgentLog({
  runId: "foo-run-123",
  agentName: "fooAgent",
  node: "generateSummary",
  nodeType: "llm",
  systemPrompt: "lorem ipsum dolor sit amet",
  userPrompt: "lorem ipsum dolor sit amet consectetur",
});

try {
  const output = await callSomeAiProvider(/* ... */);
  endAgentLog({ invocationId, status: "success", output });
} catch (err: any) {
  endAgentLog({ invocationId, status: "error", error: err.message });
  throw err;
}
```

> `startAgentLog`/`endAgentLog` הן פונקציות **סינכרוניות** (בדיוק כמו `logger.info`/`logger.error`) - הכתיבה בפועל ל-MongoDB קורית ברקע דרך ה-Transport, ולא חוסמת את הקוד הקורא.

## פרמטרים - `StartAgentLogParams`

| פרמטר | חובה? | הסבר |
|---|---|---|
| `runId` | כן | מזהה הריצה השלמה של האייג'נט. משותף לכל הצעדים של אותה הרצה. דוגמה: `"foo-run-123"` |
| `agentName` | כן | שם/סוג האייג'נט שמבצע את הצעד. דוגמה: `"fooAgent"` |
| `node` | כן | שם הצעד הספציפי בזרימה של האייג'נט. דוגמה: `"generateSummary"` |
| `parentRunId` | לא | מזהה צעד-אב, אם זה תת-צעד שנקרא מתוך node אחר. השמט אם זה צעד ברמה העליונה |
| `nodeType` | לא | סיווג סוג הפעולה: `"llm" \| "tool" \| "retriever" \| "chain" \| "parser" \| "other"`. ברירת מחדל: `"other"` |
| `systemPrompt` | לא | הנחיית המערכת (system message) שנשלחת למודל |
| `userPrompt` | לא | תוכן הפנייה בפועל (user message) שנשלחת למודל |
| `description` | לא | תיאור חופשי וקריא לאדם, לתצוגה בדשבורד |
| `tags` | לא | תיוגים חופשיים לסינון/קיבוץ. דוגמה: `["production", "v2"]` |
| `metadata` | לא | מידע נוסף שאין לו שדה ייעודי (למשל שם מודל ספציפי, מספר טוקנים צפוי) |

> `requestId` נוסף אוטומטית ל-`metadata` אם הקריאה מתבצעת בתוך הקשר של בקשת HTTP פעילה (דרך אותו `requestContext` שכבר קיים ב-`logger.ts`) — אין צורך להעביר אותו ידנית.

## פרמטרים - `EndAgentLogParams`

| פרמטר | חובה? | הסבר |
|---|---|---|
| `invocationId` | כן | ה-id שהוחזר מ-`startAgentLog`. מקשר בין רשומת ה-end לרשומת ה-start התואמת |
| `status` | כן | `"success"` או `"error"` |
| `output` | לא | הפלט שהתקבל מה-AI. רלוונטי כאשר `status === "success"` |
| `error` | לא | הודעת השגיאה. רלוונטי כאשר `status === "error"` |

## איתור קריאות תקועות

מכיוון שכל invocation מיוצג על ידי שתי רשומות נפרדות (`start` ו-`end`), איתור קריאה תקועה דורש למצוא רשומת `start` שאין לה רשומת `end` תואמת (לפי `invocationId`) מעבר לזמן סביר:

```ts
import { AgentLog } from "./models/agentLog";

const stuckThreshold = new Date(Date.now() - 60_000); // דקה אחורה

const stuckStarts = await AgentLog.aggregate([
  { $match: { phase: "start", timestamp: { $lt: stuckThreshold } } },
  {
    $lookup: {
      from: "agentlogs",
      let: { invocationId: "$invocationId" },
      pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$invocationId", "$$invocationId"] }, { $eq: ["$phase", "end"] }] } } }],
      as: "endDoc",
    },
  },
  { $match: { endDoc: { $size: 0 } } },
]);
```