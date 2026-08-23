import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  title: string;
  content: string;
  category: string;
  tags: Array<{ _id: string; name: string } | mongoose.Types.ObjectId>;
  attachments: string[]; // מערך של נתיבי קבצים או קישורים
  viewsCount: number;
  rating: number;
  similarLinks: string[]; // לינקים לפוסטים דומים
  author: mongoose.Types.ObjectId;
  createdAt: Date;
  isBlocked: boolean;
  isLocked: boolean;
  ratingCount: number;   // מספר המשתמשים שדירגו
  ratingSum: number;     // סכום כל הדירוגים שניתנו (למשל: 5 + 4 + 5 = 14)
  averageRating: number; // הציון הממוצע (Sum חלקי Count)
  // מחזיק אובייקטים עם מזהה המשתמש והציון המדויק שהוא נתן
  ratedBy: Array<{ userId: mongoose.Types.ObjectId; score: number }>;
  titleEmbedding: number[]; // <-- הטיפוס ב-Interface (נשמר תקין!)
  lastActivity: Date; // שדה למעקב אחר פעילות אחרונה (פוסט או תגובה)
}

const PostSchema: Schema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, required: true, default: 'כללי' },
  tags: [{ type: Schema.Types.ObjectId, ref: 'tag' }],
  attachments: [{ type: String }],
  viewsCount: { type: Number, default: 0 },
  rating: { type: Number, default: 5 }, // דירוג התחלתי דיפולטיבי
  similarLinks: [{ type: String }],
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  isBlocked: { type: Boolean, default: false }, // חסום ומוסתר ממשתמשים רגילים
  isLocked: { type: Boolean, default: false }, // נעול - אי אפשר להוסיף תגובות חדשות
  ratingCount: { type: Number, default: 0 },   // מספר המשתמשים שדירגו
  ratingSum: { type: Number, default: 0 },     // סכום כל הדירוגים שניתנו
  averageRating: { type: Number, default: 0 }, // הציון הממוצע (Sum חלקי Count)
  
  // הגדרת תת-אובייקט השומר את הציון המדויק לצורך החלפה עתידית של הדירוג
  ratedBy: [{
    _id: false, // מונע מ-Mongoose לייצר מזהה ID פנימי מיותר לכל שורת דירוג
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    score: { type: Number, required: true, min: 1, max: 5 }
  }],
  
  // שדה למעקב אחר פעילות אחרונה
  lastActivity: { type: Date, default: Date.now }, // <-- תיקון: נוסף הפסיק החסר שהפיל את השרת!
  
  // הגדרת השדה הוקטורי עבור מנוע ה-AI באטלס
  titleEmbedding: {
    type: [Number],
    default: []
  }
});

export default mongoose.model<IPost>('Post', PostSchema);