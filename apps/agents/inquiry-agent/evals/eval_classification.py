"""Eval: measures classify_inquiry() accuracy against a labeled fixture set.

Calls the real Gemini API (no mocking) - run manually, not part of CI or pytest.

Run with: python evals/eval_classification.py
Fixtures: evals/fixtures/classification.json
Writes results to: evals/output/eval_classification.csv
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from _shared import load_fixtures, pace, report_and_exit, write_csv_report

from classify import classify_inquiry
from config import load_config

CATEGORY_ACCURACY_THRESHOLD = 0.9
URGENCY_ACCURACY_THRESHOLD = 0.8
EXACT_MATCH_ACCURACY_THRESHOLD = 0.7


def run() -> None:
    config = load_config()
    fixtures = load_fixtures("classification.json")

    rows = []
    category_correct = 0
    urgency_correct = 0
    exact_matches = 0
    error_count = 0

    for i, case in enumerate(fixtures):
        pace(i)
        try:
            actual = classify_inquiry(case["text"], config)
        except Exception as e:
            error_count += 1
            rows.append(
                {
                    "text": case["text"],
                    "expected_category": case["expected_category"],
                    "expected_urgency": case["expected_urgency"],
                    "actual_category": "ERROR",
                    "actual_urgency": "ERROR",
                    "category_match": False,
                    "urgency_match": False,
                    "exact_match": False,
                    "error": str(e),
                }
            )
            continue

        category_match = actual["category"] == case["expected_category"]
        urgency_match = actual["urgency"] == case["expected_urgency"]

        category_correct += category_match
        urgency_correct += urgency_match
        exact_matches += category_match and urgency_match

        rows.append(
            {
                "text": case["text"],
                "expected_category": case["expected_category"],
                "expected_urgency": case["expected_urgency"],
                "actual_category": actual["category"],
                "actual_urgency": actual["urgency"],
                "category_match": category_match,
                "urgency_match": urgency_match,
                "exact_match": category_match and urgency_match,
                "error": "",
            }
        )

    write_csv_report("eval_classification.csv", rows, fieldnames=list(rows[0].keys()))
    if error_count:
        print(f"classification: {error_count}/{len(fixtures)} case(s) errored (counted as misses)")

    total = len(fixtures)
    metrics = {
        "category_accuracy": category_correct / total,
        "urgency_accuracy": urgency_correct / total,
        "exact_match_accuracy": exact_matches / total,
    }
    thresholds = {
        "category_accuracy": CATEGORY_ACCURACY_THRESHOLD,
        "urgency_accuracy": URGENCY_ACCURACY_THRESHOLD,
        "exact_match_accuracy": EXACT_MATCH_ACCURACY_THRESHOLD,
    }
    report_and_exit("classification", metrics, thresholds)


if __name__ == "__main__":
    run()
