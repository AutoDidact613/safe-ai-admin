import { z } from 'zod';
import mongoose from "mongoose";
import logger from "../logger";
import getTenders from "../repositories/tenderBoardRepository";
import { TenderLog } from "../models/tendersBoardLog";
import { callAI } from "./aiService"; // ← הפונקציה הגנרית

// ==========================================
// סכמות Zod
// ==========================================
const TenderZodSchema = z.object({
  title: z.string().describe("כותרת קצרה וקולעת למכרז"),
  shortDescription: z.string().describe("תיאור תמציתי של מהות המכרז"),
  timeRequired: z.string().describe("לוח הזמנים הנדרש או דדליין"),
  budget: z.string().describe("התקציב המוערך למכרז"),
  productType: z.enum([
    "אפליקציה", "אתר", "תוכנת desktop",
    "הטמעה של פיצר במערכת קיימת", "ייעוץ",
    "הקמת תשתית לאייגנט", "אחר"
  ]),
  aiApplicationType: z.enum([
    "התממשקות פשוטה", "צאטבוט", "אייגנט", "מולטי אייגנט"
  ]).describe("ענה בעברית בלבד, בדיוק לפי הenum"),
  agentsRequired: z.array(z.string()),
  wantsEmails: z.boolean(),
  additionalDetails: z.string(),
});

// ✅ הסכמה מצפה ל-{ query: {...} }
const SearchQueryZodSchema = z.object({
  query: z.record(z.string(), z.any())
    .describe("אובייקט שאילתת MongoDB תקני"),
});

// ==========================================
// System Prompts
// ==========================================
const TENDER_SYSTEM_PROMPT = `אתה עוזר מקצועי לניהול מכרזים. נתח את הטקסט וחלץ את המידע לשדות ה-JSON.
החזר JSON בלבד במבנה הבא בדיוק — עברית בלבד בערכי ה-enum:
{"title":"...","shortDescription":"...","timeRequired":"...","budget":"...","productType":"אפליקציה","aiApplicationType":"צאטבוט","agentsRequired":[],"wantsEmails":true,"additionalDetails":"..."}
ערכי productType המותרים: "אפליקציה","אתר","תוכנת desktop","הטמעה של פיצר במערכת קיימת","ייעוץ","הקמת תשתית לאייגנט","אחר"
ערכי aiApplicationType המותרים: "התממשקות פשוטה","צאטבוט","אייגנט","מולטי אייגנט"`;

// ✅ תיקון 1: prompt מפורש עם דוגמאות כדי ש-Gemini יעטוף ב-query
// ✅ תיקון 3: ערכי enum בעברית מפורשים כדי ש-Gemini לא יחזיר אנגלית
const SEARCH_SYSTEM_PROMPT = `אתה מומחה MongoDB. תרגם את בקשת החיפוש לשאילתת filter עבור Mongoose.

השדות הזמינים: title, shortDescription, productType, budget, timeRequired, aiApplicationType, additionalDetails.

חוקים:
1. השתמש ב-$regex עם 'i' לחיפוש טקסט חופשי.
2. השתמש ב-$or לחיפוש במספר שדות במקביל.
3. להתאמה ל-enum — השתמש בערך העברי המדויק:
   ערכי aiApplicationType: "התממשקות פשוטה", "צאטבוט", "אייגנט", "מולטי אייגנט"
   ערכי productType: "אפליקציה","אתר","תוכנת desktop","הטמעה של פיצר במערכת קיימת","ייעוץ","הקמת תשתית לאייגנט","אחר"

חובה: החזר תמיד JSON במבנה הבא בלבד — עטוף את השאילתה תחת המפתח "query":
{"query": { ...שאילתת MongoDB... }}

דוגמה לחיפוש "צאטבוטים":
{"query": {"aiApplicationType": "צאטבוט"}}

דוגמה לחיפוש טקסט חופשי:
{"query": {"$or": [{"title": {"$regex": "foo", "$options": "i"}}, {"shortDescription": {"$regex": "foo", "$options": "i"}}]}}`;

// ==========================================
// פונקציית עזר — שמירת לוג
// ==========================================
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
      expiresAt,
    } as any);
  } catch (logError) {
    logger.error("Failed to write Tender DB Log", { logError });
  }
}

// ==========================================
// מחלקת השירות — משתמשת ב-callAI
// ==========================================
export class AIService {

  static async generateTenderData(userDescription: string) {
    const startTime = Date.now();
    try {
      logger.info("Starting AI tender data generation", {
        descriptionLength: userDescription?.length,
      });

      // ← קריאה ל-callAI הגנרי
      const parsedData = await callAI({
        userPrompt: userDescription,
        systemPrompt: TENDER_SYSTEM_PROMPT,
        schema: TenderZodSchema,
        temperature: 0.2,
      });

      logger.info("AI tender data generation completed", {
        title: parsedData.title,
        productType: parsedData.productType,
      });

      await saveTenderLog({
        action: "SMART_CREATE",
        status: "SUCCESS",
        metaData: {
          textLength: userDescription?.length,
          responseTime: Date.now() - startTime,
        },
      });

      return parsedData;

    } catch (error: any) {
      logger.error("Error in AIService.generateTenderData", {
        err: error,
        descriptionLength: userDescription?.length,
      });
      await saveTenderLog({
        action: "SMART_CREATE",
        status: "FAILED",
        errorMessage: error?.message || String(error),
        metaData: {
          textLength: userDescription?.length,
          responseTime: Date.now() - startTime,
        },
      });
      throw new Error("נכשלה יצירת המכרז החכמה באמצעות ה-AI");
    }
  }

  static async generateSearchQuery(userSearchText: string): Promise<any> {
    const startTime = Date.now();
    try {
      logger.info("Starting AI search query generation", { searchText: userSearchText });

      // ← קריאה ל-callAI הגנרי
      const raw = await callAI({
        userPrompt: `בקשת החיפוש: "${userSearchText}"`,
        systemPrompt: SEARCH_SYSTEM_PROMPT,
        schema: z.record(z.string(), z.any()), // מקבלים any object — נעשה normalize בעצמנו
        temperature: 0.1,
      });

      // ✅ תיקון 2: fallback — אם Gemini לא עטף ב-query, עוטפים בעצמנו
      const normalized = (raw as any).query !== undefined
        ? (raw as any)
        : { query: raw };

      const parsedData = SearchQueryZodSchema.parse(normalized);

      if (!parsedData?.query || Object.keys(parsedData.query).length === 0) {
          logger.warn("AI generated empty query, returning all tenders", {
          searchText: userSearchText,
        });
        await saveTenderLog({
          action: "SMART_SEARCH",
          status: "SUCCESS",
          metaData: { searchText: userSearchText, query: {}, responseTime: Date.now() - startTime },
        });
        return await getTenders({});
      }

      logger.info("AI search query generation completed", {
        query: JSON.stringify(parsedData.query),
      });

      await saveTenderLog({
        action: "SMART_SEARCH",
        status: "SUCCESS",
        metaData: {
          searchText: userSearchText,
          query: parsedData.query,
          responseTime: Date.now() - startTime,
        },
      });

      return await getTenders(parsedData.query);

    } catch (error: any) {
      logger.error("Error in AIService.generateSearchQuery", {
        error,
        searchText: userSearchText,
      });
      await saveTenderLog({
        action: "SMART_SEARCH",
        status: "FAILED",
        errorMessage: error?.message || String(error),
        metaData: { searchText: userSearchText, responseTime: Date.now() - startTime },
      });
      if (error?.status === 429) throw new Error("RATE_LIMIT");
      throw error;
    }
  }
}