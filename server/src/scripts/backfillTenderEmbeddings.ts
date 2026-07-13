/**
 * One-off backfill: computes contentEmbedding for every existing tender that
 * doesn't have one yet, so Atlas Vector Search has something to search over
 * for documents created before the embedding field existed.
 *
 * Usage: npm run backfill:tender-embeddings  (from server/)
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/db";
import { Tender } from "../models/tender";
import { getEmbedding } from "../services/embeddingService";
import logger from "../logger";

function buildEmbeddingText(tender: any): string {
  return [
    tender.title,
    tender.shortDescription,
    tender.productType,
    tender.aiApplicationType,
    tender.additionalDetails,
  ]
    .filter(Boolean)
    .join(". ");
}

async function run() {
  await connectDatabase();

  const tenders = await Tender.find({ contentEmbedding: { $exists: false } }).select(
    "title shortDescription productType aiApplicationType additionalDetails"
  );

  logger.info(`Backfilling embeddings for ${tenders.length} tenders`);

  let updated = 0;
  let skipped = 0;

  for (const tender of tenders) {
    const text = buildEmbeddingText(tender);
    if (!text) {
      skipped++;
      continue;
    }

    try {
      const contentEmbedding = await getEmbedding(text);
      await Tender.updateOne({ _id: tender._id }, { $set: { contentEmbedding } });
      updated++;
    } catch (error) {
      logger.error("Failed to backfill embedding for tender", { tenderId: tender._id, error });
    }
  }

  logger.info(`Backfill complete: ${updated} updated, ${skipped} skipped (no text)`);
  await mongoose.disconnect();
}

run().catch((error) => {
  logger.error("Backfill script failed", { error });
  process.exit(1);
});
