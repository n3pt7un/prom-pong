# Phase 2: Formula Trust-Boundary and Persistence Contracts - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden admin formula trust controls by documenting the accepted risk and verifying existing guardrails are correctly wired, fix the known Supabase import parity bug so players/matches/history/rackets all import, and establish explicit persistence adapter contracts across both backends. This phase clarifies HOW to implement these hardening and parity fixes — no new product capabilities.

</domain>

<decisions>
## Implementation Decisions

### Formula Trust Controls
- Trust-boundary approach: document the accepted risk formally; rely on existing `new Function()` scope isolation and `validateCustomFormula` dry-run. No new execution engine or AST parser introduced.
- Auth boundary tests: add explicit allow/deny test cases covering the admin-only gate on formula config save and validate endpoints (consistent with Phase 1 approach for other admin routes).
- Formula error handling at match time: log the failure with context (match ID, formula string), then fall back to standard ELO so matches still record. No silent swallowing — observable in server logs.
- Admin UI: add a visible warning note in `EloConfigTab.tsx` listing available formula variables/constants and stating that formulas run server-side under admin trust.

### Formula Compatibility Tests (SECU-02)
- Cover the three built-in presets (standard, score_weighted, custom template) with known input/output assertions.
- Include edge cases that could break numeric output: zero-score matches, identical ELO ratings, and custom constants with extreme values.
- Tests should verify that existing valid admin configurations produce the same ELO deltas after any Phase 2 changes.

### Supabase Import Fix (DATA-01)
- Fix the known bug in `source/server/routes/export-import.js`: the Supabase path currently only imports players; matches, history, and rackets must be imported with full parity to local mode.
- Import approach mirrors local mode: upsert all four collections in one import call (players, matches, history, rackets).
- If Supabase table structure requires different field mapping (e.g., `match_players` join table), use the same mapper patterns established in `source/server/db/mappers.js`.

### Persistence Adapter Contracts (DATA-03)
- Contract form: documented behavioral expectations as integration/unit tests that run against both backends, not TypeScript interfaces (too disruptive for brownfield JS).
- For each parity-critical operation (getPlayers, createMatch, getFullState, import), define test assertions that pass identically against Supabase and local modes.
- The existing `dbOps` object in `source/server/db/operations.js` remains the single interface surface — tests enforce its contract rather than restructuring it.

### Claude's Discretion
- Exact logging format for formula error events.
- Test framework file organization for formula and adapter contract tests (follow existing Jest patterns in source/).
- Exact wording of the admin UI trust boundary note.
- Supabase import error handling details (e.g., partial failure behavior across collections).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope and Requirements
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, and requirement IDs (SECU-01, SECU-02, DATA-01, DATA-03).
- `.planning/REQUIREMENTS.md` — Full requirement definitions and constraints for SECU-01/02, DATA-01/03.
- `.planning/PROJECT.md` — Stabilization principles: behavior-preserving, incremental, brownfield-safe.
- `.planning/STATE.md` — Current execution status, active phase context, and key decisions from Phase 1.

### Formula Execution and Config
- `source/server/services/elo.js` — Formula execution via `runFormula`/`new Function()`, preset definitions, `validateCustomFormula` dry-run, and `calculateMatchDelta` integration point.
- `source/components/admin/EloConfigTab.tsx` — Admin UI for formula configuration; target for trust boundary warning note.

### Persistence and Import
- `source/server/routes/export-import.js` — Known bug location: Supabase import path only persists players; fix target for DATA-01.
- `source/server/db/operations.js` — `dbOps` facade: dual-backend branching pattern, all parity-critical operations.
- `source/server/db/persistence.js` — Local JSON/GCS persistence implementation.
- `source/server/db/mappers.js` — Supabase-to-legacy field mapping patterns; use for match/history/racket import mapping.
- `source/lib/supabase.js` — Supabase client and `isSupabaseEnabled()` gate used throughout.

### Test Infrastructure
- `source/jest.config.cjs` — Existing Jest config and project setup; follow patterns for new backend tests.
- `.planning/phases/01-security-guardrails-and-boundary-validation/` — Phase 1 test patterns for auth boundary and admin route tests; replicate style for formula auth tests.

### Prior Security Design
- `.planning/codebase/CONCERNS.md` — Documented security considerations for formula execution and persistence fragility.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `source/server/services/elo.js`: `runFormula`, `validateCustomFormula`, `FORMULA_PRESETS`, `calculateMatchDelta` — all targets for compatibility test coverage; error handling enhancement goes in `runFormula` fallback path.
- `source/server/db/mappers.js`: Existing `toLegacyMatch`, `toLegacyPlayer`, `toLegacyEloHistory`, etc. — reuse these for Supabase import mapping to maintain consistency.
- `source/server/middleware/auth.js`: `authMiddleware` + `adminMiddleware` — formula config endpoints already use these; tests should assert allow/deny behavior using same patterns as Phase 1 auth tests.

### Established Patterns
- `dbOps` in `operations.js`: all methods follow `if (isSupabaseEnabled()) { ... } else { ... }` branching — new import operations should follow this same pattern.
- Formula preset templates in `FORMULA_PRESETS`: standard reference for compatibility test expected outputs.
- Phase 1 established the pattern for admin route boundary tests using inline Jest assertions without direct middleware import (Firebase admin requires real credentials).

### Integration Points
- Formula error logging: add inside `calculateMatchDelta` in `source/server/services/elo.js` at the catch block after `runFormula` call.
- Supabase import fix: extend the `if (isSupabaseEnabled())` branch in `POST /api/import` in `source/server/routes/export-import.js` to add matches/history/rackets upserts.
- Admin UI trust note: add to `source/components/admin/EloConfigTab.tsx` in the custom formula editor section.

</code_context>

<specifics>
## Specific Ideas

- Formula error at match time should be observable in server logs with enough context (match ID, formula string that failed) to diagnose the issue without re-running the match.
- The Supabase import fix should make the success response reflect reality — currently returns `{ success: true }` even when only players were imported.
- Admin UI warning should list the actual available variable names (winnerElo, loserElo, kFactor, dFactor, scoreWinner, scoreLoser, customConstants) so admins know exactly what they can use.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-formula-trust-boundary-and-persistence-contracts*
*Context gathered: 2026-03-16*
