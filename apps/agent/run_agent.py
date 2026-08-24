import argparse
import sys
import uuid

import requests
from google.genai import errors as genai_errors

import usage_tracker
from agent_ops import GraphStateError, edit_draft, resume_with_approval, resume_with_selection
from api_client import SafeAIClient
from config import ConfigError
from config import load_config
from graph import build_graph


def _thread_config(thread_id: str) -> dict:
    return {"configurable": {"thread_id": thread_id}}


def cmd_list(_args: argparse.Namespace) -> None:
    usage_tracker.reset()
    try:
        config = load_config()
        client = SafeAIClient(config)
        graph = build_graph(config, client)

        thread_id = str(uuid.uuid4())
        config.thread_id = thread_id
        state = graph.invoke({}, _thread_config(thread_id))
    except ConfigError as e:
        sys.exit(f"שגיאת הגדרות: {e}")
    except requests.exceptions.RequestException as e:
        sys.exit(f"שגיאת תקשורת עם השרת: {e}")
    except genai_errors.APIError as e:
        sys.exit(f"שגיאה בקריאה ל-Gemini: {e}")

    print(f"thread-id: {thread_id}")
    print(f"{'ID':<10}{'URGENCY':<10}TITLE")
    for inquiry in state.get("inquiries", []):
        urgency = state["classified"].get(inquiry["id"], {}).get("urgency", "?")
        print(f"{inquiry['id']:<10}{urgency:<10}{inquiry['title']}")

    print(f"\nטוקנים בריצה זו: {usage_tracker.get_total_tokens(thread_id)}")


def cmd_process(args: argparse.Namespace) -> None:
    usage_tracker.reset()
    try:
        config = load_config()
        config.thread_id = args.thread_id
        client = SafeAIClient(config)
        graph = build_graph(config, client)
        thread_config = _thread_config(args.thread_id)

        snapshot = graph.get_state(thread_config)
        next_nodes = snapshot.next

        if "draft_node" in next_nodes:
            if not args.ids:
                raise SystemExit("--ids is required to select inquiries at this stage")
            selected_ids = args.ids.split(",")
            drafts = resume_with_selection(graph, thread_config, selected_ids)

            print(f"thread-id: {args.thread_id}")
            for inquiry_id, draft in drafts.items():
                print(f"--- {inquiry_id} (guardrails passed: {draft['guardrails_passed']}) ---")
                if draft["guardrails_reasons"]:
                    print(f"reasons: {draft['guardrails_reasons']}")
                print(draft["text"])

            print(f"\nטוקנים בריצה זו: {usage_tracker.get_total_tokens(args.thread_id)}")

        elif "send_node" in next_nodes:
            if args.edit:
                inquiry_id = args.edit
                current_draft = snapshot.values.get("drafts", {}).get(inquiry_id, {})

                print(f"טיוטה נוכחית עבור {inquiry_id}:")
                print(current_draft.get("text", ""))
                print("\nהקלד את הטיוטה החדשה, ואז שורה ריקה לסיום:")

                lines = []
                while True:
                    line = input()
                    if line == "":
                        break
                    lines.append(line)

                edit_draft(graph, thread_config, inquiry_id, "\n".join(lines))
                print("הטיוטה עודכנה")
                return

            if not args.approve:
                raise SystemExit("--approve is required to send replies at this stage")
            approved_ids = args.approve.split(",")
            resume_with_approval(graph, thread_config, approved_ids)
            print(f"Sent replies for: {', '.join(approved_ids)}")

            print(f"\nטוקנים בריצה זו: {usage_tracker.get_total_tokens(args.thread_id)}")

        else:
            # Known gap (tracked separately, not fixed here): if a run crashes inside
            # guardrails_node or evaluator_node (e.g. a transient LLM error), next_nodes
            # is ("guardrails_node",) / ("evaluator_node",) - neither branch above matches,
            # so it lands here as "no pending step" even though the run is actually stuck
            # mid-graph. Resuming in that case requires calling graph.invoke(None, thread_config)
            # directly rather than through this CLI.
            raise SystemExit("This run has no pending step (already completed or not started)")
    except GraphStateError as e:
        sys.exit(str(e))
    except ConfigError as e:
        sys.exit(f"שגיאת הגדרות: {e}")
    except requests.exceptions.RequestException as e:
        sys.exit(f"שגיאת תקשורת עם השרת: {e}")
    except genai_errors.APIError as e:
        sys.exit(f"שגיאה בקריאה ל-Gemini: {e}")


def main() -> None:
    parser = argparse.ArgumentParser(description="SafeAI inquiry agent CLI")
    subparsers = parser.add_subparsers(required=True)

    list_parser = subparsers.add_parser("list", help="fetch, classify, and list open inquiries")
    list_parser.set_defaults(func=cmd_list)

    process_parser = subparsers.add_parser(
        "process",
        help="resume a paused run: select inquiries to draft, edit a draft, or approve drafts to send",
    )
    process_parser.add_argument("--thread-id", required=True)
    process_parser.add_argument("--ids", help="comma-separated inquiry IDs to draft replies for")
    process_parser.add_argument("--edit", help="inquiry ID to edit the draft for")
    process_parser.add_argument("--approve", help="comma-separated inquiry IDs to approve and send")
    process_parser.set_defaults(func=cmd_process)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
