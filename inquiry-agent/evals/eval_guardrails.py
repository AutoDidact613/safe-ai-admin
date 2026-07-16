"""Eval: measures check_draft() precision/recall against a labeled fixture set.

Run with: python evals/eval_guardrails.py
Writes results to evals/output/eval_guardrails.csv
"""
import csv
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from guardrails import check_draft

FIXTURES = [
    {
        "inquiry": {"id": "1", "title": "foo", "description": "bar"},
        "draft": "Lorem ipsum dolor sit amet.",
        "expected_passed": True,
    },
    {
        "inquiry": {"id": "2", "title": "foo", "description": "bar"},
        "draft": "Contact other.user@example.com, 100% guaranteed fix.",
        "expected_passed": False,
    },
]

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "output", "eval_guardrails.csv")


def run():
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["inquiry_id", "expected_passed", "actual_passed", "reasons", "match"])

        for case in FIXTURES:
            result = check_draft(case["draft"], case["inquiry"])
            match = result["passed"] == case["expected_passed"]
            writer.writerow(
                [
                    case["inquiry"]["id"],
                    case["expected_passed"],
                    result["passed"],
                    "; ".join(result["reasons"]),
                    match,
                ]
            )


if __name__ == "__main__":
    run()
