"""Core graph-resume operations shared between run_agent.py (CLI) and
api.py (HTTP). Each function takes an already-built graph and a
thread_config and returns plain data - no printing, no argparse, no
stdin - so both callers wrap the exact same logic instead of each
re-implementing the resume/edit/approve sequence.
"""
from nodes import _MAX_DRAFT_RETRIES

_MAX_DRAFT_ATTEMPTS = _MAX_DRAFT_RETRIES + 1


class GraphStateError(RuntimeError):
    """Raised when the graph isn't paused at the gate an operation expects."""


def resume_with_selection(graph, thread_config: dict, selected_ids: list) -> dict:
    """Resumes a run paused at GATE 1 (before draft_node) with the chosen
    inquiry IDs: drafts each one and runs it through guardrails.

    Each guardrails retry is its own resume - interrupt_before re-pauses on
    every loop-back into draft_node, so a single graph.invoke() call only
    ever executes one draft attempt. The loop here calls invoke() up to
    _MAX_DRAFT_ATTEMPTS times as a safety backstop; the graph's own retry
    cap (nodes.py's guardrails_node/guardrails_gate) is what actually stops
    it first and lets it fall through to the approval gate.

    Returns once paused at GATE 3 (before send_node) - including drafts that
    never passed guardrails, since the admin has final say either way.
    """
    snapshot = graph.get_state(thread_config)
    if "draft_node" not in snapshot.next:
        raise GraphStateError("This run is not waiting for inquiry selection (gate 1)")

    # מוודאים שכל ה-ID-ים שנבחרו אכן קיימים ברשימת הפניות שנשלפה בריצה הזו.
    # בלי הבדיקה הזו, ID לא תקין (הקלדה שגויה, פנייה שכבר לא open) היה
    # מגיע עד ל-draft_node ומפיל אותו עם KeyError גולמי (by_id[inquiry_id])
    # במקום שגיאה ברורה שהקורא ל-API/CLI יכול להבין.
    known_ids = {inquiry["id"] for inquiry in snapshot.values.get("inquiries", [])}
    unknown_ids = [inquiry_id for inquiry_id in selected_ids if inquiry_id not in known_ids]
    if unknown_ids:
        raise GraphStateError(f"Unknown inquiry id(s), not part of this run: {unknown_ids}")

    graph.update_state(thread_config, {"selected_ids": selected_ids})

    for _ in range(_MAX_DRAFT_ATTEMPTS):
        graph.invoke(None, thread_config)
        snapshot = graph.get_state(thread_config)
        if snapshot.next == ("send_node",):
            break
        if snapshot.next != ("draft_node",):
            raise GraphStateError(f"Unexpected pause point after drafting: {snapshot.next}")
    else:
        raise GraphStateError(
            "Drafting did not reach the approval gate after "
            f"{_MAX_DRAFT_ATTEMPTS} attempts - the graph's own retry cap should "
            "have stopped this sooner; this is an unexpected/anomalous state"
        )

    values = snapshot.values
    drafts = values.get("drafts", {})
    guardrail_results = values.get("guardrail_results", {})
    return {
        inquiry_id: {
            "text": drafts.get(inquiry_id, {}).get("text", ""),
            "guardrails_passed": guardrail_results.get(inquiry_id, {}).get("passed"),
            "guardrails_reasons": guardrail_results.get(inquiry_id, {}).get("reasons", []),
        }
        for inquiry_id in selected_ids
    }


def edit_draft(graph, thread_config: dict, inquiry_id: str, text: str) -> dict:
    """Overwrites one drafted reply's text while paused at GATE 3 (before
    send_node). Never invokes the graph - editing never auto-advances to
    sending."""
    snapshot = graph.get_state(thread_config)
    if "send_node" not in snapshot.next:
        raise GraphStateError("This run is not waiting for approval (gate 3)")

    drafts = dict(snapshot.values.get("drafts", {}))
    # מאפשרים לערוך רק טיוטה שכבר קיימת (עברה draft_node/guardrails_node) -
    # לא ליצור כאן ID חדש שמעולם לא נוסח או נבדק ב-guardrails.
    if inquiry_id not in drafts:
        raise GraphStateError(f"No draft exists for inquiry id: {inquiry_id}")

    drafts[inquiry_id] = {"inquiry_id": inquiry_id, "text": text}
    graph.update_state(thread_config, {"drafts": drafts})

    return {"inquiry_id": inquiry_id, "text": text}


def resume_with_approval(graph, thread_config: dict, approved_ids: list) -> dict:
    """Resumes a run paused at GATE 3 (before send_node) with the explicitly
    approved IDs. send_node only sends replies for IDs in approved_ids -
    nothing is sent for any inquiry left out of this list."""
    snapshot = graph.get_state(thread_config)
    if "send_node" not in snapshot.next:
        raise GraphStateError("This run is not waiting for approval (gate 3)")

    # אותו רציונל כמו ב-resume_with_selection: בלי הבדיקה הזו, send_node
    # היה קורס עם KeyError גולמי (state["drafts"][inquiry_id]) על ID
    # שאף פעם לא נוסחה עבורו טיוטה בריצה הזו.
    known_ids = set(snapshot.values.get("drafts", {}))
    unknown_ids = [inquiry_id for inquiry_id in approved_ids if inquiry_id not in known_ids]
    if unknown_ids:
        raise GraphStateError(f"Unknown inquiry id(s), no draft exists for: {unknown_ids}")

    graph.update_state(thread_config, {"approved_ids": approved_ids})
    graph.invoke(None, thread_config)

    return {"sent_ids": approved_ids}
