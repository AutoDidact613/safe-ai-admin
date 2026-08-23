# תיעוד: טבלת `ContactRequestType` (סוגי פניות טופס יצירת קשר)

## סקירה כללית

`ContactRequestType` הוא Collection ב-MongoDB המחזיק את רשימת "סוגי הפנייה" המוצגים ב-Dropdown של טופס יצירת הקשר בצד הלקוח (`ContactPage.tsx`). כל מסמך מייצג קטגוריה אחת של פנייה (למשל "באג", "שאלה כללית" וכו').

הטבלה משמשת אך ורק כמקור נתונים לרשימת בחירה (lookup table) — היא אינה מקושרת (foreign key) ישירות למודל `ContactMessage` בשכבת ה-DB, אלא הערך הנבחר (`value`) נשלח כטקסט חופשי במסגרת יצירת פניית קשר.

## מיקום בקוד

| שכבה | קובץ |
|---|---|
| Model (Schema) | [`apps/server/src/models/ContactRequestType.ts`](../apps/server/src/models/ContactRequestType.ts) |
| Repository | [`apps/server/src/repositories/contactTypeRepository.ts`](../apps/server/src/repositories/contactTypeRepository.ts) |
| Service | [`apps/server/src/services/contactTypeService.ts`](../apps/server/src/services/contactTypeService.ts) |
| Controller | [`apps/server/src/controllers/contactTypeController.ts`](../apps/server/src/controllers/contactTypeController.ts) |
| Routes | [`apps/server/src/routes/contactTypeRoutes.ts`](../apps/server/src/routes/contactTypeRoutes.ts) |
| רישום ב-App | `apps/server/src/index.ts` — `app.use("/contact-types", contactTypeRoutes)` |
| צריכה בצד לקוח | [`apps/client/src/pages/ContactPage.tsx`](../apps/client/src/pages/ContactPage.tsx), `API_ENDPOINTS.contactTypes` ב-[`apps/client/src/config/api.ts`](../apps/client/src/config/api.ts) |

## סכימת השדות (Schema)

| שדה | טיפוס | חובה | ברירת מחדל | הערות |
|---|---|---|---|---|
| `_id` | ObjectId | אוטומטי | — | מזהה מסמך של Mongoose |
| `label` | String | כן | — | הטקסט המוצג למשתמש ב-UI (למשל `"באג"`) |
| `value` | String | כן | — | **ייחודי** (`unique: true`) — הערך הנשלח בפועל בבקשה |
| `isActive` | Boolean | לא | `true` | קובע אם הסוג מוצג כרגע ברשימה |

> קובץ המקור: `apps/server/src/models/ContactRequestType.ts`

```ts
const contactRequestTypeSchema = new Schema({
  label: { type: String, required: true },
  value: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true }
});
```

## API

### `GET /contact-types`

מחזיר את כל סוגי הפנייה הפעילים (`isActive: true`), ממוינים לפי `label` (א-ב).

- **Auth נדרש:** כן — `authenticateToken` middleware (`apps/server/src/middleware/auth.ts`)
- **Query הבסיס:** `ContactRequestType.find({ isActive: true }).sort({ label: 1 })`

**תגובה מוצלחת (200):**
```json
{
  "success": true,
  "data": [
    { "label": "באג", "value": "bug" },
    { "label": "שאלה כללית", "value": "general" }
  ]
}
```

**תגובת שגיאה (500):**
```json
{
  "success": false,
  "message": "שגיאה בשליפת סוגי פניות"
}
```

### זרימת הקריאה (Data Flow)

```
Route (GET /contact-types)
  → authenticateToken (middleware)
  → contactTypeController.getContactTypes
    → contactTypeService.getContactTypes
      → contactTypeRepository.getAllActiveTypes
        → ContactRequestType.find({ isActive: true }).sort({ label: 1 })
```

התבנית עוקבת אחר שכבות הפרויקט הסטנדרטיות: Route → Controller → Service → Repository → Model, בהתאם ל-[CLAUDE.md](../CLAUDE.md).

## צריכה בצד הלקוח

ב-`ContactPage.tsx` הרשימה נטענת ב-`useEffect` בעת טעינת העמוד, דרך `apiCall(API_ENDPOINTS.contactTypes)`, ומוצגת כאפשרויות בשדה בחירת סוג הפנייה בטופס.

```ts
// apps/client/src/config/api.ts
contactTypes: `${API_BASE_URL}/contact-types`
```

## הוספה/עדכון של סוגי פנייה

נכון לכתיבת מסמך זה אין endpoint ליצירה/עריכה של סוגי פנייה (אין CRUD מלא) — הכנסת רשומות חדשות ל-`ContactRequestType` מתבצעת ישירות מול ה-DB. אם תידרש תמיכה ב-CRUD מלא (למשל ניהול ע"י מנהל מערכת), יש להוסיף בקרים תואמים ל-`requireAdmin` middleware, בדומה למוסבר ב-[CLAUDE.md](../CLAUDE.md) תחת "Admin routes must use `requireAdmin` middleware".

## הערות ותחזוקה

- שדה `value` הוא ייחודי ברמת ה-Schema — ניסיון להוסיף רשומה עם `value` קיים ייכשל בשכבת ה-DB.
- מסמכים עם `isActive: false` אינם מוסתרים/נמחקים — הם רק אינם מוחזרים מה-endpoint הציבורי, מה שמאפשר "כיבוי" סוג פנייה מבלי לאבד היסטוריה.
