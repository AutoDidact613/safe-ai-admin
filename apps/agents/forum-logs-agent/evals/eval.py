import csv
import os
import sys
import time
from datetime import datetime, timezone

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from dotenv import load_dotenv  # noqa: E402

load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

from agent.nodes import (  # noqa: E402
    performance_analyzer_node,
    error_analyzer_node,
    summary_node,
    evaluator_node,
    report_generator_node,
    summarize_usage,
)

RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")

# קטעי לוגים מדומים ("log snippets") שמאפשרים להעריך עלות/טוקנים/זמן בלי תלות בחיבור MongoDB אמיתי.
FIXTURES = {
    "healthy_logs": [
        {"_id": "1", "level": "info", "message": "user logged in", "timestamp": "2026-08-25T09:00:00Z"},
        {"_id": "2", "level": "info", "message": "order created", "timestamp": "2026-08-25T09:05:00Z",
         "context": {"orderId": "ORD-100"}},
    ],
    "errors_and_slow_ops": [
        {"_id": "1", "level": "error", "message": "payment gateway timeout", "timestamp": "2026-08-25T10:00:00Z",
         "context": {"orderId": "ORD-1", "amount": 250}},
        {"_id": "2", "level": "info", "message": "slow database query", "execution_time_ms": 4200,
         "timestamp": "2026-08-25T10:05:00Z", "context": {"orderId": "ORD-2"}},
        {"_id": "3", "level": "error", "message": "payment gateway timeout", "timestamp": "2026-08-25T10:10:00Z",
         "context": {"orderId": "ORD-3", "amount": 90}},
    ],
    "business_context_heavy": [
        {"_id": "1", "level": "error", "message": "inventory check failed", "timestamp": "2026-08-25T11:00:00Z",
         "context": {"orderId": "ORD-9", "itemId": "ITEM-5", "amount": 500, "status": "out_of_stock"}},
        {"_id": "2", "level": "error", "message": "inventory check failed", "timestamp": "2026-08-25T11:02:00Z",
         "context": {"orderId": "ORD-10", "itemId": "ITEM-5", "amount": 120, "status": "out_of_stock"}},
    ],
}


def run_pipeline(raw_logs):
    """
    מריץ את שלבי הניתוח (2-6 בגרף) ברצף על raw_logs נתונים, בלי תלות ב-fetch_logs_node/MongoDB.
    """
    state = {"raw_logs": raw_logs, "retry_count": 0, "llm_usage": []}
    for node_fn in (
        performance_analyzer_node,
        error_analyzer_node,
        summary_node,
        evaluator_node,
        report_generator_node,
    ):
        state.update(node_fn(state))
    return state


def main():
    os.makedirs(RESULTS_DIR, exist_ok=True)
    run_timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    csv_path = os.path.join(RESULTS_DIR, f"cost_eval_{run_timestamp}.csv")

    rows = []
    for fixture_name, raw_logs in FIXTURES.items():
        print(f"מריצה fixture: {fixture_name} ({len(raw_logs)} לוגים)...")
        start_time = time.time()
        final_state = run_pipeline(raw_logs)
        duration_sec = round(time.time() - start_time, 2)

        usage_summary = summarize_usage(final_state.get("llm_usage", []))
        evaluation_status = (final_state.get("evaluation_result") or {}).get("status", "unknown")

        rows.append({
            "fixture_name": fixture_name,
            "num_logs": len(raw_logs),
            "duration_sec": duration_sec,
            "llm_calls": usage_summary["llm_calls"],
            "total_input_tokens": usage_summary["total_input_tokens"],
            "total_output_tokens": usage_summary["total_output_tokens"],
            "total_tokens": usage_summary["total_tokens"],
            "total_cost_usd": usage_summary["total_cost_usd"],
            "evaluation_status": evaluation_status,
            "run_timestamp_utc": datetime.now(timezone.utc).isoformat(),
        })
        print(f"  -> {duration_sec}s, {usage_summary['total_tokens']} tokens, ${usage_summary['total_cost_usd']}")

    with open(csv_path, "w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nנשמר ל-{csv_path}")


if __name__ == "__main__":
    main()
