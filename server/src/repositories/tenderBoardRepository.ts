import mongoose from "mongoose";
import { Tender } from "../models/tender";
import { User } from "../models/user";

export async function createTender(data: any) {
  return Tender.create(data);
}

// tenderBoardRepository.ts
export async function getUserByCode(publisherUserCode: string) {
  if (!mongoose.Types.ObjectId.isValid(publisherUserCode)) return null;
  return await User.findById(publisherUserCode).lean();
}
/**
 * GET Tenders
 * מעודכן לקבלת אובייקט סינון אופציונלי עבור החיפוש החכם של ה-AI
 */
export async function getTenders(filter: any = {}) {
  return Tender.find(filter).lean();
}

export async function getTenderById(id: string) {
  // If id looks like a Mongo ObjectId, use findById for efficiency.
  if (mongoose.Types.ObjectId.isValid(id)) {
    return Tender.findById(id).lean();
  }

  // Fallback: allow finding by a string `id` field (e.g. external IDs like "tnd-98234").
  return Tender.findOne({ id }).lean();
}

export async function updateTender(id: string, data: any) {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return Tender.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();
  }

  return Tender.findOneAndUpdate({ id }, data, { new: true, runValidators: true }).lean();
}

export async function updateTenderApplicants(id: string, applicants: any[]) {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return Tender.findByIdAndUpdate(
      id,
      { applicants },
      { new: true, runValidators: true }
    ).lean();
  }

  return Tender.findOneAndUpdate(
    { id },
    { applicants },
    { new: true, runValidators: true }
  ).lean();
}

export async function deleteTender(id: string) {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return Tender.findByIdAndDelete(id).lean();
  }

  return Tender.findOneAndDelete({ id }).lean();
}

const VECTOR_INDEX_NAME = process.env.TENDER_VECTOR_INDEX_NAME || "tender_vector_index";

/**
 * Semantic search over tenders using MongoDB Atlas Vector Search.
 * Requires the Atlas Search index named VECTOR_INDEX_NAME to exist on the
 * `contentEmbedding` field of the tenders collection (created in the Atlas UI).
 */
export async function vectorSearchTenders(queryVector: number[], limit = 10, minScore = 0) {
  return Tender.aggregate([
    {
      $vectorSearch: {
        index: VECTOR_INDEX_NAME,
        path: "contentEmbedding",
        queryVector,
        exact: false,
        numCandidates: Math.max(limit * 10, 100),
        limit,
      },
    },
    {
      $project: {
        contentEmbedding: 0,
        score: { $meta: "vectorSearchScore" },
      },
    },
    {
      $match: {
        score: { $gte: minScore },
      },
    },
  ]);
}

export default getTenders