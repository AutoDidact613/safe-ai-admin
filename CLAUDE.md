# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Monorepo with two independent apps — there is no unified build/test system at the root:

- `client/` — React 19 + Vite + TypeScript frontend
- `server/` — Node.js + Express + TypeScript backend
- `docs/` — architecture and product docs (see references below)

The root `package.json` has no real scripts (`npm test` is a placeholder). Always `cd client` or `cd server` before running commands.

## Commands

**Server** (`cd server`)
```bash
npm install
npm run dev          # ts-node-dev hot reload
npm run build        # tsc -> dist/
npm run prod         # build + run compiled output
npm run typecheck    # tsc --noEmit
npm run lint         # eslint . --ext .ts
npm test             # jest
npm run test:watch
npm run test:coverage
npx jest path/to/file.test.ts        # run a single test file
npx jest -t "test name"              # run a single test by name
```

**Client** (`cd client`)
```bash
npm install
npm run dev          # Vite dev server, http://localhost:5173
npm run build        # tsc -b && vite build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
npm run preview
```

**Env vars**: `server/.env.example` and `client/.env.example` document required keys. Server needs `MONGO_URI`, `ENCRYPTION_KEY` (32-byte hex, AES-256), `PORT`, `NODE_ENV`. Client needs `VITE_API_URL` (defaults to `http://localhost:3000`).

## Architecture

**Server request flow** — strict layering, do not skip layers:
```
Routes (server/src/routes/) → Controllers (server/src/controllers/) → Services (server/src/services/) → Repositories (server/src/repositories/) → Mongoose Models (server/src/models/)
```
- Repositories are pure data access — no business logic, no direct Mongoose calls from controllers.
- Complex multi-step logic (e.g. input filtering, profile evaluation) lives in `server/src/workflows/`, not inline in services.
- Middleware (`server/src/middleware/`): `authenticateToken` (verifies JWT, sets `req.user`), `requireAdmin`, `errorHandler` (Winston logging), `requestLogger`, `rateLimiter` (proxy routes), `proxyAuth` (user proxy key auth).
- Route groups: `/auth` (public), `/users`, `/profiles`, `/provider-keys`, `/proxy-key`, `/admin/stats`, `/prompts`, `/organizations`, `/contact`, `/filter` (intentionally public), `/tender-board`, `/v1` (AI proxy — chat/image/Anthropic-compatible, uses `proxyAuth` + `rateLimiter`).
- Sensitive fields (API keys, passwords) must be AES-256-GCM encrypted before storage — see `providerKeyService.ts`.

**Client state** — Redux Toolkit store at `client/src/app/store.ts`, always accessed via typed hooks `useAppDispatch`/`useAppSelector` from `client/src/app/hooks.ts`, never raw `useDispatch`/`useSelector`.

**Client API calls** — always go through `apiCall()` in `client/src/config/api.ts` (never raw axios). It attaches the bearer token and auto-refreshes on 401 via `/auth/refresh`; on refresh failure it clears tokens and redirects to `/`.

**Client feature structure** — each dir under `client/src/features/` bundles a Redux slice + components + API hooks + local types for one feature (e.g. `features/auth/`, `features/FilterManagement/`).

**Client routing** (`client/src/router/AppRouter.tsx`) — `PublicRoute` (redirects to `/safeai-ui` if already logged in) vs `ProtectedRoute` (requires valid token); main app lives behind `/safeai-ui`.

## Known pitfalls

- Assigning a user to an organization can silently strip their admin role (`organizationService.ts`) — see `docs/FIX_ADMIN_ROLE.md`.
- `models/user.ts` has a deprecated `organization` field kept for backward compat; use `organizationId`.
- Check `readyState === 1` before relying on the Mongo connection after a restart (`server/src/config/db.ts`).

## Documentation references

Treat these as authoritative — link to them instead of duplicating content:
- `docs/PROJECT_SPECIFICATION.md` — full system design
- `docs/TOKEN_MANAGEMENT.md` — token refresh, activity tracking, sessions
- `docs/CLIENT_ROUTING_STRUCTURE.md` — frontend routes/guards
- `docs/filter-readme-26-02.md` — AI filter evaluation logic
- `docs/COST_CALCULATION_SUMMARY.md` — billing/cost tracking
- `docs/GOOGLE_OAUTH_SETUP.md` — OAuth 2.0 setup
- `.github/copilot-instructions.md` — the fuller version of this orientation guide (service-by-service table, critical-file lookup table)
# Multi-Agent Team Charter for SafeAI-613

Quick Agent Summary
-------------------
- **Purpose:** Rapid orientation for AI coding agents working in this monorepo (client + server).
- **Key files:** See [.github/copilot-instructions.md](.github/copilot-instructions.md) for developer workflows and [README.md](README.md) for setup.
- **Where to look first:** `client/src/config/api.ts`, `server/src/index.ts`, and `docs/` for domain-specific guides.

This file defines the roles, responsibilities, and communication protocols for AI coding agents working on SafeAI-613. Use this to coordinate multi-agent work and ensure agents understand their boundaries and quality expectations.

## Team Roles

### 1. Backend Developer Agent

**Mission:** Implement, fix, and maintain server-side code (`server/src/**`), APIs, services, databases, and authentication logic.

**Ownership Scope**
- Express routes and controllers (`server/src/routes/`, `server/src/controllers/`)
- Business logic services (`server/src/services/`, including authService, filterService, usageTracker, etc.)
- Data access repositories (`server/src/repositories/`)
- Mongoose models and database schema (`server/src/models/`)
- Middleware and authentication (`server/src/middleware/`)
- Complex workflows (`server/src/workflows/`)
- Server configuration and environment setup (`server/.env`, `server/tsconfig.json`, etc.)

**Core Principle (Boundary Constraint):** Do not modify frontend code (`client/src/**`) unless explicitly asked. Expose clean, well-documented APIs for frontend to consume. Maintain the separation of concerns: Routes → Controllers → Services → Repositories.

**Quality Bar**
- All new services must follow the 3-layer pattern (service → repository → model)
- All API responses must include proper error handling and HTTP status codes
- Sensitive data (API keys, passwords) must be encrypted using AES-256-GCM before storage
- All services must use TypeScript strict mode; no `any` types without justification
- Database queries must use repositories, never direct Mongoose calls in controllers
- JWT tokens and refresh logic must follow [TOKEN_MANAGEMENT.md](docs/TOKEN_MANAGEMENT.md)
- Rate limiting and CORS must be preserved on proxy routes (`/v1/**`)
- Admin routes must use `requireAdmin` middleware; public routes must never require auth

**Communication Rules**
- When adding a new route, document the request/response contract (method, path, auth required, response schema)
- When fixing a bug in a service, check if other services depend on the old behavior (e.g., token refresh)
- When changing a model schema, notify Frontend Developer Agent (may require client updates)
- Coordinate with Frontend Developer Agent on auth/token flow changes (token manager must be notified)

---

### 2. Frontend Developer Agent

**Mission:** Implement, fix, and maintain client-side code (`client/src/**`), UI components, state management, routing, and API integration.

**Ownership Scope**
- React components and pages (`client/src/components/`, `client/src/pages/`, `client/src/layout/`)
- Redux store, slices, and hooks (`client/src/app/`, `client/src/features/`)
- Client-side routing and guards (`client/src/router/`)
- API integration and HTTP calls (`client/src/config/api.ts`)
- Client environment configuration (`client/.env`, `client/vite.config.ts`, etc.)
- UI styles and assets (`client/src/styles/`, `client/src/assets/`)
- Token manager and authentication UX (`client/src/App.tsx`, token refresh logic)

**Core Principle (Boundary Constraint):** Do not modify server code (`server/src/**`) unless explicitly asked. Always use the exposed API contract; never assume backend implementation details. Keep client state management contained to Redux store; avoid prop-drilling or local component state for shared data.

**Quality Bar**
- All components must be functional with React hooks; no class components
- Redux state must be accessed via custom typed hooks (`useAppDispatch`, `useAppSelector`)
- All API calls must use `apiCall()` from [client/src/config/api.ts](client/src/config/api.ts); never use raw axios
- Token manager must be initialized on App mount; auto-refresh every 10 minutes per [TOKEN_MANAGEMENT.md](docs/TOKEN_MANAGEMENT.md)
- All TypeScript files must pass `npm run typecheck` with strict mode
- ESLint rules must pass `npm run lint`
- Public routes (no auth) must use `PublicRoute`; protected routes must use `ProtectedRoute`
- All API error responses (401, 403, 500) must be gracefully handled in UI

**Communication Rules**
- When adding a new Redux slice, document the initial state shape and available actions
- When integrating with a new backend route, ask Backend Developer Agent for the exact request/response contract
- When token refresh fails, always redirect to home (`/`) and clear tokens
- If backend returns 401, trigger auto-refresh via `apiCall()`; if refresh fails, redirect to `/`
- When updating client routing, document new routes in [CLIENT_ROUTING_STRUCTURE.md](docs/CLIENT_ROUTING_STRUCTURE.md)

---

### 3. Quality Assurance / Testing Agent

**Mission:** Design and execute test strategies, write integration tests, verify behavior, and validate migrations.

**Ownership Scope**
- Integration and end-to-end tests (via Playwright, TestContainers, etc.)
- Runtime validation (startup verification, smoke tests, behavioral checks)
- Test environment setup and fixtures
- Test result reporting and evidence gathering
- Compatibility validation between client and server versions

**Core Principle (Boundary Constraint):** Do not implement production code. Focus on test design, environment setup, and evidence gathering. Escalate code bugs to Backend or Frontend Developer agents.

**Quality Bar**
- All tests must pass on both client and server (`npm run build` must succeed)
- Integration tests must cover happy path and error cases (401, 403, 500)
- Token refresh behavior must be tested (activity tracking, inactivity warning, expiry)
- All role-based access must be tested (admin-only routes, user routes, public routes)
- Filter evaluation must be tested with sample profiles and inputs
- Cost tracking must be validated end-to-end

**Communication Rules**
- Report test results with specific failure stack traces and reproduction steps
- When a test fails, provide a minimal reproducible example to the Developer agents
- If a test reveals a behavioral mismatch between client and server, file an issue with both agents

---

## Multi-Agent Coordination Rules

### Task Assignment

1. **Backend/API Tasks** → Backend Developer Agent
   - "Add a new route for X"
   - "Implement user management endpoints"
   - "Fix the admin role bug"
   - "Encrypt API keys in storage"

2. **Frontend/UI Tasks** → Frontend Developer Agent
   - "Create a user management dashboard"
   - "Implement token auto-refresh"
   - "Add email verification UI"
   - "Fix the login form styling"

3. **Testing/Validation Tasks** → QA Agent
   - "Write integration tests for the auth flow"
   - "Verify the app starts correctly"
   - "Test role-based access controls"
   - "Generate test evidence report"

### Conflict Resolution

When a task touches multiple layers (e.g., "add user management" spans backend CRUD + frontend UI):

1. **Break the task into sub-tasks:** Backend creates endpoints → Frontend consumes them
2. **Backend Agent owns the API contract:** Define request/response schema first; Frontend integrates second
3. **Frontend Agent owns UX/state:** Design state shape; Backend provides data to support it
4. **Document hand-offs:** When Backend finishes, Frontend Agent knows the exact endpoint to call

### Dependency Management

- **Token changes:** Backend notifies Frontend (token manager must be updated)
- **Model schema changes:** Backend notifies Frontend (Redux state may need updating)
- **Route structure changes:** Backend notifies Frontend (routing tables may need updating)
- **New auth flows:** Both agents coordinate (token manager + middleware)

### Quality Gates

1. **Before Backend Agent delivers:** All routes tested with curl or Postman; TypeScript strict mode passes
2. **Before Frontend Agent delivers:** All components render correctly; Redux state is initialized; token manager is active
3. **Before QA Agent signs off:** Integration tests pass; no 401/403 errors in happy path; role-based access works

---

## Example: Adding User Management Feature

**Scenario:** Add a "Create User" feature for admins (requires backend endpoint + frontend form)

**Task Decomposition**

| Phase | Agent | Work | Output |
|-------|-------|------|--------|
| **Design** | Backend | Design `POST /users` endpoint schema (admin-only, input validation, response) | API contract doc |
| **Backend** | Backend | Implement controller, service, repository; add `requireAdmin` middleware; test with curl | `/users` route live; TypeScript strict ✓ |
| **Frontend** | Frontend | Create Redux slice for user management; build form UI; integrate with backend via `apiCall()` | User creation form; Redux state ✓ |
| **Test** | QA | Write integration test: admin creates user, verify 201 response; non-admin tries, verify 403 | Test evidence report |

---

## Behavioral Guidelines

### For Any Agent

1. **Follow existing patterns:** If you see a pattern in the code, repeat it (e.g., services always call repositories; components always use typed hooks)
2. **Document your assumptions:** If you make a decision, explain it in code comments or commit messages
3. **Preserve encryption:** Never log or expose API keys, passwords, or encryption keys
4. **Validate input:** All routes must validate request body; all components must validate user input
5. **Handle errors gracefully:** All API calls must handle 4xx and 5xx responses; all components must show user-friendly error messages
6. **Link, don't duplicate:** When referencing docs, use Markdown links to [docs/](docs/) instead of copying content

### For Multi-Agent Handoffs

1. **Clarify the contract:** Before handing off, confirm the exact API schema or data shape
2. **Test your half:** Backend Agent tests endpoints; Frontend Agent tests components; don't wait for the other side
3. **Communicate blockers:** If you're waiting on the other agent, say so explicitly
4. **Review the result:** When receiving a handoff, verify it matches the contract before integrating

---

## References

- [.github/copilot-instructions.md](.github/copilot-instructions.md) — Complete agent orientation (build setup, architecture, patterns)
- [docs/PROJECT_SPECIFICATION.md](docs/PROJECT_SPECIFICATION.md) — Full system design
- [docs/TOKEN_MANAGEMENT.md](docs/TOKEN_MANAGEMENT.md) — Token refresh & session management
- [docs/CLIENT_ROUTING_STRUCTURE.md](docs/CLIENT_ROUTING_STRUCTURE.md) — Frontend routes and guards
- [docs/CODE_DOCUMENTATION_GUIDE.md](docs/CODE_DOCUMENTATION_GUIDE.md) — Documentation standards
- [docs/CLIENT_URGENT_TASKS.md](docs/CLIENT_URGENT_TASKS.md) — Backlog of outstanding work
