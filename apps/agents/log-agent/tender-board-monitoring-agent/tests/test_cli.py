"""
Unit tests for agent.cli's --html flag (agent.cli.run_report /
agent.cli._write_html_report). Never touches a real MongoDB or LLM -
run_report tests monkeypatch agent.cli.build_graph with a fake app
exposing .invoke(state) -> dict, the same DI spirit used throughout
this codebase's other tests (just at the CLI boundary instead of via
build_graph's own parameters, since run_report calls build_graph()
directly with no injectable hooks of its own).
"""

from datetime import datetime

import agent.cli as cli_module
from agent.cli import _write_html_report, parse_args, run_report


class _FakeApp:
    def __init__(self, result):
        self._result = result

    def invoke(self, state):
        return self._result


def _success_result():
    return {
        "error": None,
        "report": "סיכום פעילות לוח המכרזים",
        "counts": {"create": 1, "register": 0, "edit": 0, "delete": 0, "view": 0, "other": 0, "invalid": 0},
        "errors": {"total": 0, "by_module": {}, "recurring": []},
        "anomalies": {"duplicates": [], "slow_requests": []},
        "analysis": {"business_logic_notes": "תקין", "error_patterns": [], "anomalies": [], "confidence": 0.9},
        "analysis_ok": True,
        "analysis_attempts": 1,
    }


def test_write_html_report_creates_a_readable_file(tmp_path):
    path = tmp_path / "report.html"

    _write_html_report(str(path), datetime(2026, 1, 1), datetime(2026, 1, 31), _success_result())

    content = path.read_text(encoding="utf-8")
    assert content.startswith("<!DOCTYPE html>")
    assert "תקין" in content


def test_write_html_report_on_fetch_error_writes_error_page(tmp_path):
    path = tmp_path / "report.html"
    result = {"error": "Could not connect to MongoDB: timeout"}

    _write_html_report(str(path), datetime(2026, 1, 1), datetime(2026, 1, 31), result)

    content = path.read_text(encoding="utf-8")
    assert "Could not connect to MongoDB: timeout" in content


def test_write_html_report_bad_path_warns_instead_of_raising(tmp_path, capsys):
    bad_path = tmp_path / "no-such-directory" / "report.html"

    _write_html_report(str(bad_path), datetime(2026, 1, 1), datetime(2026, 1, 31), _success_result())

    assert not bad_path.exists()
    captured = capsys.readouterr()
    assert "Warning" in captured.err


def test_run_report_writes_html_file_when_flag_is_passed(tmp_path, monkeypatch):
    html_path = tmp_path / "out.html"
    monkeypatch.setattr(cli_module, "build_graph", lambda: _FakeApp(_success_result()))

    args = parse_args(["report", "--days", "7", "--html", str(html_path)])
    exit_code = run_report(args)

    assert exit_code == 0
    assert html_path.exists()


def test_run_report_without_html_flag_does_not_write_a_file(tmp_path, monkeypatch):
    monkeypatch.setattr(cli_module, "build_graph", lambda: _FakeApp(_success_result()))

    args = parse_args(["report", "--days", "7"])
    exit_code = run_report(args)

    assert exit_code == 0
    assert args.html is None
