import mongoose from "mongoose";
import * as repo from "../repositories/tenderBoardRepository";
import logger from "../logger";
import { TBAIService } from "./tenderBoardAIService";
import { getEmbedding } from "./embeddingService";
import { TenderLog } from "../models/tendersBoardLog";
import {
  sendApplicantRegisteredEmail,
  sendTenderClosedEmail,
} from "../utils/email";

const aiService = new TBAIService();

// הרשימה הסטטית של התחומים 
const Static_ProductType_List = [
  'אפליקציה',
  'אתר',
  'תוכנת desktop',
  'הטמעה של פיצר במערכת קיימת',
  'ייעוץ',
  'הקמת תשתית לאייגנט',
  'אחר'
];

const AI_ApplicationType_List = [
  'התממשקות פשוטה',
  'צאטבוט',
  'אייגנט',
  'מולטי אייגנט'
];

/**
 * פונקציית עזר פנימית ליצירת לוג בבסיס הנתונים עם חישוב TTL של 60 יום מראש
 */
async function saveTenderLog(params: {
  action: "CREATE" | "UPDATE" | "DELETE" | "APPLY" | "SMART_CREATE" | "SMART_SEARCH";
  status: "SUCCESS" | "FAILED";
  tenderId?: string | mongoose.Types.ObjectId;
  metaData?: any;
  errorMessage?: string;
}) {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60);

    const validTenderId = params.tenderId && mongoose.Types.ObjectId.isValid(params.tenderId)
      ? new mongoose.Types.ObjectId(params.tenderId.toString())
      : undefined;

    await TenderLog.create({
      action: params.action,
      status: params.status,
      tenderId: validTenderId,
      metaData: params.metaData,
      errorMessage: params.errorMessage,
      timestamp: new Date(),
      expiresAt
    } as any);
  } catch (err) {
    const error = err as Error;
    logger.error("Failed to write Tender DB Log", {
      error: error.message,
      stack: error.stack,
      action: params.action,
      tenderId: params.tenderId,
    });
  }
}

/**
 * פונקציית עזר פנימית - שליפת המייל של מנהל המכרז מה-DB לפי publisherUserCode
 * מחזירה את המייל אם נמצא, או null אם לא
 */
async function getPublisherEmail(publisherUserCode: string): Promise<string | null> {
  try {
    const publisher = await repo.getUserByCode(publisherUserCode);
    if (!publisher?.email) {
      logger.warn("Publisher email not found", { publisherUserCode });
      return null;
    }
    return publisher.email;
  } catch (err) {
    const error = err as Error;
    logger.error("Failed to fetch publisher email", {
      error: error.message,
      stack: error.stack,
      publisherUserCode,
    });
    return null;
  }
}

export async function getProductTypeList() {
  return Static_ProductType_List;
}

export async function getAIApplicationTypeList() {
  return AI_ApplicationType_List;
}

/**
 * Builds the text that gets embedded for vector search — combines the
 * free-text and enum fields a user is likely to search by.
 */
function buildEmbeddingText(data: any): string {
  return [
    data.title,
    data.shortDescription,
    data.productType,
    data.aiApplicationType,
    data.additionalDetails,
  ]
    .filter(Boolean)
    .join(". ");
}

/**
 * Computes and attaches the contentEmbedding for a tender payload, used before
 * create/update so the document stays searchable via $vectorSearch. Failures
 * are logged and swallowed — losing semantic search on one tender must not
 * block create/update of the tender itself.
 */
async function withEmbedding(data: any): Promise<any> {
  const text = buildEmbeddingText(data);
  if (!text) return data;

  try {
    const contentEmbedding = await getEmbedding(text);
    return { ...data, contentEmbedding };
  } catch (err) {
    const error = err as Error;
    logger.error("Failed to compute tender embedding; saving without it", {
      error: error.message,
      stack: error.stack,
    });
    return data;
  }
}

export async function createTender(data: any) {
  try {
    const tender = await repo.createTender(await withEmbedding(data));

    // contentEmbedding is a large numeric vector with no business value in a log entry, so it's excluded here.
    const { contentEmbedding, ...tenderForLog } = tender.toObject();

    logger.info("Tender created successfully", { tenderId: tender._id, tender: tenderForLog });

    await saveTenderLog({
      action: "CREATE",
      status: "SUCCESS",
      tenderId: tender._id,
      metaData: { tender: tenderForLog }
    });

    return tender;
  } catch (err) {
    const error = err as Error;
    logger.error("Failed to create tender", {
      error: error.message,
      stack: error.stack,
      tender: data,
    });

    await saveTenderLog({
      action: "CREATE",
      status: "FAILED",
      errorMessage: error.message,
      metaData: { tender: data }
    });

    throw error;
  }
}

export async function listTenders() {
  try {
    const tenders = await repo.getTenders();
    logger.info("Fetched tenders list", { count: tenders?.length || 0 });
    return tenders;
  } catch (err) {
    const error = err as Error;
    logger.error("Failed to list tenders", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

export async function getTenderById(id: string) {
  try {
    const tender = await repo.getTenderById(id);
    if (!tender) {
      logger.warn(`Tender with ID ${id} not found`);
    } else {
      logger.info("Fetched tender details", { tenderId: id });
    }
    return tender;
  } catch (err) {
    const error = err as Error;
    logger.error("Failed to get tender by ID", {
      error: error.message,
      stack: error.stack,
      tenderId: id,
    });
    throw error;
  }
}

const EMBEDDING_TEXT_FIELDS = ["title", "shortDescription", "productType", "aiApplicationType", "additionalDetails"];

export async function updateTender(id: string, data: any) {
  try {
    const needsReembedding = Object.keys(data || {}).some((key) => EMBEDDING_TEXT_FIELDS.includes(key));
    const payload = needsReembedding ? await withEmbedding({ ...(await repo.getTenderById(id)), ...data }) : data;

    const result = await repo.updateTender(id, payload);
    logger.info("Tender updated successfully", { tenderId: id });

    await saveTenderLog({
      action: "UPDATE",
      status: "SUCCESS",
      tenderId: id,
      metaData: { changes: Object.keys(data || {}) }
    });

    return result;
  } catch (err) {
    const error = err as Error;
    logger.error("Failed to update tender", {
      error: error.message,
      stack: error.stack,
      tenderId: id,
    });

    await saveTenderLog({
      action: "UPDATE",
      status: "FAILED",
      tenderId: id,
      errorMessage: error.message
    });

    throw error;
  }
}

/**
 * סגירת מכרז - מעדכן isActive=false ושולח מייל למנהל המכרז
 * שולף את המייל של המנהל לפי publisherUserCode השמור במכרז
 */
export async function closeTender(id: string) {
  try {
    // שליפת המכרז לפני הסגירה כדי לקבל את publisherUserCode והכותרת
    const tender = await repo.getTenderById(id);
    if (!tender) {
      throw new Error("Tender not found");
    }

    // עדכון isActive=false בבסיס הנתונים
    const result = await repo.updateTender(id, { isActive: false });

    logger.info("Tender closed successfully", { tenderId: id, title: tender.title });

    await saveTenderLog({
      action: "UPDATE",
      status: "SUCCESS",
      tenderId: id,
      metaData: { changes: ["isActive"], closedAt: new Date() }
    });

    // שליחת מייל למנהל המכרז - לא חוסמת את התוצאה
    if (tender.publisherUserCode && tender.wantsEmails) {
      const adminEmail = await getPublisherEmail(tender.publisherUserCode);
      if (adminEmail) {
        await sendTenderClosedEmail({
          adminEmail,
          tenderTitle: tender.title,
          tenderId: id,
          totalApplicants: tender.applicants?.length || 0,
        });
      }
    }

    return result;
  } catch (err) {
    const error = err as Error;
    logger.error("Failed to close tender", {
      error: error.message,
      stack: error.stack,
      tenderId: id,
    });

    await saveTenderLog({
      action: "UPDATE",
      status: "FAILED",
      tenderId: id,
      errorMessage: error.message
    });

    throw error;
  }
}

export async function deleteTender(id: string) {
  try {
    const result = await repo.deleteTender(id);

    logger.info("Tender deleted successfully", { tenderId: id });

    await saveTenderLog({
      action: "DELETE",
      status: "SUCCESS",
      tenderId: id
    });

    return result;
  } catch (err) {
    const error = err as Error;
    logger.error("Failed to delete tender", {
      error: error.message,
      stack: error.stack,
      tenderId: id,
    });

    await saveTenderLog({
      action: "DELETE",
      status: "FAILED",
      tenderId: id,
      errorMessage: error.message
    });

    throw error;
  }
}

/**
 * Apply to a tender as an applicant
 * Validates that applicant details are provided and prevents duplicate applications by email
 * לאחר רישום מוצלח - שולח מייל למנהל המכרז עם פרטי המועמד
 */
export async function applyToTender(
  tenderId: string,
  applicant: {
    name: string;
    email: string;
    details: string;
    proposal?: number;
    contactMethod?: string;
  }
) {
  logger.info("Processing application to tender", { tenderId, applicantEmail: applicant?.email });

  if (!applicant.name || !applicant.name.trim()) {
    logger.warn("Validation failed: Applicant name is required", { tenderId });
    throw new Error("Applicant name is required");
  }
  if (!applicant.email || !applicant.email.trim()) {
    logger.warn("Validation failed: Applicant email is required", { tenderId });
    throw new Error("Applicant email is required");
  }
  if (!applicant.details || !applicant.details.trim()) {
    logger.warn("Validation failed: Applicant details are required", { tenderId, applicantEmail: applicant.email });
    throw new Error("Applicant details are required");
  }

  const tender = await repo.getTenderById(tenderId);
  if (!tender) {
    logger.error("Tender not found for application", { tenderId });
    throw new Error("Tender not found");
  }

  const normalizedName = applicant.name.trim();
  const normalizedEmail = applicant.email.trim().toLowerCase();

  const alreadyApplied = tender.applicants?.some(
    (a: any) => a.email?.trim().toLowerCase() === normalizedEmail
  );

  if (alreadyApplied) {
    logger.warn("Duplicate application attempt", { tenderId, applicantEmail: normalizedEmail });
    const duplicateError = new Error("You have already registered for this tender") as Error & { code?: string };
    duplicateError.code = "ALREADY_APPLIED";
    throw duplicateError;
  }

  const normalizedApplicant = {
    name: normalizedName,
    email: normalizedEmail,
    details: applicant.details.trim(),
    proposal: applicant.proposal,
    contactMethod: applicant.contactMethod?.trim() || undefined,
  };

  const updatedApplicants = [
    ...(tender.applicants || []),
    normalizedApplicant,
  ];

  try {
    const result = await repo.updateTenderApplicants(tenderId, updatedApplicants);
    logger.info("Applicant registered successfully to tender", { tenderId, applicantEmail: normalizedEmail });

    await saveTenderLog({
      action: "APPLY",
      status: "SUCCESS",
      tenderId: tenderId,
      metaData: { applicantEmail: normalizedEmail }
    });

    // שליחת מייל למנהל המכרז לאחר רישום מוצלח - לא חוסמת את התוצאה
    if (tender.publisherUserCode && tender.wantsEmails) {
      const adminEmail = await getPublisherEmail(tender.publisherUserCode);
      if (adminEmail) {
        await sendApplicantRegisteredEmail({
          adminEmail,
          tenderTitle: tender.title,
          tenderId,
          applicant: {
            ...normalizedApplicant,
            proposal: normalizedApplicant.proposal?.toString(),
          },
        });
      }
    }

    return result;
  } catch (err) {
    const error = err as Error;
    logger.error("Failed to update tender applicants", {
      error: error.message,
      stack: error.stack,
      tenderId,
      applicantEmail: normalizedEmail,
    });

    await saveTenderLog({
      action: "APPLY",
      status: "FAILED",
      tenderId: tenderId,
      errorMessage: error.message,
      metaData: { applicantEmail: normalizedEmail }
    });

    throw error;
  }
}

/**
 * ========================================================
 * פונקציות שירות חדשות - שילוב ה-AI במערכת
 * ========================================================
 */

export async function createSmartTender(text: string) {
  try {
    logger.info("Processing createSmartTender requested", { textLength: text?.length });

    const aiTenderData = await TBAIService.generateTenderData(text);

    const fullTenderData = {
      ...aiTenderData,
      isActive: true,
      applicants: []
    };

    return fullTenderData;
  } catch (err) {
    const error = err as Error;
    logger.error("Failed to process createSmartTender", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

export async function smartSearchTenders(searchText: string, limit = 10) {
  try {
    logger.info("Received search text for smart search", { searchText });

    const queryVector = await getEmbedding(searchText);

    // שולפים בור מועמדים רחב לפי דמיון סמנטי בלבד (contentEmbedding לא מכיל timeRequired/budget),
    // כדי שהחיפוש לא יחמיץ מכרזים רלוונטיים רק בגלל ניקוד וקטורי נמוך על שאילתה שמבוססת על זמן/תקציב.
    const candidatePoolSize = Math.max(limit * 5, 30);
    const candidates = await repo.vectorSearchTenders(queryVector, candidatePoolSize);

    logger.info("Vector search candidates", {
      searchText,
      candidateCount: candidates.length,
      scores: candidates.map((c: any) => c.score),
    });

    const results = await TBAIService.filterRelevantTenders(searchText, candidates);

    logger.info("Executed AI relevance filtering", { searchText, resultCount: results.length });

    const limitedResults = results.slice(0, limit);

    await saveTenderLog({
      action: "SMART_SEARCH",
      status: "SUCCESS",
      metaData: { searchText, resultCount: limitedResults.length },
    });

    return limitedResults;
  } catch (err) {
    const error = err as Error;
    logger.error("Failed to process smartSearchTenders", {
      error: error.message,
      stack: error.stack,
      searchText,
    });

    await saveTenderLog({
      action: "SMART_SEARCH",
      status: "FAILED",
      errorMessage: error.message,
      metaData: { searchText },
    });

    throw error;
  }
}