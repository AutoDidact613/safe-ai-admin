"""
CLI Summary Report formatting logic (originally Story SCRUM-39).

Deliberately separated from the LangGraph wiring (agent/graph.py) and
from the CLI argument parsing (agent/cli.py): this module's only job is
turning a counts dict into a human-readable string. That makes it
trivially testable without touching MongoDB or LangGraph at all.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from agent.nodes.classify import (
    ALL_CATEGORIES,
    DELETE,
    EDIT,
    INVALID,
    OTHER,
    REGISTER,
    VIEW,
    CREATE,
    _HTTP_LOG_PATTERN,
)

# The 5 categories the story explicitly asks to report on, in the order
# the business cares about most (create -> register -> edit -> delete -> view).
BUSINESS_CATEGORIES = [CREATE, REGISTER, EDIT, DELETE, VIEW]

# Hebrew display labels for every category - the underlying dict keys
# from agent.nodes.classify (e.g. "create", "register") never change;
# only what's printed to the user does. Shared with agent.nodes.html_report
# so both renderers show identical wording.
CATEGORY_LABELS_HE = {
    CREATE: "יצירה",
    REGISTER: "רישום",
    EDIT: "עריכה",
    DELETE: "מחיקה",
    VIEW: "צפייה",
    OTHER: "אחר",
    INVALID: "לא תקין",
}

_SEPARATOR = "-" * 40

# Path segments shaped like a Mongo ObjectId (24 hex chars), e.g. the
# "6a4b8b1e851d47b859934fd4" in "/tender-board/6a4b8b1e851d47b859934fd4/apply" -
# normalized to ":id" so every request against "the same kind of resource"
# groups together regardless of which specific document it hit.
_OBJECT_ID_SEGMENT = re.compile(r"^[0-9a-fA-F]{24}$")


def _format_date(value: datetime) -> str:
    return value.strftime("%Y-%m-%d")


def _normalize_endpoint(method: str, path: str) -> str:
    """
    "METHOD /path" with the query string dropped and any ObjectId-shaped
    segment replaced by ":id", e.g.
    ("GET", "/tender-board/smart-search?q=foo") -> "GET /tender-board/smart-search"
    ("POST", "/tender-board/6a4b8b1e851d47b859934fd4/apply") -> "POST /tender-board/:id/apply"

    _HTTP_LOG_PATTERN's path group is "\\S+" - it does NOT stop at "?",
    so the query string has to be stripped here, not in the regex.
    Segments are normalized individually (not a single global replace),
    so a path with more than one ObjectId segment still normalizes
    correctly.
    """
    path_no_query = path.split("?", 1)[0]
    segments = path_no_query.split("/")
    normalized = [":id" if _OBJECT_ID_SEGMENT.match(segment) else segment for segment in segments]
    return f"{method.upper()} {'/'.join(normalized)}"


def group_slow_requests_by_endpoint(slow_requests: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Collapse a flat list of {"message", "duration_ms"} slow-request
    entries (agent.nodes.stats.compute_latency_stats's "over_threshold")
    into one summary row per endpoint, so a report doesn't have to print
    one line per slow request (which can run into the dozens).

    Not every over_threshold entry is guaranteed to be an HTTP
    access-log line - compute_latency_stats matches any message ending
    in "NNNms" - so a message that doesn't match _HTTP_LOG_PATTERN falls
    back to being grouped by its own raw text instead of crashing or
    being silently dropped.

    Returns one dict per endpoint: {"endpoint", "count", "avg_ms", "max_ms"},
    sorted by avg_ms descending (worst offenders first).
    """
    durations_by_endpoint: dict[str, list[int]] = {}

    for entry in slow_requests:
        message = entry["message"].strip()
        http_match = _HTTP_LOG_PATTERN.match(message)
        if http_match:
            method, path = http_match.groups()
            key = _normalize_endpoint(method, path)
        else:
            key = message
        durations_by_endpoint.setdefault(key, []).append(entry["duration_ms"])

    groups = [
        {
            "endpoint": endpoint,
            "count": len(durations),
            "avg_ms": sum(durations) / len(durations),
            "max_ms": max(durations),
        }
        for endpoint, durations in durations_by_endpoint.items()
    ]
    groups.sort(key=lambda group: -group["avg_ms"])
    return groups


def format_report(
    start_date: datetime,
    end_date: datetime,
    counts: dict[str, int],
    error_summary: "dict | None" = None,
    anomalies: "dict | None" = None,
    analysis: "dict | None" = None,
    analysis_unavailable_reason: "str | None" = None,
) -> str:
    """
    Build the readable CLI report from a category -> count mapping.

    `counts` is expected to already contain every key in
    agent.nodes.classify.ALL_CATEGORIES (that's exactly what
    count_tender_events guarantees) - this function does not defend
    against missing keys on purpose, so a mismatch surfaces immediately
    as a KeyError during development instead of silently printing "0".

    `error_summary` (agent.nodes.errors.summarize_errors's return value)
    and `anomalies` (`{"duplicates": [...], "slow_requests": [...]}`)
    are both optional and default to None so existing callers are
    unaffected - when omitted, the report looks exactly as it did
    before this story. Both sections are aggregate-level summaries
    only; neither ever lists individual raw records (that stays
    exclusive to chat mode).

    `analysis` (agent.nodes.analyze.analyze_records's return value, once
    agent.nodes.evaluator.evaluate_analysis has approved it) renders an
    "AI Analysis" section. `analysis_unavailable_reason` is the
    alternative when evaluator_node never approved a response within
    the retry cap - the two are mutually exclusive; passing neither
    (the default) omits the section entirely, exactly as before this
    story.
    """
    lines = [
        "סיכום פעילות לוח המכרזים",
        f"תקופה: {_format_date(start_date)} עד {_format_date(end_date)}",
        _SEPARATOR,
    ]

    for category in BUSINESS_CATEGORIES:
        lines.append(f"{CATEGORY_LABELS_HE[category]:<12}: {counts[category]:>6}")

    lines.append(_SEPARATOR)
    lines.append(f"{CATEGORY_LABELS_HE[OTHER]:<12}: {counts[OTHER]:>6}   (שורות לוג שאינן משויכות לפעולת מכרז)")
    lines.append(f"{CATEGORY_LABELS_HE[INVALID]:<12}: {counts[INVALID]:>6}   (רשומות לוג פגומות או לא קריאות)")
    lines.append(_SEPARATOR)

    total = sum(counts[category] for category in ALL_CATEGORIES)
    lines.append(f"{'סה\"כ':<12}: {total:>6}")

    if error_summary is not None:
        lines.append(_SEPARATOR)
        lines.append("שגיאות")
        lines.append(f"  סה\"כ: {error_summary['total']}")
        for module, count in sorted(error_summary["by_module"].items(), key=lambda kv: -kv[1]):
            lines.append(f"    {module}: {count}")
        for entry in error_summary["recurring"]:
            lines.append(f"  חוזרת x{entry['count']} [{entry['module']}]: {entry['message']}")

    if anomalies is not None:
        lines.append(_SEPARATOR)
        lines.append("חריגות")
        duplicates = anomalies.get("duplicates", [])
        lines.append(f"  זוהו {len(duplicates)} מקרי הגשה כפולה")
        for dup in duplicates:
            lines.append(
                f"    משתמש={dup['user_id']} ארגון={dup['organization_id']} "
                f"מכרזים={dup['tender_ids']} (הפרש של {dup['seconds_apart']:.3f} שניות)"
            )
        slow_requests = anomalies.get("slow_requests", [])
        lines.append(f"  {len(slow_requests)} בקשות חרגו מסף זמן התגובה")
        for group in group_slow_requests_by_endpoint(slow_requests):
            lines.append(
                f"    {group['endpoint']}: ממוצע {group['avg_ms']:.0f}ms "
                f"({group['count']} בקשות, מקסימום {group['max_ms']}ms)"
            )

    if analysis is not None:
        lines.append(_SEPARATOR)
        lines.append("ניתוח בינה מלאכותית")
        lines.append(f"  {analysis['business_logic_notes']}")
        for pattern in analysis["error_patterns"]:
            lines.append(f"  דפוס שגיאה: {pattern}")
        for anomaly in analysis["anomalies"]:
            lines.append(f"  חריגה: {anomaly}")
        lines.append(f"  רמת ביטחון: {analysis['confidence']:.2f}")
    elif analysis_unavailable_reason is not None:
        lines.append(_SEPARATOR)
        lines.append("ניתוח בינה מלאכותית")
        lines.append(f"  לא זמין בהרצה הנוכחית - {analysis_unavailable_reason}")

    return "\n".join(lines)


def format_error_report(start_date: datetime, end_date: datetime, error_message: str) -> str:
    """Build a readable report for the case where fetching failed entirely."""
    return "\n".join(
        [
            "סיכום פעילות לוח המכרזים",
            f"תקופה: {_format_date(start_date)} עד {_format_date(end_date)}",
            _SEPARATOR,
            f"שגיאה: לא ניתן היה לשלוף את לוגי לוח המכרזים - {error_message}",
            _SEPARATOR,
        ]
    )
