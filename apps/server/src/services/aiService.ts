import { traceable } from 'langsmith/traceable';
import { wrapOpenAI } from 'langsmith/wrappers';
import { ZodSchema } from 'zod';
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
import { openaiClient, DEFAULT_OPENAI_MODEL, FALLBACK_OPENAI_MODEL } from '../config/openaiclient';

/**
 * הופך טקסט לוקטור מספרי (embedding), לשימוש בחיפוש סמנטי של פוסטים דומים בפורום.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    const embedding = response.data[0]?.embedding;
    if (!embedding) {
      throw new Error('OpenAI לא החזיר embedding בתשובה');
    }
    return embedding;
  } catch (error) {
    console.error('OpenAI Embedding Error:', error);
    throw new Error('Failed to generate embedding from OpenAI');
  }
}

/**
 * openaiClient מוגדר עם maxRetries: 0 (ראו config/openaiclient.ts) - הריטריי מנוהל
 * ידנית בכל קריאה. callAI כבר עושה fallback על 429/503, אבל הפונקציות הבאות
 * (refineContent/suggestTitles/suggestTags) קדמו ל-callAI ולא היה להן רשת ביטחון
 * דומה - שגיאת rate-limit או 503 חולפת מ-OpenAI הייתה קורסת ישר ל-500 למשתמש.
 * הפונקציה הזו מוסיפה ריטריי בודד עם השהיה קצרה במקרים האלה בלבד.
 */
async function createChatCompletionWithRetry(
  params: ChatCompletionCreateParamsNonStreaming
) {
  try {
    return await openaiClient.chat.completions.create(params);
  } catch (error: any) {
    const isTransient = error?.status === 429 || error?.status === 503;
    if (!isTransient) {
      throw error;
    }
    console.warn(`[aiService] ${error.status} מ-OpenAI, מנסה שוב אחרי השהיה קצרה...`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return await openaiClient.chat.completions.create(params);
  }
}

/**
 * משפר את הניסוח של תוכן פוסט קיים בפורום.
 */
export async function refineContent(content: string): Promise<string> {
  const response = await createChatCompletionWithRetry({
    model: FALLBACK_OPENAI_MODEL,
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
  return response.choices[0]?.message.content?.trim() || '';
}

/**
 * מציע עד 3 כותרות מתאימות לתוכן פוסט בפורום.
 */
export async function suggestTitles(content: string): Promise<string[]> {
  const response = await createChatCompletionWithRetry({
    model: FALLBACK_OPENAI_MODEL,
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
  const data = JSON.parse(response.choices[0]?.message.content || '{}');
  return data.titles || [];
}

/**
 * מחלץ עד 3 תגיות נושא רלוונטיות מתוך תוכן פוסט בפורום.
 */
export async function suggestTags(content: string): Promise<string[]> {
  const response = await createChatCompletionWithRetry({
    model: FALLBACK_OPENAI_MODEL,
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
  const data = JSON.parse(response.choices[0]?.message.content || '{}');
  return data.tags || [];
}

/**
 * אובייקט פוסט מלא (כותרת, תוכן, קטגוריה, תגיות) לפרסום אוטומטי על ידי
 * הבוט היומי, כשאין פעילות אורגנית בפורום.
 */
export interface BotPostIdea {
  title: string;
  content: string;
  category: string;
  tags: string[];
}

export async function generateDailyPostIdea(): Promise<BotPostIdea> {
  const response = await openaiClient.chat.completions.create({
    model: FALLBACK_OPENAI_MODEL,
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

  const parsed = JSON.parse(response.choices[0]?.message.content || '{}');

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

interface CallAIOptions<T> {
  userPrompt: string;
  systemPrompt: string;
  schema: ZodSchema<T>;
  temperature?: number;
  model?: string;
  callName?: string;
}

export async function callAI<T>(options: CallAIOptions<T>): Promise<T> {
  const { callName, ...rest } = options;

  // traceable עוטף את כל הלוגיקה — כולל wrapOpenAI בפנים
  // כך ב-LangSmith מופיע run אחד בשם callName עם nested span של קריאת OpenAI
  const traced = traceable(
    async function (opts: Omit<CallAIOptions<T>, 'callName'>): Promise<T> {
      const {
        userPrompt,
        systemPrompt,
        schema,
        temperature = 0.2,
        model = DEFAULT_OPENAI_MODEL,
      } = opts;

      // wrapOpenAI חייב להיות בתוך traceable כדי שהקריאה תופיע כ-nested span
      const tracedOpenAI = wrapOpenAI(openaiClient);

      const messages = [
        { role: "system" as const, content: systemPrompt },
        { role: "user"   as const, content: userPrompt   },
      ];

      try {
        const response = await tracedOpenAI.chat.completions.create({
          model,
          temperature,
          response_format: { type: "json_object" },
          messages,
        });
        const raw = response?.choices[0]?.message?.content ?? "{}";
        return schema.parse(JSON.parse(raw));

      } catch (error: any) {
        // ✅ fallback על 429 (rate limit) ועל 503 (service unavailable)
        const shouldFallback = (error?.status === 429 || error?.status === 503)
          && model !== FALLBACK_OPENAI_MODEL;

        if (shouldFallback) {
          console.warn(`[callAI] ${error.status} on ${model}, retrying with ${FALLBACK_OPENAI_MODEL}...`);

          const fallbackResponse = await tracedOpenAI.chat.completions.create({
            model: FALLBACK_OPENAI_MODEL,
            temperature,
            response_format: { type: "json_object" },
            messages,
          });
          const raw = fallbackResponse?.choices[0]?.message?.content ?? "{}";
          return schema.parse(JSON.parse(raw));
        }

        throw error;
      }
    },
    { name: callName ?? "callAI" }
  );

  return traced(rest);
}