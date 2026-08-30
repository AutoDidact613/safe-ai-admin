from typing import Any, Dict, List, TypedDict


class Reference(TypedDict):
    title: str
    url: str
    description: str


class TechStackRecommendation(TypedDict):
    recommendation: str
    reasoning: str


class GraphState(TypedDict, total=False):
    tender_id: str
    tender: Dict[str, Any]
    tech_stack: TechStackRecommendation
    open_source_references: List[Reference]
    reading_sources: List[Reference]
    research_failed: bool
    document: str
    status: str
