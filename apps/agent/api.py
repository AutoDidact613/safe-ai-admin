import uuid

import requests
from fastapi import FastAPI, HTTPException
from google.genai import errors as genai_errors

from api_client import SafeAIClient
from config import ConfigError, load_config
from graph import build_graph

app = FastAPI(title="inquiry-agent")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/run/list")
def run_list() -> dict:
    try:
        config = load_config()
        client = SafeAIClient(config)
        graph = build_graph(config, client)

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
