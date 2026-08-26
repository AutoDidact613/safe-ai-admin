// מעלה קובץ בפועל ל-S3 דרך presigned POST (לא PUT בודד) - כדי שהגבלת
// content-length-range שהשרת חתם עליה תיאכף בפועל על ידי S3 עצמו.
//
// חשוב: לפי הדרישות של S3, כל השדות מ-`fields` חייבים להיות מצורפים
// ל-FormData *לפני* השדה `file` - S3 מתעלם משדות שמגיעים אחריו.
export async function uploadFileViaPresignedPost(
  url: string,
  fields: Record<string, string>,
  file: File
): Promise<Response> {
  const formData = new FormData();

  Object.entries(fields).forEach(([key, value]) => {
    formData.append(key, value);
  });

  formData.append('file', file);

  return fetch(url, {
    method: 'POST',
    body: formData,
  });
}
