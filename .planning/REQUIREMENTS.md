# Requirements: Test Pong Tech Debt Stabilization

**Defined:** 2026-03-16
**Core Value:** The existing app remains feature-equivalent while critical maintenance risk and regression risk are materially reduced.

## v1 Requirements

Requirements for this stabilization milestone. Each maps to exactly one roadmap phase.

### Security Hardening

- [ ] **SECU-01**: Dynamic admin-provided formula execution is an accepted trust-boundary risk for this milestone; execution remains admin-only and is documented/guarded rather than replaced.
- [ ] **SECU-02**: Formula migration preserves existing valid Elo formula behavior through compatibility tests for known admin configurations.
- [x] **SECU-03**: API mutating and admin routes enforce centralized schema validation with consistent 4xx responses for invalid payloads.
- [x] **SECU-04**: Development auth bypass is only possible when both NODE_ENV=development and explicit local-dev flags are present; unsafe combinations fail fast at startup.
- [x] **SECU-05**: CSP hardening is staged to remove unsafe directives where feasible while preserving required auth popup/login flows.

### Architecture and Maintainability

- [ ] **ARCH-01**: source/App.tsx orchestration is decomposed into route-level containers and focused coordination hooks without navigation or modal behavior regression.
- [ ] **ARCH-02**: source/hooks/useLeagueHandlers.ts is split into domain modules (matches, players, admin, tournaments/challenges) with shared mutation/error helper behavior.
- [ ] **ARCH-03**: Shared mutation helper standardizes async status, success/error toast behavior, and refresh side effects across handler modules.
- [ ] **ARCH-04**: Dead legacy settings implementation is removed from active runtime source tree or archived outside runtime paths.

### Data Integrity and Parity

- [ ] **DATA-01**: Supabase import path restores full parity so players, matches, history, and rackets import successfully.
- [ ] **DATA-02**: Import/export behavior is verified by parity tests that run against both Supabase and local persistence modes.
- [ ] **DATA-03**: Persistence adapter interfaces define and enforce equivalent behavior contracts for state and mutation operations across backends.

### Performance and Request-Path Correctness

- [ ] **PERF-01**: GET /state no longer performs mutation side effects in request flow; reconciliation/expiry confirmation runs outside read path.
- [ ] **PERF-02**: Local persistence write path avoids synchronous full-file writes on hot mutation paths, using async and safe batching/debouncing semantics.
- [ ] **PERF-03**: ELO recomputation and related heavy maintenance paths support chunked/idempotent execution suitable for larger datasets.

### Testing and Operational Safety

- [x] **TEST-01**: Backend automated tests cover auth middleware boundaries, admin route protections, and malformed payload handling.
- [ ] **TEST-02**: Backend automated tests cover import/export flows and verify parity-critical behavior between local and Supabase modes.
- [ ] **TEST-03**: Regression tests verify pending-match expiry/reconciliation and recompute workflows do not corrupt rankings/history data.
- [x] **TEST-04**: Release checks include risk-focused CI gates for stabilization-critical paths before deployment.

## v2 Requirements

Deferred until after stabilization core is complete.

### Advanced Reliability Tooling

- **RELX-01**: Shadow traffic replay for behavior-drift validation on critical endpoints.
- **RELX-02**: Fault-injection scenarios for auth and persistence dependencies.
- **RELX-03**: Risk-weighted debt scorecard dashboard with trend tracking.

### Broader Type/Platform Modernization

- **PLAT-01**: Broader strict TypeScript rollout across all frontend/backend modules.
- **PLAT-02**: Runtime/platform modernization beyond stabilization-critical upgrades.

## Out of Scope

| Feature | Reason |
|---------|--------|
| New gameplay/user-facing feature expansion | Stabilization and debt-risk reduction are the explicit priority for this milestone. |
| Full framework/architecture rewrite | High migration risk and poor fit for incremental brownfield hardening. |
| Immediate complete replatforming of persistence architecture | Better addressed after parity and correctness are locked by tests. |
| Coverage-percentage maximization as a primary KPI | Risk-based verification on critical paths provides higher stabilization value. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SECU-01 | Phase 2 | Pending |
| SECU-02 | Phase 2 | Pending |
| SECU-03 | Phase 1 | Complete |
| SECU-04 | Phase 1 | Complete |
| SECU-05 | Phase 1 | Complete |
| ARCH-01 | Phase 3 | Pending |
| ARCH-02 | Phase 3 | Pending |
| ARCH-03 | Phase 3 | Pending |
| ARCH-04 | Phase 3 | Pending |
| DATA-01 | Phase 2 | Pending |
| DATA-02 | Phase 5 | Pending |
| DATA-03 | Phase 2 | Pending |
| PERF-01 | Phase 4 | Pending |
| PERF-02 | Phase 4 | Pending |
| PERF-03 | Phase 4 | Pending |
| TEST-01 | Phase 1 | Complete |
| TEST-02 | Phase 5 | Pending |
| TEST-03 | Phase 5 | Pending |
| TEST-04 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 after accepted-risk security decision (SECU-01)*
