from unittest.mock import MagicMock

from nodes import _MAX_DRAFT_RETRIES, guardrails_gate, send_node


def _passed(inquiry_id: str) -> dict:
    return {"inquiry_id": inquiry_id, "passed": True, "reasons": []}


def _failed(inquiry_id: str) -> dict:
    return {"inquiry_id": inquiry_id, "passed": False, "reasons": ["nope"]}


def test_guardrails_gate_advances_to_evaluator_when_all_pass():
    state = {"guardrail_results": {"1": _passed("1"), "2": _passed("2")}}

    assert guardrails_gate(state) == "evaluator_node"


def test_guardrails_gate_retries_draft_when_failed_under_retry_limit():
    state = {"guardrail_results": {"1": _failed("1")}}

    assert guardrails_gate(state) == "draft_node"
    assert state["retry_counts"]["1"] == 1


def test_guardrails_gate_gives_up_and_advances_after_max_retries():
    state = {
        "guardrail_results": {"1": _failed("1")},
        "retry_counts": {"1": _MAX_DRAFT_RETRIES},
    }

    assert guardrails_gate(state) == "evaluator_node"
    assert state["retry_counts"]["1"] == _MAX_DRAFT_RETRIES


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
    client.mark_handled.assert_called_once_with("1")


def test_send_node_sends_nothing_when_no_ids_approved():
    client = MagicMock()
    state = {"drafts": {"1": {"inquiry_id": "1", "text": "draft one"}}}

    send_node(state, client)

    client.post_reply.assert_not_called()
    client.mark_handled.assert_not_called()
