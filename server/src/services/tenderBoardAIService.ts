import { OpenAI } from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

// אתחול ה-Client עם הגדרות התאימות עבור Google Gemini
const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY, 
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" 
});

const GEMINI_MODEL = "gemini-1.5-flash"; 

// ==========================================
// 1. הגדרת הסכמה עבור יצירת מכרז (Zod Schema)
// ==========================================
const TenderZodSchema = z.object({
  title: z.string()
    .describe("כותרת קצרה וקולעת למכרז"),
    
  shortDescription: z.string()
    .describe("תיאור תמציתי של מהות המכרז"),
    
  timeRequired: z.string()
    .describe("לוח הזמנים הנדרש או דדליין, למשל: '3 חודשים' או תאריך מוגדר"),
    
  budget: z.string()
    .describe("התקציב המוערך למכרז במידה וצוין, למשל: '50,000 שח'"),
    
  productType: z.enum([
    "אפליקציה", 
    "אתר", 
    "תוכנת desktop", 
    "הטמעה של פיצר במערכת קיימת", 
    "ייעוץ", 
    "הקמת תשתית לאייגנט", 
    "אחר"
  ]).describe("סוג המוצר או השירות המבוקש מתוך רשימת הenum המוגדרת מראש. אם לא ברור, ניתן לבחור 'אחר' ולהסביר בפרטים נוספים."),
  
  aiApplicationType: z.enum([
    "התממשקות פשוטה",
    "צאטבוט",
    "אייגנט",
    "מולטי אייגנט"
  ]).describe("סוג יישום ה-AI הנדרש במכרז, במידה ורלוונטי מתוך הenum המוגדר מראש"),
  
  agentsRequired: z.array(z.string())
    .describe("רשימת האייגנטים הנדרשים ללקוח - אך ורק אם ב aiApplicationType יש מולטי אייגנט , אם יש אגנט - אז תמלא רק איבר אחד. אם לא רלוונטי, השאר את המערך ריק."),
    
  wantsEmails: z.boolean()
    .describe("האם המשתמש מעוניין לקבל עדכונים במייל (ברירת מחדל true אלא אם נאמר אחרת)"),
    
  additionalDetails: z.string()
    .describe("פרטים נוספים, דגשים מיוחדים או תנאי סף שנכתבו בטקסט")
});

// ==========================================
// 2. הגדרת הסכמה עבור שאילתת החיפוש (Zod Schema)
// ==========================================
const SearchQueryZodSchema = z.object({
  query: z.record(z.string(), z.any())
    .describe("אובייקט שאילתת MongoDB (filter) תקני ונקי לחלוטין ללא הסברים")
});


// ==========================================
// מחלקת השירות הראשי של ה-AI
// ==========================================
export class AIService {

  /**
   * נקודת קצה 1: יצירת מכרז חכם מטקסט חופשי (Text to JSON)
   * שונה ל-static כדי למנוע בעיות של הקשר (Context/this) מה-Controller
   */
  static async generateTenderData(userDescription: string) {
    try {
      // שימוש ישיר ב-openai המאותחל למעלה במקום ב-this
      const response = await (openai.beta as any).chat.completions.parse({
        model: GEMINI_MODEL,
        temperature: 0.2, 
        messages: [
          {
            role: "system",
            content: "אתה עוזר מקצועי לניהול מכרזים. תפקידך לנתח את הטקסט החופשי שהמשתמש מספק, לחלץ ממנו את המידע הרלוונטי ולמפות אותו בדיוק רב לשדות ה-JSON הנדרשים על פי התיאורים והחוקים המוגדרים בסכמה."
          },
          {
            role: "user",
            content: userDescription
          }
        ],
        response_format: zodResponseFormat(TenderZodSchema, "tender_generation"),
      });

      const parsedData = response.choices[0].message.parsed;
      
      if (!parsedData) {
        throw new Error("ה-AI החזיר תשובה ריקה או לא הצליח לפרסר לפי הסכמה.");
      }

      return parsedData;
    } catch (error) {
      console.error("Error in AIService.generateTenderData:", error);
      throw new Error("נכשלה יצירת המכרז החכמה באמצעות ה-AI");
    }
  }

  /**
   * נקודת קצה 2: חיפוש חכם (תרגום לשאילתת מונגו)
   * שונה ל-static כדי להבטיח אחידות ועבודה תקינה בכל ה-Controller
   */
  static async generateSearchQuery(userSearchText: string): Promise<object> {
    try {
      const response = await (openai.beta as any).chat.completions.parse({
        model: GEMINI_MODEL,
        temperature: 0.1, 
        messages: [
          {
            role: "system",
            content: `אתה מומחה לבסיסי נתונים של MongoDB. המטרה שלך היא לתרגם את בקשת החיפוש החופשית של המשתמש לשאילתת סינון (Query/Filter) חוקית עבור MongoDB / Mongoose.
            
              השדות הזמינים ב-Collection של המכרזים הם: 
              title, shortDescription, productType, budget, timeRequired, aiApplicationType, additionalDetails.

              חוקים קשיחים לבניית השאילתה:
              1. השתמש ב-$regex עם האופציה 'i' (case-insensitive) עבור חיפוש טקסט חופשי בשדות כגון title, shortDescription או additionalDetails כדי למצוא התאמות חלקיות.
              2. אם המשתמש מחפש מונח שיכול להתאים למספר שדות במקביל, השתמש באופרטור $or כדי לחפש בכולם.
              3. אם המשתמש מציין ערך שמתאים באופן מובהק לאחד מערכי ה-enum של productType או aiApplicationType, בצע התאמה ישירה לשדה זה.`
          },
          {
            role: "user",
            content: `בקשת החיפוש של המשתמש: "${userSearchText}"`
          }
        ],
        response_format: zodResponseFormat(SearchQueryZodSchema, "search_query_generation"),
      });

      const parsedData = response.choices[0].message.parsed;
      console.log(parsedData)

      if (!parsedData || !parsedData.query) {
        return {}; 
      }

      return parsedData.query;
    } catch (error) {
      console.error("Error in AIService.generateSearchQuery:", error);
      return {}; 
    }
  }
}