/**
 * server/src/cache/embeddingCache.ts
 *
 * In-memory cache of vectors (embeddings) by category.
 * This avoids repeated database fetching for score comparisons.
 */

import { Embedding } from "../models";
import logger from "../logger";

export const embeddingCache: Record<string, number[][]> = {};

export function getEmbeddingCache(): Record<string, number[][]> {
  return embeddingCache;
}

export function getEmbeddingVectorsByCategory(category: string): number[][] {
  return embeddingCache[category] ?? [];
}

export async function loadEmbeddingCache(): Promise<void> {
  const categories = await Embedding.distinct("category");
  for (const category of categories) {
    const docs = await Embedding.find({ category }).lean();
    embeddingCache[category] = docs.map((d) => d.vector);
  }

  logger.info("Embedding cache loaded: " + Object.keys(embeddingCache).join(", "));
}

export function addEmbeddingToCache(category: string, vector: number[]): void {
  embeddingCache[category] ??= [];
  embeddingCache[category].push(vector);
}
