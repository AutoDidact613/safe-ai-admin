# agents_logger.py

מודל + לוגר לתיעוד קריאות AI שמבצעים אייג'נטים, כולל כתיבה ישירה ל-MongoDB
(`pymongo`). זהו הממשק היחיד שדרכו יש לכתוב ל-collection `agent_logs` —
אין לגשת אליה ישירות ממקום אחר בקוד.

## מה יש בקובץ

קובץ פייתוני יחיד (`agents_logger.py`) שמכיל:
- **Enums** — `NodeType`, `Phase`, `Status`.
- **מודל** — `AgentLogDocument` (dataclass) שמתאר את מבנה כל רשומה, ו-`AgentLogInput` לתת-המבנה של הקלט.
- **חיבור ל-DB** — singleton של `pymongo.MongoClient`, כולל יצירת האינדקסים הנדרשים אוטומטית בקריאה הראשונה.
- **פונקציות ציבוריות** — `start_agent_log`, `end_agent_log`, `agent_log` (context manager), `find_stuck_invocations`.

## הגדרות סביבה

| משתנה סביבה | ברירת מחדל | הסבר |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017` | כתובת החיבור ל-MongoDB |
| `MONGODB_DB_NAME` | `safeai` | שם מסד הנתונים |

## מחזור החיים

כל invocation בודד מייצר **שתי רשומות נפרדות** ב-MongoDB, מקושרות דרך `invocation_id` משותף:

1. **לפני** שליחת הבקשה ל-AI — נכתבת רשומה עם `phase="start"`.
2. **אחרי** שהתקבלה תשובה — נכתבת רשומה נוספת עם `phase="end"`, `status="success"`/`"error"`, ו-`duration_ms` (מחושב מזמן שנשמר בזיכרון התהליך בעזרת `time.monotonic()`).
3. אם הקריאה נופלת באמצע (timeout / קריסה) — רשומת ה-`end` פשוט לא נכתבת לעולם, ורשומת ה-`start` נשארת ללא זוג. ראו `find_stuck_invocations` לאיתור מקרים כאלה.

## דרך השימוש המומלצת — `agent_log` (context manager)

```python
from agents_logger import agent_log, NodeType

with agent_log(
    run_id="foo-run-123",
    agent_name="foo_agent",
    node="generate_summary",
    node_type=NodeType.LLM,
    system_prompt="lorem ipsum dolor sit amet",
    user_prompt="lorem ipsum dolor sit amet consectetur",
) as set_output:
    result = call_some_ai_provider(...)
    set_output(result)
```

- אם הקוד בתוך ה-`with` מסתיים בהצלחה — נכתבת רשומת `end` עם `status="success"` והפלט שהועבר ל-`set_output`.
- אם נזרקת שגיאה — נכתבת רשומת `end` עם `status="error"` וההודעה של השגיאה, וההודעה **נזרקת הלאה** (raise) כרגיל.

## שימוש ידני — `start_agent_log` + `end_agent_log`

להשתמש רק כאשר תחילת הקריאה וסיומה לא קורים באותו בלוק קוד (למשל streaming).

```python
from agents_logger import start_agent_log, end_agent_log, NodeType, Status

invocation_id = start_agent_log(
    run_id="foo-run-123",
    agent_name="foo_agent",
    node="generate_summary",
    node_type=NodeType.LLM,
    system_prompt="lorem ipsum dolor sit amet",
    user_prompt="lorem ipsum dolor sit amet consectetur",
)

try:
    result = call_some_ai_provider(...)
    end_agent_log(invocation_id=invocation_id, status=Status.SUCCESS, output=result)
except Exception as exc:
    end_agent_log(invocation_id=invocation_id, status=Status.ERROR, error=str(exc))
    raise
```

## פרמטרים - `start_agent_log` / `agent_log`

| פרמטר | חובה? | הסבר |
|---|---|---|
| `run_id` | כן | מזהה הריצה השלמה של האייג'נט. משותף לכל הצעדים של אותה הרצה |
| `agent_name` | כן | שם/סוג האייג'נט שמבצע את הצעד |
| `node` | כן | שם הצעד הספציפי בזרימה של האייג'נט |
| `node_type` | לא | `NodeType.LLM / TOOL / RETRIEVER / CHAIN / PARSER / OTHER`. ברירת מחדל: `OTHER` |
| `parent_run_id` | לא | מזהה צעד-אב, אם זה תת-צעד |
| `system_prompt` | לא | הנחיית המערכת שנשלחת למודל |
| `user_prompt` | לא | תוכן הפנייה שנשלחת למודל |
| `description` | לא | תיאור חופשי לקריאות עין |
| `tags` | לא | רשימת תיוגים חופשיים לסינון/קיבוץ |
| `metadata` | לא | מידע נוסף ללא שדה ייעודי |

## פרמטרים - `end_agent_log`

| פרמטר | חובה? | הסבר |
|---|---|---|
| `invocation_id` | כן | המזהה שהוחזר מ-`start_agent_log` |
| `status` | כן | `Status.SUCCESS` או `Status.ERROR` |
| `output` | לא | הפלט שהתקבל מה-AI, רלוונטי כאשר `status=SUCCESS` |
| `error` | לא | הודעת השגיאה, רלוונטי כאשר `status=ERROR` |

## איתור קריאות תקועות

```python
from agents_logger import find_stuck_invocations

stuck = find_stuck_invocations(older_than_seconds=60)
```

מחזיר רשימת רשומות `start` שאין להן רשומת `end` תואמת בטווח הזמן הנתון.

## תלויות

```bash
pip install pymongo
```
