import { OpenAI } from 'openai';

// לקוח OpenAI יחיד, נוצר פעם אחת בעת טעינת המודול - לא בכל קריאה לפונקציה.
// (לפני כן, נוצרו 3 מופעים נפרדים של OpenAI בקובץ postController.ts,
// אחד מהם אפילו לא היה בשימוש בכלל)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * הופך טקסט לוקטור מספרי (embedding), לשימוש בחיפוש סמנטי של פוסטים דומים.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('OpenAI Embedding Error:', error);
    throw new Error('Failed to generate embedding from OpenAI');
  }
}

/**
 * משפר את הניסוח של תוכן פוסט קיים.
 */
export async function refineContent(content: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 500,
    messages: [
      {
        role: 'system',
        content: 'אתה עוזר עריכה מקצועי בפורום פיתוח תוכנה. תפקידך לשפר את הניסוח, לתקן שגיאות כתיב בעברית, ולסדר קטעי קוד בתוך בלוקים מתאימים של Markdown. אל תוסיף מידע חדש ואל תאריך את הפוסט סתם.'
      },
      {
        role: 'user',
        content: `אנא שפר את הניסוח של הטקסט הבא והחזר לי רק את הטקסט המעובד והמשופר: \n\n${content}`
      }
    ]
  });
  return response.choices[0].message.content?.trim() || '';
}

/**
 * מציע עד 3 כותרות מתאימות לתוכן פוסט.
 */
export async function suggestTitles(content: string): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 150,
    messages: [
      {
        role: 'system',
        content: 'אתה עוזר כתיבה לפורום טכנולוגי. החזר אך ורק אובייקט JSON תקין (ללא סימני Markdown מסביב).'
      },
      {
        role: 'user',
        content: `נתח את הטקסט הבא והצע לו 3 אופציות לכותרות קצרות ומושכות בעברית המתאימות לפוסט. החזר מבנה JSON בדיוק כך: {"titles": ["אופציה 1", "אופציה 2", "אופציה 3"]}. הנה הטקסט: \n\n${content}`
      }
    ],
    response_format: { type: 'json_object' }
  });
  const data = JSON.parse(response.choices[0].message.content || '{}');
  return data.titles || [];
}

/**
 * מחלץ עד 3 תגיות נושא רלוונטיות מתוך תוכן פוסט.
 */
export async function suggestTags(content: string): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 60,
    messages: [
      {
        role: 'system',
        content: 'אתה עוזר מקצועי לייצור תגיות נושא עבור פורום. תפקידך לחלץ מהטקסט עד 3 מילות מפתח קצרות, מדויקות ורלוונטיות ביותר המייצגות את לב הנושא (בעברית או באנגלית). עליך להחזיר אך ורק אובייקט JSON תקין ומדויק בפורמט הבא: {"tags": ["תגית1", "תגית2", "תגית3"]}, ללא סימני Markdown וללא שום טקסט נלווה.'
      },
      {
        role: 'user',
        content: `חלץ עד 3 תגיות נושא מתאימות עבור הטקסט הבא: \n\n${content}`
      }
    ],
    response_format: { type: 'json_object' }
  });
  const data = JSON.parse(response.choices[0].message.content || '{}');
  return data.tags || [];
}

/**
 * מייצר אובייקט פוסט מלא (כותרת, תוכן, קטגוריה, תגיות) לפרסום אוטומטי
 * על ידי הבוט היומי, כשאין פעילות אורגנית בפורום.
 */
export interface BotPostIdea {
  title: string;
  content: string;
  category: string;
  tags: string[];
}

export async function generateDailyPostIdea(): Promise<BotPostIdea> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 600,
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
    response_format: { type: 'json_object' }
  });

  const parsed = JSON.parse(response.choices[0].message.content || '{}');

  if (!parsed.title || !parsed.content) {
    throw new Error('התקבל מידע חסר מהבינה המלאכותית');
  }

  return {
    title: parsed.title,
    content: parsed.content,
    category: parsed.category || 'פיתוח',
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
  };
}