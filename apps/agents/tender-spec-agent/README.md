# SafeAI Tender Spec Agent

Standalone LangGraph agent that, for a single tender, produces a technology-stack
recommendation, up to 5 similar open-source project links, up to 5 reading sources,
and an initial specification document.

This agent has no direct dependency on `client/` or `server/` code and no shared
database. It integrates with the existing SafeAI-613 site exclusively through the
server's REST API (`SAFEAI_API_BASE_URL`), the same pattern as
`apps/agents/inquiry-agent` and `apps/agents/log-agent`.

## Setup

```
python -m venv .venv
.venv/Scripts/activate   # Windows
pip install -r requirements.txt
cp .env.example .env     # then fill in real values
```

## Graph

```
fetch_node -> tech_stack_node -> research_node -> spec_document_node -> save_node
```

No HITL gates and no checkpointer (unlike `inquiry-agent`) - each run is a single,
one-shot pass for one tender, started and finished within one CLI invocation.

- `fetch_node`: pulls tender data via `GET /tender-board/:id/agent-context`.
- `tech_stack_node`: asks Gemini for a recommended language/framework + short reasoning.
- `research_node`: uses the Tavily Search API to find up to 5 similar open-source
  projects and up to 5 reading sources. A failed search does not fail the whole
  run - it continues with an empty list for that category and flags
  `research_failed` so `save_node` can note the partial failure.
- `spec_document_node`: assembles a minimal spec document (background, goals,
  proposed milestones, initial scope) from the state gathered so far.
- `save_node`: writes the full result back via `POST /tender-board/:id/specification`.

## Failure handling

A failure in `fetch_node`/`tech_stack_node` (server unreachable, invalid token,
Gemini error) is caught in `run_agent.py`, which reports `status: "failed"`
directly to the server before exiting non-zero - so the tender never stays stuck
on `"generating"`. This is a second line of defense on top of the server-side
runner's own timeout handling (SCRUM-293).

## LLM / search providers

- Gemini via `google-genai` (`GEMINI_API_KEY`, `LLM_MODEL`) - the project's only
  LLM provider, consistent with `inquiry-agent`/`log-agent`.
- Tavily Search API (`TAVILY_API_KEY`) for `research_node` - there is no built-in
  web-search capability anywhere else in this repo, so this agent is the first to
  depend on an external search provider.

## Auth

`SAFEAI_AGENT_API_TOKEN` is a personal admin JWT used as a service token, the
same convention `inquiry-agent`/`log-agent` already use (there is no dedicated
service-account mechanism in the server yet - tracked as future work, not part
of this ticket set).

## CLI usage

```
python run_agent.py generate --tender-id <id>
```

## Activation from the UI

This agent is not deployed as a long-running service. The server
(`apps/server/src/services/tenderSpecAgentRunner.ts`) spawns
`python run_agent.py generate --tender-id <id>` as a one-off subprocess when a
tender owner/admin clicks the "generate specification" button - see SCRUM-293.
Running this in a deployed environment (staging/production) requires the
`server` container to have Python 3 plus this agent's `requirements.txt`
installed; that Docker/CI packaging work is not part of this agent's code and
is tracked separately.
