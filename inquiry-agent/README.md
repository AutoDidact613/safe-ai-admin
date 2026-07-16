# SafeAI Inquiry Agent

Standalone LangGraph agent that classifies user support inquiries (category + urgency),
drafts replies, runs drafts through a GuardRails check, and sends a reply only after
explicit admin approval (human-in-the-loop).

This agent has no direct dependency on `client/` or `server/` code and no shared
database. It integrates with the existing SafeAI-613 site exclusively through the
server's REST API (`SAFEAI_API_BASE_URL`).

## Setup

```
python -m venv .venv
.venv/Scripts/activate   # Windows
pip install -r requirements.txt
cp .env.example .env     # then fill in real values
```

## Graph

```
fetch_node -> classify_node -> present_node
  -> [GATE 1: selection_gate, HITL - admin picks inquiry IDs]
  -> draft_node -> guardrails_node
       -> [GATE 2: guardrails_gate, automated - fail loops back to draft_node]
  -> evaluator_node
       -> [GATE 3: evaluator_gate, HITL - admin approves/edits/rejects]
  -> send_node
```

The graph compiles with a checkpointer keyed by `thread_id`, since gates 1 and 3
pause execution across separate CLI invocations.

## CLI usage

```
python run_agent.py list
python run_agent.py process --thread-id <id> --ids 12,7,3
```

`list` runs the graph up to gate 1 and prints inquiries sorted by urgency.
`process` resumes a paused run with the selected IDs, drafts + guardrails-checks
replies, and pauses again at gate 3 for admin review/approval.

## Evals

Each eval lives in its own file under `evals/`, and writes its results as CSV to
the gitignored `evals/output/` directory.

## Backend dependency (tracked separately, not part of this agent's code)

This agent depends on the SafeAI-613 server exposing/adding:
- `urgency` and `category` fields on inquiries (not yet on `ContactMessage`)
- a service/admin auth mechanism for this agent to call the API
- an email notification sent once an admin reply is finalized
