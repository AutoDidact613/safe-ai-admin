from typing import Any, Dict, List, TypedDict


class Inquiry(TypedDict):
    id: str
    title: str
    description: str


class Classification(TypedDict):
    category: str
    urgency: str


class Draft(TypedDict):
    inquiry_id: str
    text: str


class GraphState(TypedDict, total=False):
    inquiries: List[Inquiry]
    classified: Dict[str, Classification]
    selected_ids: List[str]
    drafts: Dict[str, Draft]
    approved_ids: List[str]
    extra: Dict[str, Any]
