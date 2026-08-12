/**
 * server/src/models/embedding.ts
 *
 * Mongoose model representing stored embeddings for each category.
 */

import mongoose from "mongoose";

export interface EmbeddingDoc extends mongoose.Document {
  category: string;
  originText: string;
  vector: number[];
}

const EmbeddingSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, lowercase: true, trim: true },
    originText: { type: String, required: true },
    vector: { type: [Number], required: true },
  },
  { timestamps: true },
);

EmbeddingSchema.index({ category: 1 });

export const Embedding = mongoose.model<EmbeddingDoc>("Embedding", EmbeddingSchema);
