from db import get_database


def fetch_contact_form_logs() -> list[dict]:
    """
    Fetches log records related to contact form submissions
    from the applicationlogs collection.

    Returns a list of dicts, each containing at least:
    - requestType (falls back to "unknown" for older records without a context field)
    - createdAt (the log timestamp)
    """
    db = get_database()
    collection = db["applicationlogs"]

    query = {"message": "Contact form submitted"}
    raw_records = list(collection.find(query))

    records = []
    for raw in raw_records:
        # Older log records were written before the "context" field existed,
        # so we handle its absence gracefully instead of crashing.
        context = raw.get("context") or {}
        records.append({
            "requestType": context.get("requestType", "unknown"),
            "createdAt": raw.get("createdAt"),
        })

    return records


if __name__ == "__main__":
    logs = fetch_contact_form_logs()
    print(f"Found {len(logs)} contact form log records")
    if logs:
        print("Example record:", logs[0])