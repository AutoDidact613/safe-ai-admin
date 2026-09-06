import cron from 'node-cron';
import Post from '../models/Post';
import { getEmbedding, generateDailyPostIdea } from './aiService';
import { resolveOrCreateTagsByNames } from './tagService';
import logger from '../logger';

const DEFAULT_AUTO_POST_BOT_HOUR = 10;

type PostFrequency = 'daily' | 'weekly' | 'monthly';

/**
 * שעת ההרצה של הבוט, לפי AUTO_POST_BOT_HOUR ב-.env (0-23).
 * אם המשתנה לא מוגדר או לא תקין, נופלים חזרה לשעה 10:00.
 */
function getAutoPostBotHour(): number {
  const configured = process.env.AUTO_POST_BOT_HOUR;
  if (configured === undefined) {
    return DEFAULT_AUTO_POST_BOT_HOUR;
  }

  const hour = parseInt(configured, 10);
  if (Number.isNaN(hour) || hour < 0 || hour > 23) {
    console.error(`[BOT] AUTO_POST_BOT_HOUR="${configured}" אינו תקין (צריך מספר בין 0 ל-23), נופל חזרה לשעה ${DEFAULT_AUTO_POST_BOT_HOUR}:00`);
    return DEFAULT_AUTO_POST_BOT_HOUR;
  }

  return hour;
}

/**
 * תדירות ההרצה של הבוט, לפי AUTO_POST_FREQUENCY ב-.env (daily, weekly, monthly).
 * ברירת מחדל: daily (יומי).
 */
function getAutoPostFrequency(): PostFrequency {
  const configured = process.env.AUTO_POST_FREQUENCY?.trim().toLowerCase();
  if (configured === 'weekly') return 'weekly';
  if (configured === 'monthly') return 'monthly';
  return 'daily';
}

/**
 * פונקציה ראשית המאתחלת את הבוט האוטומטי בשרת
 */
export const initializeAutoPostBot = () => {
  const hour = getAutoPostBotHour();
  const frequency = getAutoPostFrequency();

  // 1. הגדרת ביטוי ה-Cron וסף הימים לבדיקת פעילות לפי התדירות הנבחרת
  let cronExpression: string;
  let requiredIntervalDays: number;

  switch (frequency) {
    case 'monthly':
      cronExpression = `0 ${hour} 1 * *`; // ריצה ב-1 לכל חודש בשעה שנבחרה
      requiredIntervalDays = 30;
      break;
    case 'weekly':
      cronExpression = `0 ${hour} * * 0`; // ריצה בכל יום ראשון בשעה שנבחרה
      requiredIntervalDays = 7;
      break;
    case 'daily':
    default:
      cronExpression = `0 ${hour} * * *`; // ריצה יומית בכל יום בשעה שנבחרה
      requiredIntervalDays = 1;
      break;
  }

  console.log(`[BOT] הבוט האוטומטי מתוזמן לרוץ בתדירות ${frequency} בשעה ${hour}:00 (ביטוי cron: ${cronExpression})`);

  cron.schedule(cronExpression, async () => {
    try {
      console.log('[BOT] מתעורר ומריץ בדיקות פעילות והלכה...');

      // 1. הגנה ראשונה: בדיקה אם היום יום שבת (שבת = אינדקס 6 במערך ימי השבוע)
      const currentDay = new Date().getDay();
      if (currentDay === 6) {
        console.log('[BOT] היום יום שבת קודש. המנגנון מושבת לחלוטין.');
        return;
      }

      // 2. הגנה שנייה: בדיקה מול API חיצוני אם היום חג או ערב חג בישראל
      try {
        const todayIso = new Date().toISOString().split('T')[0]; // פורמט YYYY-MM-DD

        // פנייה ל-API של Hebcal
        const holidayResponse = await fetch(
          `https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=off&mod=off&nx=off&year=now&month=now&ss=off&mf=off&c=off`
        );
        interface HebcalItem {
          date: string;
          yomtov?: boolean;
          category?: string;
          title?: string;
        }
        interface HebcalResponse {
          items?: HebcalItem[];
        }

        const holidayData = (await holidayResponse.json()) as HebcalResponse;

        // בדיקה האם התאריך הנוכחי מוגדר כ-Yom Tov או ערב חג
        const isRestrictedDay = holidayData.items?.some((item: HebcalItem) => {
          const isSameDate = item.date === todayIso;
          const isYomTov = item.yomtov === true;
          const isErevHoliday = item.category === 'roshchodesh' || item.title?.startsWith('Erev');

          return isSameDate && (isYomTov || isErevHoliday);
        });

        if (isRestrictedDay) {
          console.log('[BOT] היום חג או ערב חג בישראל. המנגנון מושבת לטובת קדושת היום.');
          return;
        }
      } catch (apiError: any) {
        // ריצה מתוזמנת (cron) - אין req, ולכן אין userId/organizationId/requestId אמיתיים לצרף
        logger.error('Failed to check Hebcal holiday calendar', {
          error: apiError.message,
          stack: apiError.stack,
          userId: undefined,
          organizationId: undefined,
          requestId: undefined,
        });
        return;
      }

      // 3. הגנה שלישית: חיסכון משאבים ובדיקת פעילות אורגנית בבסיס הנתונים בהתאם לתדירות
      const lastPost = await Post.findOne().sort({ createdAt: -1 });

      if (lastPost) {
        const timeDifferenceMs = Date.now() - new Date(lastPost.createdAt).getTime();
        const daysSinceLastPost = timeDifferenceMs / (1000 * 60 * 60 * 24);

        if (daysSinceLastPost < requiredIntervalDays) {
          console.log(
            `[BOT] האתר פעיל אורגנית. פוסט אחרון עלה לפני ${daysSinceLastPost.toFixed(1)} ימים (הסף הנדרש לתדירות ${frequency}: ${requiredIntervalDays} ימים). פנייה ל-AI בוטלה.`
          );
          return;
        }
      }

      console.log(`[BOT] תנאי הפעלה אושרו: לא נמצאה פעילות ב-${requiredIntervalDays} הימים האחרונים. פונה ל-OpenAI...`);

      // 4. פנייה חסכונית וממוקדת ל-OpenAI ליצירת תוכן תכנותי בפורמט JSON
      const postIdea = await generateDailyPostIdea();

      // 5. הפעלת מנגנון ה-Embedding על הכותרת החדשה לצורך תאימות למנוע החיפוש הסמנטי
      const titleVector = await getEmbedding(postIdea.title).catch((err: any) => {
        logger.error('Failed to generate title embedding for bot post', {
          error: err.message,
          stack: err.stack,
          userId: undefined,
          organizationId: undefined,
          requestId: undefined,
          title: postIdea.title,
        });
        return [];
      });

      // 6. הפיכת שמות התגיות שה-AI הציע ל-ObjectId-ים אמיתיים במאגר התגיות
      const tagIds = await resolveOrCreateTagsByNames(postIdea.tags).catch((err: any) => {
        logger.error('Failed to resolve tags for bot post', {
          error: err.message,
          stack: err.stack,
          userId: undefined,
          organizationId: undefined,
          requestId: undefined,
          tags: postIdea.tags,
        });
        return [];
      });

      const botUserId = process.env.BOT_USER_ID;
      if (!botUserId) {
        console.error('[BOT] שגיאה: לא הוגדר BOT_USER_ID בקובץ ה-.env');
        return;
      }

      // 7. שמירת הפוסט האוטומטי בבסיס הנתונים תחת פרופיל הבוט
      const newBotPost = new Post({
        title: postIdea.title,
        content: postIdea.content,
        category: postIdea.category,
        tags: tagIds,
        author: botUserId,
        titleEmbedding: titleVector
      });

      await newBotPost.save();
      console.log(`[BOT] הפוסט האוטומטי פורסם בהצלחה! כותרת: "${postIdea.title}", תגיות: ${tagIds.length}`);

    } catch (error: any) {
      logger.error('Failed to run daily auto-post bot', {
        error: error.message,
        stack: error.stack,
        userId: undefined,
        organizationId: undefined,
        requestId: undefined,
      });
    }
  });
};