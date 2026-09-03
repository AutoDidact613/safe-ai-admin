from db import get_database

def transform_record(raw: dict) -> dict:
    """
    Converts a single raw log document into a convenient, minimal structure.

    Older log records were written before the "context" field existed,
    so we handle its absence gracefully instead of crashing.
    """
    context = raw.get("context") or {}
    return {
        "requestType": context.get("requestType", "unknown"),
        "createdAt": raw.get("createdAt"),
    }


def fetch_contact_form_logs() -> list[dict]:
    """
    Fetches log records related to contact form submissions
    from the applicationlogs collection, and converts each one
    into a convenient structure using transform_record().

    Returns a list of dicts, each containing:
    - requestType
    - createdAt
    """
    db = get_database()
    collection = db["applicationlogs"]

    query = {"message": "Contact form submitted"}
    raw_records = list(collection.find(query))

    return [transform_record(raw) for raw in raw_records]

if __name__ == "__main__":
    logs = fetch_contact_form_logs()
    print(f"Found {len(logs)} contact form log records")
    if logs:
        print("Example record:", logs[0])