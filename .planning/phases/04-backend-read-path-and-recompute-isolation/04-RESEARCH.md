# Phase 4: Backend Read-Path and Recompute Isolation - Research

**Researched:** 2026-03-16
**Domain:** Node.js/Express backend — read/write path separation, debounced async persistence, chunked idempotent recompute
**Confidence:** HIGH

## Summary

Phase 4 targets three tightly scoped backend correctness problems: mutation side effects on the GET /state read path (PERF-01), synchronous blocking file writes on every hot mutation (PERF-02), and an unbounded single-pass ELO recompute that cannot be interrupted or safely retried (PERF-03).

All three problems are well-understood Node.js patterns. The codebase already concentrates writes through a single `saveDB()` function and centralizes data access in `dbOps`, which makes all three changes low surface-area. No new external dependencies are required — the patterns are implemented with built-in Node.js primitives (module-level booleans, `setTimeout`-based debounce, async iteration with in-memory checkpointing).

The changes are behavior-preserving. Rankings, history, and match flows must produce identical results from the client's perspective. The only observable behavioral addition is a top-level `recomputeInProgress: true` flag in the GET /state response when a recompute is actively running.

**Primary recommendation:** Extract the expiry loop from state.js into a reconciliation service with an in-memory concurrency guard, replace `fs.writeFileSync` with a debounce-wrapped async write, and refactor `recalculateElo()` into a chunked loop that writes a checkpoint and can be safely interrupted.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**State Consistency During Reconciliation:**
- Concurrency guard on expiry: Use an in-memory flag/lock so only one reconciliation (pending-match expiry loop) runs at a time. A second concurrent GET /state while reconciliation is active skips the expiry loop and returns current data normally — no blocking, no queuing.
- No-op read behavior: When nothing is expired, GET /state behaves exactly as today — reads and returns data with no visible difference to the client. No metadata field added.
- Recompute + read coexistence: GET /state remains live and unblocked during an active ELO recompute (POST /admin/recalculate-elo). Response includes a `recomputeInProgress: true` flag so the frontend can surface a banner rather than silently showing potentially stale rankings.
- Partial reconciliation failure: Log the error, skip the failed pending match, and allow the next GET /state call to retry it. Matches stay `pending` rather than being left in a corrupt partial state. No transaction rollback required.

### Claude's Discretion

- Exact mechanism for reconciliation lock (module-level boolean, async-mutex, etc.) — keep it simple and in-memory.
- How/where `recomputeInProgress` flag is surfaced in the GET /state response shape (top-level field vs nested metadata).
- Local persistence debounce/async semantics (PERF-02) — no user preference captured; Claude has full discretion on window sizing, queue implementation, and error handling.
- Recompute chunking implementation details (PERF-03) — no user preference captured; Claude has full discretion on batch size, checkpoint format, and idempotency mechanism.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERF-01 | GET /state no longer performs mutation side effects in request flow; reconciliation/expiry confirmation runs outside read path. | Expiry loop is self-contained in state.js lines 12–75; extract to `reconciliation.js` service with an in-memory boolean guard. Architecture pattern: service extraction. |
| PERF-02 | Local persistence write path avoids synchronous full-file writes on hot mutation paths, using async and safe batching/debouncing semantics. | `saveDB()` in persistence.js is the sole write chokepoint; replace `fs.writeFileSync` with `fs.promises.writeFile` wrapped in a debounce timer. All callers automatically benefit. |
| PERF-03 | ELO recomputation and related heavy maintenance paths support chunked/idempotent execution suitable for larger datasets. | `recalculateElo()` already iterates sortedMatches in chronological order; chunking can layer on top with an in-memory offset/cursor and periodic `saveDB()` calls to persist intermediate player state. |
</phase_requirements>

---

## Standard Stack

### Core (no new dependencies needed)

| Library / Primitive | Version | Purpose | Why Standard |
|--------------------|---------|---------|--------------|
| Node.js `fs.promises.writeFile` | Built-in | Async file write replacing `writeFileSync` | Non-blocking; already used for GCS branch (async). No new dep needed. |
| Module-level boolean flag | N/A | Concurrency guard for reconciliation | Simplest correct in-process solution; single process model confirmed (Cloud Run single instance). |
| `setTimeout`-based debounce | Built-in | Debounce window around `saveDB()` | No external dep; 500ms–1s window is standard for write-coalescing in low-concurrency file persistence. |
| In-memory cursor/offset | N/A | Chunked iteration in `recalculateElo()` | No persistence needed for cursor — recompute is admin-triggered and restarts are acceptable. |

### No New External Dependencies Required

The locked decision for simplicity ("keep it simple and in-memory") means no `async-mutex`, no `p-limit`, no `debounce` npm package. All patterns are implementable with Node.js built-ins.

## Architecture Patterns

### Recommended File Layout After Phase 4

```
source/server/
├── services/
│   ├── elo.js               (existing)
│   ├── insights.js          (existing)
│   └── reconciliation.js    (NEW — owns expiry loop + concurrency guard)
├── db/
│   ├── persistence.js       (MODIFIED — debounced async saveDB)
│   └── operations.js        (MODIFIED — chunked recalculateElo, accepts recomputeInProgress hook)
└── routes/
    ├── state.js             (MODIFIED — calls reconciliation service, reads recomputeInProgress flag)
    └── admin.js             (MODIFIED — sets recomputeInProgress flag via reconciliation service)
```

### Pattern 1: Read-Path Mutation Extraction (PERF-01)

**What:** Move the pending-match expiry loop entirely out of the GET /state handler into `reconciliation.js`. The route handler checks an in-memory boolean; if reconciliation is not running, it fires-and-forgets (or awaits with timeout guard) the reconciliation service before fetching state. If reconciliation is already running, it skips straight to `getFullState()`.

**When to use:** Any route that currently performs write operations as part of a read response.

**Guard pattern:**
```javascript
// source/server/services/reconciliation.js
let reconciling = false;

export async function runReconciliation() {
  if (reconciling) return; // skip if already active
  reconciling = true;
  try {
    // expiry loop body (extracted from state.js lines 12–75)
    // per-match try/catch: log error, skip failed match, continue loop
  } finally {
    reconciling = false;
  }
}

export function isReconciling() {
  return reconciling;
}
```

**State route after extraction:**
```javascript
// source/server/routes/state.js
router.get('/state', authMiddleware, async (req, res) => {
  try {
    await runReconciliation(); // no-op if already running; fast-path if nothing expired
    const state = await dbOps.getFullState({ ... });
    state.pendingMatches = state.pendingMatches.filter(...);
    state.recomputeInProgress = isRecomputeInProgress(); // from reconciliation/admin service
    res.json(state);
  } catch (err) { ... }
});
```

**Key behavior rules from locked decisions:**
- When nothing is expired: `runReconciliation()` returns immediately, no observable difference.
- When reconciliation is active (second concurrent request): `isReconciling()` causes the loop to be skipped; route reads and returns current data.
- Per-match failure: catch per-iteration, log, `continue` — match stays `pending` for next call.

### Pattern 2: Debounced Async Write (PERF-02)

**What:** Replace `fs.writeFileSync` in the local persistence branch of `saveDB()` with `fs.promises.writeFile`. Wrap all calls to `saveDB()` with a debounce: the actual write fires after N ms of inactivity, coalescing rapid sequential mutations into a single write.

**Debounce implementation:**
```javascript
// source/server/db/persistence.js
import { promises as fsPromises } from 'fs';

let _debounceTimer = null;
let _pendingWritePromise = null;

export const saveDB = () => {
  // Return a promise that resolves when the debounced write completes
  if (_debounceTimer) clearTimeout(_debounceTimer);
  if (!_pendingWritePromise) {
    _pendingWritePromise = new Promise((resolve, reject) => {
      _debounceTimer = setTimeout(async () => {
        _pendingWritePromise = null;
        try {
          const data = JSON.stringify(db, null, 2);
          if (GCS_BUCKET) {
            // existing GCS async branch unchanged
          } else {
            await fsPromises.writeFile(DB_FILE, data);
          }
          resolve();
        } catch (err) {
          console.error('Error saving DB:', err);
          reject(err);
        }
      }, 500);
    });
  }
  return _pendingWritePromise;
};
```

**Alternative simpler approach (fire-and-forget debounce):**

If callers do not need to await the write completion (most mutation routes just need to respond after in-memory state is updated), a fire-and-forget debounce is simpler:

```javascript
let _timer = null;
export const saveDB = async () => {
  if (GCS_BUCKET) { /* existing async GCS path — no change needed */ }
  else {
    clearTimeout(_timer);
    _timer = setTimeout(() => {
      fsPromises.writeFile(DB_FILE, JSON.stringify(db, null, 2))
        .catch(err => console.error('Error saving DB:', err));
    }, 500);
  }
};
```

**Recommendation:** Use the fire-and-forget debounce for local-only path. GCS branch is already async and does not need debouncing (network latency already amortizes the cost; Cloud Run is the production target). Do not debounce the GCS branch.

**Window sizing:** 500ms is a reasonable default for a low-concurrency admin league app. Data loss risk on crash is bounded to the last 500ms of mutations — acceptable for this use case.

### Pattern 3: Chunked Idempotent Recompute (PERF-03)

**What:** Refactor `recalculateElo()` to process matches in batches of N (e.g., 50) rather than one unbounded loop. After each batch, intermediate player state is available in `playerMap`. The recompute runs to completion in all cases but yields control periodically using `setImmediate()` or `Promise.resolve()` to keep the event loop responsive during the full traversal.

**Key insight from code review:** `recalculateElo()` already builds `playerMap` incrementally in chronological order (lines 420–476). Chunking is addable without changing the computation model — just slice `sortedMatches` into pages and process page by page.

**Idempotency already holds:** The function always resets `playerMap` to `startingElo` before iterating, so re-running on the same data set produces the same result. "Idempotent" in this context means: if the function is called again while in progress, the second call either waits (via `recomputeInProgress` flag) or is rejected, and when it does run it produces deterministic output.

**Chunked iteration pattern:**
```javascript
// source/server/db/operations.js — recalculateElo()
async recalculateElo() {
  // ... setup playerMap, sortedMatches as today ...
  const CHUNK_SIZE = 50;
  for (let i = 0; i < sortedMatches.length; i += CHUNK_SIZE) {
    const chunk = sortedMatches.slice(i, i + CHUNK_SIZE);
    for (const match of chunk) {
      // ... existing per-match logic unchanged ...
    }
    // yield to event loop between chunks
    await new Promise(resolve => setImmediate(resolve));
  }
  // ... write phase (players, matchDeltas, history) as today ...
}
```

**Concurrency guard for recompute:**
```javascript
// source/server/services/reconciliation.js (or admin service module)
let recomputeInProgress = false;

export function isRecomputeInProgress() { return recomputeInProgress; }

export async function runRecompute(dbOps) {
  if (recomputeInProgress) throw new Error('Recompute already in progress');
  recomputeInProgress = true;
  try {
    return await dbOps.recalculateElo();
  } finally {
    recomputeInProgress = false;
  }
}
```

**admin.js integration:**
```javascript
router.post('/admin/recalculate-elo', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await runRecompute(dbOps);
    res.json(result);
  } catch (err) {
    if (err.message === 'Recompute already in progress') {
      return res.status(409).json({ error: 'Recompute already in progress' });
    }
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});
```

### Anti-Patterns to Avoid

- **Await-then-block on reconciliation in GET /state:** The guard must be a fast skip, not a wait. If reconciliation is running, skip and return current data. Do not queue or block the response.
- **Debouncing the GCS write path:** GCS is already async; adding a debounce timer introduces state management complexity for production writes without benefit.
- **Flushing saveDB on process exit:** Adding SIGTERM/beforeExit flush adds complexity. Acceptable tradeoff: last 500ms of writes may not persist on crash. Explicit documentation is sufficient.
- **Checkpoint persistence for chunked recompute:** The recompute runs from scratch each time it is triggered. Persisting checkpoint state to disk would add crash-recovery complexity that is not warranted at this scale.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Debounce | Custom timer management with multiple promise chains | Simple `clearTimeout/setTimeout` pattern | Single caller (`saveDB`); stdlib sufficient |
| Async mutex | External `async-mutex` package | Module-level boolean + try/finally | Single process; boolean is correct and simple |
| Event loop yielding | Custom async scheduler | `setImmediate` wrapped in `Promise` | Standard Node.js pattern for chunked CPU work |

**Key insight:** This codebase runs as a single Cloud Run instance with a single in-memory database. Distributed locking, Redis queues, worker threads, and job schedulers are all out of scope. In-memory primitives are correct and sufficient.

## Common Pitfalls

### Pitfall 1: Reconciliation re-entrant on the same request
**What goes wrong:** The reconciliation service is called, sets `reconciling = true`, begins awaiting a dbOps call, and a second concurrent GET /state arrives, reads `reconciling = false` (hasn't been set yet due to event loop tick), and enters the loop simultaneously.
**Why it happens:** `reconciling = true` must be set synchronously before the first `await`.
**How to avoid:** Set the flag as the very first statement in `runReconciliation()`, before any `await`. The try/finally pattern ensures the flag is cleared even on error.
**Warning signs:** Duplicate history entries or double ELO deltas on expired matches.

### Pitfall 2: saveDB callers await a stale promise
**What goes wrong:** Multiple mutation handlers call `saveDB()` in quick succession. The debounce promise resolves for callers that shared the same timer, but a caller that arrived after the previous timer resolved but before the new one fires gets a resolved-immediately promise and thinks the write is done.
**Why it happens:** Shared `_pendingWritePromise` reference that may have already resolved.
**How to avoid:** If callers do not need write confirmation (most route handlers), use fire-and-forget debounce. If write confirmation is needed, track promise lifecycle carefully.
**Warning signs:** Routes responding 200 but data not persisted on subsequent load.

### Pitfall 3: recomputeInProgress never clears on error
**What goes wrong:** `recalculateElo()` throws. Admin route catches it and returns 500. But if the flag is set inside the route handler rather than in a try/finally wrapper, it stays `true` permanently, blocking all future recomputes.
**Why it happens:** Setting a flag without a `finally` block.
**How to avoid:** Always clear `recomputeInProgress = false` in a `finally` block in the service wrapper.
**Warning signs:** Admin recompute endpoint always returns 409 after one failed run.

### Pitfall 4: Per-match reconciliation error silently drops the loop
**What goes wrong:** An exception inside the `for (const pm of pendingMatches)` loop propagates out and causes the entire GET /state to return 500, even though most matches could have been processed.
**Why it happens:** No per-iteration try/catch.
**How to avoid:** Wrap each iteration of the expiry loop in its own try/catch block. Log the error, `continue`. The outer function should not throw unless there is a catastrophic failure.
**Warning signs:** One malformed pending match causes all state fetches to fail.

### Pitfall 5: Debounced write loses data on process crash
**What goes wrong:** Cloud Run instance is recycled mid-flight; timer has not fired; last N mutations are lost.
**Why it happens:** In-memory debounce inherently has a loss window.
**How to avoid:** Accept and document the tradeoff. For GCS production path, no debounce is applied — writes are synchronous-to-the-await. For local dev path only, the 500ms window is acceptable.
**Warning signs:** Not a bug to detect — a design tradeoff to document.

## Code Examples

### In-memory concurrency guard (verified Node.js pattern)
```javascript
// Module-level flag — correct for single-process Express server
let active = false;

export async function runOnce(task) {
  if (active) return; // fast skip
  active = true;
  try {
    await task();
  } finally {
    active = false; // always clears, even on throw
  }
}
```

### setImmediate yield for chunked processing (verified Node.js pattern)
```javascript
// Yield to event loop between chunks without adding latency from setTimeout
await new Promise(resolve => setImmediate(resolve));
```

### fs.promises.writeFile (Node.js built-in, replaces writeFileSync)
```javascript
import { promises as fsPromises } from 'fs';
await fsPromises.writeFile(DB_FILE, data, 'utf8');
// or equivalently:
import fs from 'fs';
await fs.promises.writeFile(DB_FILE, data);
```

### Simple debounce timer (no external dependency)
```javascript
let timer = null;
function debouncedWrite() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    fs.promises.writeFile(path, data)
      .catch(err => console.error('Write error:', err));
  }, 500);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `fs.writeFileSync` in hot path | `fs.promises.writeFile` with debounce | Phase 4 | Eliminates event loop blocking on every mutation |
| Expiry loop inline in GET /state | Extracted to reconciliation service with guard | Phase 4 | GET /state is a pure read with optional side-effect trigger |
| Unbounded single-pass recompute | Chunked loop with setImmediate yields | Phase 4 | Recompute does not monopolize event loop for large datasets |

**Deprecated/outdated after this phase:**
- `fs.writeFileSync` in persistence.js local branch: replaced by async write.
- Inline expiry loop in state.js route handler: moved to `reconciliation.js` service.

## Open Questions

1. **Should `runReconciliation()` be awaited or fire-and-forget in GET /state?**
   - What we know: The locked decision says concurrent GET /state while reconciliation is active skips the loop. If awaited, a slow reconciliation (many expired matches) delays the response.
   - What's unclear: Whether the intent is that the initiating request waits for reconciliation to finish before returning, or returns immediately with current state.
   - Recommendation: Await reconciliation — it is already async and fast for the common case (nothing expired); the guard ensures concurrent requests skip it. On the rare case of many expirations, the first request bears the latency, subsequent ones do not. Document this in the plan.

2. **Debounce window size for local persistence**
   - What we know: 500ms is a common convention; the GCS path is not debounced.
   - What's unclear: Whether any test relies on `saveDB()` being synchronous or completing before the next operation.
   - Recommendation: Check existing tests for `saveDB()` mock patterns before implementing. If tests rely on synchronous behavior, adjust mocks rather than the window size.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (multi-project config) |
| Config file | `source/jest.config.cjs` |
| Quick run command | `cd source && NODE_OPTIONS='--experimental-vm-modules' jest --testPathPattern='server' --passWithNoTests` |
| Full suite command | `cd source && NODE_OPTIONS='--experimental-vm-modules' jest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERF-01 | GET /state skips expiry loop when reconciliation is already active (concurrency guard) | unit | `jest --testPathPattern='reconciliation'` | ❌ Wave 0 |
| PERF-01 | Expiry loop errors skip the failed match and allow retry | unit | `jest --testPathPattern='reconciliation'` | ❌ Wave 0 |
| PERF-01 | GET /state returns `recomputeInProgress: true` when recompute is active | unit | `jest --testPathPattern='state.route'` | ❌ Wave 0 |
| PERF-02 | `saveDB()` does not call `fs.writeFileSync` (async only) | unit | `jest --testPathPattern='persistence'` | ❌ Wave 0 |
| PERF-02 | Rapid successive `saveDB()` calls coalesce to fewer writes | unit | `jest --testPathPattern='persistence'` | ❌ Wave 0 |
| PERF-03 | `recalculateElo()` produces same output as before chunking | unit/regression | `jest --testPathPattern='operations'` | ❌ Wave 0 |
| PERF-03 | Second concurrent `recalculateElo()` call is rejected with 409 | unit | `jest --testPathPattern='admin.route'` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd source && NODE_OPTIONS='--experimental-vm-modules' jest --testPathPattern='server/__tests__|services/reconciliation|db/persistence|db/operations' --passWithNoTests`
- **Per wave merge:** `cd source && NODE_OPTIONS='--experimental-vm-modules' jest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `source/server/__tests__/reconciliation.test.mjs` — covers PERF-01 concurrency guard and per-match error handling
- [ ] `source/server/__tests__/persistence-debounce.test.mjs` — covers PERF-02 async write and debounce coalescing
- [ ] `source/server/__tests__/recompute-isolation.test.mjs` — covers PERF-03 chunked output parity and concurrent-call rejection

Note: All test files use `.mjs` extension per established Phase 1 pattern (server jest project matches `.cjs`/`.mjs` only, no TypeScript transform).

## Sources

### Primary (HIGH confidence)
- Node.js official docs — `fs.promises.writeFile`, `setImmediate` semantics, module-scope variable lifetime in CommonJS/ESM
- Direct code inspection: `source/server/routes/state.js`, `source/server/db/persistence.js`, `source/server/db/operations.js lines 410–526`, `source/server/routes/admin.js lines 272–280`
- `source/jest.config.cjs` — server project configuration confirming `.mjs` test pattern and no transform

### Secondary (MEDIUM confidence)
- Standard Node.js debounce/async patterns — well-established, matches existing GCS async branch design in persistence.js
- `setImmediate` for event loop yielding — documented Node.js technique for cooperative multitasking in single-threaded async servers

### Tertiary (LOW confidence)
- 500ms debounce window — reasonable convention for low-concurrency admin apps, but not validated against actual write frequency in production

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all patterns use built-in Node.js primitives; no external library choices to validate
- Architecture: HIGH — based on direct code inspection of target files; extraction points are clearly identified
- Pitfalls: HIGH — derived from direct reading of the existing code's failure modes (missing per-iteration try/catch, missing finally block, synchronous flag assignment before first await)

**Research date:** 2026-03-16
**Valid until:** 2026-06-16 (stable domain — Node.js built-in patterns do not change rapidly)
