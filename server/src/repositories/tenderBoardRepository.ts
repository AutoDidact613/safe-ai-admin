import mongoose from "mongoose";
import { Tender } from "../models/tender";

export async function createTender(data: any) {
  return Tender.create(data);
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