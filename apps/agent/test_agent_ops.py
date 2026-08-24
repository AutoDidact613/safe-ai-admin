from unittest.mock import MagicMock

import pytest

from agent_ops import GraphStateError, edit_draft, resume_with_approval, resume_with_selection


def _snapshot(next_nodes: tuple, values: dict | None = None) -> MagicMock:
    snapshot = MagicMock()
    snapshot.next = next_nodes
    snapshot.values = values or {}
    return snapshot


# --- resume_with_selection ---


def test_resume_with_selection_rejects_wrong_gate():
    graph = MagicMock()
    graph.get_state.return_value = _snapshot(("send_node",))

    with pytest.raises(GraphStateError):
        resume_with_selection(graph, {}, ["1"])

    graph.update_state.assert_not_called()
    graph.invoke.assert_not_called()


def test_resume_with_selection_returns_drafts_for_selected_ids_on_first_pass():
    graph = MagicMock()
    graph.get_state.side_effect = [
        _snapshot(("draft_node",)),  # initial gate check
        _snapshot(  # after the single invoke, already at gate 3
            ("send_node",),
            {
                "drafts": {"1": {"inquiry_id": "1", "text": "draft one"}},
                "guardrail_results": {"1": {"inquiry_id": "1", "passed": True, "reasons": []}},
            },
        ),
    ]

    result = resume_with_selection(graph, {"configurable": {"thread_id": "t1"}}, ["1"])

    graph.update_state.assert_called_once_with(
        {"configurable": {"thread_id": "t1"}}, {"selected_ids": ["1"]}
    )
    graph.invoke.assert_called_once_with(None, {"configurable": {"thread_id": "t1"}})
    assert result == {
        "1": {"text": "draft one", "guardrails_passed": True, "guardrails_reasons": []}
    }


def test_resume_with_selection_loops_through_guardrails_retries():
    graph = MagicMock()
    graph.get_state.side_effect = [
        _snapshot(("draft_node",)),  # initial gate check
        _snapshot(("draft_node",)),  # after invoke #1: guardrails failed, retrying
        _snapshot(  # after invoke #2: guardrails passed, at gate 3
            ("send_node",),
            {
                "drafts": {"1": {"inquiry_id": "1", "text": "draft two"}},
                "guardrail_results": {"1": {"inquiry_id": "1", "passed": True, "reasons": []}},
            },
        ),
    ]

    result = resume_with_selection(graph, {}, ["1"])

    assert graph.invoke.call_count == 2
    assert result["1"]["text"] == "draft two"


def test_resume_with_selection_raises_on_unexpected_pause_point():
    graph = MagicMock()
    graph.get_state.side_effect = [
        _snapshot(("draft_node",)),
        _snapshot(("guardrails_node",)),  # crashed mid-graph, not a known gate
    ]

    with pytest.raises(GraphStateError):
        resume_with_selection(graph, {}, ["1"])


def test_resume_with_selection_gives_up_after_max_attempts_as_a_safety_backstop():
    graph = MagicMock()
    # Always reports "still retrying" - simulates the graph's own cap somehow
    # never engaging (the exact bug this function is a backstop against).
    graph.get_state.return_value = _snapshot(("draft_node",))

    with pytest.raises(GraphStateError):
        resume_with_selection(graph, {}, ["1"])


# --- edit_draft ---


def test_edit_draft_rejects_wrong_gate():
    graph = MagicMock()
    graph.get_state.return_value = _snapshot(("draft_node",))

    with pytest.raises(GraphStateError):
        edit_draft(graph, {}, "1", "new text")

    graph.update_state.assert_not_called()


def test_edit_draft_merges_new_text_into_existing_drafts():
    graph = MagicMock()
    graph.get_state.return_value = _snapshot(
        ("send_node",),
        {"drafts": {"1": {"inquiry_id": "1", "text": "old"}, "2": {"inquiry_id": "2", "text": "keep me"}}},
    )
    thread_config = {"configurable": {"thread_id": "t1"}}

    result = edit_draft(graph, thread_config, "1", "new text")

    graph.update_state.assert_called_once_with(
        thread_config,
        {"drafts": {"1": {"inquiry_id": "1", "text": "new text"}, "2": {"inquiry_id": "2", "text": "keep me"}}},
    )
    graph.invoke.assert_not_called()
    assert result == {"inquiry_id": "1", "text": "new text"}


# --- resume_with_approval ---


def test_resume_with_approval_rejects_wrong_gate():
    graph = MagicMock()
    graph.get_state.return_value = _snapshot(("draft_node",))

    with pytest.raises(GraphStateError):
        resume_with_approval(graph, {}, ["1"])

    graph.update_state.assert_not_called()
    graph.invoke.assert_not_called()


def test_resume_with_approval_updates_state_and_resumes():
    graph = MagicMock()
    graph.get_state.return_value = _snapshot(("send_node",))
    thread_config = {"configurable": {"thread_id": "t1"}}

    result = resume_with_approval(graph, thread_config, ["1", "2"])

    graph.update_state.assert_called_once_with(thread_config, {"approved_ids": ["1", "2"]})
    graph.invoke.assert_called_once_with(None, thread_config)
    assert result == {"sent_ids": ["1", "2"]}
