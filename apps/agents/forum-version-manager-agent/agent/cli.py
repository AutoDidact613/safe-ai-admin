from datetime import datetime
import os
from pathlib import Path
import sys
from dotenv import load_dotenv
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph
from langgraph.types import Command

# הוספת תיקיית השורש של האייג'נט לנתיב כדי לאפשר ייבוא תקין
sys.path.append(str(Path(__file__).resolve().parent.parent))

from agent.graph import human_approval_node, route_guardrail, route_human_decision
from agent.nodes import (
    collect_data_node,
    consensus_evaluator_node,
    generate_release_node,
    guardrail_node,
    model_a_node,
    model_b_node,
)
from agent.state import VersionManagerState

load_dotenv()


def print_banner():
  print("=" * 60)
  print("🤖  Forum Version Manager Agent — מערכת שחרור גרסאות")
  print("=" * 60)


def main():
  print_banner()

  # יצירת מנגנון שמירת מצב (נדרש עבור interrupt ב-LangGraph)
  checkpointer = MemorySaver()

  # בניית הגרף
  builder = StateGraph(VersionManagerState)
  builder.add_node("guardrail", guardrail_node)
  builder.add_node("collect_data", collect_data_node)
  builder.add_node("model_a", model_a_node)
  builder.add_node("model_b", model_b_node)
  builder.add_node("consensus_evaluator", consensus_evaluator_node)
  builder.add_node("human_approval", human_approval_node)
  builder.add_node("generate_release", generate_release_node)

  builder.set_entry_point("guardrail")
  builder.add_conditional_edges(
      "guardrail",
      route_guardrail,
      {"collect_data": "collect_data", END: END},
  )
  builder.add_edge("collect_data", "model_a")
  builder.add_edge("model_a", "model_b")
  builder.add_edge("model_b", "consensus_evaluator")
  builder.add_edge("consensus_evaluator", "human_approval")
  builder.add_conditional_edges(
      "human_approval",
      route_human_decision,
      {"generate_release": "generate_release", END: END},
  )
  builder.add_edge("generate_release", END)

  app = builder.compile(checkpointer=checkpointer)

  user_input = input(
      "\n📝 הזן בקשת שחרור (לדוגמה: 'הכן גרסה 1.0.1 לפורום'): "
  ).strip()
  if not user_input:
    print("❌ לא הוזן קלט. היציאה מתבצעת.")
    return

  version_input = input("📌 הזן מספר גרסת יעד (לדוגמה: 1.0.1): ").strip()
  if not version_input:
    version_input = "1.0.0"

  initial_state = {
      "user_request": user_input,
      "target_version": version_input,
      "user_id": "cli_user",
      "org_id": "default_org",
      "request_id": None,
      "is_valid_request": False,
      "guardrail_reason": None,
      "forum_logs": [],
      "code_test_results": {},
      "model_a_result": {},
      "model_b_result": {},
      "has_conflict": False,
      "consensus_summary": "",
      "discrepancy_details": None,
      "human_approved": False,
      "final_html_report": None,
      "release_tag": None,
  }

  thread_config = {"configurable": {"thread_id": "forum_release_thread_1"}}

  print("\n⏳ מתחיל תהליך עיבוד וסריקה...")

  # הרצה ראשונית עד לעצירה (interrupt) או סיום
  for event in app.stream(initial_state, config=thread_config):
    for node_name, state_update in event.items():
      print(f"✔️ שלב הסתיים: [{node_name}]")

  # בדיקת מצב הגרף לאחר העצירה
  state = app.get_state(thread_config)

  # אם נחסם ב-Guardrail
  if not state.values.get("is_valid_request", False):
    print(
        f"\n⛔ הבקשה נחסמה על ידי רכיב האבטחה:"
        f" {state.values.get('guardrail_reason')}"
    )
    return

  # טיפול בעצירה עבור אישור אנושי (Human-in-the-Loop)
  if state.next and "human_approval" in state.next:
    print("\n" + "-" * 50)
    print("🛑 נדרש אישור אנושי להמשך התהליך (HITL)")
    print("-" * 50)
    print(f"סטטוס הערכה: {state.values.get('consensus_summary')}")

    if state.values.get("has_conflict"):
      print("\n⚠️ שים לב: זוהתה סתירה בין המודלים!")
      print(state.values.get("discrepancy_details"))

    user_choice = (
        input("\nהאם לאשר את שחרור הגרסה והפקת הדוח? (y/n): ").strip().lower()
    )
    is_approved = user_choice in ["y", "yes", "כן"]

    print(f"\nהחלטתך: {'מאושר' if is_approved else 'נדחה'}. ממשיך בהרצה...")

    # המשך הריצה עם החלטת המשתמש
    for event in app.stream(
        Command(resume={"approved": is_approved}), config=thread_config
    ):
      for node_name, state_update in event.items():
        print(f"✔️ שלב הסתיים: [{node_name}]")

  # שליפת המצב הסופי
  final_state = app.get_state(thread_config)

  if final_state.values.get("final_html_report"):
    # נתיב תיקיית evals/results
    results_dir = Path(__file__).resolve().parent.parent / "reports"
    results_dir.mkdir(parents=True, exist_ok=True)

    # יצירת שם ייחודי עם חותמת זמן למניעת דריסה
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = (
        results_dir / f"release_report_{version_input}_{timestamp}.html"
    )

    with open(output_file, "w", encoding="utf-8") as f:
      f.write(final_state.values["final_html_report"])

    print("\n" + "=" * 60)
    print("🎉 תהליך השחרור הושלם בהצלחה!")
    print(f"🏷️  תגית גרסה שנוצרה: {final_state.values.get('release_tag')}")
    print(f"📄 דוח HTML נשמר בנתיב: {output_file}")
    print("=" * 60)
  else:
    print("\n🛑 התהליך הסתיים ללא הפקת שחרור (לא אושר או נדחה).")


if __name__ == "__main__":
  main()