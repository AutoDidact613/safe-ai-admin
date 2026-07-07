import { Request, Response } from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

// אתחול החיבור מול AWS עם הגדרת משתני הסביבה
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// הגדרת המבנה הצפוי של גוף הבקשה (Interface)
interface UploadRequestBody {
  fileName: string;
  fileType: string;
}

// הפונקציה המרכזית שמייצרת את הקישור הזמני
export const getPresignedUrl = async (
  req: Request<{}, {}, UploadRequestBody>,
  res: Response
): Promise<Response | void> => {
  try {
    const { fileName, fileType } = req.body;

    if (!fileName || !fileType) {
      return res.status(400).json({ error: "שם וסוג הקובץ נדרשים" });
    }

    // 1. ניקוי שם הקובץ המקורי מרווחים מיותרים כדי שלא ישברו את מחרוזת ה-URL
    const cleanOriginalName = fileName.replace(/\s+/g, '_');

    // 2. יצירת מפתח ייחודי בתוך S3 ששומר על השם המקורי בסופו של ה-GUID
    // פורמט לדוגמה: uploads/11e8-d2f5-4553-bf5b_my_homework.docx
    const uniqueKey = `uploads/${uuidv4()}_${cleanOriginalName}`;

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

  } catch (error) {
    console.error("שגיאה בהפקת URL ב-TypeScript:", error);
    return res.status(500).json({ error: "נכשלה הפקת קישור מאובטח" });
  }
};