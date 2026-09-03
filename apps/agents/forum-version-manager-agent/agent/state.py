from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict


class VersionManagerState(TypedDict):
  # קלט משתמש
  user_request: str  # מה שהמשתמש הקליד (למשל: "הכן גרסה 1.0.2 לפורום")
  target_version: str  # מספר הגרסה המבוקשת

  # מזהים לתיעוד בלוגים
  user_id: Optional[str]
  org_id: Optional[str]
  request_id: Optional[str]

  # סינון ואבטחה ראשוניים (Guardrails)
  is_valid_request: bool
  guardrail_reason: Optional[str]

  # נתונים שנאספים מהמערכת (לוגים ובדיקות קוד מקומיות)
  forum_logs: List[Dict[str, Any]]
  code_test_results: Dict[str, Any]

  # תוצאות הניתוח של שני המודלים הנפרדים
  model_a_result: Dict[str, Any]
  model_b_result: Dict[str, Any]

  # השוואה, סתירות והסכמות
  has_conflict: bool
  consensus_summary: str
  discrepancy_details: Optional[str]

  # סטטוס אישור אנושי (Human In The Loop)
  human_approved: bool

  # תוצרים סופיים
  final_html_report: Optional[str]
  release_tag: Optional[str]