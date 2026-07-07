import request from 'supertest';

// src/config/openai.ts יוצר לקוח OpenAI ברמת המודול, וזה קורס אם
// OPENAI_API_KEY לא מוגדר - וב-CI (GitHub Actions) אין קובץ .env בכלל,
// אז המשתנה undefined. מדמים את המודול כדי שהבדיקה לא תיפול על תלות
// עקיפה שאין לה שום קשר לפורום.
jest.mock('../../config/openai', () => ({ openai: {} }));

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

import app from '../../index';
import Post from '../../models/Post';
import { generateAccessToken } from '../jwt';

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

  test('יוצר פוסט בהצלחה עבור משתמשת מחוברת עם טוקן תקין', async () => {
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
    const token = generateAccessToken({ userId: 'u1', email: 'a@b.com', role: 'user' });

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'כותרת חדשה', content: 'תוכן הפוסט', category: 'פיתוח', tags: [] });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('כותרת חדשה');
  });
});