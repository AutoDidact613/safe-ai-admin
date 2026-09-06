import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DeleteObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import logger from "../logger";

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

// מחלצת את ה-S3 key מתוך URL מלא (או מחזירה כמו שהוא אם זה כבר key גולמי) -
// שימוש משותף לכל פעולה שצריכה לפנות לאובייקט ב-S3 לפי ה-URL שנשמר ב-DB.
function extractKey(fileUrlOrKey: string): string {
  let key = fileUrlOrKey;
  if (fileUrlOrKey.startsWith('http')) {
    const urlObj = new URL(fileUrlOrKey);
    key = urlObj.pathname.substring(1); // מוריד את הסלאש הראשון
  }
  return decodeURIComponent(key); // הגנה למקרה שיש רווחים או עברית בשם הקובץ
}

/**
 * מייצר קישור הורדה זמני (חתום) לקובץ יחיד ב-S3.
 * מקבל גם URL מלא (שנשמר ב-DB) וגם key גולמי, ומחלץ מתוכו את ה-key הנכון.
 */
export async function generatePresignedDownloadUrl(fileKey: string): Promise<string> {
  try {
    if (!fileKey) return '';

    // אם הקישור כבר מכיל חתימה בתוקף, אין צורך לחתום עליו שוב
    if (fileKey.startsWith('http') && fileKey.includes('X-Amz-Signature')) return fileKey;

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: extractKey(fileKey),
    });

    // יצירת הקישור הזמני ל-15 דקות
    return await getSignedUrl(s3Client, command, { expiresIn: 900 });
  } catch (error: any) {
    // פונקציית עומק ללא גישה ל-req - אין userId/organizationId/requestId
    // אמיתיים לצרף כאן (בניגוד לפערים במקומות אחרים, זה לא חוסר מידע, אלא
    // שהפונקציה הזו לא יודעת בעד איזה משתמש/בקשה היא רצה).
    logger.error("Failed to generate presigned download URL", {
      error: error.message,
      stack: error.stack,
      userId: undefined,
      organizationId: undefined,
      requestId: undefined,
      fileKey,
    });
    return fileKey;
  }
}

/**
 * חותמת מערך שלם של קבצים מצורפים במקביל (לא ברצף), ומחזירה מערך תואם
 * של קישורי הורדה זמניים.
 */
export async function signAttachments(attachments: string[]): Promise<string[]> {
  if (!attachments || attachments.length === 0) return [];
  return Promise.all(attachments.map(fileKey => generatePresignedDownloadUrl(fileKey)));
}

/**
 * מוחקת קובץ יחיד מ-S3 לפי ה-URL (או key גולמי) שנשמר ב-DB.
 */
export async function deleteObject(fileUrl: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: extractKey(fileUrl),
    }),
  );
}