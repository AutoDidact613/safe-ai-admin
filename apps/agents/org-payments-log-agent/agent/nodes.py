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
