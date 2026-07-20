/**
 * server/src/models/agentLog.ts
 *
 * Mongoose model for AI-call invocations made by agents.
 * Each invocation produces TWO documents (phase="start", phase="end"),
 * linked by invocationId - mirroring the insert-only nature of the
 * winston MongoDB transport used in agentsLogger.ts.
 * Use `agentsLogger.ts` to write to this model instead of using it directly.
 */

import mongoose, { Schema, Document } from "mongoose";

export type AgentLogPhase = "start" | "end";
export type AgentLogStatus = "success" | "error";
export type AgentLogNodeType = "llm" | "tool" | "retriever" | "chain" | "parser" | "other";

export interface IAgentLog extends Document {
  runId: string; // מזהה הריצה השלמה של האייג'נט
  parentRunId: string | null; // מזהה צעד-אב, אם זה תת-צעד
  agentName: string; // שם/סוג האייג'נט שמבצע את הצעד
  node: string; // שם הצעד הספציפי בזרימה של האייג'נט
  nodeType: AgentLogNodeType; // סיווג כללי של סוג הפעולה
  invocationId: string; // מזהה משותף לשתי הרשומות (start ו-end) של אותה קריאה
  phase: AgentLogPhase; // האם זו רשומת ההתחלה או הסיום
  status: AgentLogStatus | null; // תוצאת הביצוע, רלוונטי רק ב-phase="end"
  timestamp: Date; // חותמת הזמן של הרשומה הזו
  durationMs: number | null; // משך הביצוע במילישניות, ממולא רק ב-phase="end"
  description: string; // תיאור חופשי לקריאות עין
  input: {
    systemPrompt: string | null; // הנחיית המערכת שנשלחה למודל
    userPrompt: string | null; // תוכן הפנייה שנשלחה למודל
  };
  output: unknown; // הפלט שהתקבל מה-AI, ממולא רק ב-phase="end"
  error: string | null; // הודעת השגיאה, אם status="error"
  tags: string[]; // תיוגים חופשיים לסינון/קיבוץ
  metadata: Record<string, unknown>; // מידע נוסף ללא שדה ייעודי (כולל requestId)
}

const AgentLogSchema = new Schema<IAgentLog>(
  {
    runId: { type: String, required: true, index: true }, // מזהה הריצה השלמה של האייג'נט
    parentRunId: { type: String, default: null, index: true }, // מזהה צעד-אב, אם זה תת-צעד
    agentName: { type: String, required: true, index: true }, // שם/סוג האייג'נט שמבצע את הצעד
    node: { type: String, required: true }, // שם הצעד הספציפי בזרימה של האייג'נט
    nodeType: {
      type: String,
      enum: ["llm", "tool", "retriever", "chain", "parser", "other"],
      default: "other",
    }, // סיווג כללי של סוג הפעולה
    invocationId: { type: String, required: true, index: true }, // מזהה משותף ל-start ו-end
    phase: { type: String, enum: ["start", "end"], required: true, index: true }, // האם זו רשומת התחלה או סיום
    status: { type: String, enum: ["success", "error", null], default: null }, // תוצאת הביצוע, רק ב-phase="end"
    timestamp: { type: Date, required: true, default: Date.now }, // חותמת הזמן של הרשומה הזו
    durationMs: { type: Number, default: null }, // משך הביצוע במילישניות, רק ב-phase="end"
    description: { type: String, default: "" }, // תיאור חופשי לקריאות עין
    input: {
      systemPrompt: { type: String, default: null }, // הנחיית המערכת שנשלחה למודל
      userPrompt: { type: String, default: null }, // תוכן הפנייה שנשלחה למודל
    },
    output: { type: Schema.Types.Mixed, default: null }, // הפלט שהתקבל מה-AI, רק ב-phase="end"
    error: { type: String, default: null }, // הודעת השגיאה, אם status="error"
    tags: { type: [String], default: [] }, // תיוגים חופשיים לסינון/קיבוץ
    metadata: { type: Schema.Types.Mixed, default: {} }, // מידע נוסף ללא שדה ייעודי (כולל requestId)
  },
  { timestamps: false, versionKey: false }
);

AgentLogSchema.index({ runId: 1, timestamp: 1 }); // שליפת כל צעדי ריצה בסדר כרונולוגי
AgentLogSchema.index({ invocationId: 1, phase: 1 }, { unique: true }); // מניעת כפילות start/end לאותה קריאה

export const AgentLog = mongoose.model<IAgentLog>("AgentLog", AgentLogSchema);