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

`draft_node` also retrieves relevant help articles (see RAG section below) and grounds
the generated reply in them.

## GuardRails

`guardrails_node` checks each draft before it reaches the admin:

- **Email / phone leakage** - plain regex (`guardrails.py`'s `_EMAIL_RE` / `_PHONE_RE`).
  This is intentionally exact-match: an email or phone number either appears in the
  draft or it doesn't, so a regex is the right tool and there's no ambiguity for an
  LLM to resolve.
- **Unsupported promises** - a semantic check via Gemini (`_check_overpromise`),
  not exact-phrase matching. A support reply can overpromise ("we'll have this
  fixed within the hour", "you'll get a full refund, no questions asked") without
  using any fixed keyword, so a phrase list would miss most real cases; the
  semantic check only runs when the regex checks already passed, to avoid an
  extra LLM call on a draft that's already rejected.
- **Irrelevant / unsolicited content** - a semantic check via Gemini
  (`_check_relevance`) that compares the draft against the original inquiry
  text. Catches cases like the draft padding a simple "thank you" reply with
  unrequested step-by-step instructions (e.g. explaining password reset) that
  have nothing to do with what the customer actually wrote. Only runs when the
  regex checks and the overpromise check already passed, for the same reason.

A failed check routes back to `draft_node` for another attempt, up to
`_MAX_DRAFT_RETRIES` (2) retries per inquiry, before falling through to
`evaluator_node` regardless.

## LLM provider

Classification and drafting run on Gemini via `google-genai` (`GEMINI_API_KEY`,
`LLM_MODEL` in `.env`). This is the project's only LLM provider - there is no
OpenAI dependency anywhere in this agent.

## RAG (help articles)

`draft_node` grounds each draft in the SafeAI-613 help articles most relevant to the
inquiry, instead of relying only on the LLM's own knowledge:

- `index_articles.py` is a standalone script (run manually or on a schedule, not part of
  the graph) that fetches all articles via `GET /articles/all` (the token this agent
  already uses is admin-scoped, so no server change was needed), embeds each one with
  Gemini (`embeddings.py`, `GEMINI_EMBEDDING_MODEL` in `.env`), and upserts it by `slug`
  into the `article_embeddings` collection, in a separate `inquiry_agent_knowledge`
  database on the same `MONGODB_ATLAS_URI` cluster used for checkpoints.
- `rag.py`'s `ArticleRetriever` embeds the inquiry description and does a cosine-similarity
  scan over that collection (no Atlas Vector Search index - the article count is small
  enough that a full scan is fine) to find the top matching articles for `draft_node`.

This is intentionally independent of the server's own embedding infrastructure
(`Embedding` model / `embeddingCache` / `filterService`), which exists for a different,
not-yet-active purpose (an input-filter guardrail node), not for knowledge retrieval.

## Checkpointer

Graph run state (thread checkpoints) is persisted to MongoDB Atlas via
`MongoDBSaver`, not kept in local memory - runs must survive across separate
CLI invocations (gates 1 and 3 each end a process). Requires `MONGODB_ATLAS_URI`
in `.env`, pointing at a cluster fully separate from the SafeAI-613 website's
own database.

## CLI usage

```
python run_agent.py list
python run_agent.py process --thread-id <id> --ids 12,7,3
python run_agent.py process --thread-id <id> --edit <inquiry_id>
```

`list` runs the graph up to gate 1 and prints inquiries sorted by urgency.
`process --ids` resumes a paused run with the selected IDs, drafts + guardrails-checks
replies, and pauses again at gate 3 for admin review/approval. `process --edit` lets the
admin rewrite a drafted reply's text before approving it at gate 3.

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

The SafeAI-613 server exists and is already running. `SAFEAI_AGENT_API_TOKEN`
is a dedicated service-account secret, not a user JWT - the server's
`authenticateToken` middleware checks it against `AGENT_SERVICE_TOKEN`
(constant-time comparison) before falling back to normal JWT verification,
so it doesn't expire like a 15-minute access token does. The two values must
match; see `apps/server/src/middleware/auth.ts`. This agent still depends on
the server exposing/adding:
- `urgency` and `category` fields on inquiries (not yet on `ContactMessage`)
- an email notification sent once an admin reply is finalized
