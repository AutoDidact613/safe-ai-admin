from datetime import datetime
from typing import List, TypedDict


class GraphState(TypedDict, total=False):
    start_date: datetime  # optional, set by cli.py from CLI args
    end_date: datetime  # optional, set by cli.py from CLI args
    records: List[dict]  # raw log records from fetch_node
    classified: List[dict]  # populated by classify_node (Story: סיווג וזיהוי חריגות)
    anomalies: List[dict]  # populated by evaluator_node (Story: סיווג וזיהוי חריגות)
    summary: str  # populated by summarize_node (LLM), only on the "anomalies found" path
    report: str  # populated by present_node - the final text shown to the admin
