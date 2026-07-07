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