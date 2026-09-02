import { Request, Response } from "express";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import logger from "../logger";
import { getOrganizationIdForLog } from "../utils/forumLogContext";
import { s3 } from "../utils/s3Client";

// הגדרת המבנה הצפוי של גוף הבקשה (Interface)
interface UploadRequestBody {
  fileName: string;
  fileType: string;
  fileSize?: number;
  context?: string;
}

// הגדרות ייעודיות לפי הקשר העלאה - תיקיית יעד ב-S3 וכללי ולידציה
const UPLOAD_CONTEXTS: Record<string, { prefix: string; allowedTypes: string[]; maxSizeBytes: number }> = {
  tenderResume: {
    prefix: "uploads/tenders",
    allowedTypes: ["application/pdf"],
    maxSizeBytes: 5 * 1024 * 1024,
  },
  newsImage: {
    prefix: "uploads/news",
    allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    maxSizeBytes: 5 * 1024 * 1024,
  },
};

// הפונקציה המרכזית שמייצרת את הקישור הזמני
export const getPresignedUrl = async (
  req: Request<Record<string, never>, Record<string, never>, UploadRequestBody>,
  res: Response
): Promise<Response | void> => {
  try {
    const { fileName, fileType, fileSize, context } = req.body;

    if (!fileName || !fileType) {
      return res.status(400).json({ error: "שם וסוג הקובץ נדרשים" });
    }

    if (context !== undefined && !UPLOAD_CONTEXTS[context]) {
      return res.status(400).json({ error: "הקשר העלאה לא מוכר" });
    }

    const contextConfig = context ? UPLOAD_CONTEXTS[context] : undefined;

    if (contextConfig) {
      if (!contextConfig.allowedTypes.includes(fileType)) {
        return res.status(400).json({ error: "סוג הקובץ אינו נתמך" });
      }
      if (typeof fileSize === "number" && fileSize > contextConfig.maxSizeBytes) {
        return res.status(400).json({ error: "הקובץ חורג מהגודל המותר" });
      }
    }

    // חילוץ סיומת הקובץ ויצירת מפתח ייחודי
    const fileExtension = fileName.split('.').pop();
    const keyPrefix = contextConfig?.prefix || "uploads";
    const uniqueKey = `${keyPrefix}/${uuidv4()}.${fileExtension}`;

    // הכנת פקודת ההעלאה עבור ה-Bucket
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: uniqueKey,
      ContentType: fileType,
    });

    // יצירת הקישור החתום (בתוקף ל-5 דקות / 300 שניות)
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    // הכתובת הציבורית הסופית לקריאה וצפייה בקובץ באתר
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueKey}`;

    // החזרת הנתונים ל-Frontend
    return res.json({ uploadUrl, fileUrl });

  } catch (error: any) {
    logger.error("Failed to generate presigned upload URL", {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
      organizationId: await getOrganizationIdForLog((req as any).user?.userId),
      requestId: (req as any).requestId,
      fileName: req.body.fileName,
      fileType: req.body.fileType,
    });
    return res.status(500).json({ error: "נכשלה הפקת קישור מאובטח" });
  }
};