from pymongo.errors import PyMongoError

from fetch_logs import fetch_org_payment_logs
from graph_state import GraphState


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
