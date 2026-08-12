import { OpenAI } from 'openai';

export const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 0, // ✅ אנחנו מנהלים את ה-retry בעצמנו ב-callAI
  timeout: 30_000,
});

export const DEFAULT_OPENAI_MODEL  = "gpt-4o";
export const FALLBACK_OPENAI_MODEL = "gpt-4o-mini";