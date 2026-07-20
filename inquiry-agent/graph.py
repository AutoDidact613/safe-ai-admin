from functools import partial

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph

from api_client import SafeAIClient
from config import Config
from graph_state import GraphState
from nodes import (
    classify_node,
    draft_node,
    evaluator_node,
    fetch_node,
    present_node,
    send_node,
)


def build_graph(config: Config, client: SafeAIClient):
    builder = StateGraph(GraphState)

    builder.add_node("fetch_node", partial(fetch_node, client=client))
    builder.add_node("classify_node", partial(classify_node, agent_config=config))
    builder.add_node("present_node", present_node)
    # GATE 1 (selection_gate): HITL interrupt before draft_node - admin selects
    # which inquiry IDs go into state["selected_ids"] before resuming.
    builder.add_node("draft_node", partial(draft_node, agent_config=config))
    builder.add_node("evaluator_node", evaluator_node)
    # GATE 3 (evaluator_gate): HITL interrupt before send_node - admin approves
    # (populates state["approved_ids"]) or sends the run back to draft_node.
    builder.add_node("send_node", partial(send_node, client=client))

    builder.set_entry_point("fetch_node")
    builder.add_edge("fetch_node", "classify_node")
    builder.add_edge("classify_node", "present_node")
    builder.add_edge("present_node", "draft_node")
    builder.add_edge("draft_node", "evaluator_node")
    builder.add_edge("evaluator_node", "send_node")
    builder.add_edge("send_node", END)

    return builder.compile(
        checkpointer=MemorySaver(),
        interrupt_before=["draft_node", "send_node"],
    )
