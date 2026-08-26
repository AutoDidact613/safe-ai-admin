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

// מדמים את פונקציית ה-presigned POST של AWS - אין צורך בחיבור אמיתי ל-S3 בבדיקה
jest.mock('@aws-sdk/s3-presigned-post', () => ({
  createPresignedPost: jest.fn().mockResolvedValue({
    url: 'https://fake-bucket.s3.amazonaws.com/',
    fields: { key: 'uploads/mock-uuid-value.png', 'Content-Type': 'image/png' },
  }),
}));

import app from '../../index';

const MB = 1024 * 1024;
const GB = 1024 * MB;

describe('POST /api/upload/get-url - קבלת קישור העלאה חתום', () => {
  test('מחזיר 400 אם fileName או fileType חסרים', async () => {
    const res = await request(app).post('/api/upload/get-url').send({});
    expect(res.status).toBe(400);
  });

  test('מחזיר 400 אם fileSize חסר', async () => {
    const res = await request(app)
      .post('/api/upload/get-url')
      .send({ fileName: 'image.png', fileType: 'image/png', uploadContext: 'post' });
    expect(res.status).toBe(400);
  });

  test('מחזיר 400 אם uploadContext לא תקין', async () => {
    const res = await request(app)
      .post('/api/upload/get-url')
      .send({ fileName: 'image.png', fileType: 'image/png', fileSize: 1000, uploadContext: 'invalid' });
    expect(res.status).toBe(400);
  });

  test('מחזיר url, fields ו-fileUrl כשהנתונים תקינים (הקשר פוסט)', async () => {
    const res = await request(app)
      .post('/api/upload/get-url')
      .send({ fileName: 'image.png', fileType: 'image/png', fileSize: 1000, uploadContext: 'post' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('url');
    expect(res.body).toHaveProperty('fields');
    expect(res.body).toHaveProperty('fileUrl');
    // המפתח ב-S3 נבנה מ-uuid + סיומת הקובץ בלבד (לא שם הקובץ המקורי המלא)
    expect(res.body.fileUrl).toContain('mock-uuid-value.png');
  });

  test('מחזיר 400 עבור קובץ וידאו בהקשר תגובה', async () => {
    const res = await request(app)
      .post('/api/upload/get-url')
      .send({ fileName: 'video.mp4', fileType: 'video/mp4', fileSize: 1000, uploadContext: 'comment' });

    expect(res.status).toBe(400);
  });

  test('מאפשר קובץ וידאו בהקשר פוסט', async () => {
    const res = await request(app)
      .post('/api/upload/get-url')
      .send({ fileName: 'video.mp4', fileType: 'video/mp4', fileSize: 1000, uploadContext: 'post' });

    expect(res.status).toBe(200);
  });

  test('מחזיר 400 כשקובץ תמונה חורג מהגודל המרבי המותר', async () => {
    const res = await request(app)
      .post('/api/upload/get-url')
      .send({ fileName: 'image.png', fileType: 'image/png', fileSize: 21 * MB, uploadContext: 'post' });

    expect(res.status).toBe(400);
  });

  test('מחזיר 400 כשקובץ וידאו חורג מהגודל המרבי המותר', async () => {
    const res = await request(app)
      .post('/api/upload/get-url')
      .send({ fileName: 'video.mp4', fileType: 'video/mp4', fileSize: 3 * GB, uploadContext: 'post' });

    expect(res.status).toBe(400);
  });
});