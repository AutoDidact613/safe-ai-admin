import { AIProfile } from "../models";
import { decryptSecret } from "../utils/crypto";
import {
  getProviderKeyByUserAndProvider,
  getSystemProviderKey,
  getProviderKeyByOrgAndProvider,
} from "../repositories/providerKeyRepository";
import { getOrganizationForUser } from "./organizationService";
import { OpenAI } from "openai";
import { logUsage } from "./usageTracker";
import { isProviderKeyFree } from "../middleware/rateLimiter";
import {
  calculateCostFromTokens,
  calculateImageCost,
  calculateTTSCost,
  calculateWhisperCost,
  normalizeTokenUsage,
} from "../utils/costs";
import logger from "../logger";
import { buildSystemPrompt } from "./promptBuilder";
import { guardInput } from "../workflows/proxyFilter";

function getProviderFromModel(model: string): string {
  if (model.includes("/")) {
    return model.split("/")[0] || "unknown";
  }

  const lower = model.toLowerCase();

  if (lower.startsWith("gpt") || lower.startsWith("o3")) return "openai";
  if (lower.startsWith("claude")) return "anthropic";
  if (lower.startsWith("gemini")) return "google";
  if (
    lower.startsWith("llama") ||
    lower.startsWith("groq") ||
    lower.startsWith("qwen")
  )
    return "groq";

  if (
    lower.startsWith("dall-e") ||
    lower.startsWith("tts") ||
    lower.startsWith("whisper")
  )
    return "openai";

  throw new Error(`Unsupported model: ${model}`);
}

function normalizeModelName(model: string, provider: string): string {
  if (model.includes("/")) {
    return model;
  }

  return `${provider}/${model}`;
}

export async function resolveProviderKeyForUser(
  user: any,
  provider: string,
  model?: string,
) {
  if (user.mode === "MANAGED_ORG") {
    const organization = await getOrganizationForUser(user._id.toString());
    if (!organization) {
      throw new Error("User is not linked to an organization");
    }

    const allowedModels = (organization as any).settings?.allowedModels;
    if (model && allowedModels?.length && !allowedModels.includes(model)) {
      throw new Error(`Model not allowed for your organization: ${model}`);
    }

    return getProviderKeyByOrgAndProvider(
      (organization as any)._id.toString(),
      provider,
    );
  }

  if (user.mode === "MANAGED") {
    return getSystemProviderKey(provider);
  }

  return getProviderKeyByUserAndProvider(user._id.toString(), provider);
}

function getLiteLLMCost(response: Response, data?: any): number | undefined {
  const headerCost =
    response.headers.get("x-litellm-response-cost-original") ||
    response.headers.get("x-litellm-response-cost");

  if (headerCost) {
    const parsed = Number(headerCost);
    if (!Number.isNaN(parsed)) {
      logger.info(`💰 Using LiteLLM header cost: $${parsed}`);
      return parsed;
    }
  }

  const bodyCost = data?._hidden_params?.response_cost ?? data?.response_cost;

  if (bodyCost !== undefined && bodyCost !== null) {
    const parsed = Number(bodyCost);
    if (!Number.isNaN(parsed)) {
      logger.info(`💰 Using LiteLLM body cost: $${parsed}`);
      return parsed;
    }
  }

  return undefined;
}

function extractTextFromMessageContent(content: any): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part: any) => {
        if (part.type === "text" || part.type === "input_text") {
          return part.text || "";
        }

        if (part.type === "tool_result") {
          if (typeof part.content === "string") return part.content;
          if (Array.isArray(part.content)) {
            return part.content
              .map((c: any) => (typeof c === "string" ? c : c?.text || ""))
              .join("\n");
          }
          return "";
        }

        if (part.type === "tool_use") {
          return `[tool_use: ${part.name || "unknown"}] ${JSON.stringify(part.input || {})}`;
        }

        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

function extractLastMessagesForFilter(messages: any[], count = 3): string {
  return messages
    .slice(-count)
    .map((msg: any, index: number) => {
      const text = extractTextFromMessageContent(msg.content).trim();
      if (!text) return "";

      return `Message ${index + 1} (${msg.role || "unknown"}):\n${text}`;
    })
    .filter(Boolean)
    .join("\n\n---\n\n");
}

function isAgentNoiseForFilter(text: string): boolean {
  const lower = text.toLowerCase();

  return (
    lower.includes("<system-reminder>") ||
    lower.includes("</system-reminder>") ||
    lower.includes("todowrite tool") ||
    lower.includes("you did not use a tool") ||
    lower.includes("<environment_details>") ||
    lower.includes("<tool_use_instructions>") ||
    lower.includes("tool output for") ||
    lower.includes("attempt_completion") ||
    lower.includes("ask_followup_question") ||
    lower.includes("current mode act mode") ||
    lower.includes("visible files") ||
    lower.includes("open tabs") ||
    lower.includes("tool_name:") ||
    lower.includes("begin_arg:") ||
    lower.includes("end_arg")
  );
}

function extractUserIntentForFilter(messages: any[], count = 3): string {
  const cleanUserMessages = messages
    .filter((msg: any) => msg.role === "user")
    .map((msg: any) => {
      return {
        role: msg.role || "user",
        text: extractTextFromMessageContent(msg.content).trim(),
      };
    })
    .filter((msg) => msg.text)
    .filter((msg) => !isAgentNoiseForFilter(msg.text));

  const selectedMessages =
    cleanUserMessages.length > 0
      ? cleanUserMessages.slice(-count)
      : messages
          .filter((msg: any) => msg.role === "user" || msg.role === "assistant")
          .map((msg: any) => {
            return {
              role: msg.role || "unknown",
              text: extractTextFromMessageContent(msg.content).trim(),
            };
          })
          .filter((msg) => msg.text)
          .filter((msg) => !isAgentNoiseForFilter(msg.text))
          .slice(-count);

  logger.info(`Hello!!!!!!!!!!!!!!:`);
  selectedMessages.forEach((msg, index) =>
    logger.info(
      `Message ${index + 1} (${msg.role}): ${msg.text.substring(0, 100)}...`,
    ),
  );

  return selectedMessages
    .map((msg, index) => {
      return `Message ${index + 1} (${msg.role}):\n${msg.text}`;
    })
    .join("\n\n---\n\n");
}

function extractLastInputsForResponses(input: any[], count = 3): string {
  return input
    .slice(-count)
    .map((item: any, index: number) => {
      let text = "";

      if (typeof item.content === "string") {
        text = item.content;
      } else if (Array.isArray(item.content)) {
        text = item.content
          .filter((p: any) => p.type === "text" || p.type === "input_text")
          .map((p: any) => p.text || "")
          .join("\n");
      }

      if (!text.trim()) return "";

      return `Message ${index + 1} (${item.role || "unknown"}):\n${text}`;
    })
    .filter(Boolean)
    .join("\n\n---\n\n");
}


export async function proxyChatCompletion(user: any, body: any) {
  const model = body.model;

  if (!model) {
    throw new Error("Model is required");
  }

  const provider = getProviderFromModel(model);

  let providerKey;

  const providerKeyDoc = await resolveProviderKeyForUser(user, provider, model);

  if (!providerKeyDoc) {
    throw new Error(`Provider key missing for provider: ${provider}`);
  }

  const providerApiKey = decryptSecret(providerKeyDoc.apiKeyEncrypted);

  const isFree = isProviderKeyFree(user, providerKeyDoc._id.toString());

  const profile = await AIProfile.findById(user.profileId);

  if (!profile) {
    throw new Error("Profile not found");
  }

  const userQuery = extractLastMessagesForFilter(body.messages || [], 3);

  if (userQuery && userQuery.trim() !== "") {
    const blocked = await guardInput({
      profile,
      text: userQuery,
      model,
      api: "chat",
      stream: body.stream,
    });
    if (blocked) return blocked;
  } else {
    logger.info(
      "⚠️ No textual content to moderate (chat) - skipping guardInput",
    );
  }

  const systemPrompt = await buildSystemPrompt(profile);

  const messages = [...(body.messages || [])];

  if (systemPrompt) {
    messages.unshift({
      role: "system",
      content: systemPrompt,
    });
  }

  const decryptedLiteLLMKey = decryptSecret(user.litellmKeyEncrypted);
  if (!decryptedLiteLLMKey) {
    throw new Error("LiteLLM Proxy Key could not be decrypted or is missing");
  }

  const startTime = Date.now();
  const litellmResponse = await fetch(
    `${process.env.LITELLM_PROXY_URL}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${decryptedLiteLLMKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: body.stream ?? false,
        api_key: providerApiKey,
      }),
    },
  );

  if (!litellmResponse.ok) {
    const errorText = await litellmResponse.text();

    logger.error("❌ LiteLLM Error Response:", {
      error: errorText,
      stack: errorText,
    });
    throw new Error(`LiteLLM request failed: ${errorText}`);
  }

  if (body.stream) {
    logger.debug("✅ Returning stream");

    const reader = litellmResponse.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get stream reader");
    }

    const decoder = new TextDecoder();
    const accumulatedUsage = {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };
    let responseId = "streaming";
    let responseCost = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              const responseTime = Date.now() - startTime;
              logger.info(
                "📊 Logging usage for streaming request, user:",
                user._id,
              );
              logger.info(
                "📊 Accumulated tokens:",
                accumulatedUsage.total_tokens,
              );

              const normalizedModel = normalizeModelName(model, provider);
              let streamCost = responseCost;
              if (!streamCost || streamCost === 0) {
                streamCost = calculateCostFromTokens(
                  accumulatedUsage,
                  normalizedModel,
                );
                logger.info(
                  `📊 LiteLLM didn't provide cost, calculated from tokens using model: ${normalizedModel}: $${streamCost.toFixed(6)}`,
                );
              } else {
                logger.info(
                  `📊 Using LiteLLM provided cost: $${streamCost.toFixed(6)}`,
                );
              }

              logUsage({
                userId: user._id.toString(),
                profileId: user.profileId?.toString(),
                provider,
                modelName: model,
                mode: user.mode,
                response: {
                  id: responseId,
                  usage: accumulatedUsage,
                  _hidden_params: { response_cost: responseCost },
                },
                responseTime,
                success: true,
                isFree,
                cost: streamCost,
              }).catch((err) =>
                logger.error("❌ Failed to log streaming usage:", {
                  error: err.message,
                  stack: err.stack,
                }),
              );

              controller.close();
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim();
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);

                  if (parsed.usage) {
                    accumulatedUsage.prompt_tokens +=
                      parsed.usage.prompt_tokens || 0;
                    accumulatedUsage.completion_tokens +=
                      parsed.usage.completion_tokens || 0;
                    accumulatedUsage.total_tokens +=
                      parsed.usage.total_tokens || 0;
                  }
                  if (parsed._hidden_params?.response_cost) {
                    responseCost = parsed._hidden_params.response_cost;
                  }

                  if (parsed.id) {
                    responseId = parsed.id;
                  }
                } catch (e) {
                }
              }
            }

            controller.enqueue(value);
          }
        } catch (error: any) {
          logger.error("❌ Error in stream processing:", {
            error: error.message,
            stack: error.stack,
          });
          controller.error(error);
        }
      },
    });

    return stream;
  }

  const data: any = await litellmResponse.json();

  const normalizedModel = normalizeModelName(model, provider);
  let cost = getLiteLLMCost(litellmResponse, data);

  if (cost === undefined) {
    cost = calculateCostFromTokens(data.usage, normalizedModel);
    logger.info(
      `💰 LiteLLM cost missing, calculated from tokens using model: ${normalizedModel}: $${cost.toFixed(6)}`,
    );
  }

  logger.debug("✅ Response received from LiteLLM:");
  logger.info("- ID:", data.id);
  logger.info("- Model:", data.model);
  logger.info(
    "- Content:",
    data.choices?.[0]?.message?.content?.substring(0, 50) + "...",
  );
  logger.info("- Tokens:", data.usage?.total_tokens);

  const responseTime = Date.now() - startTime;
  logger.debug("📊 Logging usage for user:", user._id);
  try {
    await logUsage({
      userId: user._id.toString(),
      profileId: user.profileId?.toString(),
      provider,
      modelName: model,
      mode: user.mode,
      response: data,
      responseTime,
      success: true,
      isFree,
      cost,
    });
    logger.debug("✅ Usage logged successfully");
  } catch (logError) {
    logger.error("❌ Failed to log usage:", {
      error: logError instanceof Error ? logError.message : String(logError),
      stack: logError instanceof Error ? logError.stack : undefined,
    });
  }

  return data;
}

export async function proxyResponses(user: any, body: any) {
  const startTime = Date.now();
  const model = body.model;

  if (!model) throw new Error("Model is required");

  const provider = getProviderFromModel(model);

  const providerKeyDoc = await resolveProviderKeyForUser(user, provider, model);

  if (!providerKeyDoc)
    throw new Error(`Provider key missing for provider: ${provider}`);

  const providerApiKey = decryptSecret(providerKeyDoc.apiKeyEncrypted);
  const isFree = isProviderKeyFree(user, providerKeyDoc._id.toString());
  const decryptedLiteLLMKey = decryptSecret(user.litellmKeyEncrypted);

  if (!decryptedLiteLLMKey)
    throw new Error("LiteLLM Proxy Key could not be decrypted or is missing");

  const profile = await AIProfile.findById(user.profileId);
  if (!profile) throw new Error("Profile not found");

  const userQuery =
    typeof body.input === "string"
      ? body.input
      : Array.isArray(body.input)
        ? extractLastInputsForResponses(body.input, 3)
        : "";

  if (userQuery && userQuery.trim() !== "") {
    const blocked = await guardInput({
      profile,
      text: userQuery,
      model,
      api: "responses",
      stream: body.stream,
    });
    if (blocked) return blocked;
  } else {
    logger.info(
      "⚠️ No textual content to moderate (responses) - skipping guardInput",
    );
  }

  const systemPrompt = await buildSystemPrompt(profile);
  const requestBody: any = {
    ...body,
    api_key: providerApiKey,
  };

  if (systemPrompt && !requestBody.instructions) {
    requestBody.instructions = systemPrompt;
  }

  logger.debug("--- DEBUG RESPONSES REQUEST ---");
  logger.debug("🔑 Provider:", provider);
  logger.debug("🔑 Model:", model);
  logger.debug("🌊 Stream:", body.stream ?? false);

  const litellmResponse = await fetch(
    `${process.env.LITELLM_PROXY_URL}/v1/responses`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${decryptedLiteLLMKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    },
  );

  if (!litellmResponse.ok) {
    const errorText = await litellmResponse.text();
    logger.error("❌ LiteLLM Responses Error:", errorText);
    throw new Error(`LiteLLM responses request failed: ${errorText}`);
  }

  if (body.stream) {
    const reader = litellmResponse.body?.getReader();
    if (!reader) throw new Error("Failed to get stream reader");

    const decoder = new TextDecoder();
    const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    let responseId = "streaming";
    let responseCost = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              const responseTime = Date.now() - startTime;
              const normalizedModel = normalizeModelName(model, provider);
              const streamCost =
                responseCost || calculateCostFromTokens(usage, normalizedModel);

              logUsage({
                userId: user._id.toString(),
                profileId: user.profileId?.toString(),
                provider,
                modelName: model,
                mode: user.mode,
                response: {
                  id: responseId,
                  usage,
                  _hidden_params: { response_cost: responseCost },
                },
                responseTime,
                success: true,
                isFree,
                cost: streamCost,
              }).catch((err) =>
                logger.error(
                  "❌ Failed to log streaming responses usage:",
                  err,
                ),
              );

              controller.close();
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);

                if (
                  parsed.type === "response.completed" &&
                  parsed.response?.usage
                ) {
                  const u = parsed.response.usage;
                  usage.prompt_tokens = u.input_tokens || 0;
                  usage.completion_tokens = u.output_tokens || 0;
                  usage.total_tokens =
                    (u.input_tokens || 0) + (u.output_tokens || 0);
                }

                if (parsed._hidden_params?.response_cost) {
                  responseCost = parsed._hidden_params.response_cost;
                }

                if (parsed.response?.id || parsed.id) {
                  responseId = parsed.response?.id || parsed.id;
                }
              } catch (_) {

              }
            }

            controller.enqueue(value);
          }
        } catch (error: any) {
          logger.error("❌ Error in responses stream:", error.message);
          controller.error(error);
        }
      },
    });

    return stream;
  }

  const data: any = await litellmResponse.json();

  const usageNormalized = {
    prompt_tokens: data.usage?.input_tokens || 0,
    completion_tokens: data.usage?.output_tokens || 0,
    total_tokens:
      (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  };

  const normalizedModel = normalizeModelName(model, provider);
  let cost = getLiteLLMCost(litellmResponse, data);

  if (cost === undefined) {
    cost = calculateCostFromTokens(usageNormalized, normalizedModel);
    logger.info(
      `💰 LiteLLM cost missing, calculated from tokens: $${cost.toFixed(6)}`,
    );
  }

  logger.debug("✅ Responses API response received");
  logger.info("- ID:", data.id);
  logger.info("- Model:", data.model);
  logger.info("- Tokens:", usageNormalized.total_tokens);

  const responseTime = Date.now() - startTime;
  try {
    await logUsage({
      userId: user._id.toString(),
      profileId: user.profileId?.toString(),
      provider,
      modelName: model,
      mode: user.mode,
      response: { ...data, usage: usageNormalized },
      responseTime,
      success: true,
      isFree,
      cost,
    });
  } catch (logError: any) {
    logger.error("❌ Failed to log responses usage:", logError.message);
  }

  return data;
}

export async function proxyAnthropicMessages(user: any, body: any) {
  const startTime = Date.now();
  const model = body.model;

  if (!model) {
    throw new Error("Model is required");
  }

  const provider = getProviderFromModel(model);

  const providerKeyDoc = await resolveProviderKeyForUser(user, provider, model);

  if (!providerKeyDoc) {
    throw new Error(`Provider key missing for provider: ${provider}`);
  }

  const providerApiKey = decryptSecret(providerKeyDoc.apiKeyEncrypted);
  const isFree = isProviderKeyFree(user, providerKeyDoc._id.toString());

  const decryptedLiteLLMKey = decryptSecret(user.litellmKeyEncrypted);
  if (!decryptedLiteLLMKey) {
    throw new Error("LiteLLM Proxy Key could not be decrypted or is missing");
  }

  const profile = await AIProfile.findById(user.profileId);
  if (!profile) {
    throw new Error("Profile not found");
  }

  const userQuery = extractUserIntentForFilter(body.messages || [], 3);

  if (userQuery && userQuery.trim() !== "") {
    const blocked = await guardInput({
      profile,
      text: userQuery,
      model,
      api: "anthropic",
      stream: body.stream,
    });
    if (blocked) return blocked;
  } else {
    logger.info(
      "⚠️ No textual content to moderate (anthropic) - skipping guardInput",
    );
  }

  const systemPrompt = await buildSystemPrompt(profile);

  const requestBody: any = {
    ...body,
    model: normalizeModelName(model, provider),
    api_key: providerApiKey,
  };

  if (systemPrompt) {
    requestBody.system = body.system
      ? `${systemPrompt}\n\n${body.system}`
      : systemPrompt;
  }

  logger.debug("--- DEBUG ANTHROPIC MESSAGES REQUEST ---");
  logger.debug("🔑 Provider:", provider);
  logger.debug("🔑 Model:", requestBody.model);
  logger.debug("🌊 Stream:", body.stream ?? false);

  const litellmResponse = await fetch(
    `${process.env.LITELLM_PROXY_URL}/v1/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${decryptedLiteLLMKey}`,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestBody),
    },
  );

  if (!litellmResponse.ok) {
    const errorText = await litellmResponse.text();

    logger.error("❌ LiteLLM Anthropic Messages Error:", {
      error: errorText,
      stack: errorText,
    });

    throw new Error(`LiteLLM anthropic messages request failed: ${errorText}`);
  }

  if (body.stream) {
    const stream = litellmResponse.body;
    if (!stream) {
      throw new Error("Failed to get Anthropic stream body");
    }

    return stream;
  }

  const data: any = await litellmResponse.json();

  const usageNormalized = {
    prompt_tokens: data.usage?.input_tokens || 0,
    completion_tokens: data.usage?.output_tokens || 0,
    total_tokens:
      (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  };

  const normalizedModel = normalizeModelName(model, provider);

  let cost = getLiteLLMCost(litellmResponse, data);

  if (cost === undefined) {
    logger.info("💰 LiteLLM cost missing, calculating from tokens");

    cost = calculateCostFromTokens(usageNormalized, normalizedModel);
  }

  const responseTime = Date.now() - startTime;

  try {
    await logUsage({
      userId: user._id.toString(),
      profileId: user.profileId?.toString(),
      provider,
      modelName: model,
      mode: user.mode,
      response: { ...data, usage: usageNormalized },
      responseTime,
      success: true,
      isFree,
      cost,
    });
  } catch (logError: any) {
    logger.error(
      "❌ Failed to log anthropic messages usage:",
      logError.message,
    );
  }

  return data;
}

export async function proxyImageGeneration(user: any, body: any) {
  const startTime = Date.now();
  const model = body.model || "dall-e-3";

  const profile = await AIProfile.findById(user.profileId);

  const provider = getProviderFromModel(model);

  const providerKeyDoc = await resolveProviderKeyForUser(user, provider, model);

  if (!providerKeyDoc) throw new Error(`Provider key missing for: ${provider}`);

  const providerApiKey = decryptSecret(providerKeyDoc.apiKeyEncrypted);
  const isFree = isProviderKeyFree(user, providerKeyDoc._id.toString());
  const decryptedLiteLLMKey = decryptSecret(user.litellmKeyEncrypted);

  const imagePrompt =
    typeof body.prompt === "string" && body.prompt.trim()
      ? body.prompt
      : "No text content";

  const blocked = await guardInput({
    profile,
    text: imagePrompt,
    model,
    api: "chat",
  });
  if (blocked) return blocked;

  if (!decryptedLiteLLMKey) throw new Error("LiteLLM key missing");

  const litellmResponse = await fetch(
    `${process.env.LITELLM_PROXY_URL}/v1/images/generations`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${decryptedLiteLLMKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...body, api_key: providerApiKey }),
    },
  );

  if (!litellmResponse.ok) {
    const err = await litellmResponse.text();
    throw new Error(`LiteLLM image generation failed: ${err}`);
  }

  const data: any = await litellmResponse.json();

  const size = body.size || "1024x1024";
  const quality = body.quality || "standard";
  const n = body.n || 1;
  const imageCost = calculateImageCost(model, size, quality, n);

  const responseTime = Date.now() - startTime;
  logUsage({
    userId: user._id.toString(),
    profileId: user.profileId?.toString(),
    provider,
    modelName: model,
    mode: user.mode,
    response: data,
    responseTime,
    success: true,
    isFree,
    cost: imageCost,
  }).catch((err) => logger.error("Failed to log image usage:", err));

  return data;
}

export async function proxyAudioTranscription(
  user: any,
  formData: FormData, 
  model: string = "whisper-1",
) {
  const startTime = Date.now();
  const provider = getProviderFromModel(model);

  const providerKeyDoc = await resolveProviderKeyForUser(user, provider, model);

  if (!providerKeyDoc) throw new Error(`Provider key missing for: ${provider}`);

  const providerApiKey = decryptSecret(providerKeyDoc.apiKeyEncrypted);
  const isFree = isProviderKeyFree(user, providerKeyDoc._id.toString());
  const decryptedLiteLLMKey = decryptSecret(user.litellmKeyEncrypted);

  if (!decryptedLiteLLMKey) throw new Error("LiteLLM key missing");

  const litellmResponse = await fetch(
    `${process.env.LITELLM_PROXY_URL}/v1/audio/transcriptions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${decryptedLiteLLMKey}`,
      },
      body: formData,
    },
  );

  if (!litellmResponse.ok) {
    const err = await litellmResponse.text();
    throw new Error(`LiteLLM transcription failed: ${err}`);
  }

  const data: any = await litellmResponse.json();

  const responseTime = Date.now() - startTime;
  logUsage({
    userId: user._id.toString(),
    profileId: user.profileId?.toString(),
    provider,
    modelName: model,
    mode: user.mode,
    response: data,
    responseTime,
    success: true,
    isFree,
    cost: 0,
  }).catch((err) => logger.error("Failed to log transcription usage:", err));

  return data;
}

export async function proxyAudioSpeech(user: any, body: any) {
  const startTime = Date.now();
  const model = body.model || "tts-1";
  const provider = getProviderFromModel(model);

  const providerKeyDoc = await resolveProviderKeyForUser(user, provider, model);

  if (!providerKeyDoc) throw new Error(`Provider key missing for: ${provider}`);

  const providerApiKey = decryptSecret(providerKeyDoc.apiKeyEncrypted);
  const isFree = isProviderKeyFree(user, providerKeyDoc._id.toString());
  const decryptedLiteLLMKey = decryptSecret(user.litellmKeyEncrypted);

  if (!decryptedLiteLLMKey) throw new Error("LiteLLM key missing");

  const litellmResponse = await fetch(
    `${process.env.LITELLM_PROXY_URL}/v1/audio/speech`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${decryptedLiteLLMKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...body, api_key: providerApiKey }),
    },
  );

  if (!litellmResponse.ok) {
    const err = await litellmResponse.text();
    throw new Error(`LiteLLM TTS failed: ${err}`);
  }

  const audioBuffer = await litellmResponse.arrayBuffer();
  const contentType =
    litellmResponse.headers.get("content-type") || "audio/mpeg";

  const inputText = body.input || "";
  const ttsCost = calculateTTSCost(model, inputText);

  const responseTime = Date.now() - startTime;
  logUsage({
    userId: user._id.toString(),
    profileId: user.profileId?.toString(),
    provider,
    modelName: model,
    mode: user.mode,
    response: { id: "tts", usage: null },
    responseTime,
    success: true,
    isFree,
    cost: ttsCost,
  }).catch((err) => logger.error("Failed to log TTS usage:", err));

  return { buffer: audioBuffer, contentType };
}
