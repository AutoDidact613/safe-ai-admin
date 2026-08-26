import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import logger from "../logger";

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * מייצר קישור הורדה זמני (חתום) לקובץ יחיד ב-S3.
 * מקבל גם URL מלא (שנשמר ב-DB) וגם key גולמי, ומחלץ מתוכו את ה-key הנכון.
 */
export async function generatePresignedDownloadUrl(fileKey: string): Promise<string> {
  try {
    if (!fileKey) return '';

    // אם הקישור כבר מכיל חתימה בתוקף, אין צורך לחתום עליו שוב
    if (fileKey.startsWith('http') && fileKey.includes('X-Amz-Signature')) return fileKey;

    // חילוץ שם הקובץ האמיתי מתוך ה-URL המלא של S3
    let key = fileKey;
    if (fileKey.startsWith('http')) {
      const urlObj = new URL(fileKey);
      key = urlObj.pathname.substring(1); // מוריד את הסלאש הראשון
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: decodeURIComponent(key), // הגנה למקרה שיש רווחים או עברית בשם הקובץ
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