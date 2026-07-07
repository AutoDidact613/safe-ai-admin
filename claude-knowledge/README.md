# SafeAI — חבילת ידע ל-claude.ai

תיקייה זו מכילה מסמכי ידע מרוכזים שנועדו להעלאה ל-**Project Knowledge** ב-claude.ai,
כדי ש-Claude (ב-claude.ai) יכיר את הפרויקט בלי לקרוא את כל קוד המקור.

## איך להשתמש
1. היכנס ל-claude.ai → צור **Project** חדש (למשל "SafeAI Admin").
2. פתח את ה-Project → לשונית **Knowledge** → **Add content**.
3. גרור לשם את כל קבצי ה-`.md` מהתיקייה הזו (חוץ מקובץ זה — לא חובה, אבל לא מזיק).
4. בשדה ה-Custom Instructions של ה-Project הדבק:
   > זהו פרויקט SafeAI — פלטפורמת proxy/gateway ל-AI עם שכבת סינון בטיחות.
   > קרא את מסמכי הידע לפני מענה. ענה בעברית עם מונחים טכניים באנגלית.

## תוכן החבילה
| קובץ | תיאור |
|------|-------|
| `01-overview.md` | מה זה SafeAI, סטאק, מבנה monorepo, תפקידים |
| `02-backend-architecture.md` | שכבות השרת, זרימת בקשה, middleware, הרשמת routes |
| `03-data-models.md` | מודלי Mongoose (User, Organization, AIProfile, Logs...) |
| `04-api-reference.md` | מפת ה-endpoints של ה-REST API |
| `05-safety-filter-engine.md` | מנוע הסינון: workflows, nodes, guardInput, embeddings/LLM |
| `06-frontend.md` | מבנה ה-client, routing, Redux, auth, features |
| `07-deployment-and-env.md` | Docker, LiteLLM, משתני סביבה, פריסה |

## רענון
כשהפרויקט משתנה משמעותית — הרץ שוב את התהליך שמייצר את הקבצים (או בקש מ-Claude Code
לעדכן), ואז החלף את הקבצים ב-Project Knowledge. הידע ב-claude.ai הוא **תמונת מצב**, לא חי.

> נוצר ע"י Claude Code מתוך קוד המקור. תאריך: 2026-06-29.
