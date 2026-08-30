from datetime import timedelta

from pymongo.errors import PyMongoError

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
    them to the state under "records".
    """
    try:
        records = fetch_org_payment_logs()
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
