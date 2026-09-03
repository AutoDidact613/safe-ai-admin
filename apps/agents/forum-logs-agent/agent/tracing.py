import json
import logging
import os
import time
from datetime import datetime, timezone
from functools import wraps

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG_DIR = os.path.join(PROJECT_ROOT, "logs")
TRACE_LOG_PATH = os.path.join(LOG_DIR, "agent_trace.jsonl")

logger = logging.getLogger("logs_agent")

if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


def _write_trace_record(record: dict) -> None:
    os.makedirs(LOG_DIR, exist_ok=True)
    with open(TRACE_LOG_PATH, "a", encoding="utf-8") as trace_file:
        trace_file.write(json.dumps(record, ensure_ascii=False) + "\n")


def trace_node(description: str):
    """
    דקורטור לצמתי הגרף: רושם כניסה/יציאה עם timestamp, שם הצומת, תיאור ומשך זמן -
    גם לקונסולה וגם כרשומת JSON בקובץ logs/agent_trace.jsonl בתוך הפרויקט.
    """

    def decorator(node_fn):
        @wraps(node_fn)
        def wrapper(state):
            node_name = node_fn.__name__
            start_time = time.time()
            start_timestamp = datetime.now(timezone.utc).isoformat()

            logger.info(f"-> נכנס ל-{node_name} ({description})")
            _write_trace_record({
                "timestamp": start_timestamp,
                "node": node_name,
                "description": description,
                "event": "enter",
            })

            try:
                return node_fn(state)
            finally:
                duration_ms = round((time.time() - start_time) * 1000, 1)
                logger.info(f"<- יצא מ-{node_name} ({description}) - {duration_ms}ms")
                _write_trace_record({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "node": node_name,
                    "description": description,
                    "event": "exit",
                    "duration_ms": duration_ms,
                })

        return wrapper

    return decorator
