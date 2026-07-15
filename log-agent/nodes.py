from graph_state import GraphState
from fetch_logs import fetch_contact_form_logs
from count_requests import count_by_request_type
from pymongo.errors import PyMongoError

def fetch_node(state: GraphState) -> dict:
    """
    LangGraph node that fetches contact form log records
    and adds them to the state under "records".
    """
    try:
        records = fetch_contact_form_logs()
    except PyMongoError as e:
        raise RuntimeError(
            "Failed to connect to the database while fetching contact form logs. "
            "Check your MONGO_URI and network connection."
        ) from e    
    return {"records": records}


def count_node(state: GraphState) -> dict:
    """
    LangGraph node that counts records by request type,
    reading "records" from the state and adding "summary" to it.
    """
    summary = count_by_request_type(state["records"])
    return {"summary": summary}