"""
Self-contained HTML rendering of the report graph's output.

Prepared ahead of a future (separately-scoped) integration where this
agent's report is surfaced inside the monorepo's client/ React app -
today it's only reachable via `agent.cli.report --html PATH`, which
writes the string this module builds straight to disk.

format_report_html() mirrors agent.nodes.report.format_report()'s
signature and reuses its CATEGORY_LABELS_HE mapping and
group_slow_requests_by_endpoint() grouping - one source of truth for
both renderers, no duplicated endpoint-normalization logic.

No templating engine is used (requirements.txt has no jinja2 or
similar) - plain f-string building, consistent with report.py's
existing style. Every piece of free text that did not originate as a
literal in this file - LLM-authored analysis text, log error messages,
grouped endpoint strings drawn from real request paths - is passed
through html.escape() before being interpolated into markup. That text
is not static, and an unescaped "<"/"&"/'"' could break the page's
structure or, once this HTML is ever served through the client app,
become a stored-XSS vector.
"""

from __future__ import annotations

import html
from datetime import datetime
from typing import Any, Optional

from agent.nodes.classify import ALL_CATEGORIES, INVALID, OTHER
from agent.nodes.report import BUSINESS_CATEGORIES, CATEGORY_LABELS_HE, group_slow_requests_by_endpoint

_STYLE = """
body { font-family: Arial, Helvetica, sans-serif; background: #f4f5f7; color: #1a1a1a; margin: 0; padding: 2rem; }
main { max-width: 900px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
h1 { margin-top: 0; font-size: 1.5rem; }
h2 { font-size: 1.15rem; border-bottom: 2px solid #e0e0e0; padding-bottom: 0.4rem; margin-top: 2rem; }
.period { color: #555; margin-bottom: 1.5rem; }
table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
th, td { text-align: right; padding: 0.4rem 0.6rem; border-bottom: 1px solid #eee; }
th { color: #555; font-weight: 600; }
.total-row td { font-weight: bold; border-top: 2px solid #ccc; }
.error-card { background: #fff4f4; border-right: 4px solid #d33; border-radius: 4px; padding: 0.75rem 1rem; margin-top: 0.5rem; }
.anomaly-card { background: #fff9e6; border-right: 4px solid #e0a800; border-radius: 4px; padding: 0.75rem 1rem; margin-top: 0.5rem; }
.analysis-card { background: #eef6ff; border-right: 4px solid #2b6cb0; border-radius: 4px; padding: 0.75rem 1rem; margin-top: 0.5rem; }
.unavailable-card { background: #f0f0f0; border-right: 4px solid #999; border-radius: 4px; padding: 0.75rem 1rem; margin-top: 0.5rem; color: #555; }
ul { margin: 0.4rem 0; padding-right: 1.2rem; }
.confidence { margin-top: 0.6rem; font-weight: 600; }
"""


def _format_date(value: datetime) -> str:
    return value.strftime("%Y-%m-%d")


def _esc(value: Any) -> str:
    return html.escape(str(value))


def _counts_table(counts: dict[str, int]) -> str:
    rows = "".join(
        f"<tr><td>{_esc(CATEGORY_LABELS_HE[category])}</td><td>{counts[category]}</td></tr>"
        for category in BUSINESS_CATEGORIES
    )
    rows += (
        f"<tr><td>{_esc(CATEGORY_LABELS_HE[OTHER])}</td><td>{counts[OTHER]}</td></tr>"
        f"<tr><td>{_esc(CATEGORY_LABELS_HE[INVALID])}</td><td>{counts[INVALID]}</td></tr>"
    )
    total = sum(counts[category] for category in ALL_CATEGORIES)
    rows += f'<tr class="total-row"><td>סה"כ</td><td>{total}</td></tr>'
    return f"<table><thead><tr><th>פעולה</th><th>כמות</th></tr></thead><tbody>{rows}</tbody></table>"


def _errors_section(error_summary: dict[str, Any]) -> str:
    by_module = "".join(
        f"<li>{_esc(module)}: {count}</li>"
        for module, count in sorted(error_summary["by_module"].items(), key=lambda kv: -kv[1])
    )
    recurring = "".join(
        f"<li>חוזרת x{entry['count']} [{_esc(entry['module'])}]: {_esc(entry['message'])}</li>"
        for entry in error_summary["recurring"]
    )
    return (
        "<h2>שגיאות</h2>"
        f'<div class="error-card">'
        f"<p>סה\"כ: {error_summary['total']}</p>"
        f"<ul>{by_module}</ul>"
        + (f"<p>חוזרות:</p><ul>{recurring}</ul>" if recurring else "")
        + "</div>"
    )


def _anomalies_section(anomalies: dict[str, Any]) -> str:
    duplicates = anomalies.get("duplicates", [])
    duplicate_items = "".join(
        f"<li>משתמש={_esc(dup['user_id'])} ארגון={_esc(dup['organization_id'])} "
        f"מכרזים={_esc(dup['tender_ids'])} (הפרש של {dup['seconds_apart']:.3f} שניות)</li>"
        for dup in duplicates
    )
    slow_requests = anomalies.get("slow_requests", [])
    slow_rows = "".join(
        f"<tr><td>{_esc(group['endpoint'])}</td><td>{group['avg_ms']:.0f}ms</td>"
        f"<td>{group['count']}</td><td>{group['max_ms']}ms</td></tr>"
        for group in group_slow_requests_by_endpoint(slow_requests)
    )
    slow_table = (
        "<table><thead><tr><th>פעולה</th><th>ממוצע</th><th>בקשות</th><th>מקסימום</th></tr></thead>"
        f"<tbody>{slow_rows}</tbody></table>"
        if slow_requests
        else ""
    )
    return (
        "<h2>חריגות</h2>"
        f'<div class="anomaly-card">'
        f"<p>זוהו {len(duplicates)} מקרי הגשה כפולה</p>"
        f"<ul>{duplicate_items}</ul>"
        f"<p>{len(slow_requests)} בקשות חרגו מסף זמן התגובה</p>"
        f"{slow_table}"
        "</div>"
    )


def _analysis_section(
    analysis: Optional[dict[str, Any]], analysis_unavailable_reason: Optional[str]
) -> str:
    if analysis is not None:
        patterns = "".join(f"<li>דפוס שגיאה: {_esc(pattern)}</li>" for pattern in analysis["error_patterns"])
        found_anomalies = "".join(f"<li>חריגה: {_esc(anomaly)}</li>" for anomaly in analysis["anomalies"])
        return (
            "<h2>ניתוח בינה מלאכותית</h2>"
            f'<div class="analysis-card">'
            f"<p>{_esc(analysis['business_logic_notes'])}</p>"
            f"<ul>{patterns}{found_anomalies}</ul>"
            f"<p class=\"confidence\">רמת ביטחון: {analysis['confidence']:.2f}</p>"
            "</div>"
        )
    if analysis_unavailable_reason is not None:
        return (
            "<h2>ניתוח בינה מלאכותית</h2>"
            f'<div class="unavailable-card">לא זמין בהרצה הנוכחית - {_esc(analysis_unavailable_reason)}</div>'
        )
    return ""


def format_report_html(
    start_date: datetime,
    end_date: datetime,
    counts: dict[str, int],
    error_summary: "dict | None" = None,
    anomalies: "dict | None" = None,
    analysis: "dict | None" = None,
    analysis_unavailable_reason: "str | None" = None,
) -> str:
    """
    Build a self-contained, styled HTML report - same inputs and the
    same optional/mutually-exclusive analysis/analysis_unavailable_reason
    contract as agent.nodes.report.format_report().
    """
    body = [
        "<h1>סיכום פעילות לוח המכרזים</h1>",
        f'<p class="period">תקופה: {_format_date(start_date)} עד {_format_date(end_date)}</p>',
        _counts_table(counts),
    ]

    if error_summary is not None:
        body.append(_errors_section(error_summary))
    if anomalies is not None:
        body.append(_anomalies_section(anomalies))
    body.append(_analysis_section(analysis, analysis_unavailable_reason))

    return (
        '<!DOCTYPE html>\n<html lang="he" dir="rtl">\n<head>\n'
        '<meta charset="utf-8">\n'
        "<title>סיכום פעילות לוח המכרזים</title>\n"
        f"<style>{_STYLE}</style>\n"
        "</head>\n<body>\n<main>\n" + "\n".join(body) + "\n</main>\n</body>\n</html>\n"
    )


def format_error_report_html(start_date: datetime, end_date: datetime, error_message: str) -> str:
    """HTML counterpart of agent.nodes.report.format_error_report()."""
    return (
        '<!DOCTYPE html>\n<html lang="he" dir="rtl">\n<head>\n'
        '<meta charset="utf-8">\n'
        "<title>סיכום פעילות לוח המכרזים</title>\n"
        f"<style>{_STYLE}</style>\n"
        "</head>\n<body>\n<main>\n"
        "<h1>סיכום פעילות לוח המכרזים</h1>\n"
        f'<p class="period">תקופה: {_format_date(start_date)} עד {_format_date(end_date)}</p>\n'
        f'<div class="error-card">שגיאה: לא ניתן היה לשלוף את לוגי לוח המכרזים - {_esc(error_message)}</div>\n'
        "</main>\n</body>\n</html>\n"
    )
