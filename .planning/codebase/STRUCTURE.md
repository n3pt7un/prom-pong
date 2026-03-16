# Codebase Structure

**Analysis Date:** 2026-03-16

## Directory Layout

```text
test-pong/
├── source/                 # Main application codebase (frontend + backend)
│   ├── components/         # React feature/UI components
│   ├── context/            # React providers for auth, league data, toasts
│   ├── hooks/              # Custom hooks for handlers and realtime
│   ├── services/           # Frontend API/auth/storage service layer
│   ├── server/             # Express API, middleware, routes, persistence
│   ├── utils/              # Client-side domain utility functions
│   ├── lib/                # Shared integration clients/utilities (Supabase, helpers)
│   ├── public/             # Static frontend assets
│   ├── dist/               # Build output (generated)
│   └── supabase/           # Local Supabase metadata/temp artifacts
├── supabase/               # Root-level SQL migrations and Supabase project assets
├── scripts/                # Automation and helper scripts
├── docs/                   # Planning/specification documents
├── .github/                # CI/workflow and prompt/tooling configuration
├── .planning/codebase/     # Generated codebase mapping documents
└── .vscode/                # Workspace editor configuration
```

## Directory Purposes

**`source/components/`:**
- Purpose: Render-level UI and feature modules.
- Contains: Page-like screens (`Leaderboard.tsx`, `PlayersHub.tsx`), admin tabs (`admin/*.tsx`), reusable UI primitives (`ui/*.tsx`).
- Key files: `source/components/Layout.tsx`, `source/components/Leaderboard.tsx`, `source/components/AdminPanel.tsx`.

**`source/context/`:**
- Purpose: Global state providers and context APIs.
- Contains: `AuthContext`, `LeagueContext`, `ToastContext`.
- Key files: `source/context/AuthContext.tsx`, `source/context/LeagueContext.tsx`.

**`source/hooks/`:**
- Purpose: Stateful orchestration logic reused by components/providers.
- Contains: Mutation command hook (`useLeagueHandlers`), realtime subscription hook (`useRealtime`).
- Key files: `source/hooks/useLeagueHandlers.ts`, `source/hooks/useRealtime.ts`.

**`source/services/`:**
- Purpose: Frontend service abstraction for auth and API transport.
- Contains: `storageService.ts`, `authService.ts`, insights/elo helper services.
- Key files: `source/services/storageService.ts`, `source/services/authService.ts`.

**`source/server/`:**
- Purpose: Backend API implementation.
- Contains: Entry server, route modules, middleware, DB adapters, server-side services.
- Key files: `source/server/index.js`, `source/server/routes/matches.js`, `source/server/db/operations.js`, `source/server/middleware/auth.js`.

**`source/utils/`:**
- Purpose: Client-side pure domain utilities and calculations.
- Contains: Ranking/statistics/validation helpers and tests.
- Key files: `source/utils/statsUtils.ts`, `source/utils/matchValidation.ts`, `source/utils/gameTypeStats.ts`.

## Key File Locations

**Entry Points:**
- `source/index.tsx`: Frontend mount and root error boundary.
- `source/App.tsx`: Application shell, provider usage, tab routing, global modals.
- `source/server/index.js`: Express bootstrap and route registration.

**Configuration:**
- `source/package.json`: Runtime scripts (`dev`, `build`, `start`, `test`).
- `source/vite.config.ts`: Dev server and `/api` proxy to backend.
- `source/tsconfig.json`: TypeScript options and `@/*` path alias.
- `source/server/config.js`: Server runtime constants and env-derived settings.

**Core Logic:**
- `source/hooks/useLeagueHandlers.ts`: Command handlers for all user mutations.
- `source/services/storageService.ts`: Frontend API contract and HTTP call implementation.
- `source/server/routes/*.js`: Endpoint-specific business rules.
- `source/server/db/operations.js`: Persistence abstraction for Supabase/JSON modes.

**Testing:**
- `source/components/*.test.tsx`: UI and integration tests.
- `source/services/*.test.ts`: Service-level tests.
- `source/utils/*.test.ts`: Utility-focused unit tests.
- `source/jest.config.cjs`: Test runner configuration.

## Naming Conventions

**Files:**
- React components use PascalCase filenames: `PlayerProfile.tsx`, `AdminPanel.tsx`.
- Hooks use `useX` camelCase: `useLeagueHandlers.ts`, `useRealtime.ts`.
- Service and utility modules use lower camelCase names: `storageService.ts`, `insightsSorting.ts`.
- Backend route files use kebab-case resource naming: `pending-matches.js`, `export-import.js`.

**Directories:**
- Feature-group directories are lowercase: `components/insights`, `components/admin`, `server/routes`.
- Shared primitive folder uses concise lowercase namespace: `components/ui`.

## Where to Add New Code

**New Feature (frontend + API):**
- Primary UI code: `source/components/` (new screen/panel module).
- Shared client orchestration: `source/hooks/useLeagueHandlers.ts` or a new hook in `source/hooks/`.
- API client functions: `source/services/storageService.ts`.
- Backend route: `source/server/routes/<feature>.js`, then register in `source/server/index.js`.
- Persistence logic: extend `source/server/db/operations.js` (and mappers when Supabase shape differs).
- Tests: co-locate in matching folder (`*.test.tsx` or `*.test.ts`).

**New Component/Module:**
- Implementation: `source/components/`.
- If reusable primitive, place in `source/components/ui/`.
- If admin-only surface, place in `source/components/admin/` and wire through `source/components/AdminPanel.tsx`.

**Utilities:**
- Shared client helpers: `source/utils/`.
- Backend-only helpers: `source/server/services/`.
- Cross-runtime library wrappers: `source/lib/`.

## Special Directories

**`source/dist/`:**
- Purpose: Vite production build artifacts.
- Generated: Yes.
- Committed: Yes (currently present in repository).

**`source/node_modules/`:**
- Purpose: Installed package dependencies.
- Generated: Yes.
- Committed: No (dependency cache only).

**`supabase/migrations/`:**
- Purpose: SQL migration history for database schema.
- Generated: No (authored migration files).
- Committed: Yes.

**`.planning/codebase/`:**
- Purpose: Generated architecture/stack/convention concern maps for GSD planning.
- Generated: Yes.
- Committed: Yes.

---

*Structure analysis: 2026-03-16*
