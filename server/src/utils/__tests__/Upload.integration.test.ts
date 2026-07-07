import request from 'supertest';

// src/config/openai.ts יוצר לקוח OpenAI ברמת המודול, וזה קורס אם
// OPENAI_API_KEY לא מוגדר - וב-CI (GitHub Actions) אין קובץ .env בכלל,
// אז המשתנה undefined. מדמים את המודול כדי שהבדיקה לא תיפול על תלות
// עקיפה שאין לה שום קשר לפורום.
jest.mock('../../config/openai', () => ({ openai: {} }));

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

// מדמים את פונקציית החתימה של AWS - אין צורך בחיבור אמיתי ל-S3 בבדיקה
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://fake-bucket.s3.amazonaws.com/uploads/fake-key.png?signed=true'),
}));

import app from '../../index';

describe('POST /api/upload/get-url - קבלת קישור העלאה חתום', () => {
  test('מחזיר 400 אם fileName או fileType חסרים', async () => {
    const res = await request(app).post('/api/upload/get-url').send({});
    expect(res.status).toBe(400);
  });

  test('מחזיר uploadUrl ו-fileUrl כשהנתונים תקינים', async () => {
    const res = await request(app)
      .post('/api/upload/get-url')
      .send({ fileName: 'image.png', fileType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('uploadUrl');
    expect(res.body).toHaveProperty('fileUrl');
    expect(res.body.fileUrl).toContain('image.png');
  });
});