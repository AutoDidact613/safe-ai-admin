import cron from 'node-cron';
import Post from '../models/Post';
import { getEmbedding, generateDailyPostIdea } from './aiService';
import { resolveOrCreateTagsByNames } from './tagService';

const DEFAULT_AUTO_POST_BOT_HOUR = 10;

/**
 * שעת ההרצה היומית של הבוט, לפי AUTO_POST_BOT_HOUR ב-.env (0-23).
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
 * פונקציה ראשית המאתחלת את הבוט האוטומטי בשרת
 */
export const initializeAutoPostBot = () => {
  // תזמון: בכל יום בשעה עגולה שמוגדרת ב-AUTO_POST_BOT_HOUR (ברירת מחדל: 10:00 בבוקר)
  const hour = getAutoPostBotHour();
  console.log(`[BOT] הבוט האוטומטי מתוזמן לרוץ מדי יום בשעה ${hour}:00`);
  cron.schedule(`0 ${hour} * * *`, async () => {
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

        // פנייה ל-API חינמי של Hebcal המזהה חגים וערבי חגים רשמיים בארץ
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

        const holidayData = await holidayResponse.json() as HebcalResponse;

        // בדיקה האם התאריך הנוכחי מוגדר כ-Yom Tov (יום טוב / אסור במלאכה) או ערב חג
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
      } catch (apiError) {
        console.error('[BOT] שגיאה בתקשורת עם Hebcal, ליתר ביטחון נעצור את הריצה:', apiError);
        return;
      }

      // 3. הגנה שלישית: חיסכון משאבים ובדיקת פעילות אורגנית בבסיס הנתונים
      const lastPost = await Post.findOne().sort({ createdAt: -1 });

      if (lastPost) {
        const timeDifferenceMs = Date.now() - new Date(lastPost.createdAt).getTime();
        const hoursSinceLastPost = timeDifferenceMs / (1000 * 60 * 60);

        // אם משתמש אמיתי העלה פוסט ב-24 השעות האחרונות, הבוט עוצר ולא מבזבז טוקנים!
        if (hoursSinceLastPost < 24) {
          console.log(`[BOT] האתר פעיל אורגנית. פוסט אחרון עלה לפני ${hoursSinceLastPost.toFixed(1)} שעות. פנייה ל-AI בוטלה.`);
          return;
        }
      }

      console.log('[BOT] תנאי הפעלה אושרו: לא נמצאה פעילות ביממה האחרונה. פונה ל-OpenAI...');

      // 4. פנייה חסכונית וממוקדת ל-OpenAI ליצירת תוכן תכנותי בפורמט JSON קשוח
      const postIdea = await generateDailyPostIdea();

      // 5. הפעלת מנגנון ה-Embedding על הכותרת החדשה לצורך תאימות למנוע החיפוש הסמנטי שלך
      const titleVector = await getEmbedding(postIdea.title).catch((err) => {
        console.error('[BOT] כשל בהפקת embedding לכותרת, ממשיכים בלעדיו:', err);
        return [];
      });

      // 6. הפיכת שמות התגיות שה-AI הציע ל-ObjectId-ים אמיתיים במאגר התגיות
      // (לפני כן: ה-AI התבקש להציע תגיות, אבל הן נוצרו ונזרקו - הפוסט של
      // הבוט אף פעם לא קיבל תגיות בפועל)
      const tagIds = await resolveOrCreateTagsByNames(postIdea.tags).catch((err) => {
        console.error('[BOT] כשל בפתרון תגיות, הפוסט יפורסם בלי תגיות:', err);
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

    } catch (error) {
      console.error('[BOT] שגיאה כללית בהרצת מנגנון הבוט האוטומטי:', error);
    }
  });
};