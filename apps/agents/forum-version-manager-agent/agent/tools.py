from datetime import datetime, timezone
import os
from pathlib import Path
import subprocess
import traceback
from pymongo import MongoClient


class MongoTracingLogger:

  def __init__(self, uri: str = None, db_name: str = None):
    mongo_uri = uri or os.getenv("MONGO_URI", "mongodb://localhost:27017")
    database_name = db_name or os.getenv("MONGO_DB_NAME", "safeai_db")
    self.client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
    self.db = self.client[database_name]
    self.collection = self.db["applicationlogs"]

  def log(self, level: str, message: str, **kwargs):
    """כתיבת לוג לפי הפורמט המדויק שהוגדר בפרויקט."""
    try:
      # חילוץ מפתחות קבועים לרמה העליונה (תומך גם ב-camelCase וגם ב-snake_case)
      user_id = kwargs.pop("userId", kwargs.pop("user_id", None))
      org_id = kwargs.pop("organizationId", kwargs.pop("org_id", None))
      request_id = kwargs.pop("requestId", kwargs.pop("request_id", None))

      # טיפול ב-stack ובשגיאה
      stack = kwargs.pop("stack", None)
      if "error" in kwargs:
        err = kwargs["error"]
        if isinstance(err, Exception):
          if not stack:
            stack = "".join(
                traceback.format_exception(type(err), err, err.__traceback__)
            )
          kwargs["error"] = str(err)
        else:
          kwargs["error"] = str(err)

      payload = {
          "level": level,
          "message": message,
          "context": kwargs,  # כל שאר השדות העסקיים נכנסים לכאן
          "userId": user_id,
          "organizationId": org_id,
          "requestId": request_id,
          "stack": stack,
          "timestamp": datetime.now(timezone.utc),
      }

      self.collection.insert_one(payload)
    except Exception as ex:
      print(f"⚠️ אזהרת שמירת לוג ב-MongoDB: {ex}")


def run_forum_tests(
    command: str = "npm run typecheck",
    target_dir: str = None,
    timeout_sec: int = 120,
) -> dict:
  """הרצת בדיקות מקומית בתיקיית ה-client הראשית (Subprocess Sandbox)."""
  base_dir = Path(__file__).resolve().parent.parent

  # איתור תיקיית ה-client שבה נמצא package.json
  if target_dir:
    resolved_path = (base_dir / target_dir).resolve()
  else:
    # ברירת מחדל: תיקיית client
    resolved_path = (base_dir / "../../client").resolve()
    if not resolved_path.exists():
      resolved_path = (base_dir / "../../../client").resolve()

  if not resolved_path.exists():
    return {
        "success": False,
        "error": f"Directory not found: {resolved_path}",
        "stdout": "",
        "stderr": "",
        "exit_code": -1,
    }

  try:
    process = subprocess.run(
        command,
        cwd=str(resolved_path),
        shell=True,
        capture_output=True,
        text=True,
        timeout=timeout_sec,
    )
    return {
        "success": process.returncode == 0,
        "exit_code": process.returncode,
        "stdout": process.stdout[-2000:] if process.stdout else "",
        "stderr": process.stderr[-2000:] if process.stderr else "",
    }
  except subprocess.TimeoutExpired:
    return {
        "success": False,
        "error": f"Execution timed out after {timeout_sec} seconds",
        "stdout": "",
        "stderr": "",
        "exit_code": -1,
    }
  except Exception as ex:
    return {
        "success": False,
        "error": str(ex),
        "stdout": "",
        "stderr": traceback.format_exc(),
        "exit_code": -1,
    }


def scan_forum_files() -> list:
  """סריקת קבצי הפורום בלבד לצורך ניתוח שינויים ללא הצפת טוקנים."""
  base_dir = Path(__file__).resolve().parent.parent
  forum_path_env = os.getenv("FORUM_PATH", "../../client/src/features/forum")
  forum_dir = (base_dir / forum_path_env).resolve()

  # fallback אם הנתיב היחסי שונה
  if not forum_dir.exists():
    forum_dir = (base_dir / "../../../client/src/features/forum").resolve()

  if not forum_dir.exists():
    return []

  files_list = []
  for path in forum_dir.rglob("*"):
    if path.is_file():
      files_list.append(str(path.relative_to(forum_dir)))
  return files_list