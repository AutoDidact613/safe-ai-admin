from unittest.mock import MagicMock, patch

from nodes import _MAX_DRAFT_RETRIES, guardrails_gate, guardrails_node, send_node


def _passed(inquiry_id: str) -> dict:
    return {"inquiry_id": inquiry_id, "passed": True, "reasons": []}


def _failed(inquiry_id: str) -> dict:
    return {"inquiry_id": inquiry_id, "passed": False, "reasons": ["nope"]}


def _inquiry(inquiry_id: str) -> dict:
    return {"id": inquiry_id, "title": "t", "description": "d"}


# --- guardrails_node: retry bookkeeping lives here (a real node, so its
# return value is persisted across an interrupt/resume boundary - unlike a
# conditional-edge function's in-place mutations, which LangGraph drops). ---


@patch("nodes.check_draft")
def test_guardrails_node_increments_retry_count_for_failing_inquiry(check_draft_mock):
    check_draft_mock.return_value = _failed("1")
    state = {
        "inquiries": [_inquiry("1")],
        "drafts": {"1": {"inquiry_id": "1", "text": "draft"}},
    }

    guardrails_node(state, agent_config=MagicMock())

    assert state["retry_counts"]["1"] == 1


@patch("nodes.check_draft")
def test_guardrails_node_accumulates_retry_count_across_calls(check_draft_mock):
    check_draft_mock.return_value = _failed("1")
    state = {
        "inquiries": [_inquiry("1")],
        "drafts": {"1": {"inquiry_id": "1", "text": "draft"}},
        "retry_counts": {"1": 1},
    }

    guardrails_node(state, agent_config=MagicMock())

    assert state["retry_counts"]["1"] == 2


@patch("nodes.check_draft")
def test_guardrails_node_does_not_increment_retry_count_for_passing_inquiry(check_draft_mock):
    check_draft_mock.return_value = _passed("1")
    state = {
        "inquiries": [_inquiry("1")],
        "drafts": {"1": {"inquiry_id": "1", "text": "draft"}},
    }

    guardrails_node(state, agent_config=MagicMock())

    assert state.get("retry_counts", {}).get("1", 0) == 0


# --- guardrails_gate: pure routing decision - reads retry_counts, never
# mutates it (mutating here is exactly the bug that made the cap a no-op). ---


def test_guardrails_gate_advances_to_evaluator_when_all_pass():
    state = {"guardrail_results": {"1": _passed("1"), "2": _passed("2")}}

    assert guardrails_gate(state) == "evaluator_node"


def test_guardrails_gate_retries_draft_when_under_retry_limit():
    state = {"guardrail_results": {"1": _failed("1")}, "retry_counts": {"1": 1}}

    assert guardrails_gate(state) == "draft_node"


def test_guardrails_gate_gives_up_and_advances_after_max_retries():
    state = {
        "guardrail_results": {"1": _failed("1")},
        "retry_counts": {"1": _MAX_DRAFT_RETRIES + 1},
    }

    assert guardrails_gate(state) == "evaluator_node"


def test_guardrails_gate_does_not_mutate_state():
    state = {"guardrail_results": {"1": _failed("1")}, "retry_counts": {"1": 1}}
    original = {"guardrail_results": {"1": _failed("1")}, "retry_counts": {"1": 1}}

    guardrails_gate(state)

    assert state == original


def test_send_node_only_sends_explicitly_approved_ids():
    client = MagicMock()
    state = {
        "approved_ids": ["1"],
        "drafts": {
            "1": {"inquiry_id": "1", "text": "draft one"},
            "2": {"inquiry_id": "2", "text": "draft two"},
        },
    }

    send_node(state, client)

    client.post_reply.assert_called_once_with("1", "draft one")
    # הפנייה לא נסגרת אוטומטית - זו פעולה ידנית של המנהל (ייתכן שיהיה
    # למשתמש המשך שאלה על אותה פנייה).
    client.mark_handled.assert_not_called()


def test_send_node_sends_nothing_when_no_ids_approved():
    client = MagicMock()
    state = {"drafts": {"1": {"inquiry_id": "1", "text": "draft one"}}}

    send_node(state, client)

    client.post_reply.assert_not_called()
    client.mark_handled.assert_not_called()
