import Tag from '../models/Tag';

/**
 * מוצא תגית קיימת לפי שם (לא תלוי רישיות), ואם היא לא קיימת - יוצר אותה.
 * מחזיר את ה-ObjectId שלה כמחרוזת, או null אם השם ריק.
 */
export async function resolveOrCreateTagByName(name: string): Promise<string | null> {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;

  let existingTag = await Tag.findOne({ name: { $regex: new RegExp(`^${trimmed}$`, 'i') } });

  if (!existingTag) {
    existingTag = await Tag.create({ name: trimmed });
  }

  return existingTag._id.toString();
}

/**
 * גרסה למספר שמות תגיות בבת אחת (למשל תגיות שנוצרו על ידי ה-AI, או
 * תגיות חדשות שהוזנו בפוסט). מריצה ברצף כדי למנוע התנגשות ביצירת
 * תגית זהה פעמיים במקביל (race condition על ה-unique index של Tag).
 */
export async function resolveOrCreateTagsByNames(names: string[]): Promise<string[]> {
  const resolved: string[] = [];
  for (const name of names) {
    const id = await resolveOrCreateTagByName(name);
    if (id) resolved.push(id);
  }
  return resolved;
}