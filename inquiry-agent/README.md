# SafeAI Inquiry Agent

Standalone LangGraph agent that classifies user support inquiries (category + urgency),
drafts replies, and sends a reply only after explicit admin approval (human-in-the-loop).

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
  -> draft_node -> evaluator_node
       -> [GATE 2: evaluator_gate, HITL - admin approves/edits/rejects]
  -> send_node
```

The graph compiles with a checkpointer keyed by `thread_id`, since gates 1 and 2
pause execution across separate CLI invocations.

## LLM provider

Classification and drafting run on Gemini via `google-genai` (`GEMINI_API_KEY`,
`LLM_MODEL` in `.env`). This is the project's only LLM provider - there is no
OpenAI dependency anywhere in this agent.

## Checkpointer

Graph run state (thread checkpoints) is persisted to MongoDB Atlas via
`MongoDBSaver`, not kept in local memory - runs must survive across separate
CLI invocations (gates 1 and 2 each end a process). Requires `MONGODB_ATLAS_URI`
in `.env`, pointing at a cluster fully separate from the SafeAI-613 website's
own database.

## CLI usage

```
python run_agent.py list
python run_agent.py process --thread-id <id> --ids 12,7,3
python run_agent.py process --thread-id <id> --edit <inquiry_id>
```

`list` runs the graph up to gate 1 and prints inquiries sorted by urgency.
`process --ids` resumes a paused run with the selected IDs, drafts replies, and
pauses again at gate 2 for admin review/approval. `process --edit` lets the
admin rewrite a drafted reply's text before approving it at gate 2.

## LangSmith

Tracing is optional and controlled by `LANGCHAIN_TRACING_V2` in `.env`
(along with `LANGCHAIN_API_KEY` / `LANGCHAIN_PROJECT`). Used for monitoring
graph runs during development; the agent works without it.

## Token usage tracking

`usage_tracker` accumulates Gemini token counts per `thread_id` in-process and
prints the running total after each CLI invocation ("טוקנים בריצה זו: ...").
It resets at the start of every `list`/`process` command - it's a
per-invocation counter, not a persisted usage log.

## Evals

Each eval lives in its own file under `evals/`, and writes its results as CSV to
the gitignored `evals/output/` directory.

## Backend dependency (tracked separately, not part of this agent's code)

The SafeAI-613 server exists and is already running, but the agent still lacks
a real service account: `SAFEAI_AGENT_API_TOKEN` is currently a personal admin
JWT used for testing, not a dedicated service-account token. This agent still
depends on the server exposing/adding:
- `urgency` and `category` fields on inquiries (not yet on `ContactMessage`)
- a real service/admin auth mechanism for this agent to call the API
- an email notification sent once an admin reply is finalized
