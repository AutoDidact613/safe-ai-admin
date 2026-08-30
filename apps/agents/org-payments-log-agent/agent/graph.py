from functools import partial

from langgraph.graph import StateGraph, END

from config import Config
from graph_state import GraphState
from nodes import (
    anomalies_gate,
    classify_node,
    evaluator_node,
    fetch_node,
    guardrails_node,
    present_node,
    summarize_node,
)


def build_graph(agent_config: Config):
    builder = StateGraph(GraphState)

    builder.add_node("fetch", fetch_node)
    builder.add_node("classify", classify_node)
    builder.add_node("evaluate", evaluator_node)
    # GATE (anomalies_gate): automated conditional edge, not human - routes to
    # the detailed (LLM) path only when evaluator_node actually found anomalies.
    builder.add_node("summarize", partial(summarize_node, agent_config=agent_config))
    builder.add_node("guardrails", guardrails_node)
    builder.add_node("present", present_node)

    builder.set_entry_point("fetch")
    builder.add_edge("fetch", "classify")
    builder.add_edge("classify", "evaluate")
    builder.add_conditional_edges(
        "evaluate",
        anomalies_gate,
        {"summarize": "summarize", "present": "present"},
    )
    builder.add_edge("summarize", "guardrails")
    builder.add_edge("guardrails", "present")
    builder.add_edge("present", END)

    return builder.compile()


if __name__ == "__main__":
    graph = build_graph(Config())
    result = graph.invoke({})
    print(result["report"])
