"""Eval: measures check_draft()'s recall/precision at catching unsupported
promises ("overpromises"), against a labeled fixture set.

Fixture drafts intentionally avoid email addresses and phone numbers so the
regex-based checks in guardrails.py never fire - this isolates the metric to
the semantic overpromise check (the regex checks are already covered by
mocked unit tests in test_guardrails.py).

Calls the real Gemini API (no mocking) - run manually, not part of CI or pytest.

Run with: python evals/eval_guardrails.py
Fixtures: evals/fixtures/guardrails.json
Writes results to: evals/output/eval_guardrails.csv
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from _shared import load_fixtures, pace, report_and_exit, write_csv_report

from config import load_config
from guardrails import check_draft

RECALL_THRESHOLD = 0.85
PRECISION_THRESHOLD = 0.7


def run() -> None:
    config = load_config()
    fixtures = load_fixtures("guardrails.json")

    rows = []
    true_positives = 0
    false_negatives = 0
    false_positives = 0
    true_negatives = 0
    error_count = 0

    for i, case in enumerate(fixtures):
        pace(i)
        expected_flagged = case["expected_overpromise"]

        try:
            result = check_draft(case["draft"], case["inquiry"], config)
        except Exception as e:
            error_count += 1
            rows.append(
                {
                    "draft": case["draft"],
                    "expected_overpromise": expected_flagged,
                    "actual_flagged": "ERROR",
                    "reasons": "",
                    "error": str(e),
                }
            )
            continue

        actual_flagged = not result["passed"]

        if expected_flagged and actual_flagged:
            true_positives += 1
        elif expected_flagged and not actual_flagged:
            false_negatives += 1
        elif not expected_flagged and actual_flagged:
            false_positives += 1
        else:
            true_negatives += 1

        rows.append(
            {
                "draft": case["draft"],
                "expected_overpromise": expected_flagged,
                "actual_flagged": actual_flagged,
                "reasons": "; ".join(result["reasons"]),
                "error": "",
            }
        )

    write_csv_report("eval_guardrails.csv", rows, fieldnames=list(rows[0].keys()))
    if error_count:
        print(f"guardrails: {error_count}/{len(fixtures)} case(s) errored (excluded from recall/precision)")

    print(
        f"guardrails: TP={true_positives} FN={false_negatives} "
        f"FP={false_positives} TN={true_negatives}"
    )

    # No fallback to 1.0 on a zero denominator: that would silently read as a
    # perfect (and misleading) PASSED score when we actually evaluated zero
    # cases of that class (e.g. everything errored out on quota limits).
    recall = (
        true_positives / (true_positives + false_negatives)
        if (true_positives + false_negatives)
        else None
    )
    precision = (
        true_positives / (true_positives + false_positives)
        if (true_positives + false_positives)
        else None
    )

    missing = [name for name, value in [("recall", recall), ("precision", precision)] if value is None]
    if missing:
        sys.exit(
            f"guardrails: INSUFFICIENT DATA - could not compute {', '.join(missing)} "
            "(0 evaluated cases in the relevant class - check the error count above)"
        )

    metrics = {"recall": recall, "precision": precision}
    thresholds = {"recall": RECALL_THRESHOLD, "precision": PRECISION_THRESHOLD}
    report_and_exit("guardrails", metrics, thresholds)


if __name__ == "__main__":
    run()
