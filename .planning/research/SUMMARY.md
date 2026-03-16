# Project Research Summary

**Project:** Test Pong
**Domain:** React + Express tech-debt stabilization with dual persistence (Supabase and local mode)
**Researched:** 2026-03-16
**Confidence:** HIGH

## Executive Summary

Test Pong is an existing production-style React and Express application that needs reliability hardening, not product expansion. The research converges on an incremental stabilization strategy used by expert teams for similar systems: preserve current runtime behavior while inserting seams, isolate high-risk boundaries, and enforce behavior with targeted regression and parity tests.

The recommended implementation path is security-and-correctness first, then architecture extraction, then performance and observability hardening. Concretely, this means removing dynamic code execution paths, tightening auth and request validation, eliminating hidden write side effects from read routes, and introducing a command/query split at the highest-risk endpoints before broader decomposition. Frontend and backend changes should proceed through compatibility facades and feature toggles, not big-bang rewrites.

The dominant delivery risk is silent divergence between Supabase and local persistence paths during refactors. The strongest mitigation is to make dual-backend parity a release gate with contract-style fixture tests and CI enforcement, while rollout safeguards (canary toggles, report-only CSP, rollback playbooks) prevent hardening work from causing operational regressions.

## Key Findings

### Recommended Stack

The stack guidance is conservative and debt-first: keep React major stable, modernize runtime/tooling in place, and prioritize safety rails that reduce regression risk while refactoring. Node should move to 24.x LTS with temporary 22.x compatibility; TypeScript strictness should be staged in high-risk modules; and Vite-aligned testing should standardize on Vitest 4 for frontend/unit integration with Playwright for end-to-end confidence.

On the backend, use Zod for boundary validation and Supertest for route/middleware regression coverage, then add dual-mode adapter contract tests with Supabase local tooling and optional Testcontainers-backed database realism. Operational hardening should layer in Pino structured logging and OpenTelemetry traces once critical behavior is protected.

**Core technologies:**
- Node.js 24.x LTS: runtime/security baseline with staged 22.x compatibility during migration.
- TypeScript 5.5+: incremental strictness to catch refactor regressions early.
- Vite 6 + Vitest 4: unified build/test toolchain and reduced config debt.
- Playwright 1.5x: critical-flow cross-browser regression safety.
- Zod 4: centralized API contract validation on mutating/admin routes.
- Supertest 7: fast API integration coverage for auth/import/export/state boundaries.
- Supabase CLI + adapter parity suite: deterministic local parity checks across persistence modes.
- Pino 9 + OpenTelemetry JS: structured diagnostics and latency/error visibility during rollout.

### Expected Features

Research aligns on stabilization table stakes: eliminate risky execution paths, enforce boundary validation and auth correctness, restore read-path purity, and install parity-aware test gates. Differentiators are operational confidence multipliers (risk scorecards, replay validation, controlled fault injection), but these should not block the first stabilization pass.

**Must have (table stakes):**
- Replace dynamic formula execution with constrained, allowlisted evaluation.
- Harden auth boundaries and strictly gate local bypass behavior to development.
- Add centralized request validation for mutating and admin routes.
- Remove write side effects from read endpoints and offload reconciliation/recompute.
- Introduce non-blocking local persistence behavior for hot request paths.
- Gate releases with backend regression plus dual-backend parity coverage.
- Baseline observability for latency/error SLO monitoring on critical endpoints.

**Should have (competitive):**
- Risk-weighted debt scorecard in CI.
- Shadow/replay validation for critical endpoint behavior drift.
- Consumer/adapter contract checks across UI and API boundaries.
- Targeted fault-injection scenarios for auth and persistence dependencies.
- One-command rollback and integrity verification playbooks.

**Defer (v2+):**
- Full framework/architecture rewrites.
- Broad net-new feature expansion.
- Blanket 100% coverage objectives.
- Repo-wide strict TypeScript cutover in one milestone.
- Infrastructure replatforming without measured bottleneck evidence.

### Architecture Approach

Architecture guidance is explicit: use a Strangler Fig pattern inside the monolith with bounded extraction and rollback seams. Frontend should split shell concerns from domain command modules while preserving existing entry points behind compatibility facades. Backend should apply scoped CQRS (query routes are read-only, command routes own mutations), move reconciliation work to background jobs, and centralize adapter behavior behind a parity-tested contract.

**Major components:**
1. Frontend shell and routing boundary: App shell, page routing, overlay coordination, and read context hydration only.
2. Domain command modules: match, player, competition, and admin writes standardized through a shared mutation runner.
3. Backend query/command split: read DTO assembly in query services; mutation logic in command services with idempotency metadata.
4. Reconciliation worker pipeline: expiry/recompute logic off request paths, idempotent and observable.
5. Persistence adapter contract layer: consistent import/export/state semantics across Supabase and local implementations.

### Critical Pitfalls

1. **Dual-persistence parity drift**: Prevent with adapter contracts, golden fixtures, and CI execution against both backends.
2. **Security hardening regressions**: Prevent with canary toggles, auth matrix tests, CSP report-only rollout, and strict env guardrails.
3. **Read routes mutating state**: Prevent with enforced GET read-only checks and moving reconciliation to background jobs.
4. **Synchronous heavy recompute paths**: Prevent with asynchronous chunked jobs, checkpoints, and idempotent retries.
5. **Test growth without risk focus**: Prevent with risk-first gating on auth, parity, import/export, and recompute surfaces.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Safety Rails and Release Guardrails
**Rationale:** Highest risk reduction per effort; required before invasive refactors.
**Delivers:** Auth matrix tests, request-validation baseline for mutating routes, CI vulnerability and smoke gates, rollout/rollback toggles, initial observability baselines.
**Addresses:** Table-stakes security boundary hardening, validation, and release safety.
**Avoids:** Security regression rollouts and low-signal testing pitfall.

### Phase 2: Formula Security and Persistence Parity Hardening
**Rationale:** Closes largest exploit and data-drift risks early.
**Delivers:** Dynamic execution removal, unified import/export contract behavior, dual-backend fixture parity suite in CI.
**Uses:** Zod boundaries, Supertest integration, adapter contract harness.
**Implements:** Persistence gateway and parity-tested command behavior.
**Avoids:** Parity drift and temporary security exception normalization.

### Phase 3: Frontend Seam Extraction and Command Modularization
**Rationale:** Reduces frontend orchestration complexity without behavior breakage.
**Delivers:** App shell/page router/overlay boundaries, domain command modules, shared mutation runner, compatibility facade in existing entrypoints.
**Uses:** Stable React major with incremental TS strictness in high-risk modules.
**Implements:** Strangler seams and bounded ownership model.
**Avoids:** Big-bang rewrite anti-pattern.

### Phase 4: Backend Read/Write Isolation and Recompute Offloading
**Rationale:** Required for deterministic reads and latency stabilization.
**Delivers:** Query vs command route split, read-only state endpoint semantics, background reconciliation/recompute jobs with idempotency.
**Uses:** Scoped CQRS patterns, telemetry instrumentation.
**Implements:** Workerized maintenance path separated from online reads.
**Avoids:** Hidden write side effects and recompute brownouts.

### Phase 5: Performance, Observability, and Node 24 Completion
**Rationale:** Final hardening once correctness and architecture seams are stable.
**Delivers:** Async/batched local persistence tuning, p95/p99 alerting, tracing/log enrichment, Node 24 default in CI/prod with retirement of 22 compatibility.
**Uses:** Pino, OpenTelemetry, runtime/version gates.
**Implements:** SLO-backed operational confidence loop.
**Avoids:** Premature optimization before parity/correctness locks.

### Phase Ordering Rationale

- Security and parity gates precede decomposition because they provide safe rollback and objective regression detection.
- Frontend extraction starts before deeper backend expansion to reduce UI churn while preserving current APIs.
- Read/write backend isolation is sequenced before performance tuning, because deterministic behavior is prerequisite to reliable optimization.
- Runtime upgrade finalization is intentionally last to avoid conflating platform and behavior risk.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** Constrained formula engine design and migration strategy from current dynamic evaluation behavior.
- **Phase 4:** Recompute job model (batch sizing, checkpoints, retry semantics) and idempotency token policy.
- **Phase 5:** Observability depth and SLO thresholds tuned to real traffic and CI/runtime budget.

Phases with standard patterns (can likely skip research-phase):
- **Phase 1:** Auth matrix, request validation middleware, CI vulnerability gates, release toggles.
- **Phase 3:** Strangler seam insertion and modular command extraction with compatibility facade.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Strong official documentation coverage (Node LTS, Vitest/Vite, TypeScript, Zod, Playwright, Supabase CLI) and clear fit to debt goals. |
| Features | HIGH | Table-stakes and anti-features align with OWASP/Express guidance and observed codebase concerns. |
| Architecture | HIGH | Directly grounded in current code hotspots and proven incremental modernization patterns. |
| Pitfalls | HIGH | Pitfalls are concrete, codebase-relevant, and paired with practical prevention controls. |

**Overall confidence:** HIGH

### Gaps to Address

- Formula migration semantics: Existing admin-config formula behavior and edge-case compatibility need explicit acceptance tests before cutover.
- Supabase-local parity definition: Equivalent IDs/counts/order guarantees should be explicitly codified to avoid ambiguous pass criteria.
- Recompute SLO targets: Latency/error budgets are directionally clear but require baseline measurement to set hard release thresholds.
- Rollout policy ownership: Toggle expiry and security exception cleanup require named owners and deadlines in milestone planning.

## Sources

### Primary (HIGH confidence)
- Internal research artifacts: .planning/research/STACK.md, .planning/research/FEATURES.md, .planning/research/ARCHITECTURE.md, .planning/research/PITFALLS.md
- Node release/LTS policy: https://nodejs.org/en/about/previous-releases
- Vitest guide and requirements: https://vitest.dev/guide/
- TypeScript strict mode reference: https://www.typescriptlang.org/tsconfig/strict.html
- Zod documentation: https://zod.dev/
- Playwright documentation: https://playwright.dev/docs/intro
- Supabase local development docs: https://supabase.com/docs/guides/local-development
- RFC 9110 HTTP semantics: https://datatracker.ietf.org/doc/html/rfc9110
- Express security best practices: https://expressjs.com/en/advanced/best-practice-security.html

### Secondary (MEDIUM confidence)
- OWASP REST Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
- OWASP Node.js Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP CSP Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
- Microsoft CQRS pattern guidance: https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs
- Martin Fowler Strangler Fig: https://martinfowler.com/bliki/StranglerFigApplication.html
- Martin Fowler Feature Toggles: https://martinfowler.com/articles/feature-toggles.html

### Tertiary (LOW confidence)
- Transactional Outbox pattern (community source): https://microservices.io/patterns/data/transactional-outbox.html

---
*Research completed: 2026-03-16*
*Ready for roadmap: yes*
