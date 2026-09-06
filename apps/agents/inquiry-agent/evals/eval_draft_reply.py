"""Eval: measures how much of generate_draft()'s output is grounded in the
retrieved articles (or the inquiry itself, when no articles were retrieved).

Groundedness is a coverage heuristic, not an LLM judge: it's the fraction of
the draft's content words (including numbers, so a fabricated figure counts
against the score) that also appear in the source material (articles +
inquiry). A low score means the draft likely states things beyond what it was
given - a high score doesn't guarantee factual correctness, only that the
draft's vocabulary traces back to a real source.

Calls the real Gemini API (no mocking) - run manually, not part of CI or pytest.

Run with: python evals/eval_draft_reply.py
Fixtures: evals/fixtures/draft_reply.json
Writes results to: evals/output/eval_draft_reply.csv
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from _shared import load_fixtures, pace, report_and_exit, write_csv_report

from config import load_config
from draft_reply import generate_draft

MIN_OVERLAP = 0.5
PASS_RATE_THRESHOLD = 0.7

_STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "if", "then", "so", "of", "to", "in",
    "on", "for", "with", "at", "by", "from", "is", "are", "was", "were", "be",
    "been", "being", "this", "that", "these", "those", "it", "its", "as",
    "you", "your", "we", "our", "i", "not", "no", "do", "does", "did", "have",
    "has", "had", "will", "would", "can", "could", "please", "thank", "thanks",
}

_TOKEN_RE = re.compile(r"[a-zA-Z']+|\d[\d,]*")


def _content_tokens(text: str) -> set:
    tokens = set()
    for token in _TOKEN_RE.findall(text.lower()):
        if token[0].isdigit():
            tokens.add(token)  # numbers are meaningful regardless of length
        elif token not in _STOPWORDS and len(token) > 2:
            tokens.add(token)
    return tokens


def _groundedness_score(draft: str, inquiry: dict, articles: list) -> float:
    draft_tokens = _content_tokens(draft)
    if not draft_tokens:
        return 0.0

    source_text = inquiry["title"] + " " + inquiry["description"]
    for article in articles:
        source_text += " " + article["title"] + " " + article["content"]
    source_tokens = _content_tokens(source_text)

    return len(draft_tokens & source_tokens) / len(draft_tokens)


def run() -> None:
    config = load_config()
    fixtures = load_fixtures("draft_reply.json")

    fieldnames = ["inquiry_id", "num_articles", "groundedness_score", "passed", "draft", "error"]
    rows = []
    scores = []
    passed_count = 0
    error_count = 0

    for i, case in enumerate(fixtures):
        pace(i)
        try:
            draft = generate_draft(case["inquiry"], case["category"], case["articles"], config)
        except Exception as e:
            error_count += 1
            rows.append(
                {
                    "inquiry_id": case["inquiry"]["id"],
                    "num_articles": len(case["articles"]),
                    "groundedness_score": "",
                    "passed": False,
                    "draft": "",
                    "error": str(e),
                }
            )
            continue

        score = _groundedness_score(draft, case["inquiry"], case["articles"])
        passed = score >= MIN_OVERLAP

        scores.append(score)
        passed_count += passed

        rows.append(
            {
                "inquiry_id": case["inquiry"]["id"],
                "num_articles": len(case["articles"]),
                "groundedness_score": round(score, 3),
                "passed": passed,
                "draft": draft,
                "error": "",
            }
        )

    write_csv_report("eval_draft_reply.csv", rows, fieldnames=fieldnames)
    if error_count:
        print(f"draft_reply: {error_count}/{len(fixtures)} case(s) errored (excluded from groundedness metrics)")

    total = len(scores)
    if total == 0:
        sys.exit("draft_reply: FAILED - every case errored, no groundedness data collected")
    metrics = {
        "avg_groundedness": sum(scores) / total,
        "pass_rate": passed_count / total,
    }
    thresholds = {"pass_rate": PASS_RATE_THRESHOLD}
    report_and_exit("draft_reply", metrics, thresholds)


if __name__ == "__main__":
    run()
