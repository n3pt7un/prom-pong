# Architecture Patterns

**Domain:** Tech-debt remediation for existing Test Pong app
**Researched:** 2026-03-16
**Mode:** Ecosystem (architecture-focused for subsequent milestone)

## Recommended Architecture

Use an incremental Strangler Fig plan inside the existing monolith, not a rewrite.

Target state in this milestone:
- Frontend: Shell + feature containers + domain mutation modules (instead of one orchestration file and one mega-hook)
- Backend: Request handlers split into query routes (read-only) and command routes (writes/side effects), with reconciliation moved off read paths
- Persistence: Keep dual adapter (Supabase/local) but enforce one command gateway so side effects are centralized and testable

### Transitional Architecture (inside current repo)

1. Keep existing runtime behavior and route surface.
2. Add seams that allow old and new orchestration to coexist behind feature flags.
3. Move one boundary at a time, with parity tests and rollback switches per boundary.

## Component Boundaries

### Frontend boundaries (concrete)

| Component | Responsibility | Communicates With | Current File(s) | Target File(s) |
|-----------|----------------|-------------------|-----------------|----------------|
| App Shell | Providers, auth gating, top-level layout wiring only | Page Router State, Feature Containers | source/App.tsx | source/app/AppShell.tsx |
| Page Router State | Hash/history tab state and navigation mapping | App Shell, Feature Containers | source/App.tsx | source/app/usePageRouter.ts |
| Overlay Coordinator | Modal stack and toast placement policy | Feature Containers, Toast context | source/App.tsx | source/app/OverlayCoordinator.tsx |
| League Read Model Context | Hold hydrated server state and refresh only | Storage query client | source/context/LeagueContext.tsx | source/context/LeagueReadContext.tsx |
| Match Commands | All match and pending-match write actions | Mutation runner, storage command client | source/hooks/useLeagueHandlers.ts | source/features/matches/useMatchCommands.ts |
| Player Commands | Player/racket/league assignment writes | Mutation runner, storage command client | source/hooks/useLeagueHandlers.ts | source/features/players/usePlayerCommands.ts |
| Competition Commands | Challenges/tournaments/seasons writes | Mutation runner, storage command client | source/hooks/useLeagueHandlers.ts | source/features/competition/useCompetitionCommands.ts |
| Admin Commands | Import/export/reset/admin/correction writes | Mutation runner, storage command client | source/hooks/useLeagueHandlers.ts | source/features/admin/useAdminCommands.ts |
| Mutation Runner | Shared mutation behavior: toast policy, refresh policy, undo hooks, error mapping | Command modules | source/hooks/useLeagueHandlers.ts | source/features/shared/runMutation.ts |

Ownership model:
- Shell team owns source/app/*.
- Domain feature owners own source/features/<domain>/*.
- Context owner owns source/context/LeagueReadContext.tsx.

### Backend boundaries (concrete)

| Component | Responsibility | Communicates With | Current File(s) | Target File(s) |
|-----------|----------------|-------------------|-----------------|----------------|
| Query Routes | Read-only endpoints, no mutation side effects | Query services only | source/server/routes/state.js and others | source/server/routes/query/*.js |
| Command Routes | Write endpoints, validation, authorization, idempotency checks | Command services | source/server/routes/matches.js, export-import.js, etc. | source/server/routes/command/*.js |
| Reconciliation Worker | Expiry confirmations and heavy recompute outside request lifecycle | Command services, dbOps | source/server/routes/state.js + db/operations.js | source/server/jobs/reconcilePendingMatches.js |
| Query Service | Build DTOs for API read models with limits/pagination | dbOps read methods | mixed in route files | source/server/services/queryState.js |
| Command Service | Execute business mutations with transaction-like sequence and audit logs | dbOps write methods | mixed in route files | source/server/services/commands/*.js |
| Persistence Adapter | Supabase/local mode translation | storage backend | source/server/db/operations.js | source/server/db/operations.js (retained, split read/write exports) |

Ownership model:
- API transport owner: source/server/routes/query/* and source/server/routes/command/*.
- Domain logic owner: source/server/services/commands/* and query services.
- Storage owner: source/server/db/*.

## Data/Control Flow Changes (explicit and testable)

### Flow 1: Initial app load

Current:
- Frontend calls GET /api/state.
- Route mutates expired pending matches before returning state.

Target:
- Frontend calls GET /api/state-read (or same path behind feature switch).
- Query route does read-only aggregation and returns DTO.
- Reconciliation worker handles pending expiry independently.

Testable assertions:
- Calling state endpoint twice with no writes does not change persisted players/matches/history.
- Expired pending matches are confirmed by worker path, not by read endpoint.

### Flow 2: Match logging command

Current:
- UI handler directly calls recordMatch + refresh, mixed with toast/undo behavior in one mega-hook.

Target:
- UI calls useMatchCommands.logMatch command.
- runMutation standardizes error/undo/refresh semantics.
- Backend command route performs validation then invokes command service.
- Query model refresh remains explicit (pull or realtime update).

Testable assertions:
- All match commands return standard command result shape { ok, entityId, warnings }.
- Undo flow is available only for commands marked reversible.
- Toast and refresh behavior is identical across all command modules.

### Flow 3: Import parity

Current:
- Supabase import path upserts players only; local mode imports players/matches/history/rackets.

Target:
- Import command service applies same import contract across adapters.
- Adapter capability checks are explicit and fail-fast if unsupported.

Testable assertions:
- Same import payload produces equivalent counts and IDs for players, matches, history, rackets in both modes.
- Contract tests fail if any adapter drops a collection.

## Patterns to Follow

### Pattern 1: Strangler seams around high-churn orchestration
**What:** Extract small seams from source/App.tsx and source/hooks/useLeagueHandlers.ts while preserving current entrypoints.
**When:** Use for every frontend decomposition move.
**Example:** Keep source/App.tsx importing new AppShell and delegating behavior; fallback toggle returns legacy render path.

### Pattern 2: Scoped CQRS (read/write split by endpoint intent)
**What:** Separate query and command handlers in the backend, even if sharing current datastore.
**When:** Apply first to /state and top write paths (matches, pending-matches, import).
**Example:** queryState service contains zero dbOps write calls; command services contain no response shaping beyond command result.

### Pattern 3: Command envelope + idempotency token
**What:** Standard command request metadata (actor, correlationId, optional idempotencyKey).
**When:** Any endpoint that can be retried from UI or network.
**Example:** POST command route rejects duplicate idempotencyKey for same actor/intent window.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Big-bang frontend rewrite
**What:** Replacing source/App.tsx and source/hooks/useLeagueHandlers.ts in one release.
**Why bad:** High regression surface with poor rollback granularity.
**Instead:** Carve one domain module at a time with compatibility facade.

### Anti-Pattern 2: Full CQRS/Event Sourcing adoption for all routes now
**What:** Converting entire backend to distributed CQRS/event bus during remediation.
**Why bad:** Adds complexity beyond current risk budget.
**Instead:** Apply bounded read/write isolation to hotspots only.

### Anti-Pattern 3: Hidden write side effects in read handlers
**What:** Read endpoints that mutate player/match state.
**Why bad:** Non-deterministic reads, latency spikes, difficult testing.
**Instead:** Move mutations to commands or background jobs.

## Safe Build Order and Rollback Boundaries

### Phase A: Frontend seam insertion (no behavior move)
- Build:
  - Add source/app/AppShell.tsx, usePageRouter.ts, OverlayCoordinator.tsx.
  - Keep source/App.tsx as facade.
- Verification:
  - Snapshot/navigation smoke tests across tabs and modals.
  - Auth gate and provider behavior unchanged.
- Rollback boundary:
  - Single switch in source/App.tsx to legacy in-file orchestration.

### Phase B: Mega-hook decomposition by domain
- Build:
  - Add runMutation helper.
  - Split commands into matches, players, competition, admin modules.
  - Keep temporary compatibility export from useLeagueHandlers.
- Verification:
  - Contract tests for each command module success/error/refresh behavior.
  - UI parity tests for destructive actions and undo.
- Rollback boundary:
  - Repoint useLeagueHandlers export to legacy implementation per-domain.

### Phase C: Backend read/write isolation for state and match flows
- Build:
  - Introduce query/command route folders.
  - Move /state mutation logic into reconcilePendingMatches worker callable.
  - Keep old route signatures where possible.
- Verification:
  - Read endpoint idempotence test (no writes).
  - Command endpoint behavior parity test for match create/edit/delete.
- Rollback boundary:
  - Feature flag to disable worker path and re-enable legacy route logic for one release window.

### Phase D: Import parity and adapter contract hardening
- Build:
  - Centralize import command service.
  - Add adapter contract tests for Supabase/local parity.
- Verification:
  - Golden import fixtures in both persistence modes.
- Rollback boundary:
  - Keep legacy import handler callable behind admin-only emergency flag.

### Phase E: Performance hardening after isolation
- Build:
  - Async/batched local persistence writes.
  - Chunked recompute and bounded full-state responses.
- Verification:
  - Latency baseline: state read p95 and match command p95 before/after.
- Rollback boundary:
  - Toggle to synchronous write path if data integrity alarms trigger.

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| Read latency | Current stack acceptable after read-only state endpoint | Needs strict DTO limits and caching | Requires separate read store/materialized projections |
| Write contention | Low with command isolation | Medium, needs idempotency and queuing for heavy commands | High, requires partitioning and asynchronous command processing |
| Recompute workloads | Manual/admin recompute feasible | Must be background chunked jobs | Requires distributed job orchestration |
| Dual adapter parity | Manageable with contract tests | Costly; narrow feature set per adapter | Prefer one primary production adapter with compatibility mode only |

## Roadmap Implications

1. Start with seam insertion and compatibility facades before moving logic.
2. Split frontend mutation domains before backend flow migration to reduce UI churn.
3. Isolate backend read/write at state and match hotspots before broader API refactor.
4. Lock adapter parity with tests before any deeper performance tuning.

## Confidence and Sources

Confidence by sub-area:
- Frontend decomposition plan: HIGH (direct codebase evidence from source/App.tsx and source/hooks/useLeagueHandlers.ts)
- Backend read/write isolation plan: HIGH (direct evidence of read-path side effects in source/server/routes/state.js)
- Incremental migration strategy: MEDIUM-HIGH (validated by Strangler guidance)
- CQRS scope and cautions: HIGH (official architecture guidance + Fowler caution)

Sources:
- Codebase architecture and concerns:
  - .planning/codebase/ARCHITECTURE.md
  - .planning/codebase/CONCERNS.md
  - source/App.tsx
  - source/hooks/useLeagueHandlers.ts
  - source/context/LeagueContext.tsx
  - source/server/routes/state.js
  - source/server/routes/export-import.js
  - source/server/db/operations.js
- External references:
  - https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs (Last updated 2025-02-21) [HIGH]
  - https://martinfowler.com/bliki/CQRS.html [HIGH for scope caution]
  - https://martinfowler.com/bliki/StranglerFigApplication.html (2024-08-22) [HIGH for incremental modernization]
