import { Embedding, EmbeddingDoc } from "../models/embedding";

type CreateEmbeddingInput = Pick<EmbeddingDoc, "category" | "originText" | "vector">;

export async function getEmbeddingsByCategories(categories: string[]) {
  return Embedding.find({
    category: { $in: categories },
  }).lean();
}

export async function createEmbedding(data: CreateEmbeddingInput) {
  return Embedding.create(data);
}

export async function getDistinctCategories() {
  return Embedding.distinct("category");
}