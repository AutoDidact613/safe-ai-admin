from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph
from langgraph.types import interrupt

from .nodes import (
    collect_data_node,
    consensus_evaluator_node,
    generate_release_node,
    guardrail_node,
    model_a_node,
    model_b_node,
)
from .state import VersionManagerState


# --- 1. פונקציות ניתוב והתניה (Conditional Edges) ---
def route_guardrail(state: VersionManagerState) -> str:
  """בדיקה האם הבקשה אושרה על ידי ה-Guardrail."""
  if state.get("is_valid_request", False):
    return "collect_data"
  return END


# --- 2. צומת אישור אנושי (Human-in-the-Loop) ---
def human_approval_node(state: VersionManagerState) -> dict:
  """עצירת התהליך לבקשת אישור ידני מהמשתמש לפני שחרור גרסה."""
  summary = state.get("consensus_summary", "")
  has_conflict = state.get("has_conflict", False)
  discrepancy = state.get("discrepancy_details")

  approval_prompt = {
      "message": "נדרש אישור לשחרור גרסה",
      "target_version": state.get("target_version"),
      "summary": summary,
      "has_conflict": has_conflict,
      "discrepancy": discrepancy,
  }

  user_decision = interrupt(approval_prompt)

  approved = (
      user_decision.get("approved", False)
      if isinstance(user_decision, dict)
      else bool(user_decision)
  )

  return {"human_approved": approved}


def route_human_decision(state: VersionManagerState) -> str:
  """ניתוב לפי החלטת המשתמש."""
  if state.get("human_approved", False):
    return "generate_release"
  return END


# --- 3. בניית הגרף (StateGraph) ---
def create_version_manager_graph(checkpointer=None):
  builder = StateGraph(VersionManagerState)

  builder.add_node("guardrail", guardrail_node)
  builder.add_node("collect_data", collect_data_node)
  builder.add_node("model_a", model_a_node)
  builder.add_node("model_b", model_b_node)
  builder.add_node("consensus_evaluator", consensus_evaluator_node)
  builder.add_node("human_approval", human_approval_node)
  builder.add_node("generate_release", generate_release_node)

  builder.set_entry_point("guardrail")

  builder.add_conditional_edges(
      "guardrail",
      route_guardrail,
      {"collect_data": "collect_data", END: END},
  )

  builder.add_edge("collect_data", "model_a")
  builder.add_edge("model_a", "model_b")
  builder.add_edge("model_b", "consensus_evaluator")
  builder.add_edge("consensus_evaluator", "human_approval")

  builder.add_conditional_edges(
      "human_approval",
      route_human_decision,
      {"generate_release": "generate_release", END: END},
  )

  builder.add_edge("generate_release", END)

  # שימוש ב-checkpointer ברירת מחדל אם לא סופק מבחוץ
  if checkpointer is None:
    checkpointer = MemorySaver()

  return builder.compile(checkpointer=checkpointer)