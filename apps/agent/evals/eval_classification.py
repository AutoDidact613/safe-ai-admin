"""Eval: measures classify_inquiry() accuracy against a labeled fixture set.

Run with: python evals/eval_classification.py
Writes results to evals/output/eval_classification.csv
"""
import csv
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from classify import classify_inquiry
from config import load_config

FIXTURES = [
    {"text": "Lorem ipsum dolor sit amet, consectetur.", "expected_category": "bug", "expected_urgency": "urgent"},
    {"text": "Lorem ipsum dolor sit amet.", "expected_category": "feature", "expected_urgency": "low"},
]

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "output", "eval_classification.csv")


def run():
    config = load_config()
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["text", "expected_category", "expected_urgency", "actual_category", "actual_urgency", "match"])

        for case in FIXTURES:
            actual = classify_inquiry(case["text"], config)
            match = (
                actual["category"] == case["expected_category"]
                and actual["urgency"] == case["expected_urgency"]
            )
            writer.writerow(
                [
                    case["text"],
                    case["expected_category"],
                    case["expected_urgency"],
                    actual["category"],
                    actual["urgency"],
                    match,
                ]
            )


if __name__ == "__main__":
    run()
