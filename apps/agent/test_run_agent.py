import argparse
from unittest.mock import MagicMock, patch

import pytest

from run_agent import cmd_process


def _args(**overrides) -> argparse.Namespace:
    base = {"thread_id": "t1", "ids": None, "edit": None, "approve": None}
    base.update(overrides)
    return argparse.Namespace(**base)


def _snapshot(next_nodes: tuple, values: dict | None = None) -> MagicMock:
    snapshot = MagicMock()
    snapshot.next = next_nodes
    snapshot.values = values or {}
    return snapshot


@patch("run_agent.build_graph")
@patch("run_agent.SafeAIClient")
@patch("run_agent.load_config")
def test_draft_stage_requires_ids_flag(load_config_mock, client_cls, build_graph_mock):
    graph = MagicMock()
    graph.get_state.return_value = _snapshot(("draft_node",))
    build_graph_mock.return_value = graph

    with pytest.raises(SystemExit):
        cmd_process(_args())

    graph.update_state.assert_not_called()
    graph.invoke.assert_not_called()


@patch("run_agent.build_graph")
@patch("run_agent.SafeAIClient")
@patch("run_agent.load_config")
def test_send_stage_requires_approve_flag(load_config_mock, client_cls, build_graph_mock):
    graph = MagicMock()
    graph.get_state.return_value = _snapshot(("send_node",), {"drafts": {}})
    build_graph_mock.return_value = graph

    with pytest.raises(SystemExit):
        cmd_process(_args())

    graph.update_state.assert_not_called()
    graph.invoke.assert_not_called()


@patch("run_agent.build_graph")
@patch("run_agent.SafeAIClient")
@patch("run_agent.load_config")
def test_edit_updates_draft_without_sending(load_config_mock, client_cls, build_graph_mock, monkeypatch):
    graph = MagicMock()
    graph.get_state.return_value = _snapshot(
        ("send_node",), {"drafts": {"1": {"inquiry_id": "1", "text": "old text"}}}
    )
    build_graph_mock.return_value = graph
    monkeypatch.setattr("builtins.input", MagicMock(side_effect=["new text", ""]))

    cmd_process(_args(edit="1"))

    thread_config, update = graph.update_state.call_args[0]
    assert thread_config == {"configurable": {"thread_id": "t1"}}
    assert update["drafts"]["1"]["text"] == "new text"
    graph.invoke.assert_not_called()


@patch("run_agent.build_graph")
@patch("run_agent.SafeAIClient")
@patch("run_agent.load_config")
def test_approve_resumes_graph_with_exactly_the_approved_ids(
    load_config_mock, client_cls, build_graph_mock
):
    graph = MagicMock()
    graph.get_state.return_value = _snapshot(("send_node",), {"drafts": {}})
    graph.invoke.return_value = {}
    build_graph_mock.return_value = graph

    cmd_process(_args(approve="1,2"))

    thread_config = {"configurable": {"thread_id": "t1"}}
    graph.update_state.assert_called_once_with(thread_config, {"approved_ids": ["1", "2"]})
    graph.invoke.assert_called_once_with(None, thread_config)
