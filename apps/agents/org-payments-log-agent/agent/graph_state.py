from typing import List, TypedDict


class GraphState(TypedDict, total=False):
    records: List[dict]  # raw log records from fetch_node
    classified: List[dict]  # populated by classify_node (Story: סיווג וזיהוי חריגות)
    anomalies: List[dict]  # populated by evaluator_node (Story: סיווג וזיהוי חריגות)
    summary: str  # populated by summarize_node (Story: דוח + LLM + Gate), only on the "anomalies found" path
