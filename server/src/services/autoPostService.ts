import cron from 'node-cron';
import Post from '../models/Post';
import { getEmbedding, generateDailyPostIdea } from './aiService';
import { resolveOrCreateTagsByNames } from './tagService';

/**
 * פונקציה ראשית המאתחלת את הבוט האוטומטי בשרת
 */
export const initializeAutoPostBot = () => {
  // תזמון קבוע: בכל יום בדיוק בשעה 10:00 בבוקר
  cron.schedule('0 10 * * *', async () => {
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
        const holidayData = await holidayResponse.json();

        // בדיקה האם התאריך הנוכחי מוגדר כ-Yom Tov (יום טוב / אסור במלאכה) או ערב חג
        const isRestrictedDay = holidayData.items?.some((item: any) => {
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