// בדיקות תקינות קובץ לפני שמתחילים להעלות אותו - רק לחוויית משתמש מהירה
// (הודעת שגיאה מיידית, בלי לחכות לתשובה מהשרת). האכיפה האמיתית תמיד קורית
// בשרת/S3 - בדיקה כאן היא נוחות בלבד, לא הגנה, כי אפשר לעקוף קוד שרץ
// בדפדפן בקלות.

export type FileCategory = "video" | "image" | "document";

const VIDEO_EXTENSIONS = ["mp4", "mov", "avi", "mkv", "webm", "wmv", "flv", "m4v", "3gp"];
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];

/**
 * מסווגת קובץ לפי הסיומת שלו ולפי ה-MIME type שהדפדפן דיווח - בדיוק כמו
 * שהשרת עושה ב-uploadController.ts. חייבים להישאר מסונכרנים.
 */
export function getFileCategory(fileName: string, fileType: string): FileCategory {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  if (fileType.startsWith("video/") || VIDEO_EXTENSIONS.includes(extension)) {
    return "video";
  }
  if (fileType.startsWith("image/") || IMAGE_EXTENSIONS.includes(extension)) {
    return "image";
  }
  return "document";
}

export function getMaxSizeBytes(category: FileCategory): number {
  const MB = 1024 * 1024;
  const GB = 1024 * MB;

  if (category === "image") {
    return (Number(import.meta.env.VITE_MAX_UPLOAD_SIZE_IMAGE_MB) || 20) * MB;
  }
  if (category === "video") {
    return (Number(import.meta.env.VITE_MAX_UPLOAD_SIZE_VIDEO_GB) || 2.5) * GB;
  }
  return (Number(import.meta.env.VITE_MAX_UPLOAD_SIZE_DOCUMENT_MB) || 50) * MB;
}

function formatSize(bytes: number, category: FileCategory): string {
  return category === "video"
    ? `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
    : `${Math.round(bytes / (1024 * 1024))}MB`;
}

/**
 * בודקת את הבייטים הראשונים של הקובץ (magic bytes / file signature) מול
 * חתימות ידועות של קבצי וידאו נפוצים - בלי קשר לשם הקובץ או לסיומת שלו.
 * זה תופס מקרה נפוץ שבדיקת MIME/סיומת מפספסת: קובץ וידאו ששונה שמו
 * (video.mp4 -> video.png) - הדפדפן היה מדווח עליו כתמונה, אבל הבייטים
 * עצמם עדיין יגידו את האמת. לא כיסוי מוחלט של כל פורמט וידאו קיים, אבל
 * מכסה את הפורמטים הנפוצים ביותר.
 */
export async function looksLikeVideoByMagicBytes(file: File): Promise<boolean> {
  const headerSize = 16;
  const buffer = await file.slice(0, headerSize).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const matches = (offset: number, signature: number[]) =>
    signature.every((byte, i) => bytes[offset + i] === byte);

  // MP4 / MOV / M4V (ISO base media): "ftyp" בבייטים 4-7
  if (matches(4, [0x66, 0x74, 0x79, 0x70])) return true;

  // WebM / MKV (Matroska/EBML header)
  if (matches(0, [0x1a, 0x45, 0xdf, 0xa3])) return true;

  // AVI: "RIFF....AVI "
  if (matches(0, [0x52, 0x49, 0x46, 0x46]) && matches(8, [0x41, 0x56, 0x49, 0x20])) return true;

  // FLV
  if (matches(0, [0x46, 0x4c, 0x56])) return true;

  return false;
}

/**
 * הבדיקה המלאה לפני העלאה: מחזירה הודעת שגיאה אם משהו לא בסדר, או null
 * אם הכל תקין ואפשר להמשיך.
 */
export async function validateFileForUpload(
  file: File,
  context: "post" | "comment"
): Promise<string | null> {
  const category = getFileCategory(file.name, file.type);

  if (context === "comment") {
    const isVideoByMagicBytes = await looksLikeVideoByMagicBytes(file).catch(() => false);
    if (category === "video" || isVideoByMagicBytes) {
      return "העלאת קבצי וידאו אינה נתמכת בתגובות";
    }
  }

  const maxSizeBytes = getMaxSizeBytes(category);
  if (file.size > maxSizeBytes) {
    return `הקובץ חורג מהגודל המרבי המותר (${formatSize(maxSizeBytes, category)}) עבור סוג קובץ זה`;
  }

  return null;
}
