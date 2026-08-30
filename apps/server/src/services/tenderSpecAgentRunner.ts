import { spawn } from "child_process";
import path from "path";
import logger from "../logger";
import { saveTenderSpecification } from "./tenderBoardService";

const AGENT_DIR =
  process.env.TENDER_SPEC_AGENT_DIR || path.resolve(__dirname, "../../../agents/tender-spec-agent");
// Windows installs of Python typically expose only "python" on PATH, not
// "python3" (unlike Linux/Mac, where "python" is often absent or points at
// Python 2) - default per-platform so this works out of the box on either.
const PYTHON_BIN =
  process.env.TENDER_SPEC_AGENT_PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");
const RUN_TIMEOUT_MS = Number(process.env.TENDER_SPEC_AGENT_TIMEOUT_MS) || 5 * 60 * 1000;

// Defense-in-depth: tenderId always matched an existing tender's _id/id in the
// DB before this function is called (see requestTenderSpecificationHandler),
// but we still validate the exact shape here before it reaches a shell:true
// spawn (needed for Windows PATH resolution below), rather than relying only
// on that earlier check.
const SAFE_TENDER_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * מפעיל את tender-spec-agent (apps/agents/tender-spec-agent) כתהליך subprocess
 * נפרד, ללא חסימה של event loop השרת (SCRUM-293, אופציה 1 - runner קליל).
 * הפונקציה לא ממתינה לתוצאה - ה-agent כותב את התוצאה בעצמו בחזרה דרך
 * POST /tender-board/:id/specification. אם התהליך נכשל להיפתח, קורס, או חורג
 * מ-timeout בלי לכתוב תוצאה - מסמנים status=failed ישירות כדי שהמשתמש לא
 * יישאר תקוע ב-"generating" לנצח.
 */
export function triggerTenderSpecAgent(tenderId: string): void {
  logger.info("Triggering tender-spec-agent run", { tenderId, agentDir: AGENT_DIR });

  let settled = false;
  let stderr = "";

  const markFailed = async (reason: string) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    logger.error("tender-spec-agent run failed", { tenderId, reason });
    try {
      await saveTenderSpecification(tenderId, { status: "failed", errorMessage: reason });
    } catch (error) {
      logger.error("Failed to mark tender specification as failed", { tenderId, error });
    }
  };

  if (!SAFE_TENDER_ID_PATTERN.test(tenderId)) {
    void markFailed(`Refusing to spawn agent for unexpected tender id shape: ${tenderId}`);
    return;
  }

  // On Windows, Node's spawn() frequently fails to resolve "python"/"python3"
  // via PATH even when the same command works fine in a regular terminal
  // (a long-standing Node-on-Windows quirk with CreateProcess's PATH lookup) -
  // routing through the shell (cmd.exe) fixes it by using Windows' own PATH
  // resolution instead of Node's.
  const child = spawn(PYTHON_BIN, ["run_agent.py", "generate", "--tender-id", tenderId], {
    cwd: AGENT_DIR,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });

  const timer = setTimeout(() => {
    child.kill("SIGKILL");
    void markFailed(`Agent run timed out after ${RUN_TIMEOUT_MS}ms`);
  }, RUN_TIMEOUT_MS);

  child.stderr?.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  child.on("error", (error) => {
    void markFailed(`Failed to start agent process: ${error.message}`);
  });

  child.on("exit", (code) => {
    clearTimeout(timer);
    if (settled || code === 0) return;
    settled = true;
    void markFailed(`Agent process exited with code ${code}: ${stderr.slice(-500)}`);
  });
}
