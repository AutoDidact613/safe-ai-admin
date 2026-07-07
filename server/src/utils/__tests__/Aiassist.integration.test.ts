import request from 'supertest';

jest.mock('uuid', () => ({ v4: () => 'mock-uuid-value' }));
jest.mock('../../middleware/requestLogger', () => ({
  requestLogger: (_req: any, _res: any, next: any) => next(),
}));

// מדמים את שירות ה-AI - אין צורך בקריאה אמיתית ל-OpenAI בבדיקה, וגם לא רצוי
// (זה היה עולה כסף אמיתי בכל הרצת בדיקות)
jest.mock('../../services/aiService', () => ({
  getEmbedding: jest.fn(),
  suggestTags: jest.fn(),
  suggestTitles: jest.fn(),
  refineContent: jest.fn(),
}));

import app from '../../index';
import { generateAccessToken } from '../jwt';
import { suggestTags } from '../../services/aiService';

const validToken = generateAccessToken({ userId: 'u1', email: 'a@b.com', role: 'user' });
const sampleContent = 'זהו תוכן פוסט לדוגמה שמספיק ארוך כדי לעבור את בדיקת אורך המינימום';

describe('POST /api/posts/ai-assist - עוזר ה-AI', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('מחזיר 401 בלי טוקן התחברות', async () => {
    const res = await request(app)
      .post('/api/posts/ai-assist')
      .send({ mode: 'tags', content: sampleContent });

    expect(res.status).toBe(401);
  });

  test('מחזיר 400 אם התוכן קצר מ-15 תווים', async () => {
    const res = await request(app)
      .post('/api/posts/ai-assist')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ mode: 'tags', content: 'קצר מדי' });

    expect(res.status).toBe(400);
  });

  test('מחזיר תגיות מוצעות עבור mode=tags', async () => {
    (suggestTags as jest.Mock).mockResolvedValue(['React', 'TypeScript', 'Node.js']);

    const res = await request(app)
      .post('/api/posts/ai-assist')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ mode: 'tags', content: sampleContent });

    expect(res.status).toBe(200);
    expect(res.body.tags).toEqual(['React', 'TypeScript', 'Node.js']);
  });

  test('מחזיר 400 עבור mode לא מוכר', async () => {
    const res = await request(app)
      .post('/api/posts/ai-assist')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ mode: 'not-a-real-mode', content: sampleContent });

    expect(res.status).toBe(400);
  });
});