# Phase 4: Backend Read-Path and Recompute Isolation - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove mutation side effects from the GET /state read path, make local persistence hot-path writes async and non-blocking, and make ELO recompute safe for chunked/idempotent execution at scale. All changes preserve existing user-facing behavior — rankings, history, and match flows must remain behaviorally equivalent.

</domain>

<decisions>
## Implementation Decisions

### State Consistency During Reconciliation

- **Concurrency guard on expiry**: Use an in-memory flag/lock so only one reconciliation (pending-match expiry loop) runs at a time. A second concurrent GET /state while reconciliation is active skips the expiry loop and returns current data normally — no blocking, no queuing.
- **No-op read behavior**: When nothing is expired, GET /state behaves exactly as today — reads and returns data with no visible difference to the client. No metadata field added.
- **Recompute + read coexistence**: GET /state remains live and unblocked during an active ELO recompute (POST /admin/recalculate-elo). Response includes a `recomputeInProgress: true` flag so the frontend can surface a banner rather than silently showing potentially stale rankings.
- **Partial reconciliation failure**: Log the error, skip the failed pending match, and allow the next GET /state call to retry it. Matches stay `pending` rather than being left in a corrupt partial state. No transaction rollback required.

### Claude's Discretion

- Exact mechanism for reconciliation lock (module-level boolean, async-mutex, etc.) — keep it simple and in-memory.
- How/where `recomputeInProgress` flag is surfaced in the GET /state response shape (top-level field vs nested metadata).
- Local persistence debounce/async semantics (PERF-02) — no user preference captured; Claude has full discretion on window sizing, queue implementation, and error handling.
- Recompute chunking implementation details (PERF-03) — no user preference captured; Claude has full discretion on batch size, checkpoint format, and idempotency mechanism.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope and Requirement Mapping
- `.planning/ROADMAP.md` — Phase 4 goal, success criteria, and requirement IDs in scope (PERF-01, PERF-02, PERF-03).
- `.planning/REQUIREMENTS.md` — PERF-01/02/03 requirement definitions and constraints.
- `.planning/PROJECT.md` — Stabilization principles: behavior-preserving, incremental, brownfield.

### Key Implementation Files
- `source/server/routes/state.js` — GET /state route; contains the entire inline expiry/reconciliation loop that must move off the read path (PERF-01).
- `source/server/db/persistence.js` — `saveDB()` uses `fs.writeFileSync` synchronously; target for async/debounced rewrite (PERF-02).
- `source/server/db/operations.js` — `recalculateElo()` at line 410; loads all matches with `getMatches(999999)` and loops per-player; target for chunked/idempotent rewrite (PERF-03).
- `source/server/routes/admin.js` — `POST /admin/recalculate-elo` at line 272; entry point for recompute; needs `recomputeInProgress` flag integration.

No external specs — requirements are fully captured in decisions above and REQUIREMENTS.md.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `source/server/db/operations.js`: `recalculateElo()` already performs full in-memory replay — chunking can be layered on top of the existing sorted-match iteration without a full rewrite.
- `source/server/db/persistence.js`: `saveDB()` is already used consistently across all mutation operations — adding debounce/async here propagates to all callers with minimal surface area.
- `source/server/routes/state.js`: The expiry loop is self-contained (lines 12–75 approximately) and can be extracted to a service function cleanly.

### Established Patterns
- All persistence writes go through `saveDB()` in `persistence.js` — single chokepoint for PERF-02 fix.
- `dbOps` object in `operations.js` centralizes all data access — new reconciliation service can call `dbOps` methods directly.
- Auth middleware (`authMiddleware`) already wraps GET /state — no change needed to auth boundary.

### Integration Points
- Reconciliation logic extracted from `state.js` → new `source/server/services/reconciliation.js` (or similar) to own the expiry loop and lock state.
- `recomputeInProgress` flag can live as a module-level export on the reconciliation/admin service, consumed by `state.js` when building the response.
- `saveDB()` in `persistence.js` is the single write path — debounce wrapper goes here without touching individual route handlers.

</code_context>

<specifics>
## Specific Ideas

- `recomputeInProgress` flag should be top-level in the GET /state response so the frontend can detect it without deep inspection.
- Reconciliation lock should be simple in-memory (module-level boolean) — no external locking mechanism needed at this scale.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-backend-read-path-and-recompute-isolation*
*Context gathered: 2026-03-16*
