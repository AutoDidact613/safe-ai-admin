# SafeAI Admin — Agent Instructions

## What This Project Is
SafeAI is an AI proxy/gateway that sits between users and LLM providers (OpenAI, Anthropic, etc.).
The admin panel manages users, content-filter profiles, usage tracking, and API keys.

## Repo Layout
```
client/    React 19 + TypeScript frontend (Vite, port 5173)
server/    Express 5 + TypeScript backend (port 3001)
```

## Before You Start
1. Read `CLAUDE.md` for full architecture details.
2. Run `npm run typecheck` in both `client/` and `server/` before and after changes to catch errors early.
3. Never commit `.env` files.

## Critical Rules

### Client-side
- **API calls:** Always use `apiCall<T>(endpoint, options?)` from `src/config/api.ts`. Never use raw `fetch()`. It handles token refresh on 401.
- **Auth state:** Always use `useAuth()` from `src/context/AuthContext.tsx`. Never read `localStorage.getItem("user")` or `localStorage.getItem("userRole")` directly.
- **useEffect + fetch:** Always add `AbortController` and return a cleanup function.
- **No division by zero:** Guard all percentage calculations: `total > 0 ? (x / total) * 100 : 0`.

### Server-side
- Protect routes with `authenticateToken` middleware. Admin routes also need `requireAdmin`.
- Use `repositories/` layer for all DB operations — don't call Mongoose models directly in controllers.
- Log with `logger` (Winston), not `console.log`.
- Validate request body with Zod before processing.

## Running the Project
```bash
# Client
cd client && npm run dev

# Server
cd server && npm run dev

# Type-check only (no emit)
cd client && npm run typecheck
cd server && npm run typecheck

# Tests (server)
cd server && npm test
```

## Making Changes

### Adding a new API endpoint
1. Add the URL to `client/src/config/api.ts` → `API_ENDPOINTS`.
2. Create the route handler in `server/src/routes/`.
3. Add controller logic in `server/src/controllers/`.
4. Add repository method in `server/src/repositories/`.
5. Mount in `server/src/index.ts`.

### Adding a new client page
1. Create component in `src/pages/` or `src/features/`.
2. Add route in `src/router/AppRouter.tsx`.
3. Wrap in `<ProtectedRoute>` + `<ErrorBoundary>` if authenticated.

### Adding a new feature to the dashboard
- Check if it belongs in `UserDashboard` (regular user) or `AdminStatistics`/`ProfilesManagement`/`UsersManagement` (admin).
- For data fetching, prefer extending `useUsageData` or `useProfiles` hooks over new inline fetches.

## Architecture Decisions to Preserve
- `Statistics.tsx` is intentionally a thin router component. Admin vs. user logic lives in `AdminStatistics` / `UserStatistics`.
- `AuthContext` is the single source of truth for auth state. Do not add secondary auth state elsewhere.
- `ErrorBoundary` wraps all protected routes so one component crash doesn't kill the whole dashboard.
- `apiCall` includes automatic token refresh — this is why raw `fetch()` must not be used.
