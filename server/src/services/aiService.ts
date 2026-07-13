import { traceable } from 'langsmith/traceable';
import { wrapOpenAI } from 'langsmith/wrappers';
import { ZodSchema } from 'zod';
import { openaiClient, DEFAULT_OPENAI_MODEL, FALLBACK_OPENAI_MODEL } from '../config/openaiclient';

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