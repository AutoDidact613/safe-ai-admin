const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || "http://localhost:8000";
const RUN_LIST_TIMEOUT_MS = 60_000;

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
