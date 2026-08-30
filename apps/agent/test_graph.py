from unittest.mock import MagicMock, patch

from langgraph.checkpoint.memory import MemorySaver

from graph import build_graph
from nodes import _MAX_DRAFT_RETRIES


def _thread_config(thread_id: str = "t1") -> dict:
    return {"configurable": {"thread_id": thread_id}}


def _fake_fetch_node(state, client):
    state["inquiries"] = [{"id": "1", "title": "t1", "description": "d1"}]
    return state


def _fake_classify_node(state, agent_config):
    state["classified"] = {"1": {"category": "general", "urgency": "normal"}}
    return state


def _fake_draft_node(state, agent_config, retriever):
    drafts = state.setdefault("drafts", {})
    for inquiry_id in state.get("selected_ids", []):
        drafts[inquiry_id] = {"inquiry_id": inquiry_id, "text": f"draft for {inquiry_id}"}
    return state


def _fake_guardrails_node(state, agent_config):
    state["guardrail_results"] = {
        inquiry_id: {"inquiry_id": inquiry_id, "passed": True, "reasons": []}
        for inquiry_id in state.get("drafts", {})
    }
    return state


def _build_test_graph():
    """Builds the real graph wiring from graph.py, swapping the Mongo-backed
    checkpointer for an in-memory one and the LLM/HTTP-backed nodes for fakes,
    so the HITL interrupt behavior can be exercised without live infra."""
    config = MagicMock()
    config.mongodb_atlas_uri = "mongodb://fake"
    client = MagicMock()

    with (
        patch("graph.MongoClient", return_value=MagicMock()),
        patch("graph.MongoDBSaver", return_value=MemorySaver()),
        patch("graph.fetch_node", _fake_fetch_node),
        patch("graph.classify_node", _fake_classify_node),
        patch("graph.draft_node", _fake_draft_node),
        patch("graph.guardrails_node", _fake_guardrails_node),
    ):
        graph = build_graph(config, client)

    return graph, client


def _build_test_graph_with_real_guardrails():
    """Same as _build_test_graph, but leaves the real guardrails_node/gate
    from nodes.py in place (only check_draft's LLM call is mocked by the
    caller) - exercises the actual retry-cap fix through the compiled graph,
    not just the isolated unit tests in test_nodes.py."""
    config = MagicMock()
    config.mongodb_atlas_uri = "mongodb://fake"
    client = MagicMock()

    with (
        patch("graph.MongoClient", return_value=MagicMock()),
        patch("graph.MongoDBSaver", return_value=MemorySaver()),
        patch("graph.fetch_node", _fake_fetch_node),
        patch("graph.classify_node", _fake_classify_node),
        patch("graph.draft_node", _fake_draft_node),
    ):
        graph = build_graph(config, client)

    return graph, client


def test_graph_pauses_before_draft_node_for_inquiry_selection():
    graph, _client = _build_test_graph()
    thread_config = _thread_config()

    graph.invoke({}, thread_config)

    assert graph.get_state(thread_config).next == ("draft_node",)


def test_graph_pauses_before_send_node_for_approval():
    graph, client = _build_test_graph()
    thread_config = _thread_config()

    graph.invoke({}, thread_config)
    graph.update_state(thread_config, {"selected_ids": ["1"]})
    graph.invoke(None, thread_config)

    assert graph.get_state(thread_config).next == ("send_node",)
    client.post_reply.assert_not_called()
    client.mark_handled.assert_not_called()


def test_resuming_without_approval_sends_nothing():
    graph, client = _build_test_graph()
    thread_config = _thread_config()

    graph.invoke({}, thread_config)
    graph.update_state(thread_config, {"selected_ids": ["1"]})
    graph.invoke(None, thread_config)  # now paused before send_node

    # Resume without ever populating approved_ids (equivalent to bypassing
    # the CLI's --approve requirement and calling the graph directly).
    graph.invoke(None, thread_config)

    client.post_reply.assert_not_called()
    client.mark_handled.assert_not_called()
    assert graph.get_state(thread_config).next == ()


def test_explicit_approval_sends_only_the_approved_ids():
    graph, client = _build_test_graph()
    thread_config = _thread_config()

    graph.invoke({}, thread_config)
    graph.update_state(thread_config, {"selected_ids": ["1"]})
    graph.invoke(None, thread_config)  # paused before send_node

    graph.update_state(thread_config, {"approved_ids": ["1"]})
    graph.invoke(None, thread_config)

    client.post_reply.assert_called_once_with("1", "draft for 1")
    # הפנייה לא נסגרת אוטומטית - זו פעולה ידנית של המנהל.
    client.mark_handled.assert_not_called()


@patch("nodes.check_draft")
def test_guardrails_retry_gives_up_and_reaches_send_node_after_max_retries(check_draft_mock):
    check_draft_mock.return_value = {"inquiry_id": "1", "passed": False, "reasons": ["always bad"]}
    graph, _client = _build_test_graph_with_real_guardrails()
    thread_config = _thread_config()

    graph.invoke({}, thread_config)
    graph.update_state(thread_config, {"selected_ids": ["1"]})

    for _ in range(_MAX_DRAFT_RETRIES + 1):
        graph.invoke(None, thread_config)
        if graph.get_state(thread_config).next == ("send_node",):
            break

    snapshot = graph.get_state(thread_config)
    assert snapshot.next == ("send_node",)
    assert snapshot.values["retry_counts"]["1"] == _MAX_DRAFT_RETRIES + 1
    # The draft is still handed to the admin for review even though it never
    # passed guardrails - the admin has final say, not the guardrail check.
    assert snapshot.values["guardrail_results"]["1"]["passed"] is False
    assert "1" in snapshot.values["drafts"]


@patch("nodes.check_draft")
def test_guardrails_retry_recovers_before_exhausting_the_cap(check_draft_mock):
    check_draft_mock.side_effect = [
        {"inquiry_id": "1", "passed": False, "reasons": ["bad once"]},
        {"inquiry_id": "1", "passed": True, "reasons": []},
    ]
    graph, _client = _build_test_graph_with_real_guardrails()
    thread_config = _thread_config()

    graph.invoke({}, thread_config)
    graph.update_state(thread_config, {"selected_ids": ["1"]})

    for _ in range(_MAX_DRAFT_RETRIES + 1):
        graph.invoke(None, thread_config)
        if graph.get_state(thread_config).next == ("send_node",):
            break

    snapshot = graph.get_state(thread_config)
    assert snapshot.next == ("send_node",)
    assert snapshot.values["retry_counts"]["1"] == 1
    assert snapshot.values["guardrail_results"]["1"]["passed"] is True
