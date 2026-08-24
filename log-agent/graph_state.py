from typing import TypedDict
 
 
class GraphState(TypedDict):
    records: list[dict]
    summary: dict[str, int]
