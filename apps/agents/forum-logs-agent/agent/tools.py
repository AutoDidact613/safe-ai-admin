import os
import json
from typing import Dict, Any, Optional
from urllib.parse import quote_plus
from pymongo import MongoClient
from langchain_core.tools import tool
from dotenv import load_dotenv

# טעינת משתני הסביבה מקובץ .env
load_dotenv()

# שליפת הגדרות החיבור מתוך .env
MONGO_URI = os.getenv("LOGS_MONGO_URI")
DB_NAME = os.getenv("LOGS_DATABASE_NAME", "filtersdk")
COLLECTION_NAME = os.getenv("LOGS_COLLECTION_NAME", "applicationlogs")
MAX_LIMIT = int(os.getenv("MAX_LOG_ENTRIES_PER_QUERY", 100))

# יצירת חיבור גלובלי ל-MongoDB (Connection Pool)
mongo_client: Optional[MongoClient] = None

if MONGO_URI:
    try:
        # טיפול בסיסמאות או שם משתמש המכילים תווים מיוחדים
        if "@" in MONGO_URI and "://" in MONGO_URI:
            # פירוק מחרוזת החיבור כדי לקודד את הסיסמה/שם המשתמש
            prefix, rest = MONGO_URI.split("://", 1)
            user_info, host_info = rest.rsplit("@", 1)
            
            if ":" in user_info:
                username, password = user_info.split(":", 1)
                encoded_user = quote_plus(username)
                encoded_pass = quote_plus(password)
                MONGO_URI = f"{prefix}://{encoded_user}:{encoded_pass}@{host_info}"
        
        mongo_client = MongoClient(MONGO_URI)
    except Exception as e:
        print(f"Warning: Failed to initialize MongoDB client: {e}")

# שדות מותרים לסינון (בהתאם לסכימה הקבועה של מסמכי הלוג בפרויקט)
ALLOWED_FIELDS = {"level", "message", "userId", "organizationId", "requestId", "timestamp", "stack"}

# אופרטורים מותרים כערך של שדה (אינם מריצים קוד, בשונה מ-$where/$expr/$function)
ALLOWED_OPERATORS = {"$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$in", "$nin"}

# אופרטורים לוגיים מותרים ברמה העליונה בלבד
ALLOWED_LOGICAL_OPERATORS = {"$and", "$or", "$nor"}


def _is_allowed_field(field_name: str) -> bool:
    return field_name in ALLOWED_FIELDS or field_name.startswith("context.")


def _validate_field_value(field_name: str, value: Any) -> None:
    if not isinstance(value, dict):
        return

    for operator, operator_value in value.items():
        if operator not in ALLOWED_OPERATORS:
            raise ValueError(f"Operator '{operator}' is not permitted for field '{field_name}'")
        if isinstance(operator_value, dict):
            raise ValueError(f"Nested operator values are not permitted for '{operator}' on field '{field_name}'")


def _sanitize_query_filter(query_filter: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(query_filter, dict):
        raise ValueError("query_filter must be an object")

    sanitized: Dict[str, Any] = {}

    for key, value in query_filter.items():
        if key in ALLOWED_LOGICAL_OPERATORS:
            if not isinstance(value, list):
                raise ValueError(f"'{key}' must be a list of filter objects")
            sanitized[key] = [_sanitize_query_filter(sub_filter) for sub_filter in value]
            continue

        if key.startswith("$"):
            raise ValueError(f"Operator '{key}' is not permitted at the top level")

        if not _is_allowed_field(key):
            raise ValueError(f"Field '{key}' is not permitted in query_filter")

        _validate_field_value(key, value)
        sanitized[key] = value

    return sanitized


@tool
def fetch_forum_logs(query_filter: Optional[Dict[str, Any]] = None, limit: int = MAX_LIMIT) -> str:
    """
    Fetches application log entries from MongoDB Atlas based on a query filter.
    
    Args:
        query_filter: A dictionary representing the MongoDB find filter (e.g., {"level": "ERROR"}).
                      If None or empty, fetches the most recent logs.
        limit: Maximum number of log documents to return (default is 100).
        
    Returns:
        JSON string containing the array of retrieved log documents.
    """
    if not mongo_client:
        return "Error: LOGS_MONGO_URI is not set or client failed to initialize."

    if query_filter is None:
        query_filter = {}

    try:
        query_filter = _sanitize_query_filter(query_filter)
    except ValueError as e:
        return f"Error: invalid query_filter - {e}"

    safe_limit = max(1, min(limit, MAX_LIMIT))

    try:
        # גישה לבסיס הנתונים והאוסף דרך החיבור הקיים
        db = mongo_client[DB_NAME]
        collection = db[COLLECTION_NAME]

        # הרצת שאילתת find עם הגבלת תוצאות ומיון לפי הזמן החדש ביותר
        cursor = collection.find(query_filter).sort("_id", -1).limit(safe_limit)

        logs = []
        for doc in cursor:
            # המרת ObjectID של MongoDB למחרוזת כדי שיהיה ניתן לסרלז ל-JSON
            doc["_id"] = str(doc["_id"])
            logs.append(doc)

        if not logs:
            return "No logs found matching the given criteria."

        return json.dumps(logs, ensure_ascii=False, indent=2)

    except Exception as e:
        return f"An error occurred while fetching logs from MongoDB: {str(e)}"