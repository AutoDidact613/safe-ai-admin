import { openaiClient, EMBEDDING_MODEL } from "../config/openaiclient";
import logger from "../logger";

export async function getEmbedding(text: string): Promise<number[]> {
  const input = text?.trim();
  if (!input) {
    throw new Error("Cannot generate embedding for empty text");
  }

  try {
    const response = await openaiClient.embeddings.create({
      model: EMBEDDING_MODEL,
      input,
    });
    const embedding = response.data[0]?.embedding;
    if (!embedding) {
      throw new Error("Embedding provider returned no data");
    }
    return embedding;
  } catch (error) {
    logger.error("Failed to generate embedding", { error, textLength: input.length });
    throw error;
  }
}
