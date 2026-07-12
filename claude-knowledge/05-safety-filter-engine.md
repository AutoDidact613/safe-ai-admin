# SafeAI — מנוע הסינון (Workflows)

הלב של המוצר. כל הקוד תחת `server/src/workflows/`.

## מבנה כללי
```
workflows/
├─ runner.ts                 # שני runners גנריים (guard + transform)
├─ types.ts                  # GuardNode, GuardContext, NodeTrace, TransformNode...
├─ proxyFilter.ts            # guardInput — הדבק בין ה-proxy ל-workflow
├─ blockedResponse.ts        # בניית "תשובות דמה" כשנחסם (chat/responses/anthropic + SSE)
├─ input/
│  ├─ evaluate.ts            # evaluateText — מביא פרופיל, מריץ workflow, כותב EvaluationLog
│  ├─ inputFilterWorkflow.ts # INPUT_NODES = רשימת ה-guard nodes לפי סדר
│  └─ nodes/llmDecisionNode.ts
├─ output/outputFilterWorkflow.ts
└─ instructions/             # בניית system prompt (transform pipeline)
```

## שני סוגי pipelines (`runner.ts`)
1. **`runGuardPipeline`** — לסינון (input/output). **fail-fast**: עוצר ב-node הראשון שמחזיר `block`.
   **fail-closed**: אם node זורק שגיאה → נחשב חסום (`error-in-<node>`). מחזיר `{ allowed, reason, blockedBy?, trace[] }`.
2. **`runTransformPipeline`** — לבניית הנחיות/output: מריץ את כל ה-nodes ברצף וצובר context. שגיאה כאן **כן** מתפוצצת (לא בולעים).

שניהם מודדים זמן ומוציאים **structured JSON log** לכל שלב (`node.completed`, `workflow.blocked`, וכו') — נוח ל-log aggregator.

## Guard node — החוזה
כל node ממש את `GuardNode`:
```ts
{ name: string, run(ctx): Promise<{ verdict: "allow"|"block", reason: string, metadata?: {...} }> }
```
`ctx: GuardContext = { text, profile, profileId }`.

## ה-Input workflow כיום
`INPUT_NODES = [llmDecisionNode]` — כרגע **node יחיד** פעיל.
- **`llmDecisionNode`** (`input/nodes/llmDecisionNode.ts`): בונה תיאור פרופיל
  (`allowed categories: ... blocked categories: ...`) וקורא ל-`getLLMDecision(text, profileName, profileDesc)`
  ב-`services/llmService.ts`. מחזיר `allow`/`block`.

> **הרחבה עתידית מתוכננת** (קיימת כהערות בקוד, לא פעילה): `promptInjectionNode`, `embeddingGuardNode`.
> מוסיפים node פשוט ע"י הוספתו למערך `INPUT_NODES` לפי הסדר הרצוי (זול/ודאי קודם, כי fail-fast).
> ה-embedding guard ישתמש ב-`utils/cosineSimilarity.ts` ובספים מתוך הפרופיל
> (`thresholdAllowed`, `thresholdBlocked`, `similarityMargin`).

## evaluateText (`input/evaluate.ts`)
נקודת הכניסה לאורקסטרציה. נקראת משני מקומות:
1. **ה-proxy** דרך `guardInput` (שמתרגם חסימה לתשובת דמה).
2. **endpoint ישיר** `/filter` (`evaluateHandler`) שמחזיר verdict כ-JSON.

זרימה: מביא פרופיל מלא (`getFullProfileById` — כולל שדות `select:false`) → `runInputWorkflow` (טהור, ללא DB) → כותב `EvaluationLog` (audit, אלא אם `auditDisabled`) → מחזיר `{ allowed, reason, trace, blockedBy? }`.

## guardInput (`proxyFilter.ts`) — שילוב ב-proxy
```ts
const blocked = await guardInput({ profile, text, model, api, stream });
if (blocked) return blocked;   // תשובת דמה (לא Error) — ממשיכים רגיל אם null
```
- `api`: `"chat" | "responses" | "anthropic"`.
- אם **מאושר** → מחזיר `null` (ה-proxy ממשיך ל-LiteLLM).
- אם **נחסם** → לוג `proxy.blocked` + בונה payload לפי ה-API:
  - `buildBlockedAnthropicMessage` / `buildBlockedResponsesApi` / `buildBlockedChatCompletion`.
  - אם `stream` → עוטף ב-`toSSEStream` (Server-Sent Events).
  כלומר ללקוח חוזרת **תשובת LLM רגילה לכאורה** עם הסבר החסימה, לא שגיאת 4xx — שומר על תאימות client.

## נקודות מפתח לזכור
- הסינון הוא **fail-closed** — בספק/בשגיאה חוסמים.
- ה-`trace` המלא נשמר ב-EvaluationLog לניתוח/דיבוג false-positives.
- הפרדה נקייה: `inputFilterWorkflow` טהור (ללא DB) ↔ `evaluate.ts` מוסיף audit ↔ `proxyFilter` מוסיף תרגום לתשובת HTTP.
