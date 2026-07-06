import { OpenAI } from 'openai';

export const geminiClient = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
  maxRetries: 0, // ✅ אנחנו מנהלים את ה-retry בעצמנו ב-callAI
  timeout: 30_000,
});

export const DEFAULT_GEMINI_MODEL  = "gemini-2.5-flash";
export const FALLBACK_GEMINI_MODEL = "gemini-2.0-flash-lite";