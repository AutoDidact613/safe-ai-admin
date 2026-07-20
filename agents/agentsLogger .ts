/**
 * server/src/agentsLogger.ts
 *
 * Winston logger configuration for AI-call invocations made by agents.
 * Mirrors the structure of server/src/logger.ts: a winston logger with
 * JSON output, and a custom transport that persists every log line to
 * MongoDB (AgentLog collection) for latency analysis and audit.
 *
 * Full documentation: docs/agentsLogger.md
 */

import winston from "winston";
import Transport from "winston-transport";
import { randomUUID } from "node:crypto";
import { AgentLog, AgentLogNodeType } from "../server/src/models/agentsLog";
import { requestContext } from "../server/src/logger";

const isProd = process.env.NODE_ENV === "production";

// Custom MongoDB transport - persists every agent-call log line (start/end) to MongoDB
class AgentLogTransport extends Transport {
  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts);
  }

  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    const { level, message, timestamp, ...rest } = info;

    const logEntry = new AgentLog({
      ...rest,
      timestamp: new Date(),
    });

    // Save to MongoDB asynchronously
    logEntry.save().catch((err) => {
      // Don't throw - logging should never crash the app
      console.error("Failed to save agent log to MongoDB:", err);
    });

    callback();
  }
}

const agentLogger = winston.createLogger({
  level: isProd ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new AgentLogTransport(), // Save all agent logs to MongoDB
  ],
});

export interface StartAgentLogParams {
  runId: string; // מזהה הריצה השלמה של האייג'נט
  agentName: string; // שם/סוג האייג'נט
  node: string; // שם הצעד הספציפי בזרימה
  parentRunId?: string; // מזהה צעד-אב, אם זה תת-צעד
  nodeType?: AgentLogNodeType; // סיווג סוג הפעולה, ברירת מחדל "other"
  systemPrompt?: string; // הנחיית המערכת שנשלחת למודל
  userPrompt?: string; // תוכן הפנייה שנשלחת למודל
  description?: string; // תיאור חופשי לתצוגה בדשבורד
  tags?: string[]; // תיוגים חופשיים לסינון/קיבוץ
  metadata?: Record<string, unknown>; // מידע נוסף ללא שדה ייעודי
}

export interface EndAgentLogParams {
  invocationId: string; // מזהה הקריאה שהוחזר מ-startAgentLog
  status: "success" | "error"; // תוצאת הביצוע
  output?: unknown; // הפלט מה-AI, רלוונטי כאשר status="success"
  error?: string; // הודעת השגיאה, רלוונטי כאשר status="error"
}

// שומר בזיכרון (per-process) את זמן ההתחלה של כל invocation, לצורך חישוב durationMs ב-end
const startTimesByInvocation = new Map<string, number>();

// כותב שורת לוג "start" - נקרא ממש לפני שליחת הבקשה ל-AI. מחזיר invocationId
export function startAgentLog(params: StartAgentLogParams): string {
  const invocationId = randomUUID();
  const ctx = requestContext.getStore();

  startTimesByInvocation.set(invocationId, Date.now());

  agentLogger.info("agent_call_start", {
    runId: params.runId,
    parentRunId: params.parentRunId ?? null,
    agentName: params.agentName,
    node: params.node,
    nodeType: params.nodeType ?? "other",
    invocationId,
    phase: "start",
    status: null,
    description: params.description ?? "",
    input: {
      systemPrompt: params.systemPrompt ?? null,
      userPrompt: params.userPrompt ?? null,
    },
    tags: params.tags ?? [],
    metadata: ctx ? { ...params.metadata, requestId: ctx.requestId } : params.metadata ?? {},
  });

  return invocationId;
}

// כותב שורת לוג "end" - נקרא אחרי שהתקבלה תשובה מה-AI (בהצלחה או בשגיאה)
export function endAgentLog(params: EndAgentLogParams): void {
  const startedAt = startTimesByInvocation.get(params.invocationId);
  const durationMs = startedAt ? Date.now() - startedAt : null;
  startTimesByInvocation.delete(params.invocationId);

  const logPayload = {
    invocationId: params.invocationId,
    phase: "end",
    status: params.status,
    durationMs,
    output: params.output ?? null,
    error: params.error ?? null,
  };

  if (params.status === "error") {
    agentLogger.error("agent_call_end", logPayload);
  } else {
    agentLogger.info("agent_call_end", logPayload);
  }
}

// עוטף קריאה ל-AI: כותב start, מריץ את fn, וכותב end לפי success/error. זורק הלאה את השגיאה המקורית
export async function withAgentLog<T>(params: StartAgentLogParams, fn: () => Promise<T>): Promise<T> {
  const invocationId = startAgentLog(params);

  try {
    const output = await fn();
    endAgentLog({ invocationId, status: "success", output });
    return output;
  } catch (err: any) {
    endAgentLog({ invocationId, status: "error", error: err?.message ?? String(err) });
    throw err;
  }
}