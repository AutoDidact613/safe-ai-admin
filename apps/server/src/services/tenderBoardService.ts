import mongoose from "mongoose";
import * as repo from "../repositories/tenderBoardRepository";
import logger from "../logger";
import { TBAIService } from "./tenderBoardAIService";
import { TenderLog } from "../models/tendersBoardLog";
import {
  sendApplicantRegisteredEmail,
  sendTenderClosedEmail,
} from "../utils/email";

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
  } catch (logError) {
    logger.error("Failed to write Tender DB Log", { logError });
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
  } catch (error) {
    logger.error("Failed to fetch publisher email", { error, publisherUserCode });
    return null;
  }
}

export async function getProductTypeList() {
  return Static_ProductType_List;
}

export async function getAIApplicationTypeList() {
  return AI_ApplicationType_List;
}

export async function createTender(data: any) {
  try {
    const tender = await repo.createTender(data);

    logger.info("Tender created successfully", { tenderId: tender._id, title: data.title });

    await saveTenderLog({
      action: "CREATE",
      status: "SUCCESS",
      tenderId: tender._id,
      metaData: { title: data.title }
    });

    return tender;
  } catch (error: any) {
    logger.error("Failed to create tender", { error, title: data?.title });

    await saveTenderLog({
      action: "CREATE",
      status: "FAILED",
      errorMessage: error?.message || String(error),
      metaData: { title: data?.title }
    });

    throw error;
  }
}

export async function listTenders() {
  try {
    const tenders = await repo.getTenders();
    logger.info("Fetched tenders list", { count: tenders?.length || 0 });
    return tenders;
  } catch (error) {
    logger.error("Failed to list tenders", { error });
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
  } catch (error) {
    logger.error("Failed to get tender by ID", { error, tenderId: id });
    throw error;
  }
}

/**
 * מסננת את מערך ה-applicants של מכרז לפי זהות המבקש: בעל המכרז/אדמין רואים את
 * כל הרשימה (נדרש עבור מסך "הצעות"), כל משתמש אחר רואה לכל היותר את ה-applicant
 * שהוא עצמו הגיש - כדי לא לחשוף בתגובת ה-API פרטים אישיים ותאריכי הגשה של מציעים אחרים.
 */
export function filterApplicantsForRequester(
  tender: any,
  requesterUserId?: string,
  requesterRole?: string
) {
  if (!tender) return tender;

  const allApplicants = tender.applicants || [];

  // מספר המציעים וטווח ההצעות הם נתונים מצרפיים וציבוריים (מוצגים היום לכל
  // משתמש בכרטיס/בפרטי המכרז) - מחושבים כאן מהמערך המלא כדי שלא "יתכווצו"
  // כשמסננים את רשימת ה-applicants הגולמית למי שאינו הבעלים/אדמין.
  const applicantsCount = allApplicants.length;
  const proposals = allApplicants
    .map((a: any) => a.proposal)
    .filter((n: any) => typeof n === "number" && Number.isFinite(n));
  const proposalRange = proposals.length
    ? { min: Math.min(...proposals), max: Math.max(...proposals) }
    : null;

  const isOwnerOrAdmin =
    requesterRole === "admin" ||
    (!!requesterUserId && tender.publisherUserCode === requesterUserId);
  if (isOwnerOrAdmin) {
    return { ...tender, applicantsCount, proposalRange };
  }

  const applicants = allApplicants.filter(
    (a: any) => requesterUserId && a.userId === requesterUserId
  );

  return { ...tender, applicants, applicantsCount, proposalRange };
}

export async function updateTender(id: string, data: any) {
  try {
    const result = await repo.updateTender(id, data);
    logger.info("Tender updated successfully", { tenderId: id });

    await saveTenderLog({
      action: "UPDATE",
      status: "SUCCESS",
      tenderId: id,
      metaData: { changes: Object.keys(data || {}) }
    });

    return result;
  } catch (error: any) {
    logger.error("Failed to update tender", { error, tenderId: id });

    await saveTenderLog({
      action: "UPDATE",
      status: "FAILED",
      tenderId: id,
      errorMessage: error?.message || String(error)
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
  } catch (error: any) {
    logger.error("Failed to close tender", { error, tenderId: id });

    await saveTenderLog({
      action: "UPDATE",
      status: "FAILED",
      tenderId: id,
      errorMessage: error?.message || String(error)
    });

    throw error;
  }
}

/**
 * סימון כל ההצעות (applicants) של מכרז כנצפו - מאפס את חיווי "הצעות חדשות"
 */
export async function markTenderOffersViewed(id: string) {
  try {
    const result = await repo.markApplicantsViewed(id);
    if (!result) {
      throw new Error("Tender not found");
    }

    logger.info("Tender offers marked as viewed", { tenderId: id });

    await saveTenderLog({
      action: "UPDATE",
      status: "SUCCESS",
      tenderId: id,
      metaData: { changes: ["applicants.isViewed"] }
    });

    return result;
  } catch (error: any) {
    logger.error("Failed to mark tender offers as viewed", { error, tenderId: id });

    await saveTenderLog({
      action: "UPDATE",
      status: "FAILED",
      tenderId: id,
      errorMessage: error?.message || String(error)
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
  } catch (error: any) {
    logger.error("Failed to delete tender", { error, tenderId: id });

    await saveTenderLog({
      action: "DELETE",
      status: "FAILED",
      tenderId: id,
      errorMessage: error?.message || String(error)
    });

    throw error;
  }
}

/**
 * Apply to a tender as an applicant
 * Validates that applicant details are provided and prevents duplicate applications
 * לאחר רישום מוצלח - שולח מייל למנהל המכרז עם פרטי המועמד
 */
const PORTFOLIO_LINK_REGEX = /^https?:\/\/.+/i;

// מקבל key גולמי או URL מלא ל-S3 ומחזיר את ה-path (ה-key) בלבד, לצורך ולידציית תיקיית היעד
function extractS3Key(fileKeyOrUrl: string): string {
  if (!fileKeyOrUrl.startsWith("http")) return fileKeyOrUrl;
  try {
    return new URL(fileKeyOrUrl).pathname.replace(/^\//, "");
  } catch {
    return fileKeyOrUrl;
  }
}

export async function applyToTender(
  tenderId: string,
  applicant: {
    name: string;
    email: string;
    details: string;
    proposal?: number;
    contactMethod?: string;
    userId?: string;
    resumeFileKey?: string;
    portfolioLink?: string;
    professionalProfileId?: string;
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
  if (applicant.resumeFileKey && !extractS3Key(applicant.resumeFileKey.trim()).startsWith("uploads/tenders/")) {
    logger.warn("Validation failed: Invalid resume file key", { tenderId, applicantEmail: applicant.email });
    throw new Error("Invalid resume file");
  }
  if (applicant.portfolioLink && !PORTFOLIO_LINK_REGEX.test(applicant.portfolioLink.trim())) {
    logger.warn("Validation failed: Invalid portfolio link", { tenderId, applicantEmail: applicant.email });
    throw new Error("Invalid portfolio link");
  }

  const tender = await repo.getTenderById(tenderId);
  if (!tender) {
    logger.error("Tender not found for application", { tenderId });
    throw new Error("Tender not found");
  }

  const normalizedName = applicant.name.trim();
  const normalizedEmail = applicant.email.trim().toLowerCase();
  const normalizedUserId = applicant.userId?.trim() || undefined;

  // הבדיקה העיקרית מתבססת על userId (זהות אמיתית ומהימנה מתוך ה-JWT); השוואת
  // name+email נשמרת כ-fallback עבור רשומות ישנות שנוצרו לפני הוספת userId.
  const alreadyApplied = tender.applicants?.some((a: any) =>
    normalizedUserId
      ? a.userId === normalizedUserId
      : a.name?.trim() === normalizedName &&
        a.email?.trim().toLowerCase() === normalizedEmail
  );

  if (alreadyApplied) {
    logger.warn("Duplicate application attempt", { tenderId, applicantEmail: normalizedEmail, userId: normalizedUserId });
    throw new Error("Applicant already exists");
  }

  const normalizedApplicant = {
    name: normalizedName,
    email: normalizedEmail,
    details: applicant.details.trim(),
    proposal: applicant.proposal,
    contactMethod: applicant.contactMethod?.trim() || undefined,
    userId: normalizedUserId,
    appliedAt: new Date(),
    resumeFileKey: applicant.resumeFileKey?.trim() || undefined,
    portfolioLink: applicant.portfolioLink?.trim() || undefined,
    professionalProfileId: applicant.professionalProfileId || undefined,
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
        // המועמד שנרשם כרגע הוא תמיד האחרון במערך המעודכן שחזר מה-DB,
        // כך שה-_id שלו ניתן לשימוש כדי לקשר ישירות להצעה במייל.
        const newApplicantId = result?.applicants?.[result.applicants.length - 1]?._id?.toString();

        await sendApplicantRegisteredEmail({
          adminEmail,
          tenderTitle: tender.title,
          tenderId,
          applicantId: newApplicantId,
          applicant: {
            ...normalizedApplicant,
            proposal: normalizedApplicant.proposal?.toString(),
          },
        });
      }
    }

    return result;
  } catch (error: any) {
    logger.error("Failed to update tender applicants", { error, tenderId, applicantEmail: normalizedEmail });

    await saveTenderLog({
      action: "APPLY",
      status: "FAILED",
      tenderId: tenderId,
      errorMessage: error?.message || String(error),
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
  } catch (error) {
    logger.error("Failed to process createSmartTender", { error });
    throw error;
  }
}

// Only these tender fields, and only these operators on them, may appear in an
// AI-generated search filter — blocks $where/$expr/$function-style NoSQL injection
// via prompt injection in the free-text search box.
const SEARCHABLE_TENDER_FIELDS = [
  "title",
  "shortDescription",
  "productType",
  "budget",
  "timeRequired",
  "aiApplicationType",
  "additionalDetails",
];

function isAllowedFieldValue(value: unknown): boolean {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value).every((key) => key === "$regex" || key === "$options");
  }
  return false;
}

function sanitizeSearchFilter(filter: unknown): Record<string, any> {
  if (!filter || typeof filter !== "object" || Array.isArray(filter)) return {};

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(filter as Record<string, unknown>)) {
    if (key === "$or" || key === "$and") {
      if (Array.isArray(value)) {
        const clauses = value.map(sanitizeSearchFilter).filter((clause) => Object.keys(clause).length > 0);
        if (clauses.length > 0) sanitized[key] = clauses;
      }
      continue;
    }

    if (SEARCHABLE_TENDER_FIELDS.includes(key) && isAllowedFieldValue(value)) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export async function smartSearchTenders(searchText: string) {
  try {
    logger.info("Received search text for smart search", { searchText });

    const mongoFilter = await TBAIService.generateSearchQuery(searchText);

    const safeFilter = sanitizeSearchFilter(mongoFilter);

    logger.info("Executing smart search with filter", { filter: JSON.stringify(safeFilter) });
    console.log("Executing smart search with filter:", JSON.stringify(safeFilter));
    return await repo.getTenders(safeFilter);
  } catch (error: any) {
    if (error?.message === "RATE_LIMIT") {
      logger.warn("Rate limit reached on AI search", { searchText });
      throw Object.assign(new Error("שירות החיפוש החכם עמוס כרגע, נסה שוב בעוד מספר שניות"), { statusCode: 429 });
    }
    logger.error("Failed to process smartSearchTenders", { error, searchText });
    throw error;
  }
}