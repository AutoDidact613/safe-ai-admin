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