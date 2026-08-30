import argparse
import sys

import requests
from google.genai import errors as genai_errors

from api_client import SafeAIClient
from config import ConfigError, load_config
from graph import build_graph


def _report_failure(client: SafeAIClient, tender_id: str, message: str) -> None:
    """מסמן status=failed ישירות דרך ה-API כשהריצה נכשלת מחוץ ל-save_node
    (fetch_node/tech_stack_node/research_node קרסו), כדי שהמשתמש לא יישאר
    תקוע ב-'generating' לנצח (SCRUM-293/SCRUM-290)."""
    try:
        client.save_specification(tender_id, {"status": "failed", "errorMessage": message})
    except requests.exceptions.RequestException:
        # אם גם קריאת הכשל עצמה נכשלת (למשל השרת למטה) - אין מה לעשות מעבר
        # ל-exit code שגוי; ה-runner בצד השרת (SCRUM-293) מסמן failed בעצמו
        # אחרי timeout, כרשת ביטחון שנייה.
        pass


def cmd_generate(args: argparse.Namespace) -> None:
    try:
        config = load_config()
    except ConfigError as e:
        sys.exit(f"שגיאת הגדרות: {e}")

    client = SafeAIClient(config)

    try:
        graph = build_graph(config, client)
        state = graph.invoke({"tender_id": args.tender_id})
    except requests.exceptions.RequestException as e:
        message = f"שגיאת תקשורת עם השרת: {e}"
        _report_failure(client, args.tender_id, message)
        sys.exit(message)
    except genai_errors.APIError as e:
        message = f"שגיאה בקריאה ל-Gemini: {e}"
        _report_failure(client, args.tender_id, message)
        sys.exit(message)
    except Exception as e:  # noqa: BLE001 - כל כשל לא-צפוי חייב לסמן status=failed, לא להיתקע ב-generating
        message = f"שגיאה לא צפויה בהרצת ה-agent: {e}"
        _report_failure(client, args.tender_id, message)
        sys.exit(message)

    print(f"אפיון עבור מכרז {args.tender_id} הופק ונשמר בהצלחה (סטטוס: {state.get('status', 'ready')}).")


def main() -> None:
    parser = argparse.ArgumentParser(description="SafeAI tender-spec agent CLI")
    subparsers = parser.add_subparsers(required=True)

    generate_parser = subparsers.add_parser(
        "generate",
        help="generate a tech-stack recommendation, similar-project research, and a spec document for one tender",
    )
    generate_parser.add_argument("--tender-id", required=True)
    generate_parser.set_defaults(func=cmd_generate)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
