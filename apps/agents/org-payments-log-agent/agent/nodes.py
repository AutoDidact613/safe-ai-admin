from datetime import timedelta

import json
import re

from google import genai
from langsmith import traceable
from pymongo.errors import PyMongoError

from config import Config
from fetch_logs import fetch_org_payment_logs
from graph_state import GraphState

# Ordered (message substring, event_type) pairs. Matched case-insensitively,
# first match wins. These substrings mirror the exact logger.info/error calls
# in apps/server/src/services/organizationService.ts and organizationRepository.ts.
_EVENT_TYPE_PATTERNS = [
    ("approved", "approval"),
    ("rejected", "rejection"),
    ("topped up", "topup"),
    ("wallet balance incremented", "topup"),
    ("active state changed", "status_change"),
]

# Anomaly rule (per Epic scope decision): 3+ topups for the same organization
# within a 24-hour window.
_TOPUP_ANOMALY_THRESHOLD = 3
_TOPUP_ANOMALY_WINDOW = timedelta(hours=24)


def fetch_node(state: GraphState) -> dict:
    """
    LangGraph node that fetches organization/payment log records and adds
    them to the state under "records". Reads an optional "start_date"/
    "end_date" from the initial state (set by cli.py from CLI args).
    """
    try:
        records = fetch_org_payment_logs(
            start_date=state.get("start_date"), end_date=state.get("end_date")
        )
    except PyMongoError as e:
        raise RuntimeError(
            "Failed to connect to the database while fetching organization/payment "
            "logs. Check your MONGO_URI and network connection."
        ) from e

    return {"records": records}


def classify_event_type(message: str) -> str:
    """
    Classifies a single log message into an event type (approval / rejection /
    topup / status_change), or "other" if it doesn't match a known pattern.
    Deliberately rule-based (not LLM) - see SCRUM-299 for the reasoning.
    """
    lowered = message.lower()
    for substring, event_type in _EVENT_TYPE_PATTERNS:
        if substring in lowered:
            return event_type
    return "other"


def classify_node(state: GraphState) -> dict:
    """
    LangGraph node that classifies each fetched record by event type and adds
    the result to the state under "classified".
    """
    classified = [
        {**record, "event_type": classify_event_type(record.get("message", ""))}
        for record in state.get("records", [])
    ]
    return {"classified": classified}


def _find_topup_anomalies(classified: list[dict]) -> list[dict]:
    """
    Groups "topup" events by organizationId and flags any organization with
    at least _TOPUP_ANOMALY_THRESHOLD topups inside a rolling
    _TOPUP_ANOMALY_WINDOW window.
    """
    topups_by_org: dict[str, list] = {}
    for record in classified:
        if record.get("event_type") != "topup":
            continue
        org_id = record.get("context", {}).get("organizationId")
        if org_id is None:
            continue
        topups_by_org.setdefault(org_id, []).append(record["timestamp"])

    anomalies = []
    for org_id, timestamps in topups_by_org.items():
        timestamps = sorted(timestamps)
        for i in range(len(timestamps) - _TOPUP_ANOMALY_THRESHOLD + 1):
            window = timestamps[i : i + _TOPUP_ANOMALY_THRESHOLD]
            if window[-1] - window[0] <= _TOPUP_ANOMALY_WINDOW:
                anomalies.append(
                    {
                        "organization_id": org_id,
                        "type": "excessive_topups",
                        "count": len(window),
                        "window_start": window[0],
                        "window_end": window[-1],
                    }
                )
                break  # one anomaly entry per organization is enough

    return anomalies


def evaluator_node(state: GraphState) -> dict:
    """
    LangGraph node that inspects the classified records and flags
    organizations that crossed the configured anomaly threshold, adding the
    result to the state under "anomalies".
    """
    anomalies = _find_topup_anomalies(state.get("classified", []))
    return {"anomalies": anomalies}


def anomalies_gate(state: GraphState) -> str:
    """
    The Gate: routes to the LLM-backed detailed report path when anomalies
    were found, or straight to the short "all clear" report otherwise.
    """
    return "summarize" if state.get("anomalies") else "present"


_SUMMARY_PROMPT_TEMPLATE = """You are writing a short status report for a system
administrator about suspicious organization wallet activity detected in the logs.

For each anomaly below, write one clear sentence explaining what was found and why
it's worth a look (do not invent details beyond what's given; do not address the
administrator directly with imperative instructions - just report the facts).

Anomalies (JSON):
{anomalies_json}
"""


@traceable
def _call_llm(prompt: str, config: Config) -> str:
    client = genai.Client(api_key=config.gemini_api_key)
    response = client.models.generate_content(model=config.llm_model, contents=prompt)
    return response.text


def summarize_node(state: GraphState, agent_config: Config) -> dict:
    """
    LangGraph node (LLM) that turns the structured "anomalies" list into a
    short natural-language summary for the admin. Only runs on the
    "anomalies found" path (see anomalies_gate).
    """
    anomalies_json = json.dumps(state.get("anomalies", []), default=str)
    prompt = _SUMMARY_PROMPT_TEMPLATE.format(anomalies_json=anomalies_json)
    return {"summary": _call_llm(prompt, agent_config)}


# Matches Mongo ObjectIds (24 hex chars) - e.g. a raw userId that must never be
# shown to the admin unless it's one of the organization ids the report is
# already, legitimately, about.
_OBJECT_ID_PATTERN = re.compile(r"\b[0-9a-fA-F]{24}\b")


def _redact_unknown_ids(text: str, known_ids: set) -> str:
    return _OBJECT_ID_PATTERN.sub(
        lambda m: m.group(0) if m.group(0) in known_ids else "[REDACTED]", text
    )


def guardrails_node(state: GraphState) -> dict:
    """
    LangGraph node that filters the LLM-generated summary before it's shown
    to the admin: any id-like token that isn't one of the organization ids
    already present in "anomalies" (i.e. anything the LLM may have
    hallucinated or copied in from elsewhere) is redacted.
    """
    summary = state.get("summary")
    if not summary:
        return {}

    known_org_ids = {
        str(a["organization_id"]) for a in state.get("anomalies", []) if a.get("organization_id")
    }
    return {"summary": _redact_unknown_ids(summary, known_org_ids)}


def present_node(state: GraphState) -> dict:
    """
    LangGraph node that produces the final text report shown to the admin.
    Two shapes, depending on the Gate's outcome: a short "all clear" message,
    or a detailed report built from the (guarded) LLM summary plus the raw
    anomaly list.
    """
    anomalies = state.get("anomalies", [])
    if not anomalies:
        return {"report": "✅ הכל תקין — לא נמצאו חריגות בטווח שנבדק."}

    lines = ["⚠️ נמצאו חריגות:", "", state.get("summary", ""), "", "פירוט:"]
    for anomaly in anomalies:
        lines.append(
            f"- ארגון {anomaly['organization_id']}: "
            f"{anomaly['count']} טעינות ארנק בין {anomaly['window_start']} ל-{anomaly['window_end']}"
        )
    return {"report": "\n".join(lines)}
