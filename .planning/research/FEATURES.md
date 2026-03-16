# Feature Landscape

**Domain:** Production React/Express stabilization (tech-debt remediation)
**Researched:** 2026-03-16

## Table Stakes

Features users and operators should expect in any credible stabilization milestone. Missing these means risk remains materially high.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Eliminate dynamic code execution in business rules (replace `new Function` with constrained expression engine) | OWASP and Node guidance treat dynamic evaluation sinks as high-risk; this is a known concern in this codebase. | High | Must preserve existing Elo config behavior while introducing an allowlisted grammar and execution limits. |
| Production-safe auth boundary hardening | Security baseline requires endpoint-level access control and secure auth behavior in all environments. | Medium | Tighten `LOCAL_DEV` bypass conditions to development-only + explicit startup fail-fast for unsafe combos. |
| Centralized request validation for API contracts | Input validation and content-type validation are baseline API controls and reduce exploit and corruption risk. | Medium | Introduce schema validation middleware for all mutating/admin endpoints first. |
| CSP and security header hardening without `unsafe-inline`/`unsafe-eval` reliance | Helmet/CSP hardening is baseline for production Express security posture. | Medium | Stage rollout with report-only first to avoid breaking auth popup/login flows unexpectedly. |
| Dependency vulnerability management in CI (audit gate + patch cadence) | Keeping dependencies current and continuously scanned is table-stakes supply chain hygiene. | Low | Add CI checks and a severity policy; prioritize auth/runtime path dependencies. |
| Read-path purity for state endpoints (remove write side effects from GET flows) | Production performance/reliability baseline requires predictable read latency and side-effect separation. | Medium | Move expiry confirmation/reconciliation from request path to background or scheduled jobs. |
| Non-blocking persistence strategy for local mode | Express/Node production guidance advises avoiding sync I/O in hot paths. | Medium | Replace full synchronous writes with async batched/debounced writes and crash-safe flushing strategy. |
| Baseline backend regression suite for high-risk flows | Stabilization requires fast detection of auth, import/export, and parity regressions. | High | Cover auth boundaries, import parity (Supabase/local), reconciliation/recompute, and role-based route access. |
| Dual-backend parity tests as release gate | This codebase has two persistence modes; parity validation is critical to avoid silent divergence. | High | Add contract-like fixtures and assertion harness that run on both adapters. |
| Performance observability baseline (API latency/error dashboards + SLO alerts) | You cannot stabilize what you cannot measure; p95/p99 latency and error-rate visibility is expected in production ops. | Medium | Start with `/state`, import/export, recompute endpoints and tie alerts to release checks. |

## Differentiators

Capabilities that go beyond baseline hardening and materially improve long-term maintainability and incident avoidance.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Risk-weighted debt burn-down scorecard in CI | Makes remediation progress objective (security, performance, test risk), not anecdotal. | Medium | Use weighted score by endpoint criticality and exploitability; publish trend per PR. |
| Shadow traffic or replay validation for critical endpoints | Detects behavior drift during refactors before production impact. | High | Replay sanitized production traces against candidate builds; diff responses and timing bands. |
| CDC-style contract checks for frontend-backend and adapter boundaries | Prevents accidental API drift while splitting monolith hooks/components. | Medium | Add consumer contracts for high-risk routes and persistence adapter interfaces. |
| Targeted chaos/fault-injection for persistence and auth dependencies | Raises confidence under partial outages and timeout/failure modes. | High | Inject Supabase timeouts/errors and ensure graceful degradation paths stay intact. |
| Automated remediation assistant playbooks (one-command rollback + data integrity checks) | Reduces MTTR during stabilization releases and builds operator confidence. | Medium | Bundle smoke checks, rollback, and post-rollback consistency verification. |

## Anti-Features

Features to explicitly avoid in a stabilization milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full framework migration or architecture rewrite | High delivery risk, long feedback loops, and weak fit for immediate stability goals. | Do incremental extraction behind stable contracts and behavior-locking tests. |
| Net-new user-facing feature expansion | Dilutes remediation capacity and increases regression surface. | Freeze feature scope except defects/security fixes tied to existing workflows. |
| 100% coverage target as a hard objective | Encourages low-value tests and slows focused risk reduction. | Target risk-based coverage on auth, import/export parity, and recompute/state paths. |
| Simultaneous broad strict-TypeScript migration everywhere | Large churn can mask regressions during hardening. | Apply incremental strictness on auth/admin and mutation-heavy modules first. |
| Premature infra replatforming (new DB/queue/cache stack) | Adds migration risk before behavior is stabilized. | Stabilize behavior first; replatform only with measured bottleneck evidence. |
| Security controls that block operations without rollout strategy | Abrupt enforcement can break production flows and trigger rollback churn. | Use staged rollout (report-only, canary, enforce) with fallback switches. |

## Feature Dependencies

Security first, then performance correctness, then hardening depth.

```text
Centralized request validation
  -> Auth boundary hardening
  -> Contract/parity tests

Remove dynamic code execution
  -> Security regression tests
  -> CSP tightening enforcement

Read-path purity (/state)
  -> Background reconciliation jobs
  -> Performance SLO baselines

Non-blocking persistence
  -> Local/Supabase parity regression tests
  -> Fault-injection resilience tests

Baseline backend regression suite
  -> Safe modular refactors (App/useLeagueHandlers split)
  -> Risk scorecard confidence in CI

Observability baseline
  -> SLO alerts
  -> Shadow traffic comparison gates
```

## Sequencing Hints

1. **Contain exploit and auth risk first**
   - Dynamic formula execution replacement
   - Dev bypass hardening
   - Request validation + CSP staged hardening
2. **Stabilize correctness under load**
   - Remove GET side effects
   - Async persistence improvements
   - Import/export parity bug fixes
3. **Lock behavior with tests and contracts**
   - Backend regression suite for auth/import/recompute
   - Dual-backend parity harness
   - Contract checks for API boundaries
4. **Add operational confidence differentiators**
   - SLO-backed dashboards/alerts
   - Shadow replay and targeted fault-injection
   - Risk scorecard for ongoing debt control

## MVP Recommendation

Prioritize:
1. Dynamic execution removal + auth bypass hardening
2. Centralized request validation + CSP/security-header tightening (staged)
3. Read-path purity + async local persistence
4. Backend regression suite for auth/import/parity/recompute
5. Parity gate between Supabase and local modes

Defer:
- Shadow traffic replay and chaos tooling: high leverage but not required for first stabilization pass.
- Broader strict-TS migration: useful later, but can create excessive churn during critical remediation.

## Sources

- Express production security best practices (official): https://expressjs.com/en/advanced/best-practice-security.html (HIGH)
- Express production performance/reliability best practices (official): https://expressjs.com/en/advanced/best-practice-performance.html (HIGH)
- OWASP REST Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html (HIGH)
- OWASP Node.js Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html (HIGH)
- Web Vitals guidance and thresholds (updated 2024-10-31): https://web.dev/articles/vitals (MEDIUM)
- Practical Test Pyramid (test portfolio strategy): https://martinfowler.com/articles/practical-test-pyramid.html (MEDIUM)
