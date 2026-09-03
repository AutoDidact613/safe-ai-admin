"""Unit tests for agent.nodes.evaluator (Story SCRUM-180)."""

from agent.nodes.evaluator import evaluate_analysis


def _valid_analysis(**overrides):
    base = {"business_logic_notes": "fine", "error_patterns": [], "anomalies": [], "confidence": 0.9}
    base.update(overrides)
    return base


def test_evaluate_analysis_passes_a_well_formed_high_confidence_response():
    assert evaluate_analysis(_valid_analysis(), errors={"total": 0}, anomalies={"duplicates": []}) is True


def test_evaluate_analysis_fails_when_required_key_is_missing():
    analysis = _valid_analysis()
    del analysis["confidence"]
    assert evaluate_analysis(analysis, errors={"total": 0}, anomalies={"duplicates": []}) is False


def test_evaluate_analysis_fails_when_confidence_is_not_numeric():
    analysis = _valid_analysis(confidence="high")
    assert evaluate_analysis(analysis, errors={"total": 0}, anomalies={"duplicates": []}) is False


def test_evaluate_analysis_fails_when_confidence_below_threshold():
    analysis = _valid_analysis(confidence=0.2)
    assert evaluate_analysis(analysis, errors={"total": 0}, anomalies={"duplicates": []}) is False


def test_evaluate_analysis_fails_on_hallucinated_duplicate_claim():
    analysis = _valid_analysis(anomalies=["זוהתה הגשה כפולה של מכרזים"])
    # No real duplicates were found - the model invented this.
    assert evaluate_analysis(analysis, errors={"total": 0}, anomalies={"duplicates": []}) is False


def test_evaluate_analysis_passes_duplicate_claim_when_actually_backed_by_data():
    analysis = _valid_analysis(anomalies=["זוהתה הגשה כפולה של מכרזים"])
    assert evaluate_analysis(analysis, errors={"total": 0}, anomalies={"duplicates": [{"tender_ids": ["a", "b"]}]}) is True


def test_evaluate_analysis_fails_on_hallucinated_error_pattern_claim():
    analysis = _valid_analysis(anomalies=["השבוע ניכרת עלייה חדה בשגיאות"])
    assert evaluate_analysis(analysis, errors={"total": 0}, anomalies={"duplicates": []}) is False


def test_evaluate_analysis_passes_error_pattern_claim_when_backed_by_data():
    analysis = _valid_analysis(anomalies=["השבוע ניכרת עלייה חדה בשגיאות"])
    assert evaluate_analysis(analysis, errors={"total": 5}, anomalies={"duplicates": []}) is True


# --- mixed-language safety net --------------------------------------------
# analyze_node's prompt instructs the model to answer in Hebrew, but if it
# ever ignores that instruction, the hallucination guard must still catch
# an invented anomaly - the English keywords are checked in ADDITION to the
# Hebrew ones for exactly this reason.


def test_evaluate_analysis_fails_on_hallucinated_duplicate_claim_in_english():
    analysis = _valid_analysis(anomalies=["duplicate submission detected"])
    assert evaluate_analysis(analysis, errors={"total": 0}, anomalies={"duplicates": []}) is False


def test_evaluate_analysis_fails_on_hallucinated_error_pattern_claim_in_english():
    analysis = _valid_analysis(anomalies=["a clear error spike this week"])
    assert evaluate_analysis(analysis, errors={"total": 0}, anomalies={"duplicates": []}) is False
