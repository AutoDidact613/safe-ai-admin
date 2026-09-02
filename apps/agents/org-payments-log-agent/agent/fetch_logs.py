from datetime import datetime
from typing import Optional

from db import get_database

# Matches the info/warn/error log messages written by organizationService.ts /
# organizationRepository.ts (e.g. "Organization approved", "Organization wallet
# topped up successfully (Mock)", "User added to organization").
_ORG_PAYMENT_MESSAGE_PATTERN = "organization|wallet"


def transform_record(raw: dict) -> dict:
    """
    Converts a single raw applicationlogs document into a convenient, minimal
    structure. The full "context" dict is preserved (not flattened) because it
    carries fields such as organizationId/amount that downstream nodes
    (classification, anomaly detection) need to group and filter on.
    """
    return {
        "level": raw.get("level", "info"),
        "message": raw.get("message", ""),
        "context": raw.get("context") or {},
        "timestamp": raw.get("timestamp"),
    }


def fetch_org_payment_logs(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> list[dict]:
    """
    Fetches log records related to organization/wallet activity from the
    applicationlogs collection, optionally restricted to a [start_date, end_date]
    timestamp range, and converts each one using transform_record().

    Returns a list of dicts, each containing: level, message, context, timestamp.
    """
    db = get_database()
    collection = db["applicationlogs"]

    query: dict = {"message": {"$regex": _ORG_PAYMENT_MESSAGE_PATTERN, "$options": "i"}}

    timestamp_filter = {}
    if start_date is not None:
        timestamp_filter["$gte"] = start_date
    if end_date is not None:
        timestamp_filter["$lte"] = end_date
    if timestamp_filter:
        query["timestamp"] = timestamp_filter

    raw_records = list(collection.find(query))

    return [transform_record(raw) for raw in raw_records]


if __name__ == "__main__":
    logs = fetch_org_payment_logs()
    print(f"Found {len(logs)} organization/payment log records")
    if logs:
        print("Example record:", logs[0])
