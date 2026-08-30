from langgraph.graph import StateGraph, END

from graph_state import GraphState
from nodes import fetch_node

# Minimal graph for this Story (שליפה וסינון לוגים): fetch_node only.
# classify_node / evaluator_node / the Gate / summarize_node / guardrails_node /
# present_node will be added and wired in here by the following Stories
# (SCRUM-299, SCRUM-300).
graph_builder = StateGraph(GraphState)

graph_builder.add_node("fetch", fetch_node)

graph_builder.set_entry_point("fetch")
graph_builder.add_edge("fetch", END)

graph = graph_builder.compile()


if __name__ == "__main__":
    result = graph.invoke({})
    print(f"Fetched {len(result['records'])} records")
