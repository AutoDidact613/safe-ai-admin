import request from 'supertest';

// requestLogger רץ על כל בקשה (גם בבדיקה הזו) ומנסה לשמור רשומת לוג
// ב-MongoDB האמיתי. בסביבת בדיקות אין חיבור אמיתי, אז זה "נתקע" ל-10
// שניות (timeout של Mongoose) ומדפיס שגיאה אחרי שהבדיקות כבר הסתיימו.
// מדמים אותו למידלוור ריק שרק קורא ל-next(), כדי לא ליצור את הרעש הזה.
jest.mock('../../middleware/requestLogger', () => ({
  requestLogger: (_req: any, _res: any, next: any) => next(),
}));

// uploadController.ts (שנטען כתלות עקיפה כשמייבאים את index.ts) משתמש
// בחבילת uuid, שגרסתה המותקנת היא ESM-בלבד ו-Jest לא מצליח לפרש אותה
// כברירת מחדל. אין צורך ב-UUID אמיתי בבדיקה הזו כלל, אז פשוט מדמים
// (mock) אותה - כך Jest לא בכלל מנסה לטעון את הקובץ הבעייתי.
// חשוב: jest.mock מסוג זה מ"מקפיץ" (hoisted) אוטומטית מעל שאר ה-imports
// שבקובץ, כך שהוא חוסם את הטעינה האמיתית לפני שהיא קורית.
jest.mock('uuid', () => ({ v4: () => 'mock-uuid-value' }));

// מייבאים את app מ-index.ts עצמו - בזכות ה-export default app + הבדיקה
// require.main === module שנוספה בסוף הקובץ, הייבוא הזה לא מריץ שרת
// אמיתי ולא מתחבר ל-MongoDB האמיתי.
// הקובץ הזה יושב ב-src/utils/__tests__/, אז צריך לעלות שתי תיקיות (../../)
// כדי להגיע ל-src, ולא רק אחת כמו אם הוא היה יושב ישירות מתחת ל-server/__tests__/.
import app from '../../index';
import Post from '../../models/Post';

jest.mock('../../models/Post'); // מנטרל את המודל האמיתי - לא נוגעים במסד הנתונים האמיתי

describe('GET /api/posts - בדיקת הראוט הראשי של הפורום', () => {
  test('צריך להחזיר סטטוס 200 ורשימת פוסטים', async () => {
    // בפרויקט שלך getPosts משתמש ב-Post.aggregate עם $facet שמחזיר
    // מסמך יחיד בצורת { data: [...], totalCount: N } - חשוב לחקות
    // בדיוק את המבנה הזה, אחרת הבדיקה תיכשל גם אם הקוד תקין.
    (Post.aggregate as jest.Mock).mockResolvedValue([
      {
        data: [{ title: "פוסט בדיקה ראשון" }],
        totalCount: 1
      }
    ]);

    const res = await request(app).get('/api/posts');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.posts)).toBe(true);
    expect(res.body.posts[0].title).toBe("פוסט בדיקה ראשון");
  });
});