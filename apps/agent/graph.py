from functools import partial
from typing import Optional

from langgraph.checkpoint.mongodb import MongoDBSaver
from langgraph.graph import END, StateGraph
from pymongo import MongoClient

from api_client import SafeAIClient
from config import Config
from graph_state import GraphState
from nodes import (
    classify_node,
    draft_node,
    evaluator_node,
    fetch_node,
    guardrails_gate,
    guardrails_node,
    present_node,
    send_node,
)
from rag import ArticleRetriever


def build_graph(config: Config, client: SafeAIClient, mongo_client: Optional[MongoClient] = None):
    builder = StateGraph(GraphState)

    # אם לא הועבר mongo_client קיים - נוצר כאן מופע חדש (זה מה שקורה ב-CLI,
    # שם התהליך נסגר ממילא בסוף כל פקודה, כך שאין בעיה שהוא לא נסגר במפורש).
    # api.py לעומת זאת רץ כתהליך ארוך-חיים ומטפל בהרבה בקשות - שם *חובה*
    # להעביר mongo_client משותף אחד (ראה _get_mongo_client שם), אחרת כל
    # קריאה ל-/run/list או /run/process הייתה פותחת connection pool חדש
    # ל-Atlas בלי לסגור את הקודם, עד לדליפת חיבורים.
    # MongoClient is created directly (not via from_conn_string, a generator-based
    # @contextmanager) so it stays referenced as a plain variable and isn't closed
    # by the garbage collector while the graph is still using it.
    if mongo_client is None:
        mongo_client = MongoClient(config.mongodb_atlas_uri)
    article_retriever = ArticleRetriever(
        mongo_client["inquiry_agent_knowledge"]["article_embeddings"], config
    )

    builder.add_node("fetch_node", partial(fetch_node, client=client))
    builder.add_node("classify_node", partial(classify_node, agent_config=config))
    builder.add_node("present_node", present_node)
    # GATE 1 (selection_gate): HITL interrupt before draft_node - admin selects
    # which inquiry IDs go into state["selected_ids"] before resuming.
    builder.add_node(
        "draft_node",
        partial(draft_node, agent_config=config, retriever=article_retriever),
    )
    builder.add_node("guardrails_node", partial(guardrails_node, agent_config=config))
    builder.add_node("evaluator_node", evaluator_node)
    # GATE 3 (evaluator_gate): HITL interrupt before send_node - admin approves
    # (populates state["approved_ids"]) or sends the run back to draft_node.
    builder.add_node("send_node", partial(send_node, client=client))

    builder.set_entry_point("fetch_node")
    builder.add_edge("fetch_node", "classify_node")
    builder.add_edge("classify_node", "present_node")
    builder.add_edge("present_node", "draft_node")
    builder.add_edge("draft_node", "guardrails_node")
    # GATE 2 (guardrails_gate): automated conditional edge, not human.
    builder.add_conditional_edges(
        "guardrails_node",
        guardrails_gate,
        {"draft_node": "draft_node", "evaluator_node": "evaluator_node"},
    )
    builder.add_edge("evaluator_node", "send_node")
    builder.add_edge("send_node", END)

    checkpointer = MongoDBSaver(mongo_client, db_name="inquiry_agent_checkpoints")

    return builder.compile(
        checkpointer=checkpointer,
        interrupt_before=["draft_node", "send_node"],
    )
