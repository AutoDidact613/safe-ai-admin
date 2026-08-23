type AnthropicContentPart = {
  type: string;
  text?: string;
};

type AnthropicMessage = {
  role: "user" | "assistant";
  content: string | AnthropicContentPart[];
};

function extractAnthropicText(content: string | AnthropicContentPart[]): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter((part) => part.type === "text")
      .map((part) => part.text || "")
      .join("\n");
  }

  return "";
}

function normalizeAnthropicRole(role: string): "user" | "assistant" {
  return role === "assistant" ? "assistant" : "user";
}

export function anthropicToOpenAIChatBody(body: any) {
  const messages = [];

  if (body.system) {
    messages.push({
      role: "system",
      content: typeof body.system === "string" ? body.system : String(body.system),
    });
  }

  for (const msg of body.messages || []) {
    messages.push({
      role: normalizeAnthropicRole(msg.role),
      content: extractAnthropicText(msg.content),
    });
  }

  return {
    model: body.model,
    messages,
    max_tokens: body.max_tokens,
    temperature: body.temperature,
    top_p: body.top_p,
    stream: body.stream ?? false,
  };
}

export function openAIToAnthropicMessage(data: any, originalModel: string) {
  const text = data?.choices?.[0]?.message?.content || "";

  return {
    id: data.id?.startsWith("msg_") ? data.id : `msg_${Date.now()}`,
    type: "message",
    role: "assistant",
    model: originalModel,
    content: [
      {
        type: "text",
        text,
      },
    ],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: data?.usage?.prompt_tokens || 0,
      output_tokens: data?.usage?.completion_tokens || 0,
    },
  };
}

export function estimateAnthropicTokens(body: any) {
  const systemText =
    typeof body.system === "string"
      ? body.system
      : body.system
        ? String(body.system)
        : "";

  const messagesText = (body.messages || [])
    .map((msg: AnthropicMessage) =>
      extractAnthropicText(msg.content),
    )
    .join("\n");

  const totalText = `${systemText}\n${messagesText}`.trim();

  // הערכה גסה בלבד בשביל Claude Code
  return {
    input_tokens: Math.ceil(totalText.length / 4),
  };
}