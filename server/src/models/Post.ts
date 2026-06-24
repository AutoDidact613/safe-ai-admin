import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  title: string;
  content: string;
  category: string;
  tags: string[];
  attachments: string[]; // מערך של נתיבי קבצים או קישורים
  viewsCount: number;
  rating: number;
  similarLinks: string[]; // לינקים לפוסטים דומים
  author: mongoose.Types.ObjectId;
  createdAt: Date;
}

const PostSchema: Schema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, required: true, default: 'כללי' },
  tags: [{ type: String }],
  attachments: [{ type: String }],
  viewsCount: { type: Number, default: 0 },
  rating: { type: Number, default: 5 }, // דירוג התחלתי דיפולטיבי
  similarLinks: [{ type: String }],
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IPost>('Post', PostSchema);