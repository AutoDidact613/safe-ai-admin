"""Eval: measures (1) rule-based classify/anomaly-detection accuracy against a
labeled fixture set, and (2) the summarize_node (LLM) output's professionalism
and non-leakage, per the spec's Appendix 3 note.

Run with: python evals/eval.py
Requires a real .env (GEMINI_API_KEY) for part 2 - part 1 needs no LLM/DB access.
Writes results to evals/results/eval_results.csv
"""
import csv
import os
import re
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "agent"))

from config import load_config  # noqa: E402
from nodes import classify_node, evaluator_node, guardrails_node, summarize_node  # noqa: E402

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "results", "eval_results.csv")

_BASE = datetime(2026, 8, 1, 12, 0, 0)

# --- Part 1: classification + anomaly-detection accuracy ------------------

CLASSIFICATION_FIXTURES = [
    {"message": "Organization approved", "expected_event_type": "approval"},
    {"message": "Organization rejected", "expected_event_type": "rejection"},
    {
        "message": "Organization wallet topped up successfully (Mock)",
        "expected_event_type": "topup",
    },
    {"message": "Organization active state changed", "expected_event_type": "status_change"},
    {"message": "Organization created in DB", "expected_event_type": "other"},
]

ANOMALY_FIXTURE_RECORDS = [
    {
        "message": "Organization wallet topped up successfully (Mock)",
        "context": {"organizationId": "org-eval-1"},
        "timestamp": _BASE + timedelta(hours=offset),
    }
    for offset in (0, 5, 10)
] + [
    {
        "message": "Organization wallet topped up successfully (Mock)",
        "context": {"organizationId": "org-eval-2"},
        "timestamp": _BASE,
    }
]
EXPECTED_ANOMALY_ORG_IDS = {"org-eval-1"}


def _run_classification_checks(writer) -> None:
    for case in CLASSIFICATION_FIXTURES:
        result = classify_node({"records": [{"message": case["message"], "context": {}}]})
        actual = result["classified"][0]["event_type"]
        writer.writerow(
            [
                "classification",
                case["message"],
                case["expected_event_type"],
                actual,
                actual == case["expected_event_type"],
            ]
        )


def _run_anomaly_detection_check(writer) -> None:
    classified = classify_node({"records": ANOMALY_FIXTURE_RECORDS})["classified"]
    anomalies = evaluator_node({"classified": classified})["anomalies"]
    actual_org_ids = {a["organization_id"] for a in anomalies}
    writer.writerow(
        [
            "anomaly_detection",
            "3 topups/24h for org-eval-1, 1 topup for org-eval-2",
            sorted(EXPECTED_ANOMALY_ORG_IDS),
            sorted(actual_org_ids),
            actual_org_ids == EXPECTED_ANOMALY_ORG_IDS,
        ]
    )


# --- Part 2: summarize_node output - professionalism and non-leakage ------

_OBJECT_ID_RE = re.compile(r"\b[0-9a-fA-F]{24}\b")


def _run_summary_quality_check(writer) -> None:
    config = load_config()
    anomalies = [
        {
            "organization_id": "507f1f77bcf86cd799439011",
            "type": "excessive_topups",
            "count": 3,
            "window_start": _BASE,
            "window_end": _BASE + timedelta(hours=20),
        }
    ]
    state = {"anomalies": anomalies}
    summary = summarize_node(state, config)["summary"]
    guarded_summary = guardrails_node({**state, "summary": summary})["summary"]

    known_ids = {a["organization_id"] for a in anomalies}
    leaked_ids = [m for m in _OBJECT_ID_RE.findall(guarded_summary) if m not in known_ids]
    is_non_empty = bool(guarded_summary and guarded_summary.strip())

    writer.writerow(
        [
            "summary_non_leakage",
            "known org id only, no foreign ids",
            "no leaked ids",
            f"leaked={leaked_ids}" if leaked_ids else "no leaked ids",
            not leaked_ids,
        ]
    )
    writer.writerow(
        [
            "summary_non_empty",
            "summarize_node produces non-empty text",
            "non-empty",
            guarded_summary[:80],
            is_non_empty,
        ]
    )


def run() -> None:
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["check", "input", "expected", "actual", "match"])
        _run_classification_checks(writer)
        _run_anomaly_detection_check(writer)
        _run_summary_quality_check(writer)


if __name__ == "__main__":
    run()
