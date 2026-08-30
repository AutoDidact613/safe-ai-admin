from langgraph.graph import StateGraph, END

from graph_state import GraphState
from nodes import classify_node, fetch_node

# Growing graph, one Story at a time: fetch -> classify -> END.
# evaluator_node / the Gate / summarize_node / guardrails_node / present_node
# will replace this END and be wired in by later Stories.
graph_builder = StateGraph(GraphState)

graph_builder.add_node("fetch", fetch_node)
graph_builder.add_node("classify", classify_node)

graph_builder.set_entry_point("fetch")
graph_builder.add_edge("fetch", "classify")
graph_builder.add_edge("classify", END)

graph = graph_builder.compile()


if __name__ == "__main__":
    result = graph.invoke({})
    print(f"Fetched {len(result['records'])} records")
