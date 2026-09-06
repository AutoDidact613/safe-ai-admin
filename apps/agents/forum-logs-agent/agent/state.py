from typing import TypedDict, List, Dict, Any, Optional


class LogAnalysisState(TypedDict):
    query_filter: Optional[Dict[str, Any]]
    raw_logs: List[Dict[str, Any]]
    
    # Sub-task 4: Summary Overview
    log_summary: Optional[str]
    
    # Sub-tasks 2 & 3: Detailed Analyses
    error_analysis: Optional[Dict[str, Any]]
    performance_analysis: Optional[Dict[str, Any]]
    
    # Sub-task 5: Evaluation & Loop
    evaluation_result: Optional[Dict[str, Any]]
    retry_count: int
    evaluation_feedback: Optional[str]
    
    # Sub-task 6: Final Output
    final_report: Optional[str]
    error_message: Optional[str]

    # Evals: usage per LLM call (node, model, input/output/total tokens), לצורך מדידת עלות/טוקנים
    llm_usage: List[Dict[str, Any]]