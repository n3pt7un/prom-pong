# Codebase Concerns

**Analysis Date:** 2026-03-16

## Tech Debt

**Monolithic frontend orchestration:**
- Issue: UI navigation, modal state, auth gates, and page composition are concentrated in one high-churn module.
- Files: `source/App.tsx`
- Impact: Small feature changes have broad regression risk and increase merge conflicts.
- Fix approach: Extract route-level containers and domain-specific hooks (navigation, challenge notifications, modal orchestration) into focused modules.

**Handler mega-hook with repeated error boilerplate:**
- Issue: A single hook owns dozens of async mutations with repetitive `try/catch` and side effects.
- Files: `source/hooks/useLeagueHandlers.ts`
- Impact: Inconsistent behavior across actions is hard to detect; edits are error-prone.
- Fix approach: Introduce shared mutation helper (`runMutation`) and split by domain (`matches`, `players`, `admin`, `tournaments`).

**Dead legacy component retained in active tree:**
- Issue: Unreferenced large legacy settings UI remains in source.
- Files: `source/components/Settings.old.tsx`
- Impact: Increases maintenance noise and can be mistakenly edited/reintroduced.
- Fix approach: Remove file or move to explicit archive docs outside runtime source tree.

## Known Bugs

**Supabase import path only persists players:**
- Symptoms: Import success response is returned, but matches/history/rackets are not imported when Supabase mode is enabled.
- Files: `source/server/routes/export-import.js`
- Trigger: `POST /api/import` while `isSupabaseEnabled()` is true.
- Workaround: Use local JSON mode for full import, or manually seed non-player tables.

**Firebase setup can silently run with placeholder config:**
- Symptoms: Login/auth initialization fails at runtime with invalid Firebase project configuration.
- Files: `source/firebaseConfig.ts`
- Trigger: Missing `VITE_FIREBASE_*` vars in environment.
- Workaround: Provide all Firebase env vars before startup.

## Security Considerations

**Runtime formula execution via dynamic code evaluation:**
- Risk: Admin-supplied formula strings are executed with `new Function`, creating code-injection and resource-abuse surface.
- Files: `source/server/services/elo.js`, `source/components/admin/EloConfigTab.tsx`
- Current mitigation: Constant names/values are validated in `saveEloConfig`; formula dry-run validation exists.
- Recommendations: Replace expression execution with a constrained parser/interpreter (AST-based), and enforce operation/time complexity limits.

**Relaxed CSP for auth popup compatibility:**
- Risk: CSP allows `'unsafe-inline'` and `'unsafe-eval'`, which weakens XSS defenses.
- Files: `source/server/index.js`
- Current mitigation: Helmet is enabled with scoped directives.
- Recommendations: Move inline scripts/styles to hashed/nonced assets and remove unsafe directives where feasible.

**Local development auth bypass can become unsafe if misconfigured:**
- Risk: `LOCAL_DEV=true` bypasses token verification and injects synthetic user context.
- Files: `source/server/middleware/auth.js`
- Current mitigation: Guarded by `!GCS_BUCKET` check.
- Recommendations: Add explicit startup warning/fail-fast in non-local environments and require `NODE_ENV=development` in bypass condition.

## Performance Bottlenecks

**State endpoint performs mutation work during read path:**
- Problem: `GET /state` confirms expired pending matches and updates players/matches in request flow.
- Files: `source/server/routes/state.js`
- Cause: Per-request side effects, nested loops, and repeated `await` calls during what should be a read operation.
- Improvement path: Move expiry reconciliation to a scheduled/background job and keep `/state` read-only.

**Local persistence rewrites full JSON DB synchronously:**
- Problem: Every mutation serializes and writes complete DB using sync file IO.
- Files: `source/server/db/persistence.js`
- Cause: `fs.writeFileSync` on full in-memory object.
- Improvement path: Use async writes with batching/debouncing or migrate fully to database-backed persistence.

**ELO recalculation scales poorly with data growth:**
- Problem: Recalculation loads very large match sets and performs many sequential updates.
- Files: `source/server/db/operations.js`
- Cause: `getMatches(999999)`, per-record update loops for players/matches/history.
- Improvement path: Use chunked/batched updates with transactional boundaries and background execution.

## Fragile Areas

**Dual persistence implementations in one operation surface:**
- Files: `source/server/db/operations.js`, `source/server/db/persistence.js`, `source/lib/supabase.js`
- Why fragile: Every feature change must stay behaviorally identical across Supabase and JSON modes.
- Safe modification: Add changes behind adapter interfaces and validate both backends with integration tests.
- Test coverage: No backend test suite detected for parity checks.

**Loose typing and permissive TS config in critical flows:**
- Files: `source/tsconfig.json`, `source/context/AuthContext.tsx`, `source/components/AdminPanel.tsx`, `source/hooks/useLeagueHandlers.ts`
- Why fragile: Frequent `any` usage plus non-strict compiler config masks type regressions.
- Safe modification: Enable incremental strictness (`noImplicitAny`, then `strict`) and replace `any` in auth/admin paths first.
- Test coverage: Frontend unit tests exist, but type-level safety is currently under-enforced.

## Scaling Limits

**Single-file local datastore has hard throughput and contention limits:**
- Current capacity: Suitable for low-concurrency local/small deployments.
- Limit: Write amplification and process-level contention increase with frequent match/challenge updates.
- Scaling path: Prefer Supabase mode in production and phase out full-file persistence path.

**Local mode ignores limiting options for full-state reads:**
- Current capacity: Returns complete in-memory arrays for matches/history/challenges/tournaments.
- Limit: Response size and serialization cost grow linearly with dataset size.
- Scaling path: Apply limits/pagination consistently in local mode (`getFullState` branch in `source/server/db/operations.js`).

## Dependencies at Risk

**Jest/ts-jest major-version skew:**
- Risk: `jest@30` with `ts-jest@29` can cause transform/runtime incompatibilities on future updates.
- Impact: Unstable test execution and harder CI upgrades.
- Migration plan: Align testing toolchain versions or migrate TS transpilation to Babel/SWC-based Jest setup.

## Missing Critical Features

**Request schema validation is not centralized:**
- Problem: Route handlers accept and forward request payloads with mostly ad-hoc checks.
- Blocks: Strong API contract guarantees and safer malformed-input handling.

**Background job separation for reconciliation/recompute tasks:**
- Problem: Expiry confirmation and heavy recomputation remain on request paths.
- Blocks: Predictable API latency under load.

## Test Coverage Gaps

**Backend API and auth middleware are untested:**
- What's not tested: Route authorization, admin-only boundaries, import/export behavior, and persistence parity.
- Files: `source/server/index.js`, `source/server/middleware/auth.js`, `source/server/routes/*.js`, `source/server/db/*.js`
- Risk: Regressions in security and data integrity can ship undetected.
- Priority: High

**Critical migration/recompute paths lack automated verification:**
- What's not tested: `recalculateElo`, pending-match expiry confirmation side effects, and local-vs-Supabase equivalence.
- Files: `source/server/db/operations.js`, `source/server/routes/state.js`
- Risk: Silent ranking/data corruption under edge cases.
- Priority: High

---

*Concerns audit: 2026-03-16*
