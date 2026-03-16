# Roadmap: Test Pong Tech Debt Stabilization

## Overview

This roadmap delivers stabilization in a risk-first sequence: establish security and release guardrails, remove high-risk dynamic execution and restore persistence parity, decompose brittle frontend orchestration seams, isolate backend read/write correctness and heavy maintenance work, then lock release confidence with parity and regression verification. The goal is behavior-equivalent user and admin workflows with materially lower maintenance and regression risk.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Security Guardrails and Boundary Validation** - Lock auth/validation/CSP/dev-mode safety rails and release gates for safe remediation. (completed 2026-03-16)
- [ ] **Phase 2: Formula Trust-Boundary and Persistence Contracts** - Preserve admin-maintainer formula flexibility while hardening trust boundaries and restoring consistent import behavior with explicit adapter contracts.
- [ ] **Phase 3: Frontend Orchestration Decomposition** - Split monolithic frontend orchestration into focused containers and domain handler modules.
- [ ] **Phase 4: Backend Read-Path and Recompute Isolation** - Remove mutation side effects from reads and make heavy maintenance flows safe at scale.
- [ ] **Phase 5: Parity and Regression Closure** - Prove dual-backend parity and ranking/history correctness with risk-focused regression coverage.

## Phase Details

### Phase 1: Security Guardrails and Boundary Validation
**Goal**: Users and admins operate through hardened auth and validated API boundaries, and releases are blocked when stabilization-critical checks fail.
**Depends on**: Nothing (first phase)
**Requirements**: SECU-03, SECU-04, SECU-05, TEST-01, TEST-04
**Success Criteria** (what must be TRUE):
  1. Invalid payloads on mutating and admin routes consistently return 4xx validation errors instead of partial execution behavior.
  2. Development auth bypass only activates in explicitly allowed local-dev conditions; unsafe environment combinations fail at startup.
  3. CSP hardening is active in staged form without breaking required auth popup/login flows used by operators.
  4. Backend tests demonstrate auth middleware and admin-route protection boundaries for expected allow/deny scenarios.
  5. CI/release checks block promotion when stabilization-critical security and regression gates fail.
**Plans**: 3 plans
Plans:
- [ ] 01-01-PLAN.md - Implement runtime guardrails for safe local-dev auth bypass and staged CSP profile wiring.
- [ ] 01-02-PLAN.md - Add centralized strict validation on high-risk admin and mutation routes with unified 4xx contract.
- [ ] 01-03-PLAN.md - Add backend security boundary tests and a blocking deploy pre-gate for phase-critical suites.

### Phase 2: Formula Trust-Boundary and Persistence Contracts
**Goal**: Admin Elo formula behavior remains supported under an explicit admin-maintainer trust boundary, and import/state semantics are explicitly contract-aligned across persistence adapters.
**Depends on**: Phase 1
**Requirements**: SECU-01, SECU-02, DATA-01, DATA-03
**Success Criteria** (what must be TRUE):
  1. Admin-provided formulas remain available to authenticated admins under documented trust-boundary controls and coverage guardrails.
  2. Existing valid Elo configurations continue producing expected outcomes verified by compatibility tests.
  3. Supabase import successfully includes players, matches, history, and rackets with behavior parity to local mode.
  4. Persistence adapters expose and satisfy equivalent contracts for state retrieval and mutation behavior.
**Plans**: 2 plans
Plans:
- [ ] 02-01-PLAN.md - Add formula error logging, admin UI trust note, and auth boundary + compatibility tests (SECU-01, SECU-02).
- [ ] 02-02-PLAN.md - Fix Supabase import parity bug and create persistence adapter contract tests (DATA-01, DATA-03).

### Phase 3: Frontend Orchestration Decomposition
**Goal**: The frontend retains existing behavior while orchestration and mutation flows are split into maintainable, focused modules.
**Depends on**: Phase 2
**Requirements**: ARCH-01, ARCH-02, ARCH-03, ARCH-04
**Success Criteria** (what must be TRUE):
  1. Navigation and modal workflows behave the same after App.tsx orchestration is moved into route-level containers and focused hooks.
  2. Match, player, admin, and tournament/challenge operations execute through separated domain handler modules with no workflow regression.
  3. Mutation operations present consistent async status and toast/error behavior through a shared helper.
  4. Legacy settings code no longer exists in active runtime execution paths.
**Plans**: TBD

### Phase 4: Backend Read-Path and Recompute Isolation
**Goal**: Read requests are deterministic and fast, while reconciliation and recompute maintenance work runs safely outside hot request paths.
**Depends on**: Phase 3
**Requirements**: PERF-01, PERF-02, PERF-03
**Success Criteria** (what must be TRUE):
  1. GET /state returns data without triggering mutation side effects in the request path.
  2. Local persistence hot-path mutations no longer depend on synchronous full-file writes and use safe async batching/debouncing semantics.
  3. ELO recompute and related maintenance flows can run in chunked, idempotent form on larger datasets without corrupting state.
**Plans**: TBD

### Phase 5: Parity and Regression Closure
**Goal**: The system has reliable automated proof that dual-backend behavior and ranking/history correctness remain stable after remediation.
**Depends on**: Phase 4
**Requirements**: DATA-02, TEST-02, TEST-03
**Success Criteria** (what must be TRUE):
  1. Import/export parity tests pass in both Supabase and local persistence modes for parity-critical datasets.
  2. Backend tests verify dual-backend behavior equivalence on parity-critical flows.
  3. Regression tests confirm pending-match expiry/reconciliation and recompute workflows preserve ranking and history integrity.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security Guardrails and Boundary Validation | 3/3 | Complete   | 2026-03-16 |
| 2. Formula Trust-Boundary and Persistence Contracts | 0/2 | Not started | - |
| 3. Frontend Orchestration Decomposition | 0/TBD | Not started | - |
| 4. Backend Read-Path and Recompute Isolation | 0/TBD | Not started | - |
| 5. Parity and Regression Closure | 0/TBD | Not started | - |
