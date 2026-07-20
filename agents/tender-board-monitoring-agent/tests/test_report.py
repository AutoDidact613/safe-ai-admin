"""Unit tests for agent.nodes.report (originally part of Story SCRUM-39)."""

from datetime import datetime

from agent.nodes.classify import ALL_CATEGORIES
from agent.nodes.report import format_error_report, format_report, group_slow_requests_by_endpoint


def _zero_counts() -> dict:
    return {category: 0 for category in ALL_CATEGORIES}


def test_format_report_shows_every_business_category_and_total():
    counts = _zero_counts()
    counts.update({"create": 2, "register": 1, "edit": 3, "delete": 0, "view": 10, "other": 4, "invalid": 1})

    report = format_report(datetime(2026, 1, 1), datetime(2026, 1, 31), counts)

    assert "יצירה" in report
    assert "רישום" in report
    assert "עריכה" in report
    assert "מחיקה" in report
    assert "צפייה" in report
    assert "אחר" in report
    assert "לא תקין" in report
    # 2 + 1 + 3 + 0 + 10 + 4 + 1 = 21
    assert "סה\"כ" in report
    assert "21" in report


def test_format_report_includes_the_date_range():
    report = format_report(datetime(2026, 3, 1), datetime(2026, 3, 31), _zero_counts())

    assert "2026-03-01" in report
    assert "2026-03-31" in report


def test_format_error_report_mentions_the_error_message():
    report = format_error_report(datetime(2026, 1, 1), datetime(2026, 1, 31), "Could not connect to MongoDB: timeout")

    assert "שגיאה" in report
    assert "Could not connect to MongoDB: timeout" in report


# --- error_summary / anomalies sections (SCRUM-166) ---------------------


def test_format_report_without_error_summary_or_anomalies_is_unchanged():
    # Existing zero-arg call sites must keep working exactly as before.
    report = format_report(datetime(2026, 1, 1), datetime(2026, 1, 31), _zero_counts())

    assert "שגיאות" not in report
    assert "חריגות" not in report


def test_format_report_includes_error_summary_section():
    error_summary = {
        "total": 2,
        "by_module": {"tenderBoard": 2},
        "recurring": [{"module": "tenderBoard", "message": "DB timeout", "count": 2}],
    }

    report = format_report(
        datetime(2026, 1, 1), datetime(2026, 1, 31), _zero_counts(), error_summary=error_summary
    )

    assert "שגיאות" in report
    assert "tenderBoard: 2" in report
    assert "חוזרת x2" in report
    assert "DB timeout" in report


def test_format_report_includes_anomalies_section():
    anomalies = {
        "duplicates": [
            {
                "user_id": "user-1",
                "organization_id": "org-1",
                "tender_ids": ["a", "b"],
                "request_ids": ["r1", "r2"],
                "seconds_apart": 0.6,
            }
        ],
        "slow_requests": [{"message": "POST /tender-board/smart-create 201 2382ms", "duration_ms": 2382}],
    }

    report = format_report(datetime(2026, 1, 1), datetime(2026, 1, 31), _zero_counts(), anomalies=anomalies)

    assert "חריגות" in report
    assert "זוהו 1 מקרי הגשה כפולה" in report
    assert "user-1" in report
    assert "1 בקשות חרגו מסף זמן התגובה" in report
    assert "POST /tender-board/smart-create" in report
    assert "ממוצע 2382ms" in report


def test_format_report_analysis_section_and_confidence_are_hebrew():
    analysis = {
        "business_logic_notes": "הכל תקין.",
        "error_patterns": ["דפוס שגיאות חוזרות"],
        "anomalies": ["הגשה כפולה"],
        "confidence": 0.75,
    }

    report = format_report(datetime(2026, 1, 1), datetime(2026, 1, 31), _zero_counts(), analysis=analysis)

    assert "ניתוח בינה מלאכותית" in report
    assert "דפוס שגיאה: דפוס שגיאות חוזרות" in report
    assert "חריגה: הגשה כפולה" in report
    assert "רמת ביטחון: 0.75" in report


def test_format_report_shows_unavailable_reason_when_no_analysis():
    report = format_report(
        datetime(2026, 1, 1),
        datetime(2026, 1, 31),
        _zero_counts(),
        analysis_unavailable_reason="ה-evaluator לא הצליח לאמת את הניתוח לאחר 3 ניסיונות",
    )

    assert "ניתוח בינה מלאכותית" in report
    assert "לא זמין בהרצה הנוכחית" in report
    assert "ה-evaluator לא הצליח לאמת את הניתוח לאחר 3 ניסיונות" in report


# --- group_slow_requests_by_endpoint --------------------------------------


def test_group_slow_requests_groups_by_method_and_path():
    slow_requests = [
        {"message": "POST /tender-board/smart-create 201 3000ms", "duration_ms": 3000},
        {"message": "POST /tender-board/smart-create 201 4000ms", "duration_ms": 4000},
    ]

    groups = group_slow_requests_by_endpoint(slow_requests)

    assert len(groups) == 1
    assert groups[0]["endpoint"] == "POST /tender-board/smart-create"
    assert groups[0]["count"] == 2
    assert groups[0]["avg_ms"] == 3500.0
    assert groups[0]["max_ms"] == 4000


def test_group_slow_requests_strips_query_string():
    slow_requests = [
        {"message": "GET /tender-board/smart-search?q=" + ("a" * 200) + " 200 2500ms", "duration_ms": 2500},
    ]

    groups = group_slow_requests_by_endpoint(slow_requests)

    assert groups[0]["endpoint"] == "GET /tender-board/smart-search"


def test_group_slow_requests_normalizes_object_id_segments():
    slow_requests = [
        {"message": "POST /tender-board/6a4b8b1e851d47b859934fd4/apply 200 3000ms", "duration_ms": 3000},
        {"message": "POST /tender-board/6a4fb16677f27b411f44e6cf/apply 200 5000ms", "duration_ms": 5000},
    ]

    groups = group_slow_requests_by_endpoint(slow_requests)

    assert len(groups) == 1
    assert groups[0]["endpoint"] == "POST /tender-board/:id/apply"


def test_group_slow_requests_falls_back_to_raw_message_for_non_http_lines():
    slow_requests = [{"message": "Backfilling embeddings for 500 tenders 4200ms", "duration_ms": 4200}]

    groups = group_slow_requests_by_endpoint(slow_requests)

    assert groups[0]["endpoint"] == "Backfilling embeddings for 500 tenders 4200ms"
    assert groups[0]["count"] == 1


def test_group_slow_requests_sorted_by_avg_ms_descending():
    slow_requests = [
        {"message": "GET /tender-board 200 2100ms", "duration_ms": 2100},
        {"message": "POST /tender-board/smart-create 201 4000ms", "duration_ms": 4000},
    ]

    groups = group_slow_requests_by_endpoint(slow_requests)

    assert [g["endpoint"] for g in groups] == ["POST /tender-board/smart-create", "GET /tender-board"]


def test_group_slow_requests_on_empty_list():
    assert group_slow_requests_by_endpoint([]) == []
