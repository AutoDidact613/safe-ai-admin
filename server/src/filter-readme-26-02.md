# 🛡️ SafeAI Manager – Daily Summary (README)

> מסמך זה מסכם את העבודה שבוצעה היום בפרויקט **SafeAI Manager** ומגדיר את המשימות הבאות, כולל דרישות ל־Retry שמחזיר גם HTML וגם Markdown מוכנים להטמעה.

---

## 📌 פרטי פרויקט

- **שם הפרויקט:** SafeAI Manager  
- **מיקום מקומי:** `C:\SafeAI Manager\...` (בכונן C)
- **אופן הרצה מקומי:** Docker Compose (כדי לעקוף בעיות SSL/תעודות אבטחה של נטפרי)

---

## ✅ מה פותח היום

### 1) Endpoints בשרת

נוספו שתי נקודות קצה עיקריות:

1. **Endpoint להוספה/יצירה של Embedding לפילטר**
   - מקבל משפט + יעד (allowed/blocked)
   - יוצר embedding
   - מוסיף למאגר הדוגמאות של הפילטר

2. **Endpoint לבדיקה (`isAllowed`)**
   - מקבל משפט
   - מייצר embedding
   - משווה מול allowed/blocked
   - מחזיר החלטה + ביטחון (בהמשך גם הסבר + Retry UI)

---

## 🧠 מצב הפילטר כרגע

נבנה פילטר ראשוני לתחום **תכנות** בלבד:

- **3 משפטים מאושרים**
- **3 משפטים חסומים**

⚠️ מסקנה: הפילטר עדיין **לא מדויק**, כי כמות הדוגמאות קטנה מדי ולכן ההשוואה הסמנטית לא יציבה.

---

## 🚀 איך להריץ את הפרויקט (תזכורת לפעם הבאה)

### הרצה עם Docker Compose

```bash
docker compose up --build
```

**למה Docker?**  
כדי להימנע מתקלות SSL/Certificate בסביבה עם נטפרי.

---

## 🖥️ מצב השרת כרגע (Deployment)

- לא כל הקוד נמצא על השרת
- תהליך מומלץ:
  1. Push ל־GitHub
  2. Pull Request
  3. Merge
  4. Pull בשרת

⚠️ חשוב: השרת משמש גם לסינון של **Continue** כרגע.  
מומלץ לבצע עדכונים **בשעות הלילה** כשהמתכנתות לא עובדות.

---

# 🔜 המשימות הבאות

## 1) אחסון Embeddings ישירות ב־MongoDB

מטרה: מעבר מאחסון זמני/מקומי לאחסון קבוע:

- שמירה קבועה של דוגמאות
- יכולת ניתוח/דיווח
- שיפור דיוק עם דאטה מצטבר
- סקייל עתידי

---

## 2) מנגנון Retry חכם (עם מודל חזק יותר)

לבנות מנגנון שבו כאשר ההחלטה לא מספיק בטוחה:

1. מסמנים ש־Retry זמין
2. מאפשרים Retry ע״י מודל חכם יותר (ולא רק embedding similarity)
3. אם ה־Retry מאשר:
   - מייצרים embedding
   - מכניסים את המשפט ל־allowed / blocked בהתאם

---

## 3) שדרוג Endpoint `isAllowed` – החזרת אובייקט מלא

במקום להחזיר רק true/false, ה־endpoint יחזיר:

- `allowed` – כן/לא
- `confidence` – אחוז/ציון ביטחון
- `reason` – פירוט מה הסיבה
- `retry` – אובייקט עם:
  - האם כדאי להציע Retry
  - URL מובנה ל־Retry
  - **HTML מוכן להטמעה**
  - **Markdown מוכן לשרשור לתשובת LLM**

---

# 🔁 דרישת Retry: החזרת HTML + Markdown מוכנים להטמעה

הפילטר **מתחייב** לספק שני מחרוזות מוכנות:
- `retry.html` – קטע HTML שניתן לשתול במערכת קיימת
- `retry.markdown` – קטע Markdown שניתן לשרשר לתשובת LLM

המפתח/ת בצד הצרכן **לא אמור/ה לבנות Feature** או UI – רק להציג את המחרוזות.

## ✅ עקרונות

- שני המחרוזות יכללו **URL מובנה** (GET או POST) שמפעיל Retry.
- ה־URL יכלול מזהה בקשה (`requestId`) או payload מינימלי.
- ה־Retry endpoint יקבל נתונים, יבצע בדיקה עם מודל חכם יותר, ויחזיר:
  - החלטה סופית
  - confidence
  - reason
  - ואם אושר/נחסם – יתבצע **auto-learn** (הכנסה ל־allowed/blocked + שמירה ל־MongoDB)

---

## 📦 Response Schema מוצע ל־/isAllowed

```json
{
  "allowed": false,
  "confidence": 0.56,
  "reason": {
    "code": "LOW_CONFIDENCE",
    "summary": "המשפט לא מספיק דומה לדוגמאות התכנות הקיימות",
    "details": {
      "allowedSim": 0.58,
      "blockedSim": 0.61,
      "threshold": 0.70
    }
  },
  "retry": {
    "available": true,
    "method": "POST",
    "url": "https://YOUR_DOMAIN/api/retry?requestId=REQ_123",
    "html": "<div class=\"safeai-retry\">\n  <p>לא בטוח/ה שהבקשה קשורה לתכנות. רוצה לנסות בדיקה חכמה יותר?</p>\n  <form method=\"post\" action=\"https://YOUR_DOMAIN/api/retry?requestId=REQ_123\">\n    <button type=\"submit\">בדיקת Retry</button>\n  </form>\n</div>",
    "markdown": "⚠️ **לא בטוח/ה שהבקשה קשורה לתכנות** (confidence: 0.56).\n\n➡️ לחצי/לחץ כדי לבצע **Retry** עם מודל חכם יותר:\n\n[ביצוע Retry](https://YOUR_DOMAIN/api/retry?requestId=REQ_123)\n"
  }
}
```

> הערה: אם המערכת הצרכנית לא יכולה להציג לינק Markdown כ־GET, ניתן להחזיר Markdown שמכיל גם **פקודת curl** מוכנה (או הנחיה קצרה), אך עדיין כמחרוזת אחת.

---

## 🔌 Retry Endpoint – הצעת חוזה API

### אפשרות מומלצת: POST עם requestId

- **Endpoint:** `POST /api/retry?requestId=...`
- **Body (אופציונלי):**
  - אם יש צורך: `originalText`, `context`, `userId`, `domain`, וכו׳
  - אפשר גם לעבוד *רק* עם `requestId` אם שומרים את פרטי הבקשה בצד השרת בזמן הקריאה ל־isAllowed

#### Response לדוגמה

```json
{
  "allowed": true,
  "confidence": 0.91,
  "reason": {
    "code": "MODEL_VERIFIED",
    "summary": "מודל חכם אימת שהשאלה קשורה לתכנות",
    "details": {
      "model": "SMART_MODEL_NAME",
      "verdict": "ALLOWED"
    }
  },
  "learned": {
    "stored": true,
    "bucket": "allowed",
    "storage": "mongodb"
  }
}
```

---

# 🧭 שלב עתידי: UI לניהול המסנן (Admin)

מטרות UI:

- צפייה ב־Prompts וב־Embeddings
- צפייה ברשימות Allowed / Blocked
- אימון ישיר: הכנסת משפטים ידנית
- אימון עקיף: ניסוי שאלות, צפייה בתוצאות, Retry, ולמידה אוטומטית

---

# 🧩 תובנות מהיום

- Embedding Filter דורש יותר דאטה כדי להגיע לדיוק גבוה
- Retry הוא מנגנון קריטי לשיפור איכות + למידה מהשטח
- החזרת HTML/Markdown מוכנים מקלה על אינטגרציה במערכות קיימות

---

## 🗒️ TODO קצר

- [ ] מעבר לאחסון embeddings ב־MongoDB
- [ ] בניית Retry עם מודל חכם יותר
- [ ] הרחבת `/isAllowed` להחזיר reason + confidence + retry(html/markdown/url)
- [ ] auto-learn: הכנסת משפטים ל־allowed/blocked לאחר retry
- [ ] UI לניהול/אימון המסנן





ם הייתי בונה לך דף נחיתה

הכותרת הראשית הייתה:

Finally, AI That Stays In Its Lane.

והסאב־טייטל:

SafeAI Manager gives organizations full control over professional AI usage.



#  מה עשיתי היום 07-03
יצרתי שליחהלבדיקה חכמה במקרה של ספק בינתייים זה נראה שבהרבה מהמקרים הוא שולח לבדיקה החכמה.
לא נרוא.  יש טבלת מעקב בשם evaluate
דחפתי לגיטהאב יצרתי פולריקווסט לא מיזגתי שינויים זה בראנצ' מונגו דיבי צריך למזג להעלות לשרת בענן וליצור חבילה.

!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!1
ל לשנות סיסמא במונגו!!!
!!! ליצור פרופיל כללי  !!!
!!! ליצור תיעוד מסודר ומבט לעתיד !!!
!!! לבדוק עם נטפרי האם יש בעיות !!!

# יצרתי SDK - שימוש::

from fastapi import FastAPI, Depends
from safeai import SafeAI

app = FastAPI()

# יצירת מופע גלובלי
evaluator = SafeAI(profile_id="69a80a2128be7b3daa47622b")

@app.on_event("startup")
async def startup_event():
    # אתחול הפרומפטים מהשרת בזמן עליית ה-FastAPI
    await evaluator.initialize()

@app.post("/ask")
async def ask_ai(prompt: str):
    # שימוש בסינון
    result = await evaluator.evaluate(prompt)
    
    if not result.get("allowed"):
        return {"status": "blocked", "reason": result.get("reason")}
    
    # כאן יבוא הקוד של שליחת הפרומפט למודל השפה שלך (כמו GPT)
    return {"status": "allowed", "response": "This is a safe answer."}


<!-- 
הנה המבנה המלא והמעודכן של ה-SDK בגרסה אסינכרונית (Async), המותאמת לעבודה עם FastAPI וטוענת את הפרומפטים בזמן היצירה.

מבנה התיקיות המומלץ:
Plaintext
safeai_sdk/
├── setup.py
└── safeai/
    ├── __init__.py
    └── client.py
1. safeai/client.py
זהו לב החבילה. השתמשתי ב-httpx כדי להבטיח שהקריאות לא יחסמו את ה-Event Loop של FastAPI.

Python
import httpx
import logging

logger = logging.getLogger(__name__)

class SafeAI:
    def __init__(self, profile_id: str, api_base_url: str = "http://localhost:3001"):
        self.profile_id = profile_id
        self.api_base_url = api_base_url
        self.evaluate_url = f"{api_base_url}/evaluate"
        self.profile_url = f"{api_base_url}/ai-profiles"
        
        # נתונים שיטענו מהשרת
        self.name = None
        self.content_prompts = []
        self.behavior_prompts = []
        self.knowledge_prompts = []
        self.is_initialized = False

    async def initialize(self):
        """
        טוען את נתוני הפרופיל והפרומפטים מהשרת בצורה אסינכרונית.
        חובה לקרוא לפונקציה זו לאחר יצירת האובייקט.
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(self.profile_url)
                response.raise_for_status()
                profiles = response.json()
                
                # חיפוש הפרופיל המתאים ברשימה
                profile = next((p for p in profiles if p.get("_id") == self.profile_id), None)
                
                if profile:
                    self.name = profile.get("name")
                    self.content_prompts = profile.get("contentPrompts", [])
                    self.behavior_prompts = profile.get("behaviorPrompts", [])
                    self.knowledge_prompts = profile.get("knowledgePrompts", [])
                    self.is_initialized = True
                    logger.info(f"SafeAI: Profile '{self.name}' initialized successfully.")
                else:
                    logger.error(f"SafeAI: Profile ID {self.profile_id} not found.")
            except Exception as e:
                logger.error(f"SafeAI: Failed to initialize profile: {e}")

    async def evaluate(self, text: str):
        """
        שולח טקסט לבדיקה מול השרת.
        """
        if not self.is_initialized:
            logger.warning("SafeAI: Evaluator called before initialization.")

        payload = {
            "profileId": self.profile_id,
            "text": text
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(self.evaluate_url, json=payload, timeout=10.0)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                return {"allowed": False, "reason": f"API Error: {e.response.status_code}"}
            except Exception as e:
                return {"allowed": False, "reason": f"Connection Error: {str(e)}"}
2. safeai/__init__.py
קובץ זה מאפשר ייבוא נוח של המחלקה.

Python
from .client import SafeAI

__all__ = ["SafeAI"]
3. setup.py
קובץ ההתקנה של החבילה.

Python
from setuptools import setup, find_packages

setup(
    name="safeai-sdk",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "httpx>=0.23.0",
    ],
    description="SDK for SafeAI filtering service",
    python_requires=">=3.7",
)
4. דוגמת שימוש בתוך FastAPI
כך תשלבי את הכל ביחד בשרת שלך:

Python
from fastapi import FastAPI, Depends
from safeai import SafeAI

app = FastAPI()

# יצירת מופע גלובלי
evaluator = SafeAI(profile_id="69a80a2128be7b3daa47622b")

@app.on_event("startup")
async def startup_event():
    # אתחול הפרומפטים מהשרת בזמן עליית ה-FastAPI
    await evaluator.initialize()

@app.post("/ask")
async def ask_ai(prompt: str):
    # שימוש בסינון
    result = await evaluator.evaluate(prompt)
    
    if not result.get("allowed"):
        return {"status": "blocked", "reason": result.get("reason")}
    
    # כאן יבוא הקוד של שליחת הפרומפט למודל השפה שלך (כמו GPT)
    return {"status": "allowed", "response": "This is a safe answer."}
הערות חשובות:
שימוש ב-initialize: בגלל שפייתון לא תומכת ב-await בתוך ה-__init__, הוספתי פונקציית initialize נפרדת. ב-FastAPI הכי נכון לקרוא לה בתוך אירוע ה-startup.

Dependencies: אל תשכחי להתקין את הדרישות: pip install httpx.

תרצי שאסביר איך לארוז את זה לקובץ .whl כדי שתוכלי להתקין את זה בפרויקטים אחרים בקלות? -->