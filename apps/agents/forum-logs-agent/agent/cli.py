import sys
import time
from datetime import datetime
from typing import Any, Dict

# מבטיח קידוד UTF-8 לפלט (עברית + סימנים כמו ✔), בלי תלות בקידוד הקונסולה של Windows (cp1255/cp1252)
# שגורם ל-UnicodeEncodeError בעת הרצה כ-exe עצמאי.
for _stream in (sys.stdout, sys.stderr):
    if getattr(_stream, "encoding", "").lower() != "utf-8":
        try:
            _stream.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass

from agent.graph import app
from agent.nodes import interpret_user_request, summarize_usage

NODE_LABELS = {
    "fetch_logs": "שליפת לוגים",
    "perf_analyzer": "ניתוח ביצועים",
    "error_analyzer": "ניתוח שגיאות",
    "summary": "הפקת סקירה כללית",
    "evaluator": "בדיקת איכות",
    "report_generator": "הפקת דוח סופי",
}


def _print_step(node_name: str, node_output: Dict[str, Any]) -> None:
    label = NODE_LABELS.get(node_name, node_name)
    print(f"  ✔ {label} הושלם")

    if node_name == "evaluator":
        status = (node_output.get("evaluation_result") or {}).get("status")
        if status == "failed":
            print("    ↻ הבדיקה נכשלה, מריצים ניתוח מחדש...")
        elif status == "passed_with_warnings":
            print("    ⚠ הגיעו למספר הניסיונות המקסימלי, ממשיכים עם אזהרה")


def run_graph(query_filter: Dict[str, Any]) -> Dict[str, Any]:
    initial_state = {"query_filter": query_filter}
    final_state: Dict[str, Any] = {}

    print("\nמריצה את האייג'נט...")
    start_time = time.time()
    for step in app.stream(initial_state, stream_mode="updates"):
        for node_name, node_output in step.items():
            _print_step(node_name, node_output)
            final_state.update(node_output)

    final_state["_run_duration_sec"] = round(time.time() - start_time, 2)
    return final_state


def format_usage_line(final_state: Dict[str, Any]) -> str:
    usage_summary = summarize_usage(final_state.get("llm_usage", []))
    duration_sec = final_state.get("_run_duration_sec")

    if not usage_summary["llm_calls"]:
        return ""

    duration_part = f" | זמן ריצה: {duration_sec}s" if duration_sec is not None else ""
    return (
        f"📊 שימוש בריצה זו: {usage_summary['llm_calls']} קריאות LLM | "
        f"{usage_summary['total_tokens']:,} טוקנים "
        f"(קלט {usage_summary['total_input_tokens']:,} · פלט {usage_summary['total_output_tokens']:,}) | "
        f"עלות משוערת: ${usage_summary['total_cost_usd']}"
        f"{duration_part}"
    )


def prompt_guided_filter() -> Dict[str, Any]:
    print("\n-- סינון מודרך (שדה ריק = לא מסננים לפיו) --")
    query_filter: Dict[str, Any] = {}

    level = input("level (למשל error/warn/info): ").strip()
    if level:
        query_filter["level"] = level

    date_from = input("מתאריך (YYYY-MM-DD): ").strip()
    date_to = input("עד תאריך (YYYY-MM-DD): ").strip()
    if date_from or date_to:
        timestamp_filter: Dict[str, str] = {}
        if date_from:
            timestamp_filter["$gte"] = date_from
        if date_to:
            timestamp_filter["$lte"] = date_to
        query_filter["timestamp"] = timestamp_filter

    user_id = input("userId: ").strip()
    if user_id:
        query_filter["userId"] = user_id

    organization_id = input("organizationId: ").strip()
    if organization_id:
        query_filter["organizationId"] = organization_id

    request_id = input("requestId: ").strip()
    if request_id:
        query_filter["requestId"] = request_id

    return query_filter


def prompt_menu() -> str:
    print("\n=== אייג'נט לוגים ===")
    print("1) שאלה בשפה חופשית")
    print("2) סינון מודרך")
    print("3) יציאה")
    return input("בחירה: ").strip()


def offer_save_report(report_text: str) -> None:
    save_choice = input("\nלשמור את הדוח לקובץ? (כן/לא): ").strip().lower()
    if save_choice not in ("כן", "y", "yes"):
        return

    default_name = f"log_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    path = input(f"נתיב לשמירה (ריק = {default_name}): ").strip() or default_name

    with open(path, "w", encoding="utf-8") as report_file:
        report_file.write(report_text)

    print(f"נשמר ל-{path}")


def offer_run_again() -> bool:
    again = input("\nלהריץ שאילתה נוספת? (כן/לא): ").strip().lower()
    return again in ("כן", "y", "yes")


def build_run_summary(query_filter: Dict[str, Any], final_state: Dict[str, Any]) -> str:
    raw_logs = final_state.get("raw_logs", [])
    performance_analysis = final_state.get("performance_analysis") or {}
    error_analysis = final_state.get("error_analysis") or {}
    evaluation_status = (final_state.get("evaluation_result") or {}).get("status", "unknown")
    usage_line = format_usage_line(final_state)

    lines = [
        "# תקציר ריצה",
        "",
        f"- פילטר: `{query_filter or '{}'}`",
        f"- לוגים שנותחו: {len(raw_logs)}",
        f"- שגיאות: {error_analysis.get('total_errors_count', 0)}",
        f"- פעולות איטיות: {performance_analysis.get('slow_queries_count', 0)}",
        f"- סטטוס בדיקת איכות: {evaluation_status}",
    ]
    if usage_line:
        lines.append(f"- {usage_line}")

    return "\n".join(lines) + "\n"


def offer_save_run_summary(query_filter: Dict[str, Any], final_state: Dict[str, Any]) -> None:
    save_choice = input("\nלשמור גם תקציר ריצה קצר? (כן/לא): ").strip().lower()
    if save_choice not in ("כן", "y", "yes"):
        return

    default_name = f"run_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    path = input(f"נתיב לשמירה (ריק = {default_name}): ").strip() or default_name

    with open(path, "w", encoding="utf-8") as summary_file:
        summary_file.write(build_run_summary(query_filter, final_state))

    print(f"נשמר ל-{path}")


def main() -> None:
    print("ברוכה הבאה לאייג'נט הלוגים.")

    while True:
        choice = prompt_menu()

        if choice == "3" or choice.lower() in ("exit", "quit", "q"):
            print("להתראות!")
            return

        if choice == "1":
            user_request = input("מה תרצי לבדוק? ").strip()
            interpretation = interpret_user_request(user_request)

            if not interpretation.get("is_relevant", True):
                refusal_reason = interpretation.get("refusal_reason") or "הבקשה אינה קשורה לניתוח לוגים."
                print(f"\n✖ {refusal_reason}")
                continue

            query_filter = interpretation.get("query_filter", {})
        elif choice == "2":
            query_filter = prompt_guided_filter()
        else:
            print("בחירה לא מוכרת, נסי שוב.")
            continue

        final_state = run_graph(query_filter)

        error_message = final_state.get("error_message")
        final_report = final_state.get("final_report")

        print()
        if final_report:
            print("=" * 60)
            print(final_report)
            print("=" * 60)
            offer_save_report(final_report)
        elif error_message:
            print(f"✖ שגיאה: {error_message}")
        else:
            print("לא התקבל דוח.")

        usage_line = format_usage_line(final_state)
        if usage_line:
            print(f"\n{usage_line}")

        offer_save_run_summary(query_filter, final_state)

        if not offer_run_again():
            print("להתראות!")
            return


if __name__ == "__main__":
    main()
