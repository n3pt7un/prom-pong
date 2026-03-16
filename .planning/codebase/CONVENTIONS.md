# Coding Conventions

**Analysis Date:** 2026-03-16

## Naming Patterns

**Files:**
- React components use PascalCase filenames in `source/components/` (for example `source/components/StatsDashboard.tsx`, `source/components/PlayerProfile.tsx`).
- Hooks use `use*` camelCase naming in `source/hooks/` (for example `source/hooks/useLeagueHandlers.ts`, `source/hooks/useChallengeToasts.ts`).
- Utility and service modules use camelCase filenames in `source/utils/` and `source/services/` (for example `source/utils/insightsSorting.ts`, `source/services/authService.ts`).
- Backend route files are kebab-case in `source/server/routes/` (for example `source/server/routes/pending-matches.js`, `source/server/routes/export-import.js`).

**Functions:**
- Use camelCase for function names (for example `calculateTeammateStats` in `source/services/insightsService.ts`, `isValidAvatarUrl` in `source/server/routes/players.js`).
- React callbacks typically use `handle*` names (for example `handleMatchSubmitWithTab` in `source/App.tsx`, `handleDeletePlayer` in `source/hooks/useLeagueHandlers.ts`).

**Variables:**
- Local variables are camelCase (`activeLeagueId` in `source/hooks/useLeagueHandlers.ts`, `allowedOrigins` in `source/server/index.js`).
- Constants use UPPER_SNAKE_CASE when global/semantic constants (`K_FACTOR`, `INITIAL_ELO` in `source/server/services/elo.js`).

**Types:**
- TypeScript interfaces/types use PascalCase (`StatsDashboardProps` in `source/components/StatsDashboard.tsx`, `Player` and `Match` in `source/types.ts`).

## Code Style

**Formatting:**
- No Prettier config detected under `source/` (`.prettierrc*`/`prettier.config.*` not detected).
- Formatting is currently convention-driven: semicolons and single quotes are consistently used across TypeScript and JS files (`source/App.tsx`, `source/server/index.js`).

**Linting:**
- No ESLint config file detected under `source/` (`.eslintrc*`/`eslint.config.*` not detected).
- Existing code includes lint-oriented inline suppression in specific cases (`// eslint-disable-next-line no-new-func` in `source/server/services/elo.js`).

## Import Organization

**Order:**
1. External libraries first (for example React/libraries in `source/components/StatsDashboard.tsx`).
2. Internal modules next (for example `../types`, `./ui/*` in `source/components/StatsDashboard.tsx`).
3. Types are often imported with runtime imports rather than `import type` in many files (`source/services/insightsService.ts`, `source/components/StatsDashboard.tsx`).

**Path Aliases:**
- Alias `@/*` is configured in `source/tsconfig.json`.
- Active usage of `@/` imports is not detected in `source/**/*.ts(x)`; prefer current relative-import style unless adopting alias usage consistently.

## Error Handling

**Patterns:**
- Frontend async handlers catch and surface user-facing errors via toast messages (`source/hooks/useLeagueHandlers.ts`).
- Backend routes use `try/catch`, log server-side context with endpoint-specific messages, and return structured JSON errors (`source/server/routes/players.js`, `source/server/routes/admin.js`).
- Service-level fallback behavior is used for risky computation paths (custom ELO formula fallback to standard formula in `source/server/services/elo.js`).

## Logging

**Framework:** console logging (`console.log`, `console.error`, `console.warn`).

**Patterns:**
- Server startup/runtime logs for environment and route activity (`source/server/index.js`).
- Explicit error logs include route/method context (`source/server/routes/admin.js`, `source/server/routes/players.js`).
- Warnings in utility error-handling paths are test-verified (`console.warn` behavior covered in `source/utils/gameTypeStats.test.ts`).

## Comments

**When to Comment:**
- Files use comments for non-obvious business rules and edge-case behavior (tab normalization/history sync in `source/App.tsx`; security rationale in `source/server/index.js`).
- Utility/service modules include explanatory comments around algorithmic logic and edge cases (`source/services/insightsService.ts`, `source/server/services/elo.js`).

**JSDoc/TSDoc:**
- JSDoc-style block comments are common for exported functions with parameter/return descriptions (`source/services/insightsService.ts`, `source/server/services/elo.js`).

## Function Design

**Size:**
- Small utility helpers for pure calculations are common (`source/lib/utils.ts`, `source/services/authService.ts`).
- Complex UI orchestration and handler collections can be large (`source/App.tsx`, `source/hooks/useLeagueHandlers.ts`).

**Parameters:**
- Domain functions pass explicit primitive/domain arguments rather than large option objects unless needed (`simulateWinsNeeded` in `source/services/insightsService.ts`, `calculateMatchDelta` in `source/server/services/elo.js`).

**Return Values:**
- Functions return typed objects/arrays and use explicit sentinel values where needed (`number | null` in `simulateWinsNeeded` at `source/services/insightsService.ts`).
- Backend routes return JSON payloads with `success` or `error` keys (`source/server/routes/admin.js`, `source/server/routes/players.js`).

## Module Design

**Exports:**
- Named exports are the default in utility/service modules (`source/services/insightsService.ts`, `source/services/authService.ts`).
- Default exports are used for Express routers and many React components (`source/server/routes/admin.js`, `source/components/Leaderboard.tsx`).

**Barrel Files:**
- Barrel files are not a dominant pattern; imports mostly target concrete module paths directly (for example `source/App.tsx`, `source/hooks/useLeagueHandlers.ts`).

---

*Convention analysis: 2026-03-16*
