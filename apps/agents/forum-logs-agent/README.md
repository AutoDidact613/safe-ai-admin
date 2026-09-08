# Logs Analysis Agent

אייג'נט LangGraph לניתוח לוגים של אפליקציה: שולף לוגים מ-MongoDB, מנתח ביצועים ושגיאות (כולל שדות עסקיים מקוננים תחת `context`), מאמת את הממצאים שלו מול הלוגים הגולמיים, ומפיק דוח Markdown.

## התקנה

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

העתיקו את `.env.example` ל-`.env` ומלאו את הערכים (ראו טבלת משתני סביבה למטה).

## הרצה

```bash
python -m agent.cli
```

ה-CLI תפריטי: שאלה בשפה חופשית (מתורגמת לפילטר על ידי LLM, עם guardrail שדוחה בקשות לא-רלוונטיות), או סינון מודרך (level/תאריכים/userId/organizationId/requestId). בסוף ריצה אפשר לשמור את הדוח לקובץ `.md`.

## מבנה הפרויקט

```
agent/
├── state.py     # LogAnalysisState - מבנה המידע שעובר בין שלבי הגרף
├── tools.py      # שליפת לוגים מ-MongoDB, עם allow-list על השדות/אופרטורים (הגנה מפני NoSQL injection)
├── nodes.py      # שלבי הניתוח (fetch/perf/error/summary/evaluator/report) + פענוח בקשה חופשית
├── graph.py      # הרכבת שלבי הניתוח לגרף LangGraph, כולל לולאת retry
├── tracing.py    # לוגר tracing עצמאי - כניסה/יציאה מכל node עם timestamp, לקונסולה ול-logs/agent_trace.jsonl
└── cli.py        # ממשק שורת פקודה אינטראקטיבי
evals/
├── eval.py       # מדידת עלות/טוקנים/זמן על קטעי לוגים מדומים
└── results/      # פלטי CSV מהרצות eval
```

## סכימת הלוגים

שדות קבועים ברמה העליונה: `level`, `message`, `userId`, `organizationId`, `requestId`, `stack`, `timestamp`.
שדות עסקיים מותאמים אישית (`orderId`, `amount`, `itemId`, `status` וכו') מקוננים תחת `context`, ומסוננים כ-`context.<שם שדה>` (למשל `{"context.orderId": "12345"}`).

## משתני סביבה

| משתנה | תיאור |
|---|---|
| `LOGS_MONGO_URI` | מחרוזת חיבור ל-MongoDB (משתמש Read-Only). ריק = האייג'נט מחזיר שגיאה ברורה במקום לנסות להתחבר |
| `LOGS_DATABASE_NAME` / `LOGS_COLLECTION_NAME` | שם ה-DB והקולקציה של הלוגים |
| `LLM_PROVIDER` | `openai` (ברירת מחדל) או `openrouter` |
| `OPENAI_API_KEY` / `OPENROUTER_API_KEY` | מפתח ה-API בהתאם לספק שנבחר |
| `DEFAULT_MODEL` | שם המודל שברירת המחדל של כל ה-nodes נופלת אליו (פורמט תלוי בספק) |
| `SUMMARY_MODEL_NAME` / `EVALUATOR_MODEL_NAME` / `REPORT_MODEL_NAME` / `INTERPRETER_MODEL_NAME` | override אופציונלי למודל של node ספציפי |
| `MAX_LOG_ENTRIES_PER_QUERY` | תקרת מספר הלוגים שנשלפים בשאילתה בודדת |
| `LANGCHAIN_TRACING_V2` / `LANGCHAIN_API_KEY` / `LANGCHAIN_PROJECT` | ניטור LangSmith (אופציונלי) |

## Evals

```bash
python evals/eval.py
```

מריץ כמה "קטעי לוגים" מדומים דרך שלבי הניתוח (לא דורש חיבור Mongo אמיתי), ושומר טבלת עלות/טוקנים/זמן לכל אחד תחת `evals/results/`.
