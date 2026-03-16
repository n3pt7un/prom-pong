# Phase 2: Formula Trust-Boundary and Persistence Contracts - Research

**Researched:** 2026-03-16
**Domain:** Node.js `new Function()` trust boundaries, Jest server testing patterns, Supabase upsert, dual-backend adapter contract testing
**Confidence:** HIGH

## Summary

Phase 2 is a brownfield hardening phase with four discrete deliverables: (1) document the `new Function()` formula trust boundary and wire error logging, (2) add auth boundary + compatibility tests for the ELO formula system, (3) fix the Supabase import parity bug, and (4) establish persistence adapter contracts as tests. All four deliverables operate entirely within existing code — no new library dependencies are needed.

The formula system in `source/server/services/elo.js` already implements sound scope isolation via explicit parameter passing to `new Function()`, and dry-run validation via `validateCustomFormula`. The only gaps are: the catch block in `calculateMatchDelta` swallows errors silently, tests for auth boundaries on formula config endpoints do not exist, and the Supabase branch in `POST /api/import` only upserts players, silently skipping matches/history/rackets.

The existing `source/server/__tests__/` directory uses `.mjs` extension for server tests (no TypeScript transform in the Jest server project). Phase 1 established the inline auth boundary pattern to avoid `firebase-admin` initialization in unit tests. Both patterns are the mandatory baseline for Phase 2 tests.

**Primary recommendation:** Follow Phase 1 test file conventions exactly — `.mjs` extension, Jest server project, inline boundary logic for auth/admin assertions — and place new test files in `source/server/__tests__/`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Formula Trust Controls**
- Trust-boundary approach: document the accepted risk formally; rely on existing `new Function()` scope isolation and `validateCustomFormula` dry-run. No new execution engine or AST parser introduced.
- Auth boundary tests: add explicit allow/deny test cases covering the admin-only gate on formula config save and validate endpoints (consistent with Phase 1 approach for other admin routes).
- Formula error handling at match time: log the failure with context (match ID, formula string), then fall back to standard ELO so matches still record. No silent swallowing — observable in server logs.
- Admin UI: add a visible warning note in `EloConfigTab.tsx` listing available formula variables/constants and stating that formulas run server-side under admin trust.

**Formula Compatibility Tests (SECU-02)**
- Cover the three built-in presets (standard, score_weighted, custom template) with known input/output assertions.
- Include edge cases that could break numeric output: zero-score matches, identical ELO ratings, and custom constants with extreme values.
- Tests should verify that existing valid admin configurations produce the same ELO deltas after any Phase 2 changes.

**Supabase Import Fix (DATA-01)**
- Fix the known bug in `source/server/routes/export-import.js`: the Supabase path currently only imports players; matches, history, and rackets must be imported with full parity to local mode.
- Import approach mirrors local mode: upsert all four collections in one import call (players, matches, history, rackets).
- If Supabase table structure requires different field mapping (e.g., `match_players` join table), use the same mapper patterns established in `source/server/db/mappers.js`.

**Persistence Adapter Contracts (DATA-03)**
- Contract form: documented behavioral expectations as integration/unit tests that run against both backends, not TypeScript interfaces (too disruptive for brownfield JS).
- For each parity-critical operation (getPlayers, createMatch, getFullState, import), define test assertions that pass identically against Supabase and local modes.
- The existing `dbOps` object in `source/server/db/operations.js` remains the single interface surface — tests enforce its contract rather than restructuring it.

### Claude's Discretion
- Exact logging format for formula error events.
- Test framework file organization for formula and adapter contract tests (follow existing Jest patterns in source/).
- Exact wording of the admin UI trust boundary note.
- Supabase import error handling details (e.g., partial failure behavior across collections).

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SECU-01 | Dynamic admin-provided formula execution is an accepted trust-boundary risk; execution remains admin-only and is documented/guarded rather than replaced. | Trust boundary documents the accepted risk via code comment + test coverage; existing `new Function()` scope isolation verified as the guard in `elo.js`. |
| SECU-02 | Formula migration preserves existing valid Elo formula behavior through compatibility tests for known admin configurations. | Three presets with known input/output tables documented in this research; edge-case inputs identified. |
| DATA-01 | Supabase import path restores full parity so players, matches, history, and rackets import successfully. | Bug is precisely located at lines 32-51 of `export-import.js`; Supabase field mapping patterns exist in `mappers.js` and `operations.js`. |
| DATA-03 | Persistence adapter interfaces define and enforce equivalent behavior contracts for state and mutation operations across backends. | `dbOps` facade verified as single interface surface; contract test patterns derived from existing Phase 1 inline-mock approach. |
</phase_requirements>

---

## Standard Stack

### Core (already in-project — no new installations)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Jest | existing (jest.config.cjs) | Test runner for all new tests | Already configured; server project handles `.mjs`/`.cjs` |
| Node.js `new Function()` | built-in | Formula execution sandbox | Already in use; no new dependency needed |
| Supabase JS client | existing (`lib/supabase.js`) | Supabase upsert for import fix | Already configured and in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Express Router + inline mock | existing | Route-level boundary tests | Same pattern as Phase 1 auth tests |

**Installation:** No new packages required for this phase.

---

## Architecture Patterns

### Existing Project Structure (relevant to this phase)
```
source/
├── server/
│   ├── services/
│   │   └── elo.js               # Formula execution: runFormula, calculateMatchDelta, validateCustomFormula
│   ├── routes/
│   │   ├── admin.js             # GET/PUT /admin/elo-config, POST /admin/recalculate-elo
│   │   └── export-import.js     # POST /api/import — BUG: Supabase branch only imports players
│   ├── db/
│   │   ├── operations.js        # dbOps facade: dual-backend branching for all persistence
│   │   ├── mappers.js           # Supabase-to-legacy field mapping (reuse for import fix)
│   │   └── persistence.js       # Local JSON/GCS persistence
│   └── __tests__/
│       ├── security-guardrails.test.mjs    # Phase 1 pattern to follow
│       ├── validation-boundaries.test.mjs  # Phase 1 pattern to follow
│       ├── admin-validation.test.mjs       # Phase 1 pattern to follow
│       └── import-reset-validation.test.mjs # Phase 1 pattern to follow
├── components/
│   └── admin/
│       └── EloConfigTab.tsx     # Admin UI — add trust boundary warning here
└── jest.config.cjs              # Server project: .mjs/.cjs only, no TypeScript transform
```

### Pattern 1: Server Test File Convention (Phase 1 established)
**What:** All backend tests use `.mjs` extension and live in `source/server/__tests__/`. No TypeScript transform in the server Jest project.
**When to use:** Every new backend test file in this phase.
**Example:**
```javascript
// source/server/__tests__/formula-trust-boundary.test.mjs
// No imports from firebase-admin — use inline mock pattern for auth boundaries
import { calculateMatchDelta, validateCustomFormula, FORMULA_PRESETS } from '../services/elo.js';

describe('formula compatibility — standard preset', () => {
  test('equal ratings 1200 vs 1200 → delta 16', () => {
    const delta = calculateMatchDelta(1200, 1200, { formulaPreset: 'standard', kFactor: 32, dFactor: 200 });
    expect(delta).toBe(16);
  });
});
```

### Pattern 2: Inline Auth Boundary Logic (Phase 1 established)
**What:** Because `firebase-admin` requires real credentials to initialize, auth/admin boundary tests replicate the middleware logic inline rather than importing the middleware directly.
**When to use:** Any test asserting auth or admin allow/deny behavior.
**Example:**
```javascript
// Inline admin boundary — mirrors adminMiddleware without firebase-admin init
async function adminBoundaryCheck(req, res, next, admins) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  const isAdmin = admins.some(a => a.firebaseUid === req.user.uid);
  if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });
  next();
}
```

### Pattern 3: dbOps Dual-Backend Branching (existing)
**What:** Every `dbOps` method branches on `isSupabaseEnabled()`. New import operations must follow this exact pattern.
**When to use:** Any new persistence operation (including the import fix).
```javascript
// From operations.js — the canonical pattern
if (isSupabaseEnabled()) {
  // Supabase path
} else {
  // Local JSON path
}
```

### Pattern 4: Supabase Match Import with `match_players` Join Table
**What:** Matches in Supabase use a `match_players` join table for winners/losers. The `batchToLegacyMatch` mapper expects `match_players` to be pre-fetched. For import, matches must be upserted into both `matches` and `match_players`.
**When to use:** In the Supabase branch of `POST /api/import`.
**Example (from existing `createMatch` in operations.js):**
```javascript
// Insert match
await supabase.from('matches').upsert({ id, type, score_winner, score_loser, timestamp, ... });
// Insert match_players rows
const matchPlayers = [
  ...winnerIds.map(id => ({ match_id: match.id, player_id: id, is_winner: true })),
  ...loserIds.map(id => ({ match_id: match.id, player_id: id, is_winner: false })),
];
await supabase.from('match_players').insert(matchPlayers);
```

### Pattern 5: ELO History Supabase Field Mapping
**What:** `elo_history` table uses snake_case columns: `player_id`, `match_id`, `new_elo`, `timestamp`, `game_type`. The `toLegacyEloHistory` mapper handles the reverse. For import, map legacy camelCase to snake_case.
```javascript
// Legacy history entry → Supabase row
{ player_id: h.playerId, match_id: h.matchId, new_elo: h.newElo, timestamp: h.timestamp, game_type: h.gameType }
```

### Anti-Patterns to Avoid
- **Importing `authMiddleware` directly in tests:** Firebase admin will fail to initialize without real credentials. Use inline boundary logic (Phase 1 pattern).
- **`.ts` extension for server tests:** The Jest server project has no TypeScript transform (`transform: {}`). Use `.mjs`.
- **Silent catch in `calculateMatchDelta`:** The current catch block swallows errors. Adding `console.error` with match context before the fallback is the fix — do not restructure the try/catch.
- **Importing `mappers.js` for the async `toLegacyMatch`:** The async version makes extra Supabase queries. For import, use inline field mapping or `batchToLegacyMatch` logic (which expects pre-joined data).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Formula sandboxing | Custom AST parser, VM module | Existing `runFormula` with `new Function()` | Already implemented, locked decision — no new engine |
| Supabase field mapping | New mapper functions | Reuse inline mapping from `operations.js`/`mappers.js` | Pattern already established and consistent |
| Test auth mocking | Real Firebase token generation | Inline boundary logic (Phase 1 pattern) | Firebase admin unavailable in unit test context |
| Persistence contracts | TypeScript interfaces | Behavioral test assertions against `dbOps` | Locked decision — too disruptive for brownfield JS |

---

## Common Pitfalls

### Pitfall 1: Supabase Import — `match_players` Join Table
**What goes wrong:** Upserting a match row into `matches` without also inserting rows into `match_players` leaves matches with no winners or losers. Any subsequent `getMatches` call via `batchToLegacyMatch` returns empty arrays.
**Why it happens:** The local mode stores `winners`/`losers` as arrays directly on the match object. Supabase normalizes this into a join table.
**How to avoid:** For every imported match, also upsert its `match_players` rows. Derive `winners`/`losers` from the legacy match's `winners` and `losers` arrays.
**Warning signs:** Imported matches appear in the list but show no players when queried via the normal `getMatches` path.

### Pitfall 2: ELO History — Missing `game_type` Field
**What goes wrong:** Legacy history entries may have `gameType` undefined or missing. Inserting `null` into `game_type` may violate a NOT NULL constraint depending on Supabase schema.
**Why it happens:** History entries created before the `gameType` field was added may not have it.
**How to avoid:** Provide a safe fallback: `game_type: h.gameType ?? 'singles'` (or whatever the schema default is) when upserting history.

### Pitfall 3: Formula Compatibility Test — `score_weighted` Requires Scores
**What goes wrong:** `score_weighted` formula only activates when `scoreWinner != null && scoreLoser != null`. If test inputs omit scores, the function falls through to standard ELO — the test then passes for the wrong reason.
**Why it happens:** The conditional in `calculateMatchDelta` line 89 gates score-weighted behavior.
**How to avoid:** Always pass explicit `scoreWinner` and `scoreLoser` in `score_weighted` test cases.

### Pitfall 4: `new Function()` `"use strict"` and Return
**What goes wrong:** The formula expression is wrapped as `return (${formula})`. If a formula uses a block statement (e.g., `{ let x = ...; return x; }`), the outer `return ({...})` breaks.
**Why it happens:** `return ({})` in strict mode is fine for expressions; block statements need different wrapping.
**How to avoid:** Document that formulas must be single expressions, not block statements. The existing UI already calls this out. Compatibility tests should only test expression-form formulas.

### Pitfall 5: Adapter Contract Tests — Supabase Backend Not Available in CI
**What goes wrong:** Tests that call the actual Supabase SDK will fail in environments without `SUPABASE_URL` and `SUPABASE_KEY` set (e.g., most CI environments).
**Why it happens:** `isSupabaseEnabled()` gates on env vars; without them the test exercises only the local path.
**How to avoid:** For DATA-03 contract tests, test the `dbOps` contract behavior against the local mode (which is always available). Document Supabase path coverage as requiring integration test infrastructure in a later phase (DATA-02 is explicitly deferred to Phase 5). Explicitly note in test file that Supabase branch is exercised manually or requires env setup.

### Pitfall 6: Import Response Truthfulness
**What goes wrong:** Current `POST /api/import` in Supabase mode returns `{ success: true }` even if only players imported. After the fix, a partial failure (e.g., matches upsert fails) would still return success if the error isn't propagated.
**Why it happens:** The Supabase branch does not await or check all upsert results before responding.
**How to avoid:** Each upsert block must `await` and check the Supabase error response. Throw on error so the route's catch block returns 500 with context.

---

## Code Examples

### Formula Compatibility — Known Output Table (source: direct code inspection of `elo.js`)
```javascript
// Standard ELO: kFactor=32, dFactor=200
// Equal ratings (1200 vs 1200):
//   expected = 1/(1+10^0) = 0.5
//   delta = Math.round(32 * (1 - 0.5)) = 16
calculateMatchDelta(1200, 1200, { formulaPreset: 'standard', kFactor: 32, dFactor: 200 })
// → 16

// Favourite wins (1400 vs 1200):
//   expected = 1/(1+10^((1200-1400)/200)) = 1/(1+10^-1) ≈ 0.909
//   delta = Math.round(32 * (1 - 0.909)) ≈ Math.round(2.91) = 3
calculateMatchDelta(1400, 1200, { formulaPreset: 'standard', kFactor: 32, dFactor: 200 })
// → 3

// Underdog wins (1200 vs 1400):
//   expected = 1/(1+10^((1400-1200)/200)) = 1/(1+10^1) ≈ 0.0909
//   delta = Math.round(32 * (1 - 0.0909)) ≈ Math.round(29.09) = 29
calculateMatchDelta(1200, 1400, { formulaPreset: 'standard', kFactor: 32, dFactor: 200 })
// → 29
```

### Score-Weighted Preset — Output Table
```javascript
// score_weighted: kFactor=32, dFactor=200, scoreWinner=11, scoreLoser=0
// effectiveK = 32 * (1 + (11-0)/11) = 32 * 2 = 64
// delta for equal ratings = Math.round(64 * 0.5) = 32
calculateMatchDelta(1200, 1200, { formulaPreset: 'score_weighted', kFactor: 32, dFactor: 200, scoreWinner: 11, scoreLoser: 0 })
// → 32

// Close game: scoreWinner=11, scoreLoser=9
// effectiveK = 32 * (1 + (11-9)/20) = 32 * 1.1 = 35.2
// delta for equal ratings = Math.round(35.2 * 0.5) = 18
calculateMatchDelta(1200, 1200, { formulaPreset: 'score_weighted', kFactor: 32, dFactor: 200, scoreWinner: 11, scoreLoser: 9 })
// → 18
```

### Formula Error Logging (target pattern for `calculateMatchDelta` fix)
```javascript
// In calculateMatchDelta catch block — add before fallback return
} catch (err) {
  // Visible in server logs with enough context to diagnose without re-running
  console.error('[ELO] Custom formula failed — falling back to standard', {
    matchId: config.matchId,          // caller must pass matchId in config
    formula: config.customFormula,
    error: err.message,
  });
  return Math.round(kFactor * (1 - expected));
}
```

### Supabase Import Fix — Matches + match_players Upsert Pattern
```javascript
// Derived from operations.js createMatch pattern
for (const match of (matches || [])) {
  await supabase.from('matches').upsert({
    id: match.id,
    type: match.type,
    score_winner: match.scoreWinner,
    score_loser: match.scoreLoser,
    timestamp: match.timestamp,
    elo_change: match.eloChange,
    logged_by: match.loggedBy,
    is_friendly: match.isFriendly || false,
    league_id: match.leagueId || null,
    match_format: match.matchFormat || 'vintage21',
    season_id: match.seasonId || null,
  });
  const matchPlayers = [
    ...(match.winners || []).map(id => ({ match_id: match.id, player_id: id, is_winner: true })),
    ...(match.losers || []).map(id => ({ match_id: match.id, player_id: id, is_winner: false })),
  ];
  if (matchPlayers.length > 0) {
    await supabase.from('match_players').upsert(matchPlayers);
  }
}
```

### ELO History Supabase Upsert Pattern (source: operations.js createMatch)
```javascript
for (const h of (history || [])) {
  await supabase.from('elo_history').upsert({
    player_id: h.playerId,
    match_id: h.matchId,
    new_elo: h.newElo,
    timestamp: h.timestamp,
    game_type: h.gameType ?? 'singles',
  });
}
```

### Rackets Supabase Upsert Pattern (source: operations.js createRacket)
```javascript
for (const r of (rackets || [])) {
  await supabase.from('rackets').upsert({
    id: r.id,
    name: r.name,
    icon: r.icon,
    color: r.color,
    stats: r.stats,
    created_by: r.createdBy,
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Silent formula failure at match time | Log + fallback (to be added) | Phase 2 | Failures become observable without breaking match recording |
| Supabase import: players only | All four collections (to be added) | Phase 2 | Full data portability between modes |
| No formula auth boundary tests | Explicit allow/deny tests (to be added) | Phase 2 | Admin-only formula config is regression-protected |
| No persistence adapter contract tests | Behavioral test assertions against `dbOps` (to be added) | Phase 2 | Contract regressions caught before reaching Supabase |

**No deprecated or outdated approaches to note** — this phase adds to existing patterns, not replacing them.

---

## Open Questions

1. **Does `elo_history` have a `NOT NULL` constraint on `game_type` in the Supabase schema?**
   - What we know: The mapper provides a safe default via `?? 'singles'` in new code paths (e.g., `recalculateElo`). Legacy history entries may not have `gameType`.
   - What's unclear: Whether the Supabase `elo_history.game_type` column is nullable.
   - Recommendation: Apply `h.gameType ?? 'singles'` defensively in the import fix. If a constraint violation occurs in integration testing, the fallback default resolves it.

2. **Does `match_players` have an `ON CONFLICT DO UPDATE` or unique constraint to support `upsert`?**
   - What we know: The `createMatch` path uses `.insert()` not `.upsert()` for `match_players`.
   - What's unclear: Whether `match_players` has a unique constraint on `(match_id, player_id)` that would allow upsert semantics.
   - Recommendation: Use `.upsert()` with `onConflict: 'match_id,player_id'` if supported, or use `.insert()` with error handling that ignores duplicate key violations (as `addAdmin` already does: `!error.message.includes('duplicate')`).

3. **Should `matchId` be passed through `config` to `calculateMatchDelta` for error logging?**
   - What we know: `calculateMatchDelta` currently has no `matchId` in its signature or config object. Callers in `recalculateElo` have the match ID.
   - What's unclear: Whether threading `matchId` through config is acceptable without other call-site changes.
   - Recommendation: Add `matchId` as an optional config property (`config.matchId`). It's purely used for logging; no behavior change. Callers that don't pass it get `undefined` in the log, which is still useful.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (existing, jest.config.cjs) |
| Config file | `source/jest.config.cjs` |
| Quick run command | `cd source && npx jest server/__tests__/formula-trust-boundary.test.mjs --runInBand` |
| Full suite command | `cd source && npm test -- --runInBand` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SECU-01 | Admin-only gate on `GET /admin/elo-config` and `PUT /admin/elo-config` allows admin, denies non-admin | unit (inline boundary) | `cd source && npx jest server/__tests__/formula-trust-boundary.test.mjs --runInBand` | Wave 0 |
| SECU-02 | Three formula presets produce expected deltas for standard inputs + edge cases | unit | `cd source && npx jest server/__tests__/formula-trust-boundary.test.mjs --runInBand` | Wave 0 |
| DATA-01 | Supabase import path upserts players, matches (+ match_players), history, rackets | unit (local mode only; Supabase path requires env) | `cd source && npx jest server/__tests__/persistence-adapter-contracts.test.mjs --runInBand` | Wave 0 |
| DATA-03 | `dbOps.getPlayers`, `dbOps.createMatch`, `dbOps.getFullState` return expected contract shape in local mode | unit | `cd source && npx jest server/__tests__/persistence-adapter-contracts.test.mjs --runInBand` | Wave 0 |

### Sampling Rate
- **Per task commit:** Run the specific test file for that task (commands above)
- **Per wave merge:** `cd source && npm test -- --runInBand`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `source/server/__tests__/formula-trust-boundary.test.mjs` — covers SECU-01, SECU-02
- [ ] `source/server/__tests__/persistence-adapter-contracts.test.mjs` — covers DATA-01, DATA-03

*(No framework install needed — Jest is already present and configured)*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `source/server/services/elo.js` — formula execution, preset definitions, error handling gap in `calculateMatchDelta` catch block
- Direct code inspection: `source/server/routes/export-import.js` — confirmed bug: Supabase branch lines 32-51 only upserts players
- Direct code inspection: `source/server/db/operations.js` — dbOps facade pattern, createMatch shows match_players join table pattern, existing mapper usage
- Direct code inspection: `source/server/db/mappers.js` — confirmed field mapping for all four collections
- Direct code inspection: `source/server/__tests__/security-guardrails.test.mjs` — Phase 1 inline boundary test pattern (`.mjs`, no firebase-admin)
- Direct code inspection: `source/jest.config.cjs` — server project matches `.mjs`/`.cjs` only, no TypeScript transform
- Direct code inspection: `source/server/routes/admin.js` — confirmed `GET /admin/elo-config` and `PUT /admin/elo-config` already behind `authMiddleware + adminMiddleware`; no separate validate-formula endpoint exists
- Direct code inspection: `source/components/admin/EloConfigTab.tsx` — UI location for trust boundary note; `AVAILABLE_VARS` array already defines variable names

### Secondary (MEDIUM confidence)
- Supabase upsert conflict handling: derived from existing `addAdmin` pattern in `operations.js` (line 331: ignores duplicate key error)

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all tooling confirmed present by direct file inspection
- Architecture: HIGH — patterns are precisely defined from Phase 1 artifacts and existing source code
- Pitfalls: HIGH — bugs confirmed by direct source inspection; Supabase join table behavior confirmed from existing `createMatch` code
- Open questions: MEDIUM — Supabase schema constraints not directly inspectable from source; flagged for implementation-time validation

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable brownfield project; no fast-moving dependencies)
