import mongoose, { Schema, Document } from 'mongoose';

// הגדרת ה-Interface עבור TypeScript בשרת
export interface IComment extends Document {
  content: string;
  postId: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  attachments: string[]; // השדה החדש ב-Interface
  createdAt: Date;
}

// הגדרת ה-Schema עבור בסיס הנתונים
const CommentSchema: Schema = new Schema({
  content: { type: String, required: true },
  postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  attachments: { type: [String], default: [] }, // השדה החדש ב-Schema
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IComment>('Comment', CommentSchema);