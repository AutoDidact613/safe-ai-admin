import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3 = new S3Client({
  region: process.env.AWS_REGION || "",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const VIEW_URL_EXPIRES_SECONDS = 60 * 60;

// ה-bucket חוסם קריאה ציבורית, אז כדי להציג קובץ צריך קישור צפייה חתום
// זמנית עם אותם credentials ששימשו להעלאה (יש להם הרשאת GetObject)
export async function getPresignedViewUrl(
  fileUrl: string,
  expiresIn = VIEW_URL_EXPIRES_SECONDS
): Promise<string> {
  const key = decodeURIComponent(new URL(fileUrl).pathname.replace(/^\//, ""));
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn });
}
