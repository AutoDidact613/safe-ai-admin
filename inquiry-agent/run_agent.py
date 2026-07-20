import argparse
import uuid

from api_client import SafeAIClient
from config import load_config
from graph import build_graph


def _thread_config(thread_id: str) -> dict:
    return {"configurable": {"thread_id": thread_id}}


def cmd_list(_args: argparse.Namespace) -> None:
    config = load_config()
    client = SafeAIClient(config)
    graph = build_graph(config, client)

    thread_id = str(uuid.uuid4())
    state = graph.invoke({}, _thread_config(thread_id))

    print(f"thread-id: {thread_id}")
    print(f"{'ID':<10}{'URGENCY':<10}TITLE")
    for inquiry in state.get("inquiries", []):
        urgency = state["classified"].get(inquiry["id"], {}).get("urgency", "?")
        print(f"{inquiry['id']:<10}{urgency:<10}{inquiry['title']}")


def cmd_process(args: argparse.Namespace) -> None:
    config = load_config()
    client = SafeAIClient(config)
    graph = build_graph(config, client)
    thread_config = _thread_config(args.thread_id)

    snapshot = graph.get_state(thread_config)
    next_nodes = snapshot.next

    if "draft_node" in next_nodes:
        if not args.ids:
            raise SystemExit("--ids is required to select inquiries at this stage")
        selected_ids = args.ids.split(",")
        graph.update_state(thread_config, {"selected_ids": selected_ids})
        state = graph.invoke(None, thread_config)

        print(f"thread-id: {args.thread_id}")
        for inquiry_id, draft in state.get("drafts", {}).items():
            print(f"--- {inquiry_id} ---")
            print(draft["text"])

    elif "send_node" in next_nodes:
        if not args.approve:
            raise SystemExit("--approve is required to send replies at this stage")
        approved_ids = args.approve.split(",")
        graph.update_state(thread_config, {"approved_ids": approved_ids})
        graph.invoke(None, thread_config)
        print(f"Sent replies for: {', '.join(approved_ids)}")

    else:
        raise SystemExit("This run has no pending step (already completed or not started)")


def main() -> None:
    parser = argparse.ArgumentParser(description="SafeAI inquiry agent CLI")
    subparsers = parser.add_subparsers(required=True)

    list_parser = subparsers.add_parser("list", help="fetch, classify, and list open inquiries")
    list_parser.set_defaults(func=cmd_list)

    process_parser = subparsers.add_parser(
        "process", help="resume a paused run: select inquiries to draft, or approve drafts to send"
    )
    process_parser.add_argument("--thread-id", required=True)
    process_parser.add_argument("--ids", help="comma-separated inquiry IDs to draft replies for")
    process_parser.add_argument("--approve", help="comma-separated inquiry IDs to approve and send")
    process_parser.set_defaults(func=cmd_process)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
