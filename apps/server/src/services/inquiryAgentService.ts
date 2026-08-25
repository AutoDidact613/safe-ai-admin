const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://localhost:8000";
const RUN_LIST_TIMEOUT_MS = 60_000;
// Drafting + guardrails (with retries) means several real LLM calls per
// selected inquiry, so this needs more headroom than a plain list fetch -
// 120s was cutting it close for just 2 inquiries with a guardrails retry.
const RUN_PROCESS_TIMEOUT_MS = 240_000;

export async function runInquiryAgentList() {
  const response = await fetch(`${AGENT_SERVICE_URL}/run/list`, {
    method: "POST",
    signal: AbortSignal.timeout(RUN_LIST_TIMEOUT_MS),
  });

  const data: any = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.detail || `סוכן ה-AI החזיר שגיאה (${response.status})`;
    throw Object.assign(new Error(message), { status: 502 });
  }

  return data;
}

async function postToAgent(path: string, body: unknown, timeoutMs: number): Promise<any> {
  const response = await fetch(`${AGENT_SERVICE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const data: any = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.detail || `סוכן ה-AI החזיר שגיאה (${response.status})`;
    // 409 means the run isn't at the gate this action expects (e.g. approving
    // before drafting happened) - a client sequencing issue, not a backend
    // failure, so it's forwarded as-is instead of collapsing to 502.
    throw Object.assign(new Error(message), { status: response.status === 409 ? 409 : 502 });
  }

  return data;
}

export async function runInquiryAgentProcess(threadId: string, ids: string[]) {
  return postToAgent("/run/process", { thread_id: threadId, ids }, RUN_PROCESS_TIMEOUT_MS);
}

export async function runInquiryAgentEdit(threadId: string, inquiryId: string, text: string) {
  return postToAgent(
    "/run/edit",
    { thread_id: threadId, inquiry_id: inquiryId, text },
    RUN_LIST_TIMEOUT_MS,
  );
}

export async function runInquiryAgentApprove(threadId: string, ids: string[]) {
  return postToAgent("/run/approve", { thread_id: threadId, ids }, RUN_LIST_TIMEOUT_MS);
}
