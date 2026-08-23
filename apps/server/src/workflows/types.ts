/**
 * server/src/workflows/types.ts
 *
 * טיפוסים משותפים לכל ה-workflows (Input / Instructions / Output).
 *
 * שני סוגי nodes:
 *  - GuardNode      → מחזיר verdict (allow/block). משמש ל-Input ו-Output filtering.
 *  - TransformNode  → ממיר/מעשיר context. משמש לבניית ההנחיות (Instructions).
 */

/* ============================================================
 * Guard nodes (Input / Output filtering)
 * ============================================================ */

export type Verdict = "allow" | "block";

/** מה ש-node בודק מחזיר פנימית (לא exception). */
export interface NodeResult {
  verdict: Verdict;
  /** מזהה קצר וקריא של הסיבה, למשל "blocked-by-llm" / "allowed-by-llm". */
  reason: string;
  /** מידע נוסף לטובת ה-trace ובניית תשובת הדמה (אופציונלי). */
  metadata?: Record<string, unknown>;
}

/** ה-context שזורם דרך guard pipeline. */
export interface GuardContext {
  /** הטקסט שמסונן. */
  text: string;
  /** הפרופיל המלא (כמו שמגיע מ-getFullProfileById). */
  profile: any;
  /** מזהה לפרופיל ללוגים. */
  profileId: string;
}

export interface GuardNode {
  /** שם ייחודי וקריא — מופיע ב-trace וב-structured logs. */
  name: string;
  run(ctx: GuardContext): Promise<NodeResult> | NodeResult;
}

/* ============================================================
 * Transform nodes (Instructions building)
 * ============================================================ */

/** ה-context שזורם דרך transform pipeline (בניית ההנחיות). */
export interface InstructionsContext {
  profile: any;
  /** מחרוזת ה-system prompt שנבנית בהדרגה ע"י ה-nodes. */
  systemPrompt: string;
}

export interface TransformNode<TCtx> {
  name: string;
  run(ctx: TCtx): Promise<TCtx> | TCtx;
}

/* ============================================================
 * Trace & results
 * ============================================================ */

export type NodeStatus = Verdict | "error" | "ok";

/** רשומת trace לכל node שרץ — input + output + זמן. */
export interface NodeTrace {
  node: string;
  status: NodeStatus;
  reason?: string;
  durationMs: number;
  /** snapshot של מה שה-node קיבל. */
  input?: unknown;
  /** snapshot של מה שה-node החזיר. */
  output?: unknown;
  metadata?: Record<string, unknown>;
}

/** תוצאת guard pipeline (input/output). */
export interface GuardWorkflowResult {
  allowed: boolean;
  reason: string;
  /** שם ה-node שחסם (אם נחסם). */
  blockedBy?: string;
  /** trace מלא של כל ה-nodes שרצו. */
  trace: NodeTrace[];
}