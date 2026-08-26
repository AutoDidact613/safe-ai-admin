import request from 'supertest';

// OPENAI_API_KEY/AWS_*/JWT_* מקבלים ערכי דמה ב-jest.setup.ts, כדי שמודולים
// שבונים לקוח (OpenAI/S3) או מאמתים משתנה סביבה בזמן import לא יקרסו כשה-
// טסט מייבא את src/index.ts - לא צריך למקמק (mock) קובץ config ספציפי בשביל זה.

// utils/crypto.ts זורק שגיאה ברמת המודול אם ENCRYPTION_KEY לא מוגדר -
// נטען בשרשרת דרך middleware/proxyAuth. אין קובץ .env ב-CI, אז מדמים אותו.
jest.mock('../../utils/crypto', () => ({
  generateApiKey: () => 'mock-key',
  hashApiKey: () => 'mock-hash',
  getKeyPrefix: () => 'mock-prefix',
  encryptSecret: (v: string) => v,
  decryptSecret: (v: string) => v,
}));

jest.mock('uuid', () => ({ v4: () => 'mock-uuid-value' }));
jest.mock('../../middleware/requestLogger', () => ({
  requestLogger: (_req: any, _res: any, next: any) => next(),
}));

// aiService נקרא ברקע (fire-and-forget) ליצירת embedding לכותרת - מדמים
// אותו כדי שלא תהיה קריאה אמיתית ל-OpenAI בבדיקה
jest.mock('../../services/aiService', () => ({
  getEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  suggestTags: jest.fn(),
  suggestTitles: jest.fn(),
  refineContent: jest.fn(),
}));

jest.mock('../../models/Post');
jest.mock('../../models/user');

import app from '../../index';
import Post from '../../models/Post';
import { User } from '../../models/user';
import { generateAccessToken } from '../jwt';

// requireForumPermission שולף את המשתמש מה-DB לפי userId שנלקח מהטוקן, ולכן
// חייב להיות ObjectId תקני (24 hex) - שלא כמו לפני שהמידלוור הזה חובר לראוט.
const USER_ID = '507f1f77bcf86cd799439011';

describe('POST /api/posts - יצירת פוסט חדש', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('מחזיר 401 כשאין טוקן התחברות בכלל', async () => {
    const res = await request(app)
      .post('/api/posts')
      .send({ title: 'כותרת', content: 'תוכן הפוסט', category: 'פיתוח', tags: [] });

    expect(res.status).toBe(401);
  });

  test('מחזיר 403 עבור משתמשת מחוברת שאין לה הרשאת canCreatePosts', async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ canCreatePosts: false }),
      }),
    });

    const token = generateAccessToken({ userId: USER_ID, email: 'a@b.com', role: 'user' });

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'כותרת חדשה', content: 'תוכן הפוסט', category: 'פיתוח', tags: [] });

    expect(res.status).toBe(403);
  });

  test('יוצר פוסט בהצלחה עבור משתמשת מחוברת עם הרשאת canCreatePosts וטוקן תקין', async () => {
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ canCreatePosts: true }),
      }),
    });

    (Post as any).mockImplementation(() => ({
      save: jest.fn().mockResolvedValue({ _id: 'newpost1' }),
    }));

    (Post.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        _id: 'newpost1',
        title: 'כותרת חדשה',
        content: 'תוכן הפוסט',
      }),
    });
    (Post.findByIdAndUpdate as jest.Mock).mockResolvedValue(undefined);

    // מייצרים טוקן אמיתי (לא מדומה) - verifyAccessToken בשרת לא נוגע ב-DB בכלל,
    // אז אפשר להשתמש בפועל בפונקציה האמיתית ליצירת הטוקן ולתת למידלוור לאמת אותו
    const token = generateAccessToken({ userId: USER_ID, email: 'a@b.com', role: 'user' });

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'כותרת חדשה', content: 'תוכן הפוסט', category: 'פיתוח', tags: [] });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('כותרת חדשה');
  });
});