# Phase 3: Frontend Orchestration Decomposition - Research

**Researched:** 2026-03-16
**Domain:** React component decomposition, custom hook splitting, brownfield refactoring
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**App.tsx Container Structure**
- Route containers live in a new `source/containers/` directory (e.g., `LeaderboardContainer.tsx`, `LogMatchContainer.tsx`, `PlayersContainer.tsx`, `AdminContainer.tsx`, etc.)
- Each container owns the modal state for modals it triggers — modal state does NOT stay in App.tsx
- App.tsx is left doing: tab navigation state (`activeTab`, `navigateTo`, history popstate handling) + provider stack composition + container selection (which container to render)
- Cross-tab coordination handlers (`handleMatchmakerSelect`, `handleLeaderboardPlayerClick`) stay in App.tsx and are passed as props to containers that need them

**Handler Domain Modules**
- Domain modules live in `source/hooks/handlers/` subdirectory
- 4 modules matching ROADMAP spec:
  - `useMatchHandlers.ts` — match submit/delete/edit, confirm/dispute/force-confirm/reject pending, request correction, approve/reject correction
  - `usePlayerHandlers.ts` — create/delete player, update player name, create/delete/update racket, update player racket assignment
  - `useAdminHandlers.ts` — season reset, factory reset, start fresh, start season, end season, import/export, league create/update/delete, assign player to league
  - `useTournamentHandlers.ts` — create/respond/generate/cancel/complete challenge, create tournament, submit tournament result, delete tournament
- `source/hooks/useLeagueHandlers.ts` is kept as a re-export facade — re-exports all handlers from the 4 domain modules so existing consumers require zero import changes

**Legacy Settings Removal**
- `source/components/Settings.old.tsx` is deleted entirely — git history preserves it if ever needed
- No archiving or exclusion from build — clean deletion

### Claude's Discretion
- Mutation helper design — the repeating try/catch + showToast + refreshData pattern may be extracted into a shared helper; Claude decides the interface (higher-order function vs wrapper), whether refreshData is always called or optional, and how undo actions are handled
- Exact container file naming and which tabs need containers vs inline rendering in App.tsx
- Internal file structure and import organization within domain handler modules

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ARCH-01 | source/App.tsx orchestration decomposed into route-level containers and focused coordination hooks without navigation or modal behavior regression | Container pattern analysis, App.tsx full read, modal state inventory |
| ARCH-02 | source/hooks/useLeagueHandlers.ts split into domain modules (matches, players, admin, tournaments/challenges) with shared mutation/error helper behavior | Full handler inventory (34 handlers), domain grouping analysis |
| ARCH-03 | Shared mutation helper standardizes async status, success/error toast behavior, and refresh side effects across handler modules | Pattern extraction analysis from existing try/catch repetition |
| ARCH-04 | Dead legacy settings implementation removed from active runtime source tree or archived outside runtime paths | Settings.old.tsx confirmed present and unused |
</phase_requirements>

---

## Summary

Phase 3 is a pure brownfield refactoring: no new features, no behavior changes, only structural redistribution. All source material exists in two primary files — `source/App.tsx` (738 lines) and `source/hooks/useLeagueHandlers.ts` (516 lines) — plus the orphaned `source/components/Settings.old.tsx`. The full content of both primary files was read and every handler and modal was catalogued.

The decomposition has two independent workstreams: (1) container extraction from App.tsx, and (2) handler domain module splitting. These workstreams touch different files and can be planned and executed in separate waves with no ordering dependency between them. The facade pattern on `useLeagueHandlers.ts` means all existing consumers of that hook are untouched regardless of execution order.

The mutation helper (ARCH-03) is a discretion area. The existing `useLeagueHandlers.ts` has a strictly uniform try/catch/refreshData/showToast pattern across ~30 of 34 handlers, with only two exceptions: `handleMatchSubmit` (adds an undo action to the toast) and `handleCompleteChallenge` (two sequential API calls). A simple higher-order function that accepts the apiCall, successMessage, optional undo action, and optional `skipRefresh` flag covers all cases cleanly.

**Primary recommendation:** Extract the mutation helper first as a utility used by all four domain modules. Then split handlers into domain modules. Then extract containers. Delete Settings.old.tsx as an independent cleanup task.

---

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | Component model, hooks | Project baseline |
| TypeScript | 5.x | Type safety across new modules | Project baseline |
| `useCallback` | React built-in | Stable handler references | Already the pattern in useLeagueHandlers.ts |
| `useState` | React built-in | Modal state in containers | Already the pattern in App.tsx |

### No New Dependencies
This phase adds zero external dependencies. All patterns use React's built-in hook API and the existing project infrastructure.

---

## Architecture Patterns

### Recommended Project Structure After Phase 3

```
source/
├── App.tsx                    # Navigation state only + provider stack + container dispatch
├── containers/                # NEW: route-level container components
│   ├── LeaderboardContainer.tsx
│   ├── LogMatchContainer.tsx
│   ├── PlayersContainer.tsx
│   ├── ArmoryContainer.tsx
│   ├── SettingsContainer.tsx
│   ├── InsightsContainer.tsx
│   ├── RecentMatchesContainer.tsx
│   ├── HallOfFameContainer.tsx
│   ├── ChallengesContainer.tsx
│   ├── WeeklyChallengesContainer.tsx
│   ├── TournamentsContainer.tsx
│   ├── SeasonsContainer.tsx
│   └── LeaguesContainer.tsx
├── hooks/
│   ├── useLeagueHandlers.ts   # MODIFIED: re-export facade only
│   ├── useRealtime.ts         # unchanged
│   ├── useChallengeToasts.ts  # unchanged
│   └── handlers/              # NEW: domain handler modules
│       ├── useMatchHandlers.ts
│       ├── usePlayerHandlers.ts
│       ├── useAdminHandlers.ts
│       └── useTournamentHandlers.ts
├── utils/
│   └── mutationHelper.ts      # NEW: shared try/catch/toast/refresh helper
└── components/
    └── Settings.old.tsx       # DELETED
```

### Pattern 1: Facade Re-export (ARCH-02 safety mechanism)

The existing `useLeagueHandlers.ts` becomes a pure re-export file. All 34 return keys are preserved. Existing components that call `const handlers = useLeagueHandlers()` continue to work with no changes.

```typescript
// source/hooks/useLeagueHandlers.ts (after decomposition)
// Source: project conventions — named exports, relative imports
import { useMatchHandlers } from './handlers/useMatchHandlers';
import { usePlayerHandlers } from './handlers/usePlayerHandlers';
import { useAdminHandlers } from './handlers/useAdminHandlers';
import { useTournamentHandlers } from './handlers/useTournamentHandlers';

export function useLeagueHandlers() {
  const matchHandlers = useMatchHandlers();
  const playerHandlers = usePlayerHandlers();
  const adminHandlers = useAdminHandlers();
  const tournamentHandlers = useTournamentHandlers();
  return {
    ...matchHandlers,
    ...playerHandlers,
    ...adminHandlers,
    ...tournamentHandlers,
  };
}
```

Note: `useMatchHandlers` needs access to `activeLeagueId` (for `handleMatchSubmit`, `handleCompleteChallenge`, `handleGenerateChallenges`). Each domain module calls the same hooks (`useLeague`, `useAuth`, `useToast`) directly rather than receiving them as arguments — this matches the existing pattern in the current monolith.

### Pattern 2: Mutation Helper (ARCH-03 design)

The repeating pattern across ~30 of 34 handlers is:
```typescript
useCallback(async (...args) => {
  try {
    await apiCall(...args);
    await refreshData();
    showToast('success message', 'success');
  } catch (err: any) {
    showToast(err.message || 'fallback', 'error');
  }
}, [refreshData, showToast, ...otherDeps])
```

Two exception cases to account for:
1. `handleMatchSubmit` — toast has an undo action `{ label, onClick }`
2. `handleCompleteChallenge` — two sequential API calls before `refreshData`
3. `handleExport` — no `refreshData` call needed (read-only + browser download)
4. `handleSeasonReset`, `handleFactoryReset`, `handleStartFresh` — call `refreshData` but have no try/catch around the reset call itself (mild inconsistency in existing code)

Recommended helper interface:
```typescript
// source/utils/mutationHelper.ts
type MutationOptions = {
  successMessage: string;
  errorFallback: string;
  skipRefresh?: boolean;
  undoAction?: { label: string; onClick: () => void | Promise<void> };
};

async function runMutation(
  apiCall: () => Promise<void>,
  { successMessage, errorFallback, skipRefresh, undoAction }: MutationOptions,
  refreshData: () => Promise<void>,
  showToast: (msg: string, type: 'success' | 'error', action?: { label: string; onClick: () => void }) => void
): Promise<void>
```

This is a plain async function, not a React hook — domain modules call it inside their `useCallback` closures. This keeps it testable without a render environment.

### Pattern 3: Container Ownership Model

Each container:
- Imports its domain handler hook(s) directly
- Owns `useState` for any modals it triggers
- Receives cross-tab callbacks as props from App.tsx (for `handleMatchmakerSelect`, `handleLeaderboardPlayerClick`)
- Pulls context values from `useLeague()`, `useAuth()`, etc. directly

```typescript
// source/containers/LogMatchContainer.tsx (example shape)
import React, { useState } from 'react';
import MatchLogger from '../components/MatchLogger';
import { useMatchHandlers } from '../hooks/handlers/useMatchHandlers';
import { useAuth } from '../context/AuthContext';
import { useLeague } from '../context/LeagueContext';

interface LogMatchContainerProps {
  onMatchLogged?: () => void; // cross-tab callback from App.tsx
}

export function LogMatchContainer({ onMatchLogged }: LogMatchContainerProps) {
  const { currentUser, isAdmin } = useAuth();
  const { players, activeLeagueId, leagues } = useLeague();
  const { handleMatchSubmit } = useMatchHandlers();
  // ... modal state if needed
}
```

### Pattern 4: App.tsx After Decomposition

App.tsx `AppContent` retains only:
1. Tab navigation state: `activeTab`, `navigateTo`, `normalizeTab`, `VALID_TABS`, hash-restore `useEffect`, popstate `useEffect`
2. Provider composition (in the `App` function wrapper)
3. Cross-tab handler functions: `handleMatchmakerSelect`, `handleLeaderboardPlayerClick`
4. `renderContent()` function that selects which container to render based on `activeTab`
5. Global overlays that are not tab-specific: toast rendering, connection-lost banner, `InstallPrompt`, admin panel overlay

Modal state that currently lives in App.tsx and should move to containers:
- `showCreatePlayerModal` → `PlayersContainer`
- `showLogMatchModal` → the modal log match wrapper stays at App.tsx level since it is triggered from the global header nav "Log Match" button (not a tab), OR a `GlobalLogMatchModal` container owned at App.tsx level is acceptable
- `showChallengeModal` → `ChallengesContainer` or a challenge-specific container
- `activeChallengeForLog` → whichever container exposes the "complete challenge" button (ChallengesContainer, InsightsContainer)
- `showChallengeNotification`, `newChallenges`, `hasCheckedChallenges` → `ChallengesContainer` or a dedicated notification container

The `showLogMatchModal` and `showAdminPanel` are triggered by global Layout header buttons (not by tab content), so they reasonably stay in App.tsx or in dedicated top-level overlay components. This is a discretion area.

### Anti-Patterns to Avoid

- **Passing refreshData or showToast as props between containers**: Each domain module calls `useLeague()` and `useToast()` directly. No prop-drilling of context values.
- **Creating barrel files**: The project convention is concrete module imports. The facade `useLeagueHandlers.ts` is the only intentional aggregator.
- **Overusing `import type`**: Project convention is to mix runtime and type imports; don't enforce stricter style in Phase 3 files.
- **Splitting handlers by file size rather than domain cohesion**: Stick to the 4 decided domain modules; don't create a 5th module to balance line counts.
- **Calling hooks inside helper functions**: `runMutation` is a plain async function, not a hook. It receives `refreshData` and `showToast` as function arguments injected from the calling hook's closure.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Async status tracking (loading/error state per operation) | Custom async state machine | Not needed — existing UX uses only toast feedback, no per-button loading spinners. Don't add new loading state patterns in Phase 3. |
| Module-level singleton for handler instances | Custom singleton/registry | React hooks with `useCallback` — already the pattern |
| Test mocks for React context | Custom context mock utilities | `@testing-library/react` render with wrapper providers — already used in integration.test.tsx |

**Key insight:** This phase is structural redistribution. No new behavior is introduced. Every pattern already exists in the codebase; the only work is moving code to the right files.

---

## Common Pitfalls

### Pitfall 1: Breaking `useCallback` Dependency Arrays After Split

**What goes wrong:** When a handler is moved to a domain module, its `useCallback` deps must reference values from the new hook's scope. A subtle error is leaving deps that reference variables from a different hook's scope (e.g., `activeLeagueId` from `useLeague` is used in `useMatchHandlers`, `useTournamentHandlers`, and the current `useLeagueHandlers` — if the split leaves it out of a dep array the handler will close over a stale value).

**Why it happens:** Automated move without reviewing each handler's dep array against what the domain module actually imports.

**How to avoid:** For each handler moved, verify every variable in the `useCallback` dep array is imported from context hooks called inside the same domain module function body.

**Warning signs:** TypeScript `react-hooks/exhaustive-deps` warnings (if lint is enabled); stale ELO / match-state bugs after the first match submission in a new session.

### Pitfall 2: Modal State Left in App.tsx by Mistake

**What goes wrong:** The decision is clear — each container owns its modal state. If a modal's `useState` and its corresponding `set*` calls are not moved together, the container renders the modal JSX but triggers it from the wrong component, causing props to flow in unexpected directions or the modal to never open.

**Why it happens:** App.tsx has both `useState` declarations and JSX rendering for modals in different parts of the file (declarations at lines 80-83, 166-172; JSX at lines 570-683). A partial move that relocates JSX but not state (or vice versa) will compile but behave incorrectly.

**How to avoid:** For each modal: move the `useState`, the setter, the trigger site, and the JSX block as an atomic unit into the target container. Verify App.tsx no longer references the moved modal's state.

### Pitfall 3: Facade Return Shape Mismatch

**What goes wrong:** If any handler name in the facade's return object doesn't match what the domain module exports, callers that use `handlers.handleXxx` will get `undefined` at runtime with no TypeScript error if the return type is inferred as `any`.

**Why it happens:** Renaming or omitting a handler key during the split without updating the facade's spread.

**How to avoid:** Add an explicit return type annotation to the `useLeagueHandlers` facade (or use a test that calls every key and verifies it is a function). The current hook has 34 named return values — all must remain in the facade return.

**Full handler inventory (34 keys):**
`handleMatchSubmit`, `handleDeleteMatch`, `handleEditMatch`, `handleCreatePlayer`, `handleDeletePlayer`, `handleCreateRacket`, `handleDeleteRacket`, `handleUpdateRacket`, `handleUpdatePlayerRacket`, `handleUpdatePlayerName`, `handleSeasonReset`, `handleFactoryReset`, `handleStartFresh`, `handleExport`, `handleImport`, `handleConfirmPending`, `handleDisputePending`, `handleForceConfirmPending`, `handleRejectPending`, `handleStartSeason`, `handleEndSeason`, `handleCreateChallenge`, `handleRespondChallenge`, `handleGenerateChallenges`, `handleCancelChallenge`, `handleCompleteChallenge`, `handleCreateTournament`, `handleSubmitTournamentResult`, `handleDeleteTournament`, `handleCreateLeague`, `handleUpdateLeague`, `handleDeleteLeague`, `handleAssignPlayerLeague`, `handleApproveCorrection`, `handleRejectCorrection`

### Pitfall 4: `handleRequestCorrection` is Defined in App.tsx, Not in useLeagueHandlers

**What goes wrong:** `handleRequestCorrection` (line 176 in App.tsx) is defined directly in `AppContent`, not in `useLeagueHandlers`. It calls `createCorrectionRequest` from `storageService` and uses `showToast`. It should move to `useMatchHandlers` during container extraction — but if the planner assumes all handlers come from `useLeagueHandlers`, this one is missed.

**How to avoid:** The planner must include `handleRequestCorrection` in `useMatchHandlers`. It follows the same pattern and fits the match domain.

### Pitfall 5: `handleMatchSubmitWithTab` Navigation Side Effect

**What goes wrong:** App.tsx has `handleMatchSubmitWithTab` (line 201) which wraps `handlers.handleMatchSubmit` and calls `navigateTo('leaderboard')` on success. The `navigateTo` function depends on App.tsx's navigation state. If this wrapper is moved to a container, `navigateTo` must be passed as a prop — it is a cross-cutting navigation concern that must stay anchored to App.tsx.

**How to avoid:** `handleMatchSubmitWithTab` can be defined in `LogMatchContainer` as a local wrapper that receives `navigateTo` as a prop, or it can remain as a composed function in App.tsx that is passed to `LogMatchContainer`. Either is correct — the planner should pick one approach explicitly.

### Pitfall 6: Settings.old.tsx Import Check Before Deletion

**What goes wrong:** Deleting `Settings.old.tsx` without verifying no production import path references it.

**How to avoid:** Run a codebase grep for `Settings.old` before deletion. Based on reading of App.tsx and the codebase structure, there are no active imports — the file uses a `.old.tsx` extension which Vite's module resolution would not pick up through a standard import. Git history confirms this is a leftover artifact. Still, the grep is a required safety step.

---

## Code Examples

### Existing Handler Pattern (verified from source)

```typescript
// Source: source/hooks/useLeagueHandlers.ts lines 72-80
const handleDeleteMatch = useCallback(async (matchId: string) => {
  try {
    await deleteMatch(matchId);
    await refreshData();
    showToast('Match deleted & ELO reversed', 'success');
  } catch (err: any) {
    showToast(err.message || 'Failed to delete match', 'error');
  }
}, [refreshData, showToast]);
```

### Handler With Undo Action (verified from source)

```typescript
// Source: source/hooks/useLeagueHandlers.ts lines 47-69
const handleMatchSubmit = useCallback(
  async (...) => {
    try {
      const result = await recordMatch(...);
      await refreshData();
      showToast('Match logged!', 'success', {
        label: 'UNDO',
        onClick: async () => {
          try {
            await deleteMatch(result.id);
            await refreshData();
            showToast('Match undone', 'success');
          } catch (err: any) {
            showToast(err.message || 'Failed to undo match', 'error');
          }
        },
      });
      return result;
    } catch (err: any) {
      showToast(err.message || 'Failed to log match', 'error');
    }
  },
  [activeLeagueId, refreshData, showToast]
);
```

### Handler Domain Grouping

| Domain Module | Handlers |
|---------------|----------|
| `useMatchHandlers` | `handleMatchSubmit`, `handleDeleteMatch`, `handleEditMatch`, `handleConfirmPending`, `handleDisputePending`, `handleForceConfirmPending`, `handleRejectPending`, `handleRequestCorrection` (from App.tsx), `handleApproveCorrection`, `handleRejectCorrection` |
| `usePlayerHandlers` | `handleCreatePlayer`, `handleDeletePlayer`, `handleUpdatePlayerName`, `handleUpdatePlayerRacket`, `handleCreateRacket`, `handleDeleteRacket`, `handleUpdateRacket` |
| `useAdminHandlers` | `handleSeasonReset`, `handleFactoryReset`, `handleStartFresh`, `handleExport`, `handleImport`, `handleStartSeason`, `handleEndSeason`, `handleCreateLeague`, `handleUpdateLeague`, `handleDeleteLeague`, `handleAssignPlayerLeague` |
| `useTournamentHandlers` | `handleCreateChallenge`, `handleRespondChallenge`, `handleGenerateChallenges`, `handleCancelChallenge`, `handleCompleteChallenge`, `handleCreateTournament`, `handleSubmitTournamentResult`, `handleDeleteTournament` |

**Count check:** 10 + 7 + 11 + 8 = 36 (includes `handleRequestCorrection` migrated from App.tsx; the facade returns 34 from the existing monolith + 1 newly migrated = 35 total unique handlers)

### Container Responsibility Map

| Tab / Trigger | Container | Modal State Moved From App.tsx |
|---------------|-----------|-------------------------------|
| `leaderboard` | `LeaderboardContainer` | none |
| `log` | `LogMatchContainer` | none (inline tab) |
| `players` | `PlayersContainer` | `showCreatePlayerModal` |
| `armory` | `ArmoryContainer` | none |
| `settings` | `SettingsContainer` | none |
| `insights` | `InsightsContainer` | `activeChallengeForLog` (shared with challenges tab) |
| `recent` | `RecentMatchesContainer` | none |
| `hof` | `HallOfFameContainer` | none |
| `challenges` | `ChallengesContainer` | `showChallengeModal`, `activeChallengeForLog`, `showChallengeNotification`, `newChallenges`, `hasCheckedChallenges` |
| `weekly` | `WeeklyChallengesContainer` | none |
| `tournaments` | `TournamentsContainer` | none |
| `seasons` | `SeasonsContainer` | none |
| `leagues` | `LeaguesContainer` | none |
| Global (header) | stays in App.tsx or `GlobalLogMatchModal` | `showLogMatchModal` |
| Global (header) | stays in App.tsx | `showAdminPanel` |

Note: `activeChallengeForLog` is set in both `insights` tab and `challenges` tab in current App.tsx. If these become separate containers, lifting this state to App.tsx and passing it as a prop may be cleaner than duplicating it. This is a planner discretion detail.

---

## State of the Art

| Old Approach | Current Approach | Impact for Phase 3 |
|--------------|------------------|--------------------|
| Monolithic `App.tsx` rendering all tabs inline | Route-level container components | Containers are the current standard React pattern; no external library needed |
| All handlers in one file | Domain-scoped handler hooks | Standard React project organization for any hook collection >10 handlers |
| `window.confirm()` for destructive actions | Still used in this codebase (`handleDeletePlayer`, reset handlers) | Phase 3 does not change this behavior — preserve as-is during move |

---

## Open Questions

1. **`showLogMatchModal` and `showAdminPanel` ownership**
   - What we know: Both are triggered by the global Layout header (not by tab content). Modal JSX is rendered at App.tsx root level.
   - What's unclear: Whether they should stay in App.tsx or become a dedicated overlay component.
   - Recommendation: Keep both in App.tsx since their triggers (`onLogMatch`, `onOpenAdminPanel`) are already passed to `Layout` as props from App.tsx. Moving them to containers would require prop-drilling `setShow*` back up.

2. **`activeChallengeForLog` shared between `insights` and `challenges` tabs**
   - What we know: App.tsx sets `activeChallengeForLog` from both the `insights` tab JSX and the `challenges` tab JSX. The modal itself is rendered at root level.
   - What's unclear: Whether `InsightsContainer` and `ChallengesContainer` share this state or each own a copy.
   - Recommendation: Keep `activeChallengeForLog` state in App.tsx and pass `setActiveChallengeForLog` as a prop to both containers that trigger it. This is the correct approach since the resulting modal renders at the App.tsx root level.

3. **Type annotation for `useLeagueHandlers` facade return type**
   - What we know: TypeScript infers the return type from the spread. No explicit type exists.
   - Recommendation: The planner should include a task to add `ReturnType<typeof useMatchHandlers> & ReturnType<typeof usePlayerHandlers> & ...` as an explicit return type annotation or inline type check on the facade to catch key mismatches at compile time.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (via ts-jest) + @testing-library/react |
| Config file | `source/jest.config.cjs` |
| Quick run command | `cd /Users/tarasivaniv/Documents/test-pong/source && npx jest --testPathPattern="containers\|handlers\|mutationHelper" --passWithNoTests` |
| Full suite command | `cd /Users/tarasivaniv/Documents/test-pong/source && npx jest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARCH-01 | App.tsx tab navigation still resolves to correct container output | unit | `npx jest --testPathPattern="AppContent\|LeaderboardContainer\|LogMatchContainer" -x` | Wave 0 |
| ARCH-01 | Modal state owned by containers, not App.tsx (no modal props passed down) | unit | `npx jest --testPathPattern="containers/"` | Wave 0 |
| ARCH-02 | `useLeagueHandlers()` facade returns all 35 handler keys as functions | unit | `npx jest --testPathPattern="useLeagueHandlers" -x` | Wave 0 |
| ARCH-02 | Each domain module hook returns its expected handler subset | unit | `npx jest --testPathPattern="handlers/" -x` | Wave 0 |
| ARCH-03 | `runMutation` calls refreshData on success, skips on skipRefresh, shows error toast on throw | unit | `npx jest --testPathPattern="mutationHelper" -x` | Wave 0 |
| ARCH-03 | Undo action is passed to showToast when provided | unit | `npx jest --testPathPattern="mutationHelper" -x` | Wave 0 |
| ARCH-04 | `Settings.old.tsx` file does not exist | file existence check | `test ! -f source/components/Settings.old.tsx && echo "PASS"` | N/A — satisfied by deletion |

### Sampling Rate
- **Per task commit:** `cd /Users/tarasivaniv/Documents/test-pong/source && npx jest --passWithNoTests -x`
- **Per wave merge:** `cd /Users/tarasivaniv/Documents/test-pong/source && npx jest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `source/utils/mutationHelper.test.ts` — covers ARCH-03: runMutation success, error, skipRefresh, undo action
- [ ] `source/hooks/handlers/useMatchHandlers.test.ts` — covers ARCH-02: handler key presence, basic invocation with mocked storageService
- [ ] `source/hooks/useLeagueHandlers.facade.test.ts` — covers ARCH-02: facade returns all 35 handler keys as functions
- [ ] `source/containers/LeaderboardContainer.test.tsx` — covers ARCH-01: renders without crash, passes handlers from context

*(Existing integration tests in `source/components/integration.test.tsx` and component tests remain valid and serve as regression guard for behavioral compatibility.)*

---

## Sources

### Primary (HIGH confidence)
- `source/App.tsx` — Full read, 738 lines, all modal state, tab rendering, and handler calls inventoried
- `source/hooks/useLeagueHandlers.ts` — Full read, 516 lines, all 34 handlers catalogued and domain-grouped
- `source/components/Settings.old.tsx` — Confirmed present, confirmed no active imports in App.tsx or other files
- `.planning/phases/03-frontend-orchestration-decomposition/03-CONTEXT.md` — All locked decisions read verbatim
- `.planning/codebase/ARCHITECTURE.md` — Layer structure and data flow confirmed
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, import order, export conventions confirmed
- `.planning/codebase/STRUCTURE.md` — Directory layout baseline confirmed
- `source/jest.config.cjs` — Test framework and patterns confirmed
- `source/components/integration.test.tsx` — Test style and mock patterns confirmed

### Secondary (MEDIUM confidence)
- React documentation pattern: container/presentational component split is a well-established React pattern, no external verification needed for this project
- React `useCallback` dep array rules: stable React documentation, HIGH confidence

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all patterns directly verified in source files
- Architecture: HIGH — all source files read in full; container map and handler grouping derived from actual code, not assumptions
- Pitfalls: HIGH — all pitfalls identified from direct inspection of the source files being modified
- Validation: HIGH — test framework confirmed from jest.config.cjs; test gap list derived from requirements

**Research date:** 2026-03-16
**Valid until:** 2026-04-15 (stable codebase, no moving dependencies)
