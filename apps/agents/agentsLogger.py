"""
agents_logger.py

מודל + לוגר לתיעוד קריאות AI שמבצעים אייג'נטים, כולל כתיבה ל-MongoDB.
תיעוד מלא ודוגמאות שימוש: docs/agents_logger.md

זהו הממשק היחיד שדרכו יש לכתוב ללוג הזה - אין לגשת ל-collection ישירות
ממקום אחר בקוד.

עקרון הפעולה: כל invocation בודד מייצר שתי רשומות נפרדות (phase="start",
phase="end") המקושרות ביניהן דרך invocation_id משותף. אם קריאה נופלת
באמצע (timeout/קריסה), רשומת ה-end פשוט לא נכתבת - וכך אפשר לזהות
קריאות תקועות (ראו find_stuck_invocations).
"""

from __future__ import annotations

import logging
import os
import time
import uuid
from contextlib import contextmanager
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from threading import Lock
from typing import Any, Iterator, Optional

from pymongo import ASCENDING, MongoClient
from pymongo.collection import Collection

logger = logging.getLogger(__name__)

_MONGO_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
_DB_NAME = os.environ.get("MONGODB_DB_NAME", "safeai")
_COLLECTION_NAME = "agent_logs"


# --------------------------------------------------------------------------
# Enums
# --------------------------------------------------------------------------

class NodeType(str, Enum):
    """סיווג כללי של סוג הפעולה שמתבצעת בצעד."""
    LLM = "llm"
    TOOL = "tool"
    RETRIEVER = "retriever"
    CHAIN = "chain"
    PARSER = "parser"
    OTHER = "other"


class Phase(str, Enum):
    """האם הרשומה מייצגת תחילת קריאה או סיומה."""
    START = "start"
    END = "end"


class Status(str, Enum):
    """תוצאת הביצוע - רלוונטי רק ברשומות phase=END."""
    SUCCESS = "success"
    ERROR = "error"


# --------------------------------------------------------------------------
# Model
# --------------------------------------------------------------------------

@dataclass
class AgentLogInput:
    system_prompt: Optional[str] = None  # הנחיית המערכת שנשלחה למודל
    user_prompt: Optional[str] = None  # תוכן הפנייה שנשלחה למודל


@dataclass
class AgentLogDocument:
    """מבנה מסמך הלוג של קריאת AI בודדת (רשומת start או end)."""

    run_id: str  # מזהה הריצה השלמה של האייג'נט
    agent_name: str  # שם/סוג האייג'נט שמבצע את הצעד
    node: str  # שם הצעד הספציפי בזרימה של האייג'נט
    invocation_id: str  # מזהה משותף לשתי הרשומות (start ו-end) של אותה קריאה
    phase: str  # "start" או "end"
    timestamp: datetime  # חותמת הזמן של הרשומה הזו
    node_type: str = NodeType.OTHER.value  # סיווג סוג הפעולה
    parent_run_id: Optional[str] = None  # מזהה צעד-אב, אם זה תת-צעד
    status: Optional[str] = None  # תוצאת הביצוע, רק ב-phase="end"
    duration_ms: Optional[int] = None  # משך הביצוע במילישניות, רק ב-phase="end"
    description: str = ""  # תיאור חופשי לקריאות עין
    input: AgentLogInput = field(default_factory=AgentLogInput)  # הקלט שנשלח ל-AI
    output: Any = None  # הפלט שהתקבל מה-AI, רק ב-phase="end"
    error: Optional[str] = None  # הודעת שגיאה, אם status="error"
    tags: list[str] = field(default_factory=list)  # תיוגים חופשיים לסינון/קיבוץ
    metadata: dict[str, Any] = field(default_factory=dict)  # מידע נוסף ללא שדה ייעודי

    def to_dict(self) -> dict[str, Any]:
        """ממיר לדיקט הניתן להכנסה ישירה ל-MongoDB."""
        return asdict(self)


# --------------------------------------------------------------------------
# DB access
# --------------------------------------------------------------------------

_client: Optional[MongoClient] = None
_collection: Optional[Collection] = None


def _get_collection() -> Collection:
    """מחזיר singleton של ה-collection, ויוצר את האינדקסים הנדרשים בקריאה הראשונה בלבד."""
    global _client, _collection
    if _collection is None:
        _client = MongoClient(_MONGO_URI)
        _collection = _client[_DB_NAME][_COLLECTION_NAME]
        _collection.create_index(
            [("invocation_id", ASCENDING), ("phase", ASCENDING)], unique=True
        )
        _collection.create_index([("run_id", ASCENDING), ("timestamp", ASCENDING)])
    return _collection


def _safe_insert(document: dict[str, Any]) -> None:
    """מכניס מסמך ל-MongoDB; לעולם לא זורק החוצה - כשל בכתיבת לוג לא אמור להפיל את האפליקציה."""
    try:
        _get_collection().insert_one(document)
    except Exception:
        logger.exception("Failed to save agent log to MongoDB")


# --------------------------------------------------------------------------
# In-memory start-time tracking (לחישוב duration_ms בין start ל-end)
# --------------------------------------------------------------------------

_start_times: dict[str, float] = {}
_start_times_lock = Lock()


# --------------------------------------------------------------------------
# Public API
# --------------------------------------------------------------------------

def start_agent_log(
    *,
    run_id: str,
    agent_name: str,
    node: str,
    node_type: NodeType = NodeType.OTHER,
    parent_run_id: Optional[str] = None,
    system_prompt: Optional[str] = None,
    user_prompt: Optional[str] = None,
    description: str = "",
    tags: Optional[list[str]] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> str:
    """רושם רשומת 'start' ממש לפני שליחת הבקשה ל-AI. מחזיר invocation_id."""
    invocation_id = str(uuid.uuid4())

    with _start_times_lock:
        _start_times[invocation_id] = time.monotonic()

    doc = AgentLogDocument(
        run_id=run_id,
        agent_name=agent_name,
        node=node,
        invocation_id=invocation_id,
        phase=Phase.START.value,
        timestamp=datetime.now(timezone.utc),
        node_type=node_type.value,
        parent_run_id=parent_run_id,
        description=description,
        input=AgentLogInput(system_prompt=system_prompt, user_prompt=user_prompt),
        tags=tags or [],
        metadata=metadata or {},
    )
    _safe_insert(doc.to_dict())
    return invocation_id


def end_agent_log(
    *,
    invocation_id: str,
    status: Status,
    output: Any = None,
    error: Optional[str] = None,
) -> None:
    """רושם רשומת 'end' אחרי שהתקבלה תשובה מה-AI (בהצלחה או בשגיאה)."""
    with _start_times_lock:
        started_at = _start_times.pop(invocation_id, None)
    duration_ms = int((time.monotonic() - started_at) * 1000) if started_at is not None else None

    _safe_insert(
        {
            "invocation_id": invocation_id,
            "phase": Phase.END.value,
            "status": status.value,
            "timestamp": datetime.now(timezone.utc),
            "duration_ms": duration_ms,
            "output": output,
            "error": error,
        }
    )


@contextmanager
def agent_log(
    *,
    run_id: str,
    agent_name: str,
    node: str,
    node_type: NodeType = NodeType.OTHER,
    parent_run_id: Optional[str] = None,
    system_prompt: Optional[str] = None,
    user_prompt: Optional[str] = None,
    description: str = "",
    tags: Optional[list[str]] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> Iterator[Any]:
    """
    Context manager נוח: פותח 'start', מריץ את הבלוק, וסוגר עם success/error
    בהתאם לתוצאה. שגיאות נזרקות הלאה (raise) אחרי שנרשמו.
    ראו דוגמת שימוש ב-docs/agents_logger.md.
    """
    invocation_id = start_agent_log(
        run_id=run_id,
        agent_name=agent_name,
        node=node,
        node_type=node_type,
        parent_run_id=parent_run_id,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        description=description,
        tags=tags,
        metadata=metadata,
    )

    result: dict[str, Any] = {"output": None}

    try:
        yield lambda output: result.__setitem__("output", output)
    except Exception as exc:
        end_agent_log(invocation_id=invocation_id, status=Status.ERROR, error=str(exc))
        raise
    else:
        end_agent_log(invocation_id=invocation_id, status=Status.SUCCESS, output=result["output"])


def find_stuck_invocations(older_than_seconds: int = 60) -> list[dict[str, Any]]:
    """מאתר רשומות 'start' שאין להן רשומת 'end' תואמת, מעבר לזמן הנתון - קריאות שנתקעו."""
    threshold = datetime.now(timezone.utc) - timedelta(seconds=older_than_seconds)
    collection = _get_collection()

    return list(
        collection.aggregate(
            [
                {"$match": {"phase": Phase.START.value, "timestamp": {"$lt": threshold}}},
                {
                    "$lookup": {
                        "from": _COLLECTION_NAME,
                        "let": {"invocation_id": "$invocation_id"},
                        "pipeline": [
                            {
                                "$match": {
                                    "$expr": {
                                        "$and": [
                                            {"$eq": ["$invocation_id", "$$invocation_id"]},
                                            {"$eq": ["$phase", Phase.END.value]},
                                        ]
                                    }
                                }
                            }
                        ],
                        "as": "end_doc",
                    }
                },
                {"$match": {"end_doc": {"$size": 0}}},
            ]
        )
    )