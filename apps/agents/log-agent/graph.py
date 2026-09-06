from langgraph.graph import StateGraph, END
from graph_state import GraphState
from nodes import fetch_node, count_node

graph_builder = StateGraph(GraphState)

graph_builder.add_node("fetch", fetch_node)
graph_builder.add_node("count", count_node)

graph_builder.set_entry_point("fetch")
graph_builder.add_edge("fetch", "count")
graph_builder.add_edge("count", END)

graph = graph_builder.compile()


if __name__ == "__main__":
    result = graph.invoke({})
    print(result)