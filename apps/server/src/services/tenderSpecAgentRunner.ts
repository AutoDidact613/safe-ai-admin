import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import logger from "../logger";
import { saveTenderSpecification } from "./tenderBoardService";

const AGENT_DIR =
  process.env.TENDER_SPEC_AGENT_DIR || path.resolve(__dirname, "../../../agents/tender-spec-agent");

// The agent's dependencies (google-genai, langgraph, python-dotenv, ...) live in its
// own venv (see README.md's "התקנה" section: `python -m venv .venv` + `pip install -r
// requirements.txt`), not in whatever interpreter happens to be first on PATH. A
// developer running the agent manually from the CLI activates that venv first, so
// bare "python" resolves to it - but this Node process never activates any venv, so
// spawning bare "python"/"python3" here resolves (if at all) to an interpreter that
// most likely doesn't have those packages installed, or doesn't exist on PATH at all.
// Prefer the venv's own interpreter when it's present (local/dev, and any environment
// that provisioned it per the README); fall back to a bare platform default for
// environments where dependencies are installed system-wide instead (e.g. a
// production container per README's "הפעלה מה-UI" section).
function resolveDefaultPythonBin(): string {
  const venvPython =
    process.platform === "win32"
      ? path.join(AGENT_DIR, ".venv", "Scripts", "python.exe")
      : path.join(AGENT_DIR, ".venv", "bin", "python");

  if (fs.existsSync(venvPython)) return venvPython;

  return process.platform === "win32" ? "python" : "python3";
}

const PYTHON_BIN = process.env.TENDER_SPEC_AGENT_PYTHON_BIN || resolveDefaultPythonBin();
const RUN_TIMEOUT_MS = Number(process.env.TENDER_SPEC_AGENT_TIMEOUT_MS) || 5 * 60 * 1000;

// Defense-in-depth: tenderId always matched an existing tender's _id/id in the
// DB before this function is called (see requestTenderSpecificationHandler),
// but we still validate the exact shape here before it reaches a shell:true
// spawn (needed for Windows PATH resolution below), rather than relying only
// on that earlier check.
const SAFE_TENDER_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

// Tracks the in-flight agent run per tenderId (one at a time - a new
// generate-specification-request while one is already running would need its own
// design, not handled here) so cancelTenderSpecAgent() can find and stop it.
const runningAgents = new Map<string, { cancel: () => void }>();

/**
 * Kills the agent subprocess and, on Windows, its full descendant tree. shell:true
 * on win32 (see below) means `child` is cmd.exe wrapping the real python.exe as a
 * grandchild - child.kill() alone terminates only the cmd.exe wrapper and leaves
 * python.exe running as an orphan. `taskkill /T` kills the whole tree rooted at
 * this pid instead. POSIX doesn't go through a shell here, so `child` already IS
 * the real process and a plain SIGKILL is enough.
 */
function killAgentProcessTree(child: ChildProcess): void {
  if (process.platform === "win32" && child.pid) {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
  } else {
    child.kill("SIGKILL");
  }
}

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
    runningAgents.delete(tenderId);
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
    // When Python's stdout/stderr is a real console, Windows lets it print any
    // Unicode character regardless of the system codepage; the moment it's piped
    // (exactly what happens here, and to any non-interactive invocation), Python
    // falls back to locale.getpreferredencoding() instead - cp1255 on Hebrew
    // Windows - which can't encode the "⚠️" in config.py's SSL-verification-disabled
    // warning (or any other emoji a dependency might print), crashing the process
    // with UnicodeEncodeError before it does anything else. Forcing UTF-8 makes
    // this subprocess's I/O encoding-independent of the host machine's locale.
    env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });

  const timer = setTimeout(() => {
    killAgentProcessTree(child);
    void markFailed(`Agent run timed out after ${RUN_TIMEOUT_MS}ms`);
  }, RUN_TIMEOUT_MS);

  runningAgents.set(tenderId, {
    cancel: () => {
      killAgentProcessTree(child);
      void markFailed("הפקת האפיון בוטלה על ידי המשתמש");
    },
  });

  child.stderr?.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  child.on("error", (error) => {
    void markFailed(`Failed to start agent process: ${error.message}`);
  });

  child.on("exit", (code) => {
    clearTimeout(timer);
    if (code === 0) {
      runningAgents.delete(tenderId);
      return;
    }
    void markFailed(`Agent process exited with code ${code}: ${stderr.slice(-500)}`);
  });
}

/**
 * מבטלת ריצה פעילה של ה-agent עבור מכרז נתון (SCRUM-293 follow-up: כפתור "ביטול").
 * מחזירה false אם אין ריצה פעילה כרגע (למשל כבר הסתיימה) - הקורא (הבקר) אחראי
 * להחזיר תגובה מתאימה למשתמש במקרה כזה, לא לזרוק שגיאה.
 */
export function cancelTenderSpecAgent(tenderId: string): boolean {
  const running = runningAgents.get(tenderId);
  if (!running) return false;
  running.cancel();
  return true;
}
