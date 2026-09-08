from functools import partial

from langgraph.graph import END, StateGraph

from api_client import SafeAIClient
from config import Config
from graph_state import GraphState
from nodes import fetch_node, research_node, save_node, spec_document_node, tech_stack_node


def build_graph(config: Config, client: SafeAIClient):
    builder = StateGraph(GraphState)

    builder.add_node("fetch_node", partial(fetch_node, client=client))
    builder.add_node("tech_stack_node", partial(tech_stack_node, agent_config=config))
    builder.add_node("research_node", partial(research_node, agent_config=config))
    builder.add_node("spec_document_node", spec_document_node)
    builder.add_node("save_node", partial(save_node, client=client))

    builder.set_entry_point("fetch_node")
    builder.add_edge("fetch_node", "tech_stack_node")
    builder.add_edge("tech_stack_node", "research_node")
    builder.add_edge("research_node", "spec_document_node")
    builder.add_edge("spec_document_node", "save_node")
    builder.add_edge("save_node", END)

    # בשונה מ-inquiry-agent: אין כאן HITL gates, כל ריצה היא מקצה-לקצה חד-פעמית
    # עבור מכרז בודד ומסתיימת בתהליך אחד - לכן אין צורך ב-checkpointer.
    return builder.compile()
