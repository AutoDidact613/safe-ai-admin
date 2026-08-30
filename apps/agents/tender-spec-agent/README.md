# SafeAI Tender Spec Agent

Agent עצמאי מבוסס LangGraph, שעבור מכרז בודד מפיק המלצה טכנולוגית, עד 5 קישורים
לפרויקטי קוד פתוח דומים, עד 5 מקורות קריאה, ומסמך אפיון ראשוני.

ל-agent הזה אין תלות ישירה בקוד של `client/` או `server/`, ואין לו בסיס נתונים
משותף. ההתממשקות עם אתר SafeAI-613 נעשית אך ורק דרך ה-REST API של השרת
(`SAFEAI_API_BASE_URL`) — אותו דפוס בדיוק כמו ב-`apps/agents/inquiry-agent`
וב-`apps/agents/log-agent`.

## התקנה

```
python -m venv .venv
.venv/Scripts/activate   # Windows
pip install -r requirements.txt
cp .env.example .env     # ואז למלא ערכים אמיתיים
```

## הגרף (Graph)

```
fetch_node -> tech_stack_node -> research_node -> spec_document_node -> save_node
```

בשונה מ-`inquiry-agent`, אין כאן HITL gates ואין checkpointer — כל ריצה היא
מעבר חד-פעמי (one-shot) עבור מכרז בודד, שמתחיל ומסתיים בתוך הפעלת CLI אחת.

- **`fetch_node`**: שולף את נתוני המכרז דרך `GET /tender-board/:id/agent-context`.
- **`tech_stack_node`**: פונה ל-Gemini לקבלת שפה/framework מומלצים + נימוק קצר.
- **`research_node`**: משתמש ב-Google Custom Search API כדי לאתר עד 5 פרויקטי קוד
  פתוח דומים ועד 5 מקורות קריאה. חיפוש שנכשל לא מפיל את כל הריצה — היא ממשיכה עם
  רשימה ריקה עבור הקטגוריה שנכשלה, ומסמנת `research_failed` כדי ש-`save_node`
  יוכל לציין את הכשל החלקי.
- **`spec_document_node`**: מרכיב מסמך אפיון מינימלי (רקע, מטרות, milestones
  מוצעים, היקף ראשוני) מתוך המידע שנאסף עד כה.
- **`save_node`**: כותב את התוצאה המלאה בחזרה דרך `POST /tender-board/:id/specification`.

## טיפול בכשלים

כשל ב-`fetch_node`/`tech_stack_node` (שרת לא זמין, טוקן לא תקין, שגיאת Gemini)
נתפס ב-`run_agent.py`, שמדווח `status: "failed"` ישירות לשרת לפני יציאה עם קוד
שגיאה — כך שהמכרז לעולם לא נשאר תקוע במצב `"generating"`. זהו קו הגנה שני,
בנוסף למנגנון ה-timeout של ה-runner בצד השרת (SCRUM-293).

## ספקי LLM וחיפוש

- **Gemini** דרך `google-genai` (`GEMINI_API_KEY`, `LLM_MODEL`) — ספק ה-LLM
  היחיד בפרויקט, בהתאמה ל-`inquiry-agent`/`log-agent`.
- **Google Custom Search API** (`GOOGLE_SEARCH_API_KEY`, `GOOGLE_SEARCH_ENGINE_ID`)
  עבור `research_node` — אין יכולת חיפוש אינטרנט מובנית בשום מקום אחר בריפו, כך
  שזהו ה-agent הראשון שתלוי בספק חיפוש חיצוני. האופציה "Search the entire web"
  לא הייתה זמינה בחשבון ה-Google ששימש להקמת ה-Programmable Search Engine, כך
  שהמנוע מוגדר לחפש ברשימת אתרים קבועה (github.com, gitlab.com, stackoverflow.com,
  dev.to, medium.com, freecodecamp.org) במקום בכל האינטרנט — ראו `_OPEN_SOURCE_SITES`
  ו-`_READING_SITES` ב-`nodes.py`.

## אימות (Auth)

`SAFEAI_AGENT_API_TOKEN` הוא כרגע JWT אדמין אישי המשמש כטוקן שירות — אותה
קונבנציה שכבר קיימת ב-`inquiry-agent`/`log-agent` (עדיין אין מנגנון
service-account ייעודי בשרת — מתועד כעבודה עתידית, לא חלק מסט הכרטיסים הנוכחי).

## שימוש ב-CLI

```
python run_agent.py generate --tender-id <id>
```

## הפעלה מה-UI

ה-agent הזה אינו פרוס כשירות שרץ ברקע (long-running service). השרת
(`apps/server/src/services/tenderSpecAgentRunner.ts`) מריץ את
`python run_agent.py generate --tender-id <id>` כתהליך subprocess חד-פעמי,
כאשר בעל המכרז/אדמין לוחץ על כפתור "הפקת אפיון" — ראו SCRUM-293.
כדי שזה יעבוד בסביבת staging/production, על קונטיינר ה-`server` להתקין גם
Python 3 ואת התלויות מ-`requirements.txt` של ה-agent; עבודת ה-packaging הזו
ב-Docker/CI אינה חלק מהקוד של ה-agent עצמו ומתועדת בנפרד.
