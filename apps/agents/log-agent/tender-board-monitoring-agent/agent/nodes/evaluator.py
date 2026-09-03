"""
Validates analyze_node's output against the underlying numeric state
(Story SCRUM-180).

evaluate_analysis() does NOT judge "is this good prose" - it judges "is
this internally consistent with the data analyze_node was actually
given". A response that hallucinates an anomaly not backed by the
numbers, or that isn't even valid JSON in the first place, fails and
triggers a retry (capped at MAX_ANALYSIS_ATTEMPTS by the graph).
"""

from __future__ import annotations

from typing import Any

REQUIRED_KEYS = {"business_logic_notes", "error_patterns", "anomalies", "confidence"}
CONFIDENCE_THRESHOLD = 0.5
MAX_ANALYSIS_ATTEMPTS = 3

# analyze_node's prompt (agent.nodes.analyze) instructs the model to
# narrate in Hebrew using these canonical words/phrases - but the
# English forms are kept here too, and checked in addition to (not
# instead of) the Hebrew ones: if the model ever ignores that
# instruction and answers in English anyway, this hallucination guard
# must still catch it rather than silently going blind.
_DUPLICATE_KEYWORDS_HE = ("כפול", "כפיל")  # covers כפולה/כפולות/כפילות/כפילה
_DUPLICATE_KEYWORDS_EN = ("duplicate",)

# "עלייה בשגיאות" as one rigid phrase would miss e.g. "עלייה חדה
# בשגיאות" (extra word in between) - checked instead as two independent
# substrings, which also covers word-order variations the model might use.
_ERROR_PATTERN_INDICATOR_HE = "שגיאות"
_ERROR_PATTERN_QUALIFIERS_HE = ("חוזרות", "חוזר", "דפוס", "עלייה", "ריבוי")
_ERROR_PATTERN_KEYWORDS_EN = ("error spike", "error pattern")


def _claims_duplicate(anomaly_text: str) -> bool:
    return any(keyword in anomaly_text for keyword in _DUPLICATE_KEYWORDS_HE) or any(
        keyword in anomaly_text for keyword in _DUPLICATE_KEYWORDS_EN
    )


def _claims_error_pattern(anomaly_text: str) -> bool:
    has_he_pattern = _ERROR_PATTERN_INDICATOR_HE in anomaly_text and any(
        qualifier in anomaly_text for qualifier in _ERROR_PATTERN_QUALIFIERS_HE
    )
    return has_he_pattern or any(keyword in anomaly_text for keyword in _ERROR_PATTERN_KEYWORDS_EN)


def format_unavailable_reason(attempts: int) -> str:
    """
    The message shown in place of the AI Analysis section when no
    response passed evaluate_analysis() within MAX_ANALYSIS_ATTEMPTS.
    Shared by agent.graph (text report) and agent.cli (HTML report) so
    the wording can't drift between the two renderers.
    """
    return f"ה-evaluator לא הצליח לאמת את הניתוח לאחר {attempts} ניסיונות"


def evaluate_analysis(
    analysis: dict[str, Any],
    errors: dict[str, Any],
    anomalies: dict[str, Any],
) -> bool:
    """
    Returns True (pass, safe to show in the report) or False (retry-worthy fail).

    Checks, in order - any failure short-circuits the rest:
      1. Structural validity: all required keys present, `confidence`
         is actually numeric. A malformed/unparseable response
         (agent.nodes.analyze._empty_analysis) fails here immediately.
      2. No hallucinated anomaly: the model's own `anomalies` narration
         mentioning "duplicate" when no duplicates were actually
         detected, or mentioning error-spike/error-pattern language
         when the error total is zero, means it invented something not
         backed by the data it was given.
      3. `confidence` below CONFIDENCE_THRESHOLD is a soft-fail worth
         one retry - the model itself wasn't sure.
    """
    if not REQUIRED_KEYS.issubset(analysis.keys()):
        return False
    if not isinstance(analysis.get("confidence"), (int, float)) or isinstance(analysis.get("confidence"), bool):
        return False
    if not isinstance(analysis.get("anomalies"), list) or not isinstance(analysis.get("error_patterns"), list):
        return False

    anomaly_text = " ".join(str(item) for item in analysis["anomalies"]).lower()
    if _claims_duplicate(anomaly_text) and not anomalies.get("duplicates"):
        return False
    if _claims_error_pattern(anomaly_text) and errors.get("total", 0) == 0:
        return False

    if analysis["confidence"] < CONFIDENCE_THRESHOLD:
        return False

    return True
