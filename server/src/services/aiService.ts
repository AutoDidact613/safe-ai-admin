import { ZodSchema } from 'zod';
import { geminiClient, DEFAULT_GEMINI_MODEL, FALLBACK_GEMINI_MODEL } from '../config/geminiclient';

interface CallAIOptions<T> {
  userPrompt: string;
  systemPrompt: string;
  schema: ZodSchema<T>;
  temperature?: number;
  model?: string;
}

export async function callAI<T>(options: CallAIOptions<T>): Promise<T> {
  const {
    userPrompt,
    systemPrompt,
    schema,
    temperature = 0.2,
    model = DEFAULT_GEMINI_MODEL,
  } = options;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user"   as const, content: userPrompt   },
  ];

  try {
    const response = await geminiClient.chat.completions.create({
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
      && model !== FALLBACK_GEMINI_MODEL;

    if (shouldFallback) {
      console.warn(`[callAI] ${error.status} on ${model}, retrying with ${FALLBACK_GEMINI_MODEL}...`);

      const fallbackResponse = await geminiClient.chat.completions.create({
        model: FALLBACK_GEMINI_MODEL,
        temperature,
        response_format: { type: "json_object" },
        messages,
      });
      const raw = fallbackResponse?.choices[0]?.message?.content ?? "{}";
      return schema.parse(JSON.parse(raw));
    }

    throw error;
  }
}