import { z } from 'zod';
import { callAI } from "./aiService"; // ← הפונקציה הגנרית
import logger from "../logger";

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
// מחלקת השירות — משתמשת ב-callAI
// ==========================================
export class TBAIService {

  static async generateTenderData(userDescription: string) {
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

      return parsedData;

    } catch (error: any) {
      logger.error("Error in AIService.generateTenderData", {
        err: error,
        descriptionLength: userDescription?.length,
      });
      throw new Error("נכשלה יצירת המכרז החכמה באמצעות ה-AI");
    }
  }

  static async generateSearchQuery(userSearchText: string): Promise<Record<string, any>> {
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

      // Returns the raw (not-yet-sanitized) filter object — the caller
      // (tenderBoardService.smartSearchTenders) is responsible for sanitizing
      // it against an allowlist before executing it against the database.
      return query;

    } catch (error: any) {
      logger.error("Error in AIService.generateSearchQuery", {
        error,
        searchText: userSearchText,
      });
      if (error?.status === 429) throw new Error("RATE_LIMIT");
      throw error;
    }
  }
}

export const AIService = TBAIService;