# SafeAI Org & Payments Log Agent

Standalone, read-only LangGraph agent that fetches organization/wallet activity
from the `applicationlogs` MongoDB collection, classifies it, detects wallet
top-up anomalies, and prints a report - narrated by an LLM when anomalies are
found, or a short "all clear" message otherwise.

This agent only reads the `applicationlogs` collection. It never writes to the
database, never modifies any organization, and never sends anything - it is
report-only, so there is no human-in-the-loop (HITL) gate.

## Setup

```
python -m venv .venv
.venv/Scripts/activate   # Windows
pip install -r requirements.txt
cp .env.example .env     # then fill in real values
```

## Graph

```
fetch_node -> classify_node -> evaluator_node
  -> [GATE: anomalies_gate, automated - routes by whether anomalies were found]
       found     -> summarize_node (LLM) -> guardrails_node -> present_node
       not found -> present_node
```

`anomalies_gate` is the only Gate in this agent, and it's fully automated
(not HITL) - there is no user action this agent needs to pause for.

## Rule-based classification and anomaly detection

`classify_node` and `evaluator_node` are deliberately rule-based, not LLM-backed:
the log messages they read are fixed strings written by the server's own
`logger.info(...)` calls (`organizationService.ts` / `organizationRepository.ts`),
so a substring match is exact, cheap, and - unlike an LLM call - can be graded
unambiguously in `evals/eval.py`. The anomaly rule is 3+ wallet top-ups for the
same organization inside a rolling 24-hour window.

## LLM usage

`summarize_node` is this agent's one real LLM component: it turns the structured
anomaly list into a short natural-language paragraph for the admin (Gemini, via
`google-genai` - `GEMINI_API_KEY` / `LLM_MODEL` in `.env`). It only runs on the
"anomalies found" path.

## GuardRails

`guardrails_node` redacts any 24-hex-character, Mongo-ObjectId-shaped token in
the LLM's summary that isn't one of the anomaly list's own organization ids -
i.e. anything the LLM may have hallucinated or copied in from elsewhere (a raw
`userId`, for example) is replaced with `[REDACTED]` before the admin sees it.

## CLI usage

```
python agent/cli.py
python agent/cli.py --start 2026-08-01 --end 2026-08-31
```

`--start`/`--end` (both optional, `YYYY-MM-DD`) restrict the log query to that
date range; omitting them fetches all matching logs.

## LangSmith

Tracing is optional and controlled by `LANGCHAIN_TRACING_V2` in `.env` (along
with `LANGCHAIN_API_KEY` / `LANGCHAIN_PROJECT`). The `summarize_node` LLM call
is decorated with `@traceable`. The agent works without tracing configured.

## Evals

`evals/eval.py` checks (1) classification/anomaly-detection accuracy against a
labeled fixture set (no LLM/DB access needed), and (2) the `summarize_node`
output's non-leakage and non-emptiness (requires a real `GEMINI_API_KEY` in
`.env`). Results are written as CSV to the gitignored `evals/results/`
directory.

```
python evals/eval.py
```

## Extensions (not implemented)

`agent/tools.py` exists as a placeholder for optional extensions (RAG,
web-search, code-exec, MCP) mentioned in the spec as recommended, not required.
This agent's scope (read-only log reporting) doesn't call for any of them.
