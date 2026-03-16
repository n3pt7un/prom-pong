# Architecture

**Analysis Date:** 2026-03-16

## Pattern Overview

**Overall:** Monolithic full-stack application with a React SPA frontend and an Express API backend in a single `source` workspace.

**Key Characteristics:**
- UI composition is centralized in `source/App.tsx` and split into feature components under `source/components/`.
- Frontend state is provider-driven (`AuthContext`, `LeagueContext`, `ToastContext`) with shared action handlers in `source/hooks/useLeagueHandlers.ts`.
- Backend route handlers in `source/server/routes/` orchestrate business rules and persist via `dbOps` in `source/server/db/operations.js`.
- Persistence is adapter-based: Supabase path and JSON/GCS path are both hidden behind `dbOps` and `source/server/db/persistence.js`.

## Layers

**Frontend Entry + Shell:**
- Purpose: Boot React and compose global providers and app shell.
- Location: `source/index.tsx`, `source/App.tsx`
- Contains: Root render, error boundary, provider stack, tab navigation, lazy feature loading.
- Depends on: Context providers (`source/context/*.tsx`), UI/feature components (`source/components/*`).
- Used by: Browser client runtime.

**Frontend State + Domain Orchestration:**
- Purpose: Manage auth/session, league data state, and action side effects.
- Location: `source/context/AuthContext.tsx`, `source/context/LeagueContext.tsx`, `source/hooks/useLeagueHandlers.ts`, `source/hooks/useRealtime.ts`
- Contains: Auth lifecycle, state hydration, realtime subscriptions, mutation handlers, toast-driven UX feedback.
- Depends on: API client in `source/services/storageService.ts`, auth client in `source/services/authService.ts`.
- Used by: Page and feature components in `source/components/`.

**Frontend Data Access (API Client):**
- Purpose: Encapsulate HTTP calls and token propagation.
- Location: `source/services/storageService.ts`
- Contains: `apiRequest` helper, typed CRUD/mutation functions for `/api/*` endpoints.
- Depends on: `source/services/authService.ts` for bearer token retrieval.
- Used by: Context providers and hooks (`source/context/*.tsx`, `source/hooks/useLeagueHandlers.ts`).

**Backend API + Middleware:**
- Purpose: HTTP API routing, auth/authorization, transport-level middleware.
- Location: `source/server/index.js`, `source/server/middleware/auth.js`, `source/server/routes/*.js`
- Contains: CORS/rate limits, auth middleware, feature/admin/player/match/challenge routes.
- Depends on: `dbOps` (`source/server/db/operations.js`), domain services (`source/server/services/*.js`).
- Used by: Frontend `source/services/storageService.ts` and any external API consumers.

**Backend Persistence + Domain Services:**
- Purpose: Data storage abstraction, DB mapping, ELO/stat computations.
- Location: `source/server/db/operations.js`, `source/server/db/persistence.js`, `source/server/db/mappers.js`, `source/server/services/elo.js`, `source/server/services/insights.js`
- Contains: Unified read/write operations, Supabase-to-legacy mapping, JSON/GCS persistence, ranking math.
- Depends on: `source/lib/supabase.js`, `source/server/config.js`, filesystem/GCS clients.
- Used by: Route handlers in `source/server/routes/*.js`.

## Data Flow

**Initial Application Load:**
1. `source/index.tsx` mounts `App` and wraps rendering with `ErrorBoundary`.
2. `source/App.tsx` composes `ToastProvider` -> `AuthProvider` -> `LeagueProvider` -> `AppContent`.
3. `AuthProvider` (`source/context/AuthContext.tsx`) resolves user session then calls `getMe()`.
4. `LeagueProvider` (`source/context/LeagueContext.tsx`) calls `getLeagueData()` and optional admin-only/config fetches.
5. API requests hit `source/server/index.js` routes, route handlers call `dbOps`, and results hydrate provider state.

**Match Logging Flow:**
1. UI submits from `source/components/MatchLogger.tsx` through `handleMatchSubmit` in `source/hooks/useLeagueHandlers.ts`.
2. `handleMatchSubmit` calls `recordMatch` in `source/services/storageService.ts`.
3. Backend route `POST /api/matches` in `source/server/routes/matches.js` validates payload, checks permissions, calculates deltas.
4. Route persists via `dbOps.createMatch` and `dbOps.updatePlayer` in `source/server/db/operations.js`.
5. Frontend refreshes state (`refreshData`) and updates the view.

**Realtime Update Flow (Supabase mode):**
1. `LeagueProvider` enables `useRealtime` when `VITE_USE_SUPABASE === 'true'`.
2. `source/hooks/useRealtime.ts` subscribes to table changes through `source/lib/supabase.ts`.
3. Incoming events mutate React state arrays (`setPlayers`, `setMatches`, etc.) without polling.

**State Management:**
- Server state is normalized in providers and propagated through React context.
- Mutations execute via handler hooks, then reconcile with explicit refresh and/or realtime updates.
- UI view state (active tab, modals, local notifications) remains in `source/App.tsx`.

## Key Abstractions

**`LeagueState` transport contract:**
- Purpose: Shared shape for frontend hydration and export/import operations.
- Examples: `source/services/storageService.ts`, `source/server/routes/state.js`
- Pattern: DTO-style aggregate object with arrays (`players`, `matches`, `history`, etc.).

**`dbOps` repository facade:**
- Purpose: Hide storage backend details from routes.
- Examples: `source/server/db/operations.js`, usage across `source/server/routes/*.js`
- Pattern: Method-based data access abstraction (`getPlayers`, `createMatch`, `getFullState`, etc.).

**Provider + Hook orchestration:**
- Purpose: Separate read models from write actions in frontend.
- Examples: `source/context/LeagueContext.tsx`, `source/hooks/useLeagueHandlers.ts`
- Pattern: Context for state exposure + custom hook for mutation commands.

## Entry Points

**Frontend client entry:**
- Location: `source/index.tsx`
- Triggers: Browser loading `source/index.html` via Vite build/dev server.
- Responsibilities: Mount root React tree and top-level error boundary.

**Frontend application shell:**
- Location: `source/App.tsx`
- Triggers: Imported by `source/index.tsx`.
- Responsibilities: Provider stack, tab-level routing via `history`, global modals/toasts, lazy feature rendering.

**Backend server entry:**
- Location: `source/server/index.js`
- Triggers: `npm run dev` and `npm run start` from `source/package.json`.
- Responsibilities: Initialize middleware, register `/api` routes, choose persistence mode, start HTTP server.

## Error Handling

**Strategy:** Route-level try/catch on backend plus client-side surfaced errors through toast notifications.

**Patterns:**
- Backend routes return HTTP status + `{ error }` payload on validation/auth/internal failures (`source/server/routes/*.js`).
- API client `apiRequest` throws normalized `Error` objects for non-2xx responses (`source/services/storageService.ts`).
- UI handlers catch exceptions and display success/error toast feedback (`source/hooks/useLeagueHandlers.ts`).
- Render-time crashes are contained by `ErrorBoundary` (`source/index.tsx`).

## Cross-Cutting Concerns

**Logging:** Request and error logs on server (`source/server/index.js`, route files), plus realtime/subscription diagnostics (`source/hooks/useRealtime.ts`).

**Validation:** Input validation is route-local (match type/score/team checks in `source/server/routes/matches.js`).

**Authentication:** Bearer-token verification in `source/server/middleware/auth.js`, with frontend token injection in `source/services/storageService.ts`.

---

*Architecture analysis: 2026-03-16*
