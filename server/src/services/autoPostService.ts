import cron from 'node-cron';
import Post from '../models/Post';
import { OpenAI } from 'openai';

/**
 * פונקציית עזר פרטית להפיכת כותרת הפוסט האוטומטי לוקטור מספרי
 */
async function getBotEmbedding(text: string): Promise<number[]> {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Bot Embedding Error:', error);
    return [];
  }
}

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

      // המשך הלוגיקה מופיע בחלק 2...

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
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const aiResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // המודל הזול והמתאים ביותר למשימה
        max_tokens: 600,      // חסימת בזבוז: מגבילים את אורך התשובה לפוסט ממוצע וממוקד
        messages: [
          {
            role: 'system',
            content: 'אתה מתכנת בכיר ומנהל קהילת פיתוח תוכנה. תפקידך להעשיר את הפורום בתוכן איכותי כאשר הוא יבש.'
          },
          {
            role: 'user',
            content: 'תחשוב על טיפ קוד ייחודי, אתגר תכנות מעניין, או הסבר קצר על טכנולוגיה אקטואלית (למשל React, TypeScript, Node.js, AI פיתוח). החזר לי אובייקט JSON בלבד, ללא סימני markdown של קוד, המכיל את השדות הבאים בעברית: "title" (כותרת מושכת), "content" (תוכן הפוסט בצורה מקצועית ועשירה), "category" (הערך "פיתוח"), "tags" (מערך של 3 תגיות טקסט קשורות).'
          }
        ],
        response_format: { type: 'json_object' } // מאלץ את ה-AI להחזיר רק JSON תקין
      });

      const parsedData = JSON.parse(aiResponse.choices[0].message.content || '{}');

      if (!parsedData.title || !parsedData.content) {
        throw new Error('התקבל מידע חסר מהבינה המלאכותית');
      }

      // 5. הפעלת מנגנון ה-Embedding על הכותרת החדשה לצורך תאימות למנוע החיפוש הסמנטי שלך
      const titleVector = await getBotEmbedding(parsedData.title);

      const botUserId = process.env.BOT_USER_ID;
      if (!botUserId) {
        console.error('[BOT] שגיאה: לא הוגדר BOT_USER_ID בקובץ ה-.env');
        return;
      }

      // 6. שמירת הפוסט האוטומטי בבסיס הנתונים תחת פרופיל הבוט
      const newBotPost = new Post({
        title: parsedData.title,
        content: parsedData.content,
        category: parsedData.category || 'פיתוח',
        author: botUserId,
        titleEmbedding: titleVector
      });

      await newBotPost.save();
      console.log(`[BOT] הפוסט האוטומטי פורסם בהצלחה! כותרת: "${parsedData.title}"`);

    } catch (error) {
      console.error('[BOT] שגיאה כללית בהרצת מנגנון הבוט האוטומטי:', error);
    }
  });
};