# מערכת ניהול פדגוגי - סילבוסים / תיעוד שיעורים / הגשות

מערכת Client-Server-DB מלאה (React + Node/Express + MongoDB), נפרדת לגמרי מהקוד הקיים בריפו (SafeAI). כוללת התחברות אמיתית (JWT) ואכיפת הרשאות בצד השרת לפי תפקיד: **רכזת מגמה**, **מזכירה**, **מורה**, **תלמידה**.

## מבנה הפרויקט

```
pedagogical-system/
├─ server/     Node.js + Express + Mongoose (JavaScript)
├─ client/     React + Vite (JavaScript)
├─ backup/     סקריפטי גיבוי/שחזור ל-MongoDB
└─ docker-compose.yml
```

## הרצה מהירה (מומלץ) - Docker Compose

דורש Docker Desktop מותקן ורץ במחשב שלך.

```bash
cd pedagogical-system
docker compose up --build
```

זה מרים 3 שירותים:
- MongoDB על פורט 27017 (עם volume קבוע - הנתונים נשמרים גם אחרי `docker compose down`)
- שרת Express על http://localhost:4000
- קליינט React (Vite dev) על http://localhost:5173

**בפעם הראשונה בלבד**, בטרמינל נפרד, יש להריץ את סקריפט אכלוס הנתונים (יוצר קורסים, שיעורים ומשתמשות דמו):

```bash
docker compose exec server npm run seed
```

לאחר מכן פותחים דפדפן בכתובת http://localhost:5173 ומתחברים עם אחד ממשתמשי הדמו למטה.

## הרצה בלי Docker (פיתוח מקומי)

```bash
# דורש MongoDB רץ על localhost:27017 (או כתובת אחרת ב-MONGO_URI)
cd server
cp .env.example .env
npm install
npm run seed     # אכלוס נתונים
npm run dev       # http://localhost:4000

# בטרמינל נפרד
cd client
cp .env.example .env
npm install
npm run dev       # http://localhost:5173
```

## משתמשות לדוגמה (לאחר `npm run seed`)

כל הנתונים גנריים (Course A/B, Unit 1/2/3) כדי שיהיה קל להחליף בנתונים אמיתיים בהמשך.

| תפקיד | אימייל | סיסמה |
|---|---|---|
| רכזת מגמה | coordinator@example.com | Demo1234! |
| מזכירה | secretary@example.com | Demo1234! |
| מורה (קורס A) | teacher1@example.com | Demo1234! |
| מורה (קורס B) | teacher2@example.com | Demo1234! |
| תלמידה (קורס A) | student1@example.com | Demo1234! |
| תלמידה (קורס B) | student2@example.com | Demo1234! |

מומלץ להתחבר כ-`student1` ולוודא שהיא רואה רק את קורס A, וכ-`teacher2` ולוודא שהוא רואה רק את קורס B - זו בדיוק אכיפת ההרשאות המרכזית של המערכת.

## מטריצת הרשאות (נאכפת בצד השרת, לא רק בממשק)

| מודול | רכזת מגמה | מזכירה | מורה | תלמידה |
|---|---|---|---|---|
| סילבוסים | צפייה+עריכה בכל הקורסים | צפייה בכל הקורסים | צפייה+עריכה **רק** בקורסים שהיא מלמדת | צפייה **רק** בקורס שהיא רשומה אליו |
| תיעוד שיעורים | צפייה+עריכה בהכל | צפייה בהכל | צפייה בקורסים שלה, עריכה **רק** ברשומות שהיא יצרה | צפייה **רק** בשיעורי הקורס שלה |
| הגשות | צפייה בהכל + עדכון סטטוס | צפייה בהכל | צפייה+עדכון סטטוס **רק** להגשות בקורסים שלה | צפייה והגשה **רק** של ההגשות של עצמה |

הבדיקה מתבצעת בכל בקשת API (לא רק הסתרת כפתורים בממשק) - ראו `server/src/permissions.js` ואת הבדיקות ב-`server/src/permissions.test.js` (מריצים עם `npm test` בתיקיית `server`).

## גיבוי ושחזור (כשעובדים עם Mongo מקומי ב-Docker)

ה-volume הקבוע (`mongo_data`) שומר את הנתונים כל עוד לא מוחקים אותו במפורש (`docker compose down -v`). זה מספיק להמשכיות יומיומית על אותה מכונה, אבל **לא** מגן מפני מחיקת המכונה, פגיעה בדיסק, או מעבר למחשב אחר. לכן מומלץ לגבות מדי פעם לקובץ חיצוני:

```bash
./backup/backup.sh                        # יוצר backups/backup-<תאריך-שעה>.gz
./backup/restore.sh backups/backup-XXXX.gz  # משחזר מקובץ גיבוי (מוחק ומחליף את הנתונים הקיימים)
```

מומלץ להריץ את `backup.sh` על בסיס קבוע (למשל cron יומי) ולהעתיק את קובץ הגיבוי למקום נוסף (דיסק חיצוני/אחסון ענן) - כך שגם אם המחשב עצמו נפגע, הנתונים לא אבודים.

**לטווח ארוך**, כשתרצי גישה אמיתית מהאינטרנט (לא רק מהמחשב שלך) ובלי לדאוג לגיבויים ידניים - הפתרון הבא הוא לעבור מ-Mongo מקומי ל-MongoDB Atlas (יש להם tier חינמי) ולשירות אחסון לשרת/קליינט (כגון Render/Railway/Fly.io). זה דורש חשבון וכרטיס אשראי בצד שלך, ולכן לא בוצע כברירת מחדל כאן. כשתרצי, מספיק לשנות את `MONGO_URI` בקובץ `server/.env` לכתובת ה-Atlas ולפרוס את `server/` ו-`client/` (אחרי `npm run build`) לשירות המתאים.

## הערה על סביבת הפיתוח הנוכחית (Claude Code בענן)

בסביבת ה-sandbox שבה נכתב קוד זה אין גישה ל-Docker daemon ואין אפשרות להוריד את קובץ ההרצה של MongoDB (חסום ברמת מדיניות הרשת) - ולכן לא ניתן היה להריץ פה הדגמה חיה עם דפדפן. הלוגיקה נבדקה באמצעות בדיקות יחידה אמיתיות על כללי ההרשאות (`server/src/permissions.test.js`, 11/11 עוברות), ובניית ה-client עברה בהצלחה (`npm run build`). ההרצה המלאה עם דפדפן אמורה לעבוד ישירות במחשב שלך via `docker compose up`.

## API עיקרי

- `POST /api/auth/login` - התחברות, מחזיר JWT
- `GET /api/auth/me` - פרטי המשתמשת המחוברת
- `POST /api/auth/users` - יצירת משתמשת חדשה (רכזת מגמה בלבד)
- `GET/POST/PUT/DELETE /api/courses` (+`/:id/units`) - סילבוסים
- `GET/POST/PUT/DELETE /api/lesson-logs` - תיעוד שיעורים
- `GET /api/submissions`, `GET /api/submissions/open-assignments` (מציג רק מטלות שעדיין לא הוגשו), `POST /api/submissions` (תוכן + קובץ מצורף אופציונלי עד 5MB, base64), `GET /api/submissions/:id/file` (הורדת הקובץ), `PUT /api/submissions/:id/status` - הגשות
