from langgraph.graph import StateGraph, END

from graph_state import GraphState
from nodes import classify_node, evaluator_node, fetch_node

# Growing graph, one Story at a time: fetch -> classify -> evaluator -> END.
# The Gate (conditional_edges) / summarize_node (LLM) / guardrails_node /
# present_node will replace this END and be wired in by SCRUM-300 (Story:
# דוח + LLM + Gate + Guardrails).
graph_builder = StateGraph(GraphState)

graph_builder.add_node("fetch", fetch_node)
graph_builder.add_node("classify", classify_node)
graph_builder.add_node("evaluate", evaluator_node)

graph_builder.set_entry_point("fetch")
graph_builder.add_edge("fetch", "classify")
graph_builder.add_edge("classify", "evaluate")
graph_builder.add_edge("evaluate", END)

graph = graph_builder.compile()


if __name__ == "__main__":
    result = graph.invoke({})
    print(f"Fetched {len(result['records'])} records")
    print(f"Anomalies found: {len(result['anomalies'])}")
