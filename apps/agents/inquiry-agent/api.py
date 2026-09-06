import uuid

import requests
from fastapi import FastAPI, HTTPException
from google.genai import errors as genai_errors
from pydantic import BaseModel
from pymongo import MongoClient

from agent_ops import GraphStateError, edit_draft, resume_with_approval, resume_with_selection
from api_client import SafeAIClient
from config import ConfigError, load_config
from graph import build_graph

app = FastAPI(title="inquiry-agent")

# מופע יחיד ומשותף לכל בקשות ה-API, שנוצר פעם אחת (lazy) ונשאר פתוח לכל
# אורך חיי התהליך - לא ליצור MongoClient חדש בכל בקשה, אחרת כל קריאה
# ל-run/list או run/process הייתה פותחת connection pool נוסף ל-Atlas
# בלי לסגור את הקודם (בניגוד ל-CLI, ששם תהליך חדש נפתח ונסגר בכל הרצה).
_mongo_client: MongoClient | None = None


def _get_mongo_client() -> MongoClient:
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = MongoClient(load_config().mongodb_atlas_uri)
    return _mongo_client


class ProcessRequest(BaseModel):
    thread_id: str
    ids: list[str]


class EditRequest(BaseModel):
    thread_id: str
    inquiry_id: str
    text: str


class ApproveRequest(BaseModel):
    thread_id: str
    ids: list[str]


def _thread_config(thread_id: str) -> dict:
    return {"configurable": {"thread_id": thread_id}}


def _build_graph_for(thread_id: str):
    config = load_config()
    config.thread_id = thread_id
    client = SafeAIClient(config)
    return build_graph(config, client, mongo_client=_get_mongo_client())


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/run/list")
def run_list() -> dict:
    try:
        config = load_config()
        client = SafeAIClient(config)
        graph = build_graph(config, client, mongo_client=_get_mongo_client())

        thread_id = str(uuid.uuid4())
        config.thread_id = thread_id
        state = graph.invoke({}, {"configurable": {"thread_id": thread_id}})
    except ConfigError as e:
        raise HTTPException(status_code=500, detail=f"שגיאת הגדרות: {e}") from e
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"שגיאת תקשורת עם השרת: {e}") from e
    except genai_errors.APIError as e:
        raise HTTPException(status_code=503, detail=f"שגיאה בקריאה ל-Gemini: {e}") from e

    return {
        "thread_id": thread_id,
        "inquiries": [
            {**inquiry, "urgency": state["classified"].get(inquiry["id"], {}).get("urgency")}
            for inquiry in state.get("inquiries", [])
        ],
    }


@app.post("/run/process")
def run_process(req: ProcessRequest) -> dict:
    """GATE 1 -> GATE 3: drafts + guardrails-checks each selected inquiry,
    looping through guardrails retries internally, and returns once paused
    for admin review (even a draft that never passed guardrails is
    returned - the admin has final say)."""
    try:
        graph = _build_graph_for(req.thread_id)
        drafts = resume_with_selection(graph, _thread_config(req.thread_id), req.ids)
    except GraphStateError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e
    except ConfigError as e:
        raise HTTPException(status_code=500, detail=f"שגיאת הגדרות: {e}") from e
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"שגיאת תקשורת עם השרת: {e}") from e
    except genai_errors.APIError as e:
        raise HTTPException(status_code=503, detail=f"שגיאה בקריאה ל-Gemini: {e}") from e

    return {
        "thread_id": req.thread_id,
        "drafts": [{"inquiry_id": inquiry_id, **draft} for inquiry_id, draft in drafts.items()],
    }


@app.post("/run/edit")
def run_edit(req: EditRequest) -> dict:
    """GATE 3: overwrites one drafted reply's text. Never advances the
    graph - editing never auto-sends."""
    try:
        graph = _build_graph_for(req.thread_id)
        result = edit_draft(graph, _thread_config(req.thread_id), req.inquiry_id, req.text)
    except GraphStateError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e
    except ConfigError as e:
        raise HTTPException(status_code=500, detail=f"שגיאת הגדרות: {e}") from e
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"שגיאת תקשורת עם השרת: {e}") from e
    except genai_errors.APIError as e:
        raise HTTPException(status_code=503, detail=f"שגיאה בקריאה ל-Gemini: {e}") from e

    return {"thread_id": req.thread_id, **result}


@app.post("/run/approve")
def run_approve(req: ApproveRequest) -> dict:
    """GATE 3 -> END: sends replies only for the explicitly approved IDs -
    the only endpoint that actually posts a reply to the user, and only
    ever fires on an explicit admin action."""
    try:
        graph = _build_graph_for(req.thread_id)
        result = resume_with_approval(graph, _thread_config(req.thread_id), req.ids)
    except GraphStateError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e
    except ConfigError as e:
        raise HTTPException(status_code=500, detail=f"שגיאת הגדרות: {e}") from e
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"שגיאת תקשורת עם השרת: {e}") from e
    except genai_errors.APIError as e:
        raise HTTPException(status_code=503, detail=f"שגיאה בקריאה ל-Gemini: {e}") from e

    return {"thread_id": req.thread_id, **result}
