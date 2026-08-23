# אפיון: קליינט משותף לתזמון וניטור אייג'נטים בזמן אמת

## 1. רקע — מצב קיים בקוד

בדיקת שכבת האייג'נטים הקיימת (`server/src/models/agents.ts`, `log-agent/`,
`server/src/services/tenderBoardAIService.ts`, `server/src/controllers/*`, `client/src`)
העלתה את הממצאים הבאים:

| רכיב | מצב נוכחי |
|---|---|
| מודל `Agent` (`server/src/models/agents.ts`) | קטלוג/מרקטפלייס בלבד (metadata מ-manifest.json). אין router/controller/service שמייבא אותו. אין הפעלה בפועל. |
| `log-agent/` (Python + LangGraph) | גרף דו-שלבי (`fetch` → `count`) המופעל **ידנית** דרך `run_agent.py`. תוצאה מודפסת לטרמינל בלבד, לא נשמרת ולא מדווחת החוצה. אין תזמון ואין streaming. |
| `tenderBoardAIService.ts` | קריאת LLM בודדת, **סינכרונית** לכל בקשת HTTP. לא ריצה ארוכת-טווח, אין מושג "run" נפרד מהבקשה עצמה. |
| תזמון | אין ספריית תזמון מותקנת (`node-cron`/`agenda`/`bullmq` — none). `ecosystem.config.js` מגדיר תהליך pm2 יחיד לשרת בלבד. |
| זמן-אמת | קיימת תשתית SSE חד-כיוונית (`anthropicController.ts`, `openaiController.ts`) שמזרימה `ReadableStream` מ-proxy ל-LLM חיצוני. אין WebSocket, אין ערוץ streaming ל"עבודת אייג'נט". |
| קליינט משותף בפרונט | `client/src/config/api.ts` מגדיר `apiCall<T>()` — helper אחיד עם auth header ו-auto-refresh בטוקן. זו נקודת הפתיחה הטבעית לכל שכבת קליינט חדשה. |

**מסקנה:** אין כיום מנגנון אחיד להרצת אייג'נט, לתזמון שלו, או לצפייה בהתקדמות שלו. כל אייג'נט (log-agent, tenderBoard, וכל אייג'נט עתידי) בנוי בנפרד, ללא חוזה משותף.

## 2. מטרת הפרויקט

לבנות **קליינט משותף אחד** (Shared Agent Client) שכל אייג'נט — קיים ועתידי, בכל שפה — מתחבר אליו, ומאפשר:

1. **תזמונים (Scheduling)** — הגדרת מתי ואיך אייג'נט מופעל (cron / interval / ידני).
2. **ניטור חי (Live Observability)** — צפייה בזמן אמת בהתקדמות ריצה: התחלה, שלבים, לוגים, סיום/שגיאה.

"קליינט משותף" משמעו כאן **פרוטוקול + ספריית אינטגרציה אחידה**, לא רק מסך תצוגה: אותו חוזה API משרת גם את האייג'נטים עצמם (מדווחים "כלפי חוץ") וגם את לוח הבקרה בפרונט (שצורך את הדיווחים).

## 3. ארכיטקטורה מוצעת

```
┌─────────────┐   HTTP (schedule pull / run report)   ┌──────────────────────┐
│  Agent A     │ ─────────────────────────────────────▶│                      │
│ (Node process)│                                       │   Agent Orchestrator │
└─────────────┘                                        │   (server/src)       │
┌─────────────┐   HTTP (agent_client.py)                │                      │
│  Agent B     │ ─────────────────────────────────────▶│  - AgentSchedule     │
│ (Python proc)│                                        │  - AgentRun          │
└─────────────┘                                        │  - Scheduler (cron)  │
                                                         └──────────┬───────────┘
                                                                    │ SSE (run stream)
                                                                    ▼
                                                         ┌──────────────────────┐
                                                         │  Client (React)      │
                                                         │  לוח בקרה + תזמונים  │
                                                         └──────────────────────┘
```

- כל אייג'נט (בכל שפה) מדבר עם השרת דרך **אותו חוזה REST**, באמצעות ספריית קליינט דקה (Node ו-Python).
- השרת שומר מצב תזמון וריצות במסד הנתונים הקיים (MongoDB).
- הפרונט צורך את אותו API לניהול תזמונים, ומאזין לערוץ SSE לצפייה חיה.

## 4. מודלי נתונים חדשים (server/src/models)

### `AgentSchedule`
| שדה | טיפוס | הערה |
|---|---|---|
| `agentKey` | string | מזהה יציב של סוג האייג'נט (למשל `foo-agent`) |
| `triggerType` | `"cron" \| "interval" \| "manual"` | |
| `cronExpression` | string? | נדרש כש-`triggerType === "cron"` |
| `intervalMs` | number? | נדרש כש-`triggerType === "interval"` |
| `enabled` | boolean | |
| `config` | object | פרמטרים חופשיים שהאייג'נט מקבל בכל הפעלה |
| `createdBy` | ObjectId (User) | |

### `AgentRun`
| שדה | טיפוס | הערה |
|---|---|---|
| `agentKey` | string | |
| `scheduleId` | ObjectId? | ריק אם הופעל ידנית |
| `status` | `"pending" \| "running" \| "completed" \| "failed"` | |
| `steps` | `{ label: string; at: Date }[]` | תיעוד שלבים לצורך תצוגת התקדמות |
| `logs` | `{ level: string; message: string; at: Date }[]` | |
| `startedAt` / `finishedAt` | Date | |
| `result` | object? | |
| `error` | string? | |

## 5. חוזה API (Agent Orchestrator)

כל הנתיבים תחת `/api/agents`, מאובטחים בטוקן שירות ייעודי (לא טוקן משתמש קצה) עבור קריאות שמגיעות *מהאייג'נטים*, ובטוקן משתמש רגיל (`requireAdmin`) עבור ניהול תזמונים מהפרונט.

| Method | Path | קורא | תיאור |
|---|---|---|---|
| `POST` | `/agents/:agentKey/runs` | אייג'נט | פתיחת ריצה חדשה, מחזיר `runId` |
| `PATCH` | `/agents/runs/:runId` | אייג'נט | עדכון סטטוס/שלב/לוג לריצה קיימת |
| `POST` | `/agents/runs/:runId/complete` | אייג'נט | סגירת ריצה עם תוצאה/שגיאה |
| `GET` | `/agents/runs/:runId/stream` | פרונט | SSE — התקדמות בזמן אמת |
| `GET` | `/agents/:agentKey/runs` | פרונט | היסטוריית ריצות |
| `GET` | `/agents/:agentKey/schedules` | פרונט | רשימת תזמונים |
| `POST` / `PATCH` / `DELETE` | `/agents/:agentKey/schedules/:id` | פרונט | ניהול תזמון (admin בלבד) |

## 6. פרוטוקול הסטרימינג

שימוש בתשתית SSE הקיימת (כמו ב-`openaiController.ts`) ולא ב-WebSocket, כדי לא להוסיף תלות חדשה — הצורך הוא שידור חד-כיווני שרת→פרונט. השרת שומר ב-memory (Map) רשימת listeners פתוחים לכל `runId`; כל `PATCH` על ריצה דוחף event ל-listeners הרשומים בנוסף לכתיבה ל-DB.

## 7. ה-Client SDK המשותף

### 7.1 Node (`server` / כל תהליך Node עתידי)
מודול חדש `agentClient.ts` בממשק אחיד:

```ts
const client = createAgentClient({ agentKey: "foo-agent" });
const run = await client.startRun({ config: { bar: 1 } });
await run.step("baz-step");
await run.log("info", "lorem ipsum");
await run.complete({ result: { ok: true } });
```

### 7.2 Python (`log-agent` וכל תהליך Python עתידי)
מודול מקביל `agent_client.py` עם אותו חוזה HTTP:

```python
client = AgentClient(agent_key="foo-agent")
run = client.start_run(config={"bar": 1})
run.step("baz-step")
run.log("info", "lorem ipsum")
run.complete(result={"ok": True})
```

שני המימושים מדברים באותו פרוטוקול — זהו למעשה "הקליינט המשותף": לא ספרייה אחת פיזית (השפות שונות), אלא **חוזה אחד** ושני מימושים דקים שלו.

## 8. תזמונים

יש להוסיף תלות תזמון בשרת (`node-cron` מומלץ ל-MVP — קליל, ללא תשתית נוספת כמו Redis; שדרוג עתידי ל-`BullMQ` אם יידרש retry/queue מבוזר). שירות `agentSchedulerService.ts` טוען את כל ה-`AgentSchedule` הפעילים באתחול השרת, קובע cron job לכל אחד, ובכל טריגר מבצע קריאת HTTP פנימית להפעלת האייג'נט הרלוונטי (או, לאייג'נטים חיצוניים, שולח webhook).

## 9. פירוק משימות לפי צוות

לפי התפקידים המוגדרים ב-[AGENTS.md](../AGENTS.md).

### שלב א' — Backend Developer Agent

| # | משימה | תוצר |
|---|---|---|
| B1 | מודלים `AgentSchedule`, `AgentRun` (Mongoose) | סכמות + אינדקסים על `agentKey`, `status` |
| B2 | שירות `agentRunService.ts` — פתיחה/עדכון/סגירת ריצה, ניהול listeners ל-SSE | API פנימי |
| B3 | קונטרולר + ראוטר `agentsRouter.ts` לפי חוזה סעיף 5, כולל אימות טוקן שירות לנתיבי אייג'נט | נתיבים חיים |
| B4 | נתיב `GET /agents/runs/:runId/stream` (SSE) | סטרימינג חי |
| B5 | `agentSchedulerService.ts` עם `node-cron`, טעינת תזמונים באתחול | תזמונים פעילים |
| B6 | `server/src/services/agentClient.ts` (Node SDK) | ספריית אינטגרציה ל-Node |
| B7 | חיבור `tenderBoardAIService.ts` ל-SDK כ-proof of concept ראשון | אייג'נט קיים משודרג |
| B8 | תיעוד חוזה ה-API (request/response schema) עבור Frontend Agent | מסמך חוזה |

### שלב ב' — Frontend Developer Agent (תלוי סיום B3/B4/B8)

| # | משימה | תוצר |
|---|---|---|
| F1 | Redux slice `agentsSlice` — תזמונים + ריצות | ניהול state |
| F2 | Hook `useAgentRunStream(runId)` מבוסס `EventSource`, לפי דפוס `apiCall` הקיים | חיבור SSE טיפוסי |
| F3 | עמוד "לוח אייג'נטים" — רשימת `agentKey`-ים רשומים + סטטוס ריצה אחרונה | UI |
| F4 | עמוד/מודל "עריכת תזמון" — טופס ליצירת/עריכת `AgentSchedule` | UI + validation |
| F5 | תצוגת "ריצה חיה" — timeline של `steps`/`logs` בזמן אמת | UI |
| F6 | הוספת הנתיבים ל-[CLIENT_ROUTING_STRUCTURE.md](CLIENT_ROUTING_STRUCTURE.md) | תיעוד |

### שלב ג' — QA / Testing Agent (תלוי סיום שלבים א'-ב')

| # | משימה | תוצר |
|---|---|---|
| Q1 | טסט אינטגרציה: יצירת ריצה → עדכון שלבים → סגירה → אימות תוכן ב-DB | דוח כיסוי happy path |
| Q2 | טסט הרשאות: קריאה לנתיבי אייג'נט ללא טוקן שירות → 401/403 | דוח אבטחה |
| Q3 | טסט SSE: פתיחת חיבור, קבלת אירועים לפי סדר כרונולוגי, סגירה תקינה בסיום ריצה | דוח יציבות סטרימינג |
| Q4 | טסט תזמון: יצירת `AgentSchedule` עם cron קצר בסביבת בדיקה, אימות שריצה נפתחת אוטומטית | דוח תזמון |
| Q5 | טסט רגרסיה: `tenderBoardAIService` ממשיך לעבוד תקין לאחר חיבור ל-SDK | דוח רגרסיה |

## 10. תלויות חדשות נדרשות

- שרת: `node-cron` (או `agenda` אם נדרש persistence מובנה לתזמונים מעבר ל-Mongo ידני).
- אין תלויות פרונט חדשות — `EventSource` הוא native ב-browser.
- אין תלות Python חדשה מעבר ל-`requests` (כבר קיים דרך `db.py`/`fetch_logs.py`).

## 11. החלטות פתוחות לצוות

1. האם טוקן השירות לאייג'נטים הוא API key סטטי לכל `agentKey`, או JWT קצר-טווח מונפק על פי דרישה?
2. האם `log-agent` יעבור לפעול כתהליך pm2 מתוזמן דרך ה-orchestrator, או ימשיך כ-cron מערכת חיצוני שרק *מדווח* ל-orchestrator?
3. גבול שמירת `logs`/`steps` בתוך `AgentRun` (TTL / מגבלת אורך) כדי למנוע מסמכי Mongo גדולים מדי.
