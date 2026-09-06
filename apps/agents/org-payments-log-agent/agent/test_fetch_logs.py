from datetime import datetime
from unittest.mock import patch, MagicMock

from fetch_logs import transform_record, fetch_org_payment_logs


def test_transform_record_with_context():
    raw = {
        "level": "info",
        "message": "Organization approved",
        "context": {"organizationId": "org-1"},
        "timestamp": "2026-08-01T00:00:00Z",
    }
    result = transform_record(raw)
    assert result == {
        "level": "info",
        "message": "Organization approved",
        "context": {"organizationId": "org-1"},
        "timestamp": "2026-08-01T00:00:00Z",
    }


def test_transform_record_missing_context_and_level():
    # Simulates an older/minimal log record without "context" or "level".
    raw = {"message": "Organization created", "timestamp": "2026-08-01T00:00:00Z"}
    result = transform_record(raw)
    assert result == {
        "level": "info",
        "message": "Organization created",
        "context": {},
        "timestamp": "2026-08-01T00:00:00Z",
    }


def test_fetch_org_payment_logs_no_records():
    # Simulates the database returning zero matching records.
    # We mock get_database() so this test doesn't need a real connection.
    with patch("fetch_logs.get_database") as mock_get_db:
        mock_collection = MagicMock()
        mock_collection.find.return_value = []
        mock_get_db.return_value = {"applicationlogs": mock_collection}

        result = fetch_org_payment_logs()
        assert result == []


def test_fetch_org_payment_logs_multiple_records():
    # Simulates the database returning several raw records at once,
    # verifying that fetch_org_payment_logs transforms each one correctly.
    with patch("fetch_logs.get_database") as mock_get_db:
        mock_collection = MagicMock()
        mock_collection.find.return_value = [
            {
                "level": "info",
                "message": "Organization wallet topped up successfully (Mock)",
                "context": {"organizationId": "org-1", "amount": 100},
                "timestamp": "2026-08-01T00:00:00Z",
            },
            {"message": "Organization rejected", "timestamp": "2026-08-02T00:00:00Z"},
        ]
        mock_get_db.return_value = {"applicationlogs": mock_collection}

        result = fetch_org_payment_logs()
        assert result == [
            {
                "level": "info",
                "message": "Organization wallet topped up successfully (Mock)",
                "context": {"organizationId": "org-1", "amount": 100},
                "timestamp": "2026-08-01T00:00:00Z",
            },
            {
                "level": "info",
                "message": "Organization rejected",
                "context": {},
                "timestamp": "2026-08-02T00:00:00Z",
            },
        ]


def test_fetch_org_payment_logs_filters_by_message_pattern():
    # Verifies the Mongo query filters on the organization/wallet message pattern.
    with patch("fetch_logs.get_database") as mock_get_db:
        mock_collection = MagicMock()
        mock_collection.find.return_value = []
        mock_get_db.return_value = {"applicationlogs": mock_collection}

        fetch_org_payment_logs()

        called_query = mock_collection.find.call_args[0][0]
        assert called_query == {
            "message": {"$regex": "organization|wallet", "$options": "i"}
        }


def test_fetch_org_payment_logs_date_range():
    # Verifies start_date/end_date are translated into a timestamp range filter.
    with patch("fetch_logs.get_database") as mock_get_db:
        mock_collection = MagicMock()
        mock_collection.find.return_value = []
        mock_get_db.return_value = {"applicationlogs": mock_collection}

        start = datetime(2026, 8, 1)
        end = datetime(2026, 8, 31)
        fetch_org_payment_logs(start_date=start, end_date=end)

        called_query = mock_collection.find.call_args[0][0]
        assert called_query["timestamp"] == {"$gte": start, "$lte": end}
