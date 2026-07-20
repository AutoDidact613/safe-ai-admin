from api_client import SafeAIClient
from classify import classify_inquiry
from config import Config
from draft_reply import generate_draft
from graph_state import GraphState


def fetch_node(state: GraphState, client: SafeAIClient) -> GraphState:
    state["inquiries"] = client.fetch_open_inquiries()
    return state


def classify_node(state: GraphState, agent_config: Config) -> GraphState:
    classified = {}
    for inquiry in state.get("inquiries", []):
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


def draft_node(state: GraphState, agent_config: Config) -> GraphState:
    drafts = state.get("drafts", {})
    by_id = {inquiry["id"]: inquiry for inquiry in state.get("inquiries", [])}
    for inquiry_id in state.get("selected_ids", []):
        inquiry = by_id[inquiry_id]
        category = state["classified"][inquiry_id]["category"]
        drafts[inquiry_id] = {
            "inquiry_id": inquiry_id,
            "text": generate_draft(inquiry, category, agent_config),
        }
    state["drafts"] = drafts
    return state


def evaluator_node(state: GraphState) -> GraphState:
    return state


def send_node(state: GraphState, client: SafeAIClient) -> GraphState:
    for inquiry_id in state.get("approved_ids", []):
        draft = state["drafts"][inquiry_id]
        client.post_reply(inquiry_id, draft["text"])
        client.mark_handled(inquiry_id)
    return state
