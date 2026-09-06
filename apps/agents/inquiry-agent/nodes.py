from api_client import SafeAIClient
from classify import classify_inquiry
from config import Config
from draft_reply import generate_draft
from graph_state import GraphState
from guardrails import check_draft
from rag import ArticleRetriever

_MAX_DRAFT_RETRIES = 2


def fetch_node(state: GraphState, client: SafeAIClient) -> GraphState:
    print("שולף פניות מהאתר...")
    state["inquiries"] = client.fetch_open_inquiries()
    return state


def classify_node(state: GraphState, agent_config: Config) -> GraphState:
    inquiries = state.get("inquiries", [])
    print(f"מסווג {len(inquiries)} פניות...")
    classified = {}
    for inquiry in inquiries:
        classified[inquiry["id"]] = classify_inquiry(inquiry["description"], agent_config)
    state["classified"] = classified
    return state


def present_node(state: GraphState) -> GraphState:
    urgency_order = {"urgent": 0, "normal": 1, "low": 2}
    state["inquiries"] = sorted(
        state.get("inquiries", []),
        key=lambda inquiry: urgency_order.get(
            state["classified"].get(inquiry["id"], {}).get("urgency", "normal"), 1
        ),
    )
    return state


def draft_node(
    state: GraphState, agent_config: Config, retriever: ArticleRetriever
) -> GraphState:
    selected = state.get("selected_ids", [])
    print(f"מנסח {len(selected)} טיוטות תשובה...")
    drafts = state.get("drafts", {})
    by_id = {inquiry["id"]: inquiry for inquiry in state.get("inquiries", [])}
    for inquiry_id in selected:
        inquiry = by_id[inquiry_id]
        category = state["classified"][inquiry_id]["category"]
        articles = retriever.find_relevant(inquiry["description"])
        drafts[inquiry_id] = {
            "inquiry_id": inquiry_id,
            "text": generate_draft(inquiry, category, articles, agent_config),
        }
    state["drafts"] = drafts
    return state


def guardrails_node(state: GraphState, agent_config: Config) -> GraphState:
    by_id = {inquiry["id"]: inquiry for inquiry in state.get("inquiries", [])}
    results = {}
    for inquiry_id, draft in state.get("drafts", {}).items():
        results[inquiry_id] = check_draft(draft["text"], by_id[inquiry_id], agent_config)
    state["guardrail_results"] = results

    # Bookkeeping lives here, not in guardrails_gate: LangGraph only persists
    # a *node's* return value across an interrupt/resume boundary, not a
    # conditional-edge function's in-place mutations - counting retries in
    # the gate silently reset to 0 on every resume, so the cap never engaged.
    retry_counts = state.setdefault("retry_counts", {})
    for inquiry_id, result in results.items():
        if not result["passed"]:
            retry_counts[inquiry_id] = retry_counts.get(inquiry_id, 0) + 1

    return state


def guardrails_gate(state: GraphState) -> str:
    retry_counts = state.get("retry_counts", {})
    for inquiry_id, result in state.get("guardrail_results", {}).items():
        if not result["passed"] and retry_counts.get(inquiry_id, 0) <= _MAX_DRAFT_RETRIES:
            return "draft_node"
    return "evaluator_node"


def evaluator_node(state: GraphState) -> GraphState:
    """No-op by design: the admin *is* the evaluator (per spec).
    This node exists as the graph's HITL pause point before send_node -
    no automated evaluation happens here."""
    return state


def send_node(state: GraphState, client: SafeAIClient) -> GraphState:
    approved = state.get("approved_ids", [])
    print(f"שולח {len(approved)} תשובות...")
    for inquiry_id in approved:
        draft = state["drafts"][inquiry_id]
        client.post_reply(inquiry_id, draft["text"])
        # הפנייה לא נסגרת אוטומטית אחרי שליחת התשובה: ייתכן שלמשתמש תהיה
        # שאלת המשך על אותה פנייה, ולכן היא צריכה להישאר open. סגירת
        # הפנייה היא פעולה ידנית שהמנהל מבצע בעצמו דרך פאנל הניהול.
    return state
