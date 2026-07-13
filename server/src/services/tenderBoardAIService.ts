import { z } from 'zod';
import mongoose from "mongoose";
import logger from "../logger";
import { TenderLog } from "../models/tendersBoardLog";
import { callAI } from "./aiService"; // ← הפונקציה הגנרית

// ==========================================
// פונקציית עזר — נרמול ערכי enum
// ==========================================
const normalizeEnum = (val: unknown): unknown =>
  typeof val === "string" ? val.trim().replace(/\s+/g, " ") : val;

// ==========================================
// סכמות Zod
// ==========================================
const TenderZodSchema = z.object({
  title: z.string().describe("כותרת קצרה וקולעת למכרז"),
  shortDescription: z.string().describe("תיאור תמציתי של מהות המכרז"),
  timeRequired: z.object({ value: z.number().optional(), unit: z.enum(['שעות','ימים','שבועות','חודשים','שנים']).optional() }).describe("לוח הזמנים הנדרש — מספר ביחד עם יחידת זמן"),
  budget: z.number().describe("התקציב המוערך במטבע יחיד (מספר בלבד)") ,
  productType: z.preprocess(normalizeEnum, z.enum([
    "אפליקציה", "אתר", "תוכנת desktop",
    "הטמעה של פיצר במערכת קיימת", "ייעוץ",
    "הקמת תשתית לאייגנט", "אחר"
  ])),
  aiApplicationType: z.preprocess(normalizeEnum, z.enum([
    "התממשקות פשוטה", "צאטבוט", "אייגנט", "מולטי אייגנט"
  ])).describe("ענה בעברית בלבד, בדיוק לפי הenum!!! אל תענה באנגלית או משהו אחר!!!"),
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
const TENDER_SYSTEM_PROMPT = `אתה מנתח מכרזים. תפקידך: לקבל תיאור טקסטואלי ולהחזיר JSON מובנה בלבד.

== כללי פלט ==
- החזר JSON בלבד. אסור להוסיף הסבר, כותרת, markdown, קוד-בלוק או כל טקסט אחר.
- אל תכתוב backtick backtick backtick json או backtick backtick backtick — JSON גולמי בלבד.
- כל המפתחות חייבים להופיע בפלט, גם אם הערך ריק.

== מבנה JSON מדויק ==
{"title":"כותרת קצרה וקולעת","shortDescription":"תיאור תמציתי של מהות המכרז","timeRequired":{"value":14,"unit":"ימים"},"budget":10000,"productType":"<ערך מהרשימה בלבד>","aiApplicationType":"<ערך מהרשימה בלבד>","agentsRequired":[],"wantsEmails":true,"additionalDetails":"פרטים נוספים"}

== ערכי productType — העתק בדיוק אחד מהרשימה תו-תו ==
"אפליקציה" | "אתר" | "תוכנת desktop" | "הטמעה של פיצר במערכת קיימת" | "ייעוץ" | "הקמת תשתית לאייגנט" | "אחר"

== ערכי aiApplicationType — העתק בדיוק אחד מהרשימה תו-תו ==
"התממשקות פשוטה" | "צאטבוט" | "אייגנט" | "מולטי אייגנט"

== חוקים קריטיים ==
- ערכי enum: העתק תו-תו מהרשימה. ללא רווחים מיותרים, ללא תרגום לאנגלית, ללא המצאת ערכים חדשים.
- אם אין התאמה ברורה — בחר את הערך הקרוב ביותר מהרשימה.
- ערכי timeRequired.unit: "שעות" | "ימים" | "שבועות" | "חודשים" | "שנים"

== דוגמה לפלט תקין ==
{"title":"foo","shortDescription":"bar baz","timeRequired":{"value":30,"unit":"ימים"},"budget":50000,"productType":"אפליקציה","aiApplicationType":"צאטבוט","agentsRequired":["foo agent"],"wantsEmails":false,"additionalDetails":""}`;

const SEARCH_SYSTEM_PROMPT = `אתה מנוע חיפוש MongoDB. תפקידך: לקבל בקשת חיפוש בשפה חופשית ולהחזיר JSON בלבד — שאילתת filter תקנית עבור Mongoose.

== כללי פלט ==
- החזר JSON בלבד. אסור להוסיף הסבר, כותרת, markdown, קוד-בלוק או כל טקסט אחר.
- חובה לעטוף את השאילתה תחת המפתח "query" — תמיד, ללא יוצא מן הכלל.
- מבנה הפלט: {"query": { ...שאילתת MongoDB... }}

== השדות הזמינים לחיפוש ==
title, shortDescription, productType, budget, timeRequired, aiApplicationType, additionalDetails

== חוקי בניית השאילתה ==
1. חיפוש טקסט חופשי — השתמש ב-$regex עם $options:"i". חלץ מילות מפתח בלבד, אל תשים את הבקשה המלאה.
2. חיפוש במספר שדות במקביל — השתמש ב-$or.
3. התאמה לשדות enum — השתמש בערך העברי המדויק בלבד, ללא $regex, ללא שינוי תו אחד:
   aiApplicationType: "התממשקות פשוטה" | "צאטבוט" | "אייגנט" | "מולטי אייגנט"
   productType: "אפליקציה" | "אתר" | "תוכנת desktop" | "הטמעה של פיצר במערכת קיימת" | "ייעוץ" | "הקמת תשתית לאייגנט" | "אחר"
4. אם הבקשה מתאימה לערך enum — השתמש בהתאמה מדויקת בלבד, לא ב-$regex.
5. אם אין מספיק מידע לבניית שאילתה — החזר: {"query": {}}

== דוגמאות ==

בקשה: "אני רוצה צאטבוטים"
פלט: {"query": {"aiApplicationType": "צאטבוט"}}

בקשה: "אייגנטים לניהול foo"
פלט: {"query": {"aiApplicationType": "אייגנט", "$or": [{"title": {"$regex": "foo", "$options": "i"}}, {"shortDescription": {"$regex": "foo", "$options": "i"}}]}}

בקשה: "מערכת לניהול bar"
פלט: {"query": {"$or": [{"title": {"$regex": "bar", "$options": "i"}}, {"shortDescription": {"$regex": "bar", "$options": "i"}}]}}`;

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
export class TBAIService {

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

  static async generateSearchQuery(userSearchText: string): Promise<Record<string, any>> {
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
      const query = parsedData?.query && Object.keys(parsedData.query).length > 0 ? parsedData.query : {};

      logger.info("AI search query generation completed", {
        query: JSON.stringify(query),
      });

      await saveTenderLog({
        action: "SMART_SEARCH",
        status: "SUCCESS",
        metaData: {
          searchText: userSearchText,
          query,
          responseTime: Date.now() - startTime,
        },
      });

      // Returns the raw (not-yet-sanitized) filter object — the caller
      // (tenderBoardService.smartSearchTenders) is responsible for sanitizing
      // it against an allowlist before executing it against the database.
      return query;

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

export const AIService = TBAIService;