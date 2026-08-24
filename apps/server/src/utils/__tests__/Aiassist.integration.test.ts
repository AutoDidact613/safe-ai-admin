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