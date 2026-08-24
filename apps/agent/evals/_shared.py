"""Shared helpers for the evals/ scripts: fixture loading, CSV reporting,
and threshold-gated exit codes. Not a pytest module - eval_*.py scripts call
real LLMs and are meant to be run manually (see each script's docstring)."""
import csv
import json
import os
import sys
import time

_FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")
_OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")

# Gemini's free tier caps at 5 requests/minute - each eval makes one real call
# per fixture, so without pacing most of a run comes back as 429s instead of
# real signal. 13s keeps every script comfortably under that limit.
RATE_LIMIT_DELAY_SECONDS = 13


def load_fixtures(filename: str) -> list:
    with open(os.path.join(_FIXTURES_DIR, filename), encoding="utf-8") as f:
        return json.load(f)


def pace(index: int, seconds: float = RATE_LIMIT_DELAY_SECONDS) -> None:
    """Sleeps before every call except the first, to stay under the LLM
    provider's rate limit across a fixture loop."""
    if index > 0:
        time.sleep(seconds)


def write_csv_report(filename: str, rows: list, fieldnames: list) -> None:
    os.makedirs(_OUTPUT_DIR, exist_ok=True)
    with open(os.path.join(_OUTPUT_DIR, filename), "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def report_and_exit(label: str, metrics: dict, thresholds: dict) -> None:
    """Prints each metric against its threshold (if any) and exits non-zero
    if any metric misses its threshold."""
    failed = []
    for name, value in metrics.items():
        threshold = thresholds.get(name)
        line = f"{label}: {name} = {value:.1%}"
        if threshold is not None:
            line += f" (threshold: {threshold:.1%})"
            if value < threshold:
                failed.append(name)
        print(line)

    if failed:
        sys.exit(f"{label}: FAILED - below threshold on: {', '.join(failed)}")
