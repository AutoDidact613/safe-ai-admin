import logger from "../logger";

export interface TokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  input_tokens?: number;  // For Responses API
  output_tokens?: number; // For Responses API
}

export interface ModelPricing {
  input: number;
  output: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI GPT-5.4 models
  "openai/gpt-5.4": {
    input: 0.01 / 1000,
    output: 0.03 / 1000,
  },
  "openai/gpt-5.4-mini": {
    input: 0.00025 / 1000,
    output: 0.002 / 1000,
  },
  "openai/gpt-5.4-nano": {
    input: 0.00005 / 1000,
    output: 0.0004 / 1000,
  },
  "openai/gpt-4o-mini": {
    input: 0.00015 / 1000,
    output: 0.0006 / 1000,
  },
  
  // OpenAI O3 models
  "openai/o3-pro": {
    input: 0.02 / 1000,
    output: 0.06 / 1000,
  },
  "openai/o3": {
    input: 0.015 / 1000,
    output: 0.045 / 1000,
  },
  "openai/o3-mini": {
    input: 0.001 / 1000,
    output: 0.003 / 1000,
  },
  
  // Anthropic Claude 4 models
  "anthropic/claude-opus-4-6": {
    input: 0.015 / 1000,
    output: 0.075 / 1000,
  },
  "anthropic/claude-sonnet-4-6": {
    input: 0.003 / 1000,
    output: 0.015 / 1000,
  },
  "anthropic/claude-haiku-4-5": {
    input: 0.0008 / 1000,
    output: 0.004 / 1000,
  },
  
  // Google Gemini 3 models
  "gemini/gemini-3.1-pro": {
    input: 0.00125 / 1000,
    output: 0.005 / 1000,
  },
  "gemini/gemini-3-flash": {
    input: 0.000075 / 1000,
    output: 0.0003 / 1000,
  },
  "gemini/gemini-3.1-flash-lite": {
    input: 0.00001 / 1000,
    output: 0.00004 / 1000,
  },
  
  // Google Gemini 2.5 models
  "gemini/gemini-2.5-pro": {
    input: 0.00125 / 1000,
    output: 0.005 / 1000,
  },
  "gemini/gemini-2.5-flash": {
    input: 0.000075 / 1000,
    output: 0.0003 / 1000,
  },
  "gemini/gemini-2.5-flash-lite": {
    input: 0.00001 / 1000,
    output: 0.00004 / 1000,
  },
  
  // Groq models (most are free/very cheap)
  "groq/groq/compound": {
    input: 0.0 / 1000,
    output: 0.0 / 1000,
  },
  "groq/groq/compound-mini": {
    input: 0.0 / 1000,
    output: 0.0 / 1000,
  },
  "groq/llama-3.1-8b-instant": {
    input: 0.0 / 1000,
    output: 0.0 / 1000,
  },
  "groq/llama-3.3-70b-versatile": {
    input: 0.0 / 1000,
    output: 0.0 / 1000,
  },
  "groq/openai/gpt-oss-120b": {
    input: 0.0 / 1000,
    output: 0.0 / 1000,
  },
  "groq/openai/gpt-oss-20b": {
    input: 0.0 / 1000,
    output: 0.0 / 1000,
  },
  "groq/meta-llama/llama-4-scout-17b-16e-instruct": {
    input: 0.0 / 1000,
    output: 0.0 / 1000,
  },
  "groq/qwen/qwen3-32b": {
    input: 0.0 / 1000,
    output: 0.0 / 1000,
  },

  // OpenAI Image Generation - DALL-E
  "openai/dall-e-3": {
    input: 0.04,  // Standard 1024x1024
    output: 0,
  },
  "openai/dall-e-2": {
    input: 0.02,  // Standard 1024x1024
    output: 0,
  },

  // OpenAI Audio - TTS
  "openai/tts-1": {
    input: 0.015 / 1000,  // per 1K characters
    output: 0,
  },
  "openai/tts-1-hd": {
    input: 0.030 / 1000,  // per 1K characters
    output: 0,
  },

  // OpenAI Audio - Whisper
  "openai/whisper-1": {
    input: 0.006 / 60,  // per minute
    output: 0,
  },
};

/**
 * Normalizes token usage from different API formats
 * Handles both Chat Completions (prompt_tokens/completion_tokens) 
 * and Responses API (input_tokens/output_tokens)
 */
export function normalizeTokenUsage(usage: TokenUsage | null | undefined): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} {
  if (!usage) {
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }

  // Handle Responses API format (input_tokens/output_tokens)
  if (usage.input_tokens !== undefined || usage.output_tokens !== undefined) {
    const promptTokens = usage.input_tokens ?? 0;
    const completionTokens = usage.output_tokens ?? 0;
    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };
  }

  // Handle Chat Completions format (prompt_tokens/completion_tokens)
  const promptTokens = usage.prompt_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? 0;
  const totalTokens = usage.total_tokens ?? (promptTokens + completionTokens);

  return { promptTokens, completionTokens, totalTokens };
}

/**
 * Calculates cost from token usage for text-based models
 */
export function calculateCostFromTokens(
  usage: TokenUsage | null | undefined,
  model: string,
): number {
  const pricing = MODEL_PRICING[model];

  if (!usage) {
    logger.warn(`[calculateCostFromTokens] No usage data provided for model: ${model}`);
    return 0;
  }

  if (!pricing) {
    logger.warn(`[calculateCostFromTokens] No pricing found for model: ${model}. Available models:`, Object.keys(MODEL_PRICING).slice(0, 5));
    return 0;
  }

  const normalized = normalizeTokenUsage(usage);
  const calculatedCost = 
    normalized.promptTokens * pricing.input + 
    normalized.completionTokens * pricing.output;

  logger.info(
    `[calculateCostFromTokens] Model: ${model}, Input: ${normalized.promptTokens}, Output: ${normalized.completionTokens}, Cost: $${calculatedCost.toFixed(6)}`
  );

  return calculatedCost;
}

/**
 * Calculates cost for image generation based on model and size
 */
export function calculateImageCost(model: string, size: string = "1024x1024", quality: string = "standard", n: number = 1): number {
  const normalizedModel = model.includes("/") ? model : `openai/${model}`;
  
  let costPerImage = 0;

  if (normalizedModel === "openai/dall-e-3") {
    if (quality === "hd") {
      if (size === "1024x1024") costPerImage = 0.08;
      else if (size === "1024x1792" || size === "1792x1024") costPerImage = 0.12;
      else costPerImage = 0.08; // default
    } else {
      // standard quality
      if (size === "1024x1024") costPerImage = 0.04;
      else if (size === "1024x1792" || size === "1792x1024") costPerImage = 0.08;
      else costPerImage = 0.04; // default
    }
  } else if (normalizedModel === "openai/dall-e-2") {
    if (size === "1024x1024") costPerImage = 0.02;
    else if (size === "512x512") costPerImage = 0.018;
    else if (size === "256x256") costPerImage = 0.016;
    else costPerImage = 0.02; // default
  }

  const totalCost = costPerImage * n;
  logger.info(`[calculateImageCost] Model: ${normalizedModel}, Size: ${size}, Quality: ${quality}, Count: ${n}, Cost: $${totalCost.toFixed(6)}`);
  
  return totalCost;
}

/**
 * Calculates cost for TTS based on character count
 */
export function calculateTTSCost(model: string, text: string): number {
  const normalizedModel = model.includes("/") ? model : `openai/${model}`;
  const pricing = MODEL_PRICING[normalizedModel];

  if (!pricing) {
    logger.warn(`[calculateTTSCost] No pricing found for model: ${normalizedModel}`);
    return 0;
  }

  const charCount = text.length;
  const cost = charCount * pricing.input;

  logger.info(`[calculateTTSCost] Model: ${normalizedModel}, Characters: ${charCount}, Cost: $${cost.toFixed(6)}`);
  
  return cost;
}

/**
 * Calculates cost for Whisper transcription based on audio duration
 */
export function calculateWhisperCost(durationSeconds: number): number {
  const pricing = MODEL_PRICING["openai/whisper-1"];
  
  if (!pricing) {
    logger.warn(`[calculateWhisperCost] No pricing found for whisper-1`);
    return 0;
  }

  const durationMinutes = durationSeconds / 60;
  const cost = durationMinutes * pricing.input;

  logger.info(`[calculateWhisperCost] Duration: ${durationSeconds}s (${durationMinutes.toFixed(2)}min), Cost: $${cost.toFixed(6)}`);
  
  return cost;
}
