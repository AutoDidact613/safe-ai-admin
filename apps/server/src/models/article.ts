import mongoose, { Document, Schema } from "mongoose";

export interface IArticle extends Document {
  title: string;
  slug: string;
  content: string;
  description: string;
  category: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const articleSchema = new Schema<IArticle>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    content: { type: String, required: true },
    description: { type: String, default: "" },
    category: { type: String, default: "כללי" },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Article = mongoose.model<IArticle>("Article", articleSchema);