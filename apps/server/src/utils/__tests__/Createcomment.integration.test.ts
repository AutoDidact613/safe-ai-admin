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

jest.mock('../../models/Post');
jest.mock('../../models/Comment');

import app from '../../index';
import Post from '../../models/Post';
import Comment from '../../models/Comment';

describe('POST /api/posts/:id/comment - יצירת תגובה', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('מחזיר 400 אם תוכן התגובה ריק', async () => {
    const res = await request(app)
      .post('/api/posts/post1/comment')
      .send({ postId: 'post1', content: '   ' });

    expect(res.status).toBe(400);
  });

  test('מחזיר 404 אם הפוסט שמגיבים עליו לא קיים', async () => {
    (Post.findById as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/posts/missingPost/comment')
      .send({ postId: 'missingPost', content: 'תגובה כלשהי' });

    expect(res.status).toBe(404);
  });

  test('יוצר תגובה בהצלחה ומחזיר 201 עם התוכן שלה', async () => {
    const fakePost = {
      _id: 'post1',
      lastActivity: new Date(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    (Post.findById as jest.Mock).mockResolvedValue(fakePost);

    (Comment as any).mockImplementation(() => ({
      save: jest.fn().mockResolvedValue({ _id: 'comment1' }),
    }));

    (Comment.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          _id: 'comment1',
          content: 'תגובה חדשה ומעניינת',
          author: { name: 'משתמש בדיקה' },
        }),
      }),
    });

    const res = await request(app)
      .post('/api/posts/post1/comment')
      .send({ postId: 'post1', content: 'תגובה חדשה ומעניינת' });

    expect(res.status).toBe(201);
    expect(res.body.content).toBe('תגובה חדשה ומעניינת');
  });
});