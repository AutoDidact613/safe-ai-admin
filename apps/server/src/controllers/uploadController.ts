import { Request, Response } from "express";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { v4 as uuidv4 } from "uuid";

// אתחול החיבור מול AWS עם הגדרת משתני הסביבה
const s3 = new S3Client({
  region: process.env.AWS_REGION || "",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// הגדרת המבנה הצפוי של גוף הבקשה (Interface)
interface UploadRequestBody {
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadContext: "post" | "comment";
}

type FileCategory = "video" | "image" | "document";

const VIDEO_EXTENSIONS = ["mp4", "mov", "avi", "mkv", "webm", "wmv", "flv", "m4v", "3gp"];
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];

/**
 * מסווגת קובץ לפי הסיומת שלו ולפי ה-MIME type שהדפדפן דיווח. שני המקורות
 * לא אמינים לחלוטין (אפשר "לשקר" בהם בקלות ע"י שינוי שם קובץ) - זו הגנה
 * סבירה נגד טעות/שימוש בתום לב, לא הגנה מוחלטת נגד מי שממש מנסה לעקוף.
 */
function getFileCategory(fileName: string, fileType: string): FileCategory {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  if (fileType.startsWith("video/") || VIDEO_EXTENSIONS.includes(extension)) {
    return "video";
  }
  if (fileType.startsWith("image/") || IMAGE_EXTENSIONS.includes(extension)) {
    return "image";
  }
  return "document";
}

function getMaxSizeBytes(category: FileCategory): number {
  const MB = 1024 * 1024;
  const GB = 1024 * MB;

  if (category === "image") {
    return (Number(process.env.MAX_UPLOAD_SIZE_IMAGE_MB) || 20) * MB;
  }
  if (category === "video") {
    return (Number(process.env.MAX_UPLOAD_SIZE_VIDEO_GB) || 2.5) * GB;
  }
  return (Number(process.env.MAX_UPLOAD_SIZE_DOCUMENT_MB) || 50) * MB;
}

// הפונקציה המרכזית שמייצרת את הקישור הזמני
export const getPresignedUrl = async (
  req: Request<Record<string, never>, Record<string, never>, UploadRequestBody>,
  res: Response
): Promise<Response | void> => {
  try {
    const { fileName, fileType, fileSize, uploadContext } = req.body;

    if (!fileName || !fileType) {
      return res.status(400).json({ error: "שם וסוג הקובץ נדרשים" });
    }

    if (typeof fileSize !== "number" || !Number.isFinite(fileSize) || fileSize <= 0) {
      return res.status(400).json({ error: "גודל הקובץ נדרש" });
    }

    if (uploadContext !== "post" && uploadContext !== "comment") {
      return res.status(400).json({ error: "הקשר ההעלאה (uploadContext) לא תקין" });
    }

    const category = getFileCategory(fileName, fileType);

    // וידאו מותר רק בפוסטים - לא בתגובות
    if (uploadContext === "comment" && category === "video") {
      return res.status(400).json({ error: "העלאת קבצי וידאו אינה נתמכת בתגובות" });
    }

    const maxSizeBytes = getMaxSizeBytes(category);
    if (fileSize > maxSizeBytes) {
      const maxSizeLabel =
        category === "video"
          ? `${(maxSizeBytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
          : `${Math.round(maxSizeBytes / (1024 * 1024))}MB`;
      return res.status(400).json({
        error: `הקובץ חורג מהגודל המרבי המותר (${maxSizeLabel}) עבור סוג קובץ זה`,
      });
    }

    // חילוץ סיומת הקובץ ויצירת מפתח ייחודי
    const fileExtension = fileName.split('.').pop();
    const uniqueKey = `uploads/${uuidv4()}.${fileExtension}`;

    // יצירת POST חתום (במקום PUT) - כדי שנוכל לצרף תנאי content-length-range
    // חתום קריפטוגרפית: S3 עצמו דוחה כל העלאה שחורגת מהגודל, גם אם מישהו
    // עוקף את הבדיקות בצד הלקוח/שרת ומעלה ישירות מול הקישור
    const { url, fields } = await createPresignedPost(s3, {
      Bucket: process.env.AWS_BUCKET_NAME || "",
      Key: uniqueKey,
      Conditions: [
        ["content-length-range", 0, maxSizeBytes],
      ],
      Fields: {
        "Content-Type": fileType,
      },
      Expires: 300, // בתוקף ל-5 דקות
    });

    // הכתובת הציבורית הסופית לקריאה וצפייה בקובץ באתר
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueKey}`;

    // החזרת הנתונים ל-Frontend
    return res.json({ url, fields, fileUrl });

  } catch (error) {
    console.error("שגיאה בהפקת URL ב-TypeScript:", error);
    return res.status(500).json({ error: "נכשלה הפקת קישור מאובטח" });
  }
};
