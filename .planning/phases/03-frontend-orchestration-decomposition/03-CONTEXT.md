# Phase 3: Frontend Orchestration Decomposition - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Decompose `source/App.tsx` orchestration into route-level containers and focused hooks, split `source/hooks/useLeagueHandlers.ts` into domain modules with a shared mutation helper, and remove dead legacy settings code from the active runtime tree. Existing user-facing behavior must remain completely equivalent after all changes.

</domain>

<decisions>
## Implementation Decisions

### App.tsx Container Structure
- Route containers live in a new `source/containers/` directory (e.g., `LeaderboardContainer.tsx`, `LogMatchContainer.tsx`, `PlayersContainer.tsx`, `AdminContainer.tsx`, etc.)
- Each container owns the modal state for modals it triggers — modal state does NOT stay in App.tsx
- App.tsx is left doing: tab navigation state (`activeTab`, `navigateTo`, history popstate handling) + provider stack composition + container selection (which container to render)
- Cross-tab coordination handlers (`handleMatchmakerSelect`, `handleLeaderboardPlayerClick`) stay in App.tsx and are passed as props to containers that need them

### Handler Domain Modules
- Domain modules live in `source/hooks/handlers/` subdirectory
- 4 modules matching ROADMAP spec:
  - `useMatchHandlers.ts` — match submit/delete/edit, confirm/dispute/force-confirm/reject pending, request correction, approve/reject correction
  - `usePlayerHandlers.ts` — create/delete player, update player name, create/delete/update racket, update player racket assignment
  - `useAdminHandlers.ts` — season reset, factory reset, start fresh, start season, end season, import/export, league create/update/delete, assign player to league
  - `useTournamentHandlers.ts` — create/respond/generate/cancel/complete challenge, create tournament, submit tournament result, delete tournament
- `source/hooks/useLeagueHandlers.ts` is kept as a re-export facade — re-exports all handlers from the 4 domain modules so existing consumers require zero import changes

### Legacy Settings Removal
- `source/components/Settings.old.tsx` is deleted entirely — git history preserves it if ever needed
- No archiving or exclusion from build — clean deletion

### Claude's Discretion
- Mutation helper design — the repeating try/catch + showToast + refreshData pattern may be extracted into a shared helper; Claude decides the interface (higher-order function vs wrapper), whether refreshData is always called or optional, and how undo actions are handled
- Exact container file naming and which tabs need containers vs inline rendering in App.tsx
- Internal file structure and import organization within domain handler modules

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope and Requirements
- `.planning/ROADMAP.md` — Phase 3 goal, success criteria, and requirement IDs (ARCH-01, ARCH-02, ARCH-03, ARCH-04)
- `.planning/REQUIREMENTS.md` — ARCH-01 through ARCH-04 requirement definitions and constraints
- `.planning/PROJECT.md` — Stabilization principles: brownfield incrementalism, behavioral compatibility, no big-bang rewrites

### Primary Source Files to Decompose
- `source/App.tsx` — Current monolithic shell with navigation, modal state, cross-tab handlers, and tab rendering (738 lines)
- `source/hooks/useLeagueHandlers.ts` — Current monolith with ~30 handlers to be split into domain modules (516 lines)
- `source/components/Settings.old.tsx` — Dead legacy file to be deleted

### Existing Patterns and Conventions
- `.planning/codebase/ARCHITECTURE.md` — Provider/hook orchestration pattern, data flow, layer responsibilities
- `.planning/codebase/CONVENTIONS.md` — Established coding conventions to preserve
- `.planning/codebase/STRUCTURE.md` — Current file structure baseline

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `source/context/LeagueContext.tsx` + `source/context/AuthContext.tsx`: Provide state read models consumed by handlers — domain modules will continue using these via hooks
- `source/hooks/useLeagueHandlers.ts`: Existing `useCallback` + `useToast` + `refreshData` pattern is the template for all domain module handlers
- `source/services/storageService.ts`: API client — all handler calls go through this; no changes needed to this layer

### Established Patterns
- Handler pattern: `useCallback(async (...) => { try { await apiCall(); await refreshData(); showToast('success', 'success'); } catch (err) { showToast(err.message || 'fallback', 'error'); } }, [deps])`
- Modal state pattern: `const [showXxxModal, setShowXxxModal] = useState(false)` in the owning component
- Toast pattern: `showToast(message, 'success'|'error', { label, onClick }?)` from `useToast()`

### Integration Points
- App.tsx currently imports `useLeagueHandlers` in `AppContent` — after decomposition, App.tsx passes cross-tab callbacks as props to containers; containers import from domain modules or the facade
- New `source/containers/` directory connects App.tsx's navigation logic to feature components in `source/components/`
- `useLeagueHandlers.ts` facade keeps the existing import path valid for any consumers not yet updated

</code_context>

<specifics>
## Specific Ideas

- The facade pattern for `useLeagueHandlers.ts` is the key to safe brownfield decomposition — zero consumer changes required while the internals are split
- `Settings.old.tsx` deletion is the simplest possible change — no archiving overhead

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-frontend-orchestration-decomposition*
*Context gathered: 2026-03-16*
