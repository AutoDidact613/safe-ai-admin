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

// מדמים את פונקציית החתימה של AWS - אין צורך בחיבור אמיתי ל-S3 בבדיקה
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://fake-bucket.s3.amazonaws.com/uploads/fake-key.png?signed=true'),
}));

import app from '../../index';
import { generateAccessToken } from '../jwt';

const TOKEN = generateAccessToken({ userId: '507f1f77bcf86cd799439011', email: 'a@b.com', role: 'user' });

describe('POST /api/upload/get-url - קבלת קישור העלאה חתום', () => {
  test('מחזיר 401 כשאין טוקן התחברות בכלל', async () => {
    const res = await request(app)
      .post('/api/upload/get-url')
      .send({ fileName: 'image.png', fileType: 'image/png' });

    expect(res.status).toBe(401);
  });

  test('מחזיר 400 אם fileName או fileType חסרים', async () => {
    const res = await request(app)
      .post('/api/upload/get-url')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('מחזיר uploadUrl ו-fileUrl כשהנתונים תקינים', async () => {
    const res = await request(app)
      .post('/api/upload/get-url')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ fileName: 'image.png', fileType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('uploadUrl');
    expect(res.body).toHaveProperty('fileUrl');
    // המפתח ב-S3 נבנה מ-uuid + סיומת הקובץ בלבד (לא שם הקובץ המקורי המלא)
    expect(res.body.fileUrl).toContain('mock-uuid-value.png');
  });
});