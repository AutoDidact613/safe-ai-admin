# GitHub Copilot Instructions for SafeAI-613

This repository is a monorepo with two primary applications:

- `client/` — React + Vite + TypeScript frontend
- `server/` — Node.js + Express + TypeScript backend
- `docs/` — product and safety documentation, including AI proxy design and token handling

## Purpose

Use this file as the primary orientation guide for GitHub Copilot when working in this repository. Keep fixes small and aligned with the existing client/server separation. Avoid changing global root assumptions unless the change is required by the selected app.

## Important notes

- The root `package.json` contains only a placeholder `test` script. For actual lifecycle commands, use `client/package.json` and `server/package.json`.
- The frontend and backend are coupled through the API host configuration in `client/src/config/api.ts`.
- Do not assume the repo uses a single unified build system. Treat `client/` and `server/` as separate apps with their own install/build/test commands.

## Client flow

- `client/src/config/api.ts` defines `API_BASE_URL` and endpoint constants.
- `apiCall()` attaches `Authorization: Bearer <accessToken>` and handles `401` by attempting refresh via `/auth/refresh`.
- If refresh fails, the frontend clears tokens and redirects to `/`.
- `VITE_API_URL` is the environment variable that overrides the default API host for local development.

## Server flow

- `server/src/index.ts` is the main server entrypoint.
- It configures CORS, JSON/body parsing, request logging, error handling, database connection, and route wiring.
- Public auth routes are under `/auth`.
- Protected user routes use `authenticateToken`; admin routes also use `requireAdmin`.
- AI proxy routes are under `/v1` and use `proxyAuth` plus `rateLimiter`.
- Filter evaluation is exposed at `/filter` and is intentionally public.

## Key route groups

- `/auth` — login, register, refresh, verify, forgot/reset password, Google OAuth
- `/users` — user management; authenticated; admin-protected for management routes
- `/profiles` — profile management
- `/provider-keys` — provider key management
- `/proxy-key` — user proxy key management
- `/admin/stats` — admin statistics
- `/prompts` — prompt management
- `/organizations` — organization management
- `/contact` — contact form
- `/filter` — AI filter evaluation
- `/tender-board` — tender board CRUD and apply actions
- `/v1` — AI proxy endpoints for chat, image generation, and Anthropic-compatible routes

## Documentation references

Use these docs as authoritative sources rather than duplicating their content:

- `docs/PROJECT_SPECIFICATION.md`
- `docs/TOKEN_MANAGEMENT.md`
- `docs/filter-readme-26-02.md`
- `docs/COST_CALCULATION_SUMMARY.md`

## Build & Development Setup

**Prerequisites:** Node.js 18+ (recommended 20), npm

**Server Development**
```bash
cd server
npm install
npm run dev        # Hot-reload with ts-node-dev
npm run build      # Compile TypeScript to dist/
npm run prod       # Build and run production mode
npm run typecheck  # Type validation only
```

**Client Development**
```bash
cd client
npm install
npm run dev        # Vite dev server (default: http://localhost:5173)
npm run build      # Full build: typecheck + Vite bundle
npm run typecheck  # Type validation only
npm run lint       # ESLint check
```

**Environment Variables**
- `server/.env.example` and `client/.env.example` document required keys
- Key server env: `MONGO_URI`, `ENCRYPTION_KEY` (32-byte hex for AES-256), `PORT`, `NODE_ENV`
- Key client env: `VITE_API_URL` (defaults to http://localhost:3000)
- Create local `.env` files (not committed; use examples as reference)

## Architecture Patterns

**Server Request Flow (3-layer + workflows)**
```
Routes (13 routers) → Controllers → Services → Repositories → Mongoose Models
                                         ↓
                                   Workflows (for multi-step business logic)
                                         ↓
                                   Middleware (auth, logging, error handling)
```

**Layer Responsibilities**
- **Routes** (`server/src/routes/`): HTTP entry points; delegate to controllers
- **Controllers** (`server/src/controllers/`): Request handlers; call services; return responses
- **Services** (`server/src/services/`): Business logic; call repositories; no direct HTTP
- **Repositories** (`server/src/repositories/`): Data access only; query Mongoose models; no business logic
- **Models** (`server/src/models/`): Mongoose schemas with full TypeScript types
- **Workflows** (`server/src/workflows/`): Complex multi-step processes (e.g., input filtering, profile evaluation)

**Middleware Stack** (`server/src/middleware/`)
- `authenticateToken()`: Verifies JWT; attaches `req.user`
- `requireAdmin()`: Checks `req.user.role === "admin"`
- `errorHandler()`: Global error catching; logs via Winston
- `requestLogger()`: Request/response logging to MongoDB
- `rateLimiter()`: IP-based rate limiting for proxy routes
- `proxyAuth()`: Alternative auth for user proxy keys

**Critical Services** (14 files in `server/src/services/`)
| Service | Purpose |
|---------|----------|
| `authService.ts` | Login, register, JWT/refresh, password reset |
| `userService.ts` | User CRUD, permissions, role management |
| `profileService.ts` | AI profile management (BYOK/MANAGED modes) |
| `filterService.ts` | Text evaluation against filter rules (core feature) |
| `organizationService.ts` | Multi-tenant org management |
| `llmService.ts` | LLM provider orchestration |
| `proxyService.ts` | LiteLLM proxy integration |
| `usageTracker.ts` | Cost & usage analytics |
| `promptService.ts` | Prompt template management |
| `providerKeyService.ts` | Encrypted API key storage |

## Frontend State Management

**Redux Store Structure** (`client/src/app/store.ts`)
```typescript
{
  tasks: tasksSlice,
  historys: historySlice,
  table: tableSlice,
  filterManagement: filterManagementSlice,
  example: exampleSlice,
  inquiries: inquiriesSlice
}
```

**Custom Typed Hooks** (`client/src/app/hooks.ts`)
- `useAppDispatch()`: Typed dispatch with all actions
- `useAppSelector<RootState>()`: Typed selector for store state
- Use these in all components instead of raw Redux hooks

**Feature Structure** (`client/src/features/`)
Each feature typically contains:
- Redux slice (state, reducers, thunks)
- Component directory (UI rendering)
- API integration hooks (axios calls to backend)
- Local types/interfaces (TypeScript interfaces for feature data)

Example: `features/auth/` (login, register, OAuth), `features/FilterManagement/` (admin UI for profiles)

**Client Routing** (`client/src/router/AppRouter.tsx`)
- Public routes: `/`, `/login`, `/register`, `/forgot-password`, `/reset-password/:token`
- Protected routes: `/safeai-ui` (admin/user dashboard based on role)
- Auth guards: `PublicRoute` (redirects to `/safeai-ui` if logged in), `ProtectedRoute` (requires valid token)

## Common Pitfalls & Constraints

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| **Admin role lost on org assign** | `organizationService.ts` | User loses admin when added to org | See [FIX_ADMIN_ROLE.md](docs/FIX_ADMIN_ROLE.md); existing users need DB update |
| **Token manager not initialized** | `App.tsx` | Tokens never auto-refresh; UI breaks on 401 | Ensure token manager initialized on app mount |
| **API keys exposed in logs** | All services | Security breach | Must use AES-256-GCM encryption for sensitive fields |
| **Circular service dependencies** | Services ↔ Repositories | Module resolution errors | Keep repositories pure data access (no business logic) |
| **Deprecated `user.organization` field** | `models/user.ts` | Confusing dual schemas | Use `organizationId` instead; field kept for backward compat |
| **MongoDB connection state** | `config/db.ts` | Stale connection after restart | Check `readyState === 1` before using connection |
| **Missing User CRUD UI** | Client admin | Cannot manage users | See [CLIENT_URGENT_TASKS.md](docs/CLIENT_URGENT_TASKS.md); Create/Edit/Delete forms not implemented |

## Critical Files & Patterns

| When you need to... | Start by looking at... |
|---------------------|------------------------|
| Add a new API endpoint | Create route in `routes/<name>Router.ts` → controller in `controllers/<name>Controller.ts` → service in `services/<name>Service.ts` |
| Understand authentication | [authService.ts](server/src/services/authService.ts) + [middleware/auth.ts](server/src/middleware/auth.ts) + [TOKEN_MANAGEMENT.md](docs/TOKEN_MANAGEMENT.md) |
| Create a new database model | Copy pattern from [models/user.ts](server/src/models/user.ts); then create repository in `repositories/` |
| Integrate with Redux | [app/store.ts](client/src/app/store.ts) + [app/hooks.ts](client/src/app/hooks.ts) |
| Call backend from client | [config/api.ts](client/src/config/api.ts); use `apiCall()` which auto-attaches auth and handles 401 |
| Add new UI feature | Follow pattern in [features/auth/](client/src/features/auth/); create Redux slice + components |
| Track costs/usage | [utils/costs.ts](server/src/utils/costs.ts) + [services/usageTracker.ts](server/src/services/usageTracker.ts) |
| Evaluate text against filters | [filterService.ts](server/src/services/filterService.ts); main business logic in workflows/input/inputFilterWorkflow.ts |
| Understand role-based access | [middleware/auth.ts](server/src/middleware/auth.ts); admin routes use `requireAdmin` middleware |
| Manage provider API keys | [providerKeyService.ts](server/src/services/providerKeyService.ts); uses AES-256-GCM encryption |

## Documentation References

These docs are authoritative sources—link to them rather than duplicating:

- [docs/PROJECT_SPECIFICATION.md](docs/PROJECT_SPECIFICATION.md) — Full system design & architecture
- [docs/TOKEN_MANAGEMENT.md](docs/TOKEN_MANAGEMENT.md) — Token refresh system, activity tracking, session management
- [docs/CLIENT_ROUTING_STRUCTURE.md](docs/CLIENT_ROUTING_STRUCTURE.md) — All frontend routes, route guards, ProtectedRoute/PublicRoute details
- [docs/CODE_DOCUMENTATION_GUIDE.md](docs/CODE_DOCUMENTATION_GUIDE.md) — JSDoc standards & documentation patterns
- [docs/FIX_ADMIN_ROLE.md](docs/FIX_ADMIN_ROLE.md) — Known admin role bug and database fix
- [docs/CLIENT_URGENT_TASKS.md](docs/CLIENT_URGENT_TASKS.md) — Outstanding work (User CRUD UI, API key regeneration, pagination)
- [docs/filter-readme-26-02.md](docs/filter-readme-26-02.md) — AI filter evaluation logic
- [docs/COST_CALCULATION_SUMMARY.md](docs/COST_CALCULATION_SUMMARY.md) — Billing & cost tracking details
- [docs/GOOGLE_OAUTH_SETUP.md](docs/GOOGLE_OAUTH_SETUP.md) — OAuth 2.0 configuration

## Agent Behavior Guidance

- Prefer modifying frontend behavior in `client/src` and backend behavior in `server/src`.
- When in doubt, look at [client/src/config/api.ts](client/src/config/api.ts) for request handling and [server/src/index.ts](server/src/index.ts) for route wiring.
- Keep the frontend/backend boundary clear: frontend changes should not assume backend implementation details beyond the exposed API contract.
- Preserve existing route semantics and auth patterns unless you are intentionally improving them.
- For complex multi-step logic, follow the Workflow pattern used in [server/src/workflows/](server/src/workflows/); don't embed business logic in services.
- All sensitive data (API keys, passwords, encryption keys) must be encrypted using AES-256-GCM before storage.
