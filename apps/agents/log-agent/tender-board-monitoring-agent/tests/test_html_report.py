"""Unit tests for agent.nodes.html_report."""

from datetime import datetime

from agent.nodes.classify import ALL_CATEGORIES
from agent.nodes.html_report import format_error_report_html, format_report_html


def _zero_counts() -> dict:
    return {category: 0 for category in ALL_CATEGORIES}


def test_format_report_html_is_a_self_contained_rtl_document():
    report = format_report_html(datetime(2026, 1, 1), datetime(2026, 1, 31), _zero_counts())

    assert report.startswith("<!DOCTYPE html>")
    assert 'lang="he"' in report
    assert 'dir="rtl"' in report
    assert '<meta charset="utf-8">' in report
    assert "<style>" in report


def test_format_report_html_shows_counts_and_total():
    counts = _zero_counts()
    counts.update({"create": 2, "register": 1, "edit": 3, "delete": 0, "view": 10, "other": 4, "invalid": 1})

    report = format_report_html(datetime(2026, 1, 1), datetime(2026, 1, 31), counts)

    assert "יצירה" in report
    assert "צפייה" in report
    assert "21" in report  # total


def test_format_report_html_includes_errors_and_anomalies_sections():
    error_summary = {
        "total": 2,
        "by_module": {"tenderBoard": 2},
        "recurring": [{"module": "tenderBoard", "message": "DB timeout", "count": 2}],
    }
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

    report = format_report_html(
        datetime(2026, 1, 1),
        datetime(2026, 1, 31),
        _zero_counts(),
        error_summary=error_summary,
        anomalies=anomalies,
    )

    assert "שגיאות" in report
    assert "tenderBoard: 2" in report
    assert "user-1" in report
    assert "POST /tender-board/smart-create" in report


def test_format_report_html_includes_analysis_section():
    analysis = {
        "business_logic_notes": "הכל תקין.",
        "error_patterns": ["דפוס שגיאות חוזרות"],
        "anomalies": ["הגשה כפולה"],
        "confidence": 0.75,
    }

    report = format_report_html(datetime(2026, 1, 1), datetime(2026, 1, 31), _zero_counts(), analysis=analysis)

    assert "ניתוח בינה מלאכותית" in report
    assert "הכל תקין." in report
    assert "0.75" in report


def test_format_report_html_shows_unavailable_reason():
    report = format_report_html(
        datetime(2026, 1, 1),
        datetime(2026, 1, 31),
        _zero_counts(),
        analysis_unavailable_reason="ה-evaluator לא הצליח לאמת את הניתוח לאחר 3 ניסיונות",
    )

    assert "לא זמין בהרצה הנוכחית" in report
    assert "3 ניסיונות" in report


def test_format_report_html_escapes_llm_authored_text():
    analysis = {
        "business_logic_notes": '<script>alert("x")</script>',
        "error_patterns": [],
        "anomalies": [],
        "confidence": 0.9,
    }

    report = format_report_html(datetime(2026, 1, 1), datetime(2026, 1, 31), _zero_counts(), analysis=analysis)

    assert "<script>" not in report
    assert "&lt;script&gt;" in report


def test_format_report_html_escapes_error_messages():
    error_summary = {"total": 1, "by_module": {}, "recurring": [{"module": "x", "message": "<b>bad</b>", "count": 2}]}

    report = format_report_html(
        datetime(2026, 1, 1), datetime(2026, 1, 31), _zero_counts(), error_summary=error_summary
    )

    assert "<b>bad</b>" not in report
    assert "&lt;b&gt;bad&lt;/b&gt;" in report


def test_format_error_report_html_mentions_the_error_message():
    report = format_error_report_html(
        datetime(2026, 1, 1), datetime(2026, 1, 31), "Could not connect to MongoDB: timeout"
    )

    assert report.startswith("<!DOCTYPE html>")
    assert "Could not connect to MongoDB: timeout" in report
