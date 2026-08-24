from unittest.mock import patch, MagicMock
from fetch_logs import transform_record, fetch_contact_form_logs


def test_transform_record_with_context():
    raw = {
        "message": "Contact form submitted",
        "context": {"requestType": "bug", "title": "foo"},
        "createdAt": "2026-07-01",
    }
    result = transform_record(raw)
    assert result == {"requestType": "bug", "createdAt": "2026-07-01"}


def test_transform_record_missing_context():
    # Simulates an older log record, written before the "context" field existed.
    raw = {
        "message": "Contact form submitted",
        "createdAt": "2026-06-01",
    }
    result = transform_record(raw)
    assert result == {"requestType": "unknown", "createdAt": "2026-06-01"}


def test_transform_record_context_without_request_type():
    # Simulates a record where context exists but doesn't contain requestType.
    raw = {
        "message": "Contact form submitted",
        "context": {"title": "foo"},
        "createdAt": "2026-07-05",
    }
    result = transform_record(raw)
    assert result == {"requestType": "unknown", "createdAt": "2026-07-05"}


def test_fetch_contact_form_logs_no_records():
    # Simulates the database returning zero matching records.
    # We mock get_database() so this test doesn't need a real connection.
    with patch("fetch_logs.get_database") as mock_get_db:
        mock_collection = MagicMock()
        mock_collection.find.return_value = []
        mock_get_db.return_value = {"applicationlogs": mock_collection}

        result = fetch_contact_form_logs()
        assert result == []


def test_fetch_contact_form_logs_multiple_records():
    # Simulates the database returning several raw records at once,
    # verifying that fetch_contact_form_logs transforms each one correctly.
    with patch("fetch_logs.get_database") as mock_get_db:
        mock_collection = MagicMock()
        mock_collection.find.return_value = [
            {"context": {"requestType": "bug"}, "createdAt": "2026-07-01"},
            {"createdAt": "2026-06-01"},  # older record, no context
        ]
        mock_get_db.return_value = {"applicationlogs": mock_collection}

        result = fetch_contact_form_logs()
        assert result == [
            {"requestType": "bug", "createdAt": "2026-07-01"},
            {"requestType": "unknown", "createdAt": "2026-06-01"},
        ]