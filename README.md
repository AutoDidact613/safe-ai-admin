# SafeAI-613 — Monorepo

Monorepo containing:
- **apps/client**: React + Vite + TypeScript
- **apps/server**: Node.js + Express + TypeScript
- **apps/agent**: Python + FastAPI (agent layer — scaffold, see `apps/agent/README.md`)

Deployment, Docker topology, secrets management, and CI/CD are documented in **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**.

## Repository Structure

```
/
├─ apps/
│  ├─ client/
│  ├─ server/
│  └─ agent/
├─ infra/
│  ├─ docker/nginx/
│  ├─ litellm/
│  └─ legacy/
├─ docker-compose.yml        (local dev — full stack incl. mongo/postgres)
├─ docker-compose.prod.yml   (production — pulls pre-built images)
└─ .github/workflows/
   ├─ ci.yml
   ├─ cd-staging.yml         (push to develop)
   └─ cd-production.yml      (push to main)
```

## Prerequisites
- Node.js **20+**
- Python **3.12+** (only needed if working on `apps/agent` outside Docker)
- Docker + Docker Compose

## Quickstart (full stack via Docker)

```bash
cp .env.example .env
cp apps/server/.env.example apps/server/.env
cp apps/agent/.env.example apps/agent/.env
docker compose up --build
```

- Client (via nginx): http://localhost:8080
- Server: http://localhost:3001
- Agent: http://localhost:8000
- LiteLLM: http://localhost:4000

## Local dev without Docker (faster frontend iteration)

```bash
npm install                       # installs client + server workspaces
npm run dev:client                # http://localhost:5173
npm run dev:server                # http://localhost:3001 (needs Mongo + LiteLLM reachable)
```

## Environment Variables

Each app keeps its own example file; the root `.env.example` is consumed by the docker-compose files:
- `.env.example`
- `apps/client/.env.example`
- `apps/server/.env.example`
- `apps/agent/.env.example`

See `docs/DEPLOYMENT.md` for how secrets are meant to flow through local `.env` files vs. GitHub Environment secrets vs. a managed secret store.

## Workflow (Team)

### Branching
- `develop` is the integration branch — deploys to staging on push (see `cd-staging.yml`)
- `main` deploys to production on push (see `cd-production.yml`)
- Work is done on `feature/<name>` branches, merged into `develop` via PR

### Pull Requests
- Every change goes through a PR
- CI (`ci.yml`) must pass before merge

## CI/CD

- **`ci.yml`**: lint/typecheck/test/build for client, server, and agent, plus a Docker build check for all three images.
- **`cd-staging.yml`** / **`cd-production.yml`**: build and push real Docker images to GHCR; the actual rollout step is currently a **placeholder** (see `docs/DEPLOYMENT.md` for why, and what's needed to make it real).

## Contributing
1. Create a feature branch from `develop`
2. Commit changes with clear messages
3. Open a Pull Request
4. Address review comments and CI failures
5. Merge after approval

## License
Add a license file if needed.
