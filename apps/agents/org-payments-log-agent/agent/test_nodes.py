from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

from nodes import (
    anomalies_gate,
    classify_event_type,
    classify_node,
    evaluator_node,
    summarize_node,
)


def test_classify_event_type_approval():
    assert classify_event_type("Organization approved") == "approval"


def test_classify_event_type_rejection():
    assert classify_event_type("Organization rejected") == "rejection"


def test_classify_event_type_topup_mock_message():
    assert (
        classify_event_type("Organization wallet topped up successfully (Mock)")
        == "topup"
    )


def test_classify_event_type_topup_increment_message():
    assert (
        classify_event_type("Organization wallet balance incremented in DB")
        == "topup"
    )


def test_classify_event_type_status_change():
    assert classify_event_type("Organization active state changed") == "status_change"


def test_classify_event_type_other_for_unrecognized_message():
    assert classify_event_type("Organization created in DB") == "other"


def test_classify_node_adds_event_type_to_every_record():
    state = {
        "records": [
            {"message": "Organization approved", "context": {}},
            {"message": "Organization rejected", "context": {}},
        ]
    }
    result = classify_node(state)
    assert [r["event_type"] for r in result["classified"]] == ["approval", "rejection"]


def _topup_record(org_id: str, ts: datetime) -> dict:
    return {
        "message": "Organization wallet topped up successfully (Mock)",
        "context": {"organizationId": org_id},
        "timestamp": ts,
        "event_type": "topup",
    }


def test_evaluator_node_no_anomalies_below_threshold():
    base = datetime(2026, 8, 1, 12, 0, 0)
    state = {
        "classified": [
            _topup_record("org-1", base),
            _topup_record("org-1", base + timedelta(hours=1)),
        ]
    }
    result = evaluator_node(state)
    assert result["anomalies"] == []


def test_evaluator_node_flags_three_topups_within_24_hours():
    base = datetime(2026, 8, 1, 12, 0, 0)
    state = {
        "classified": [
            _topup_record("org-1", base),
            _topup_record("org-1", base + timedelta(hours=10)),
            _topup_record("org-1", base + timedelta(hours=20)),
        ]
    }
    result = evaluator_node(state)
    assert len(result["anomalies"]) == 1
    assert result["anomalies"][0]["organization_id"] == "org-1"
    assert result["anomalies"][0]["count"] == 3


def test_evaluator_node_boundary_exactly_24_hours_apart_still_flags():
    # Boundary case called out explicitly in the Story's DoD: exactly 3
    # topups where the first and last are exactly 24h apart still counts.
    base = datetime(2026, 8, 1, 0, 0, 0)
    state = {
        "classified": [
            _topup_record("org-1", base),
            _topup_record("org-1", base + timedelta(hours=12)),
            _topup_record("org-1", base + timedelta(hours=24)),
        ]
    }
    result = evaluator_node(state)
    assert len(result["anomalies"]) == 1


def test_evaluator_node_three_topups_spread_over_more_than_24_hours_does_not_flag():
    base = datetime(2026, 8, 1, 0, 0, 0)
    state = {
        "classified": [
            _topup_record("org-1", base),
            _topup_record("org-1", base + timedelta(hours=12)),
            _topup_record("org-1", base + timedelta(hours=24, minutes=1)),
        ]
    }
    result = evaluator_node(state)
    assert result["anomalies"] == []


def test_evaluator_node_ignores_non_topup_events():
    base = datetime(2026, 8, 1, 12, 0, 0)
    state = {
        "classified": [
            {
                "message": "Organization approved",
                "context": {"organizationId": "org-1"},
                "timestamp": base,
                "event_type": "approval",
            },
        ]
    }
    result = evaluator_node(state)
    assert result["anomalies"] == []


def test_evaluator_node_tracks_multiple_organizations_independently():
    base = datetime(2026, 8, 1, 12, 0, 0)
    state = {
        "classified": [
            _topup_record("org-1", base),
            _topup_record("org-1", base + timedelta(hours=1)),
            _topup_record("org-1", base + timedelta(hours=2)),
            _topup_record("org-2", base),
        ]
    }
    result = evaluator_node(state)
    org_ids = {a["organization_id"] for a in result["anomalies"]}
    assert org_ids == {"org-1"}


# ---------------------------------------------------------------------------
# anomalies_gate
# ---------------------------------------------------------------------------


def test_anomalies_gate_routes_to_summarize_when_anomalies_found():
    assert anomalies_gate({"anomalies": [{"organization_id": "org-1"}]}) == "summarize"


def test_anomalies_gate_routes_to_present_when_no_anomalies():
    assert anomalies_gate({"anomalies": []}) == "present"
    assert anomalies_gate({}) == "present"


# ---------------------------------------------------------------------------
# summarize_node (LLM, mocked)
# ---------------------------------------------------------------------------


def _config():
    config = MagicMock()
    config.gemini_api_key = "test-key"
    config.llm_model = "gemini-1.5-pro"
    return config


@patch("nodes.genai.Client")
def test_summarize_node_returns_llm_text(client_cls):
    client_cls.return_value.models.generate_content.return_value.text = (
        "Organization org-1 had 3 wallet top-ups within 24 hours."
    )
    state = {
        "anomalies": [
            {
                "organization_id": "org-1",
                "type": "excessive_topups",
                "count": 3,
                "window_start": datetime(2026, 8, 1, 0, 0),
                "window_end": datetime(2026, 8, 1, 20, 0),
            }
        ]
    }
    result = summarize_node(state, _config())
    assert result == {
        "summary": "Organization org-1 had 3 wallet top-ups within 24 hours."
    }


