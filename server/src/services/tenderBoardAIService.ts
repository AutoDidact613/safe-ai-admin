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

// ==========================================
// סכמה + פרומפט — סינון רלוונטיות בחיפוש חכם
// ==========================================
const SearchRelevanceZodSchema = z.object({
  relevantTenderIds: z.array(z.string()).describe("מזהי המכרזים הרלוונטיים בלבד, מתוך רשימת הקלט"),
});

const SEARCH_RELEVANCE_SYSTEM_PROMPT = `אתה מנוע התאמה למכרזים. תפקידך: לקבל טקסט חיפוש חופשי של לקוח, ורשימת מכרזים מועמדים, ולהחזיר אך ורק את ה-id של המכרזים שבאמת רלוונטיים לבקשה.

== קלט שתקבל (בגוף ההודעה, כ-JSON) ==
{"searchText":"<טקסט חיפוש חופשי>","tenders":[<רשימת אובייקטי מכרז>]}

== מבנה מדויק של כל אובייקט מכרז ברשימה ==
- id: string — מזהה המכרז. יש להעתיקו תו-תו בפלט אם המכרז רלוונטי, ואסור להמציא id שלא הופיע בקלט.
- title: string — כותרת המכרז.
- shortDescription: string — תיאור תמציתי של מהות המכרז.
- timeRequired: { value: number, unit: "שעות"|"ימים"|"שבועות"|"חודשים"|"שנים" } — לוח הזמנים הנדרש להשלמת המכרז.
- budget: number — תקציב מוערך.
- productType: string — אחד מ: "אפליקציה" | "אתר" | "תוכנת desktop" | "הטמעה של פיצר במערכת קיימת" | "ייעוץ" | "הקמת תשתית לאייגנט" | "אחר".
- aiApplicationType: string — אחד מ: "התממשקות פשוטה" | "צאטבוט" | "אייגנט" | "מולטי אייגנט".
- agentsRequired: string[] — סוגי אייגנטים נדרשים.
- wantsEmails: boolean — האם המכרז דורש שילוח מיילים.
- additionalDetails: string — פרטים נוספים חופשיים.

== פלט נדרש ==
JSON בלבד, במבנה: {"relevantTenderIds":["id1","id2"]}
- אסור להוסיף טקסט, הסבר, markdown או code block מסביב ל-JSON.
- אם אין אף מכרז רלוונטי, החזר מערך ריק: {"relevantTenderIds":[]}

== התאמת זמן (timeRequired) — הכלל הקריטי ביותר ==
טקסט החיפוש עשוי לתאר מגבלת זמן בדרכים שונות: מספרים, מילים כתובות, יחידות שונות, ולעיתים בצורת סמיכות ("שבועיים", "חודש וחצי").
המר תמיד את timeRequired של כל מכרז למספר ימים, לפי הטבלה הבאה:
- "שעות" -> value / 24
- "ימים" -> value
- "שבועות" -> value * 7
- "חודשים" -> value * 30
- "שנים" -> value * 365

וכך גם פרש את מגבלת הזמן מטקסט החיפוש עצמו לימים, כולל ניסוחים כמו:
- "לא יותר מחודש" / "עד חודש" -> מגבלה של 30 ימים
- "שבועיים" / "14 יום" / "2 שבועות" -> 14 ימים
- "עד שבוע" / "שבוע ימים" -> 7 ימים
- "חודש וחצי" -> 45 ימים
- "רבעון" / "3 חודשים" -> 90 ימים
- "שנה" -> 365 ימים

מכרז נחשב רלוונטי מבחינת זמן אם timeRequired שלו (מומר לימים) עומד בתנאי שצוין בטקסט החיפוש (לדוגמה: פחות או שווה למגבלה שנאמרה). אם טקסט החיפוש לא מזכיר זמן בכלל — אל תסנן לפי זמן, והתבסס רק על קריטריונים אחרים.

== דוגמאות מפורשות ==
דוגמה 1:
searchText: "אני רוצה foo שהזמן שלו לא יותר מחודש"
tenders: [{"id":"1","timeRequired":{"value":14,"unit":"ימים"}}, {"id":"2","timeRequired":{"value":2,"unit":"חודשים"}}, {"id":"3","timeRequired":{"value":2,"unit":"שבועות"}}]
חישוב: מכרז 1 = 14 ימים <= 30 -> רלוונטי. מכרז 2 = 60 ימים > 30 -> לא רלוונטי. מכרז 3 = 14 ימים <= 30 -> רלוונטי.
פלט: {"relevantTenderIds":["1","3"]}

דוגמה 2:
searchText: "מחפש bar לביצוע תוך שבועיים בלבד"
tenders: [{"id":"5","timeRequired":{"value":10,"unit":"ימים"}}, {"id":"6","timeRequired":{"value":21,"unit":"ימים"}}]
חישוב: מגבלת הטקסט = שבועיים = 14 ימים. מכרז 5 = 10 ימים <= 14 -> רלוונטי. מכרז 6 = 21 ימים > 14 -> לא רלוונטי.
פלט: {"relevantTenderIds":["5"]}

דוגמה 3:
searchText: "baz בתחום productType אפליקציה, בלי הגבלת זמן"
tenders: [{"id":"7","productType":"אפליקציה","timeRequired":{"value":6,"unit":"חודשים"}}, {"id":"8","productType":"אתר","timeRequired":{"value":5,"unit":"ימים"}}]
חישוב: אין הגבלת זמן בטקסט -> זמן לא משפיע על הסינון. מכרז 7 מתאים ב-productType -> רלוונטי. מכרז 8 לא מתאים -> לא רלוונטי.
פלט: {"relevantTenderIds":["7"]}

== כללים נוספים ==
- שקול גם התאמה סמנטית כללית (productType, aiApplicationType, agentsRequired, מילות מפתח בכותרת/תיאור) בנוסף לזמן — לא רק זמן.
- אם הטקסט מנוסח כהערכה גסה ("בערך חודש", "סביב שבוע") — התייחס למגבלה בגמישות קלה. אם הטקסט מנוסח כתנאי מדויק ("לא יותר מ-", "עד") — אכוף אותו במדויק.`;

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

    } catch (err) {
      const error = err as Error;
      logger.error("Error in AIService.generateTenderData", {
        error: error.message,
        stack: error.stack,
        descriptionLength: userDescription?.length,
      });
      await saveTenderLog({
        action: "SMART_CREATE",
        status: "FAILED",
        errorMessage: error.message,
        metaData: {
          textLength: userDescription?.length,
          responseTime: Date.now() - startTime,
        },
      });
      throw new Error("נכשלה יצירת המכרז החכמה באמצעות ה-AI");
    }
  }

  static async filterRelevantTenders(searchText: string, tenders: any[]) {
    if (!tenders.length) return tenders;

    const startTime = Date.now();
    try {
      const tendersForPrompt = tenders.map((t) => ({
        id: String(t._id ?? t.id),
        title: t.title,
        shortDescription: t.shortDescription,
        timeRequired: t.timeRequired,
        budget: t.budget,
        productType: t.productType,
        aiApplicationType: t.aiApplicationType,
        agentsRequired: t.agentsRequired,
        wantsEmails: t.wantsEmails,
        additionalDetails: t.additionalDetails,
      }));

      const { relevantTenderIds } = await callAI({
        userPrompt: JSON.stringify({ searchText, tenders: tendersForPrompt }),
        systemPrompt: SEARCH_RELEVANCE_SYSTEM_PROMPT,
        schema: SearchRelevanceZodSchema,
        temperature: 0,
        callName: "filterRelevantTenders",
      });

      logger.info("AI search relevance filtering completed", {
        searchText,
        candidateCount: tenders.length,
        relevantCount: relevantTenderIds.length,
        responseTime: Date.now() - startTime,
      });

      const relevantIdSet = new Set(relevantTenderIds);
      return tenders.filter((t) => relevantIdSet.has(String(t._id ?? t.id)));
    } catch (err) {
      const error = err as Error;
      logger.error("Error in AIService.filterRelevantTenders", {
        error: error.message,
        stack: error.stack,
        searchText,
        candidateCount: tenders.length,
      });
      throw new Error("נכשל סינון הרלוונטיות של המכרזים באמצעות ה-AI");
    }
  }

}

export const AIService = TBAIService;