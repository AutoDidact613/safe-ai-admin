from langgraph.graph import StateGraph, END
from agent.state import LogAnalysisState
from agent.nodes import (
    fetch_logs_node,
    performance_analyzer_node,
    error_analyzer_node,
    summary_node,
    evaluator_node,
    report_generator_node,
)


def decide_evaluator_route(state: LogAnalysisState) -> str:
    """
    Conditional Edge Logic:
    Determines if the graph should loop back for a retry or proceed to report generation.
    """
    eval_result = state.get("evaluation_result", {})
    status = eval_result.get("status")

    if status == "failed":
        # Loop back to re-run analyses with feedback
        return "retry"
    
    # Status is 'passed' or 'passed_with_warnings'
    return "proceed"


def build_graph():
    # 1. Initialize StateGraph with custom state schema
    workflow = StateGraph(LogAnalysisState)

    # 2. Add Nodes
    workflow.add_node("fetch_logs", fetch_logs_node)
    workflow.add_node("perf_analyzer", performance_analyzer_node)
    workflow.add_node("error_analyzer", error_analyzer_node)
    workflow.add_node("summary", summary_node)
    workflow.add_node("evaluator", evaluator_node)
    workflow.add_node("report_generator", report_generator_node)

    # 3. Set Entry Point
    workflow.set_entry_point("fetch_logs")

    # 4. Add Standard Edges (Sequential steps)
    workflow.add_edge("fetch_logs", "perf_analyzer")
    workflow.add_edge("perf_analyzer", "error_analyzer")
    workflow.add_edge("error_analyzer", "summary")
    workflow.add_edge("summary", "evaluator")

    # 5. Add Conditional Edge for Validation Loop (Sub-task 5)
    workflow.add_conditional_edges(
        "evaluator",
        decide_evaluator_route,
        {
            "retry": "perf_analyzer",      # Loop back to re-analyze
            "proceed": "report_generator"  # Move forward to final report
        }
    )

    # 6. Set End Node
    workflow.add_edge("report_generator", END)

    # Compile into an executable graph app
    return workflow.compile()


# Compiled app ready to run
app = build_graph()