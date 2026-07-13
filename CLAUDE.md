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
