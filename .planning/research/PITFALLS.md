# Domain Pitfalls: Debt-Remediation Milestones (Subsequent)

**Domain:** Hardening an existing production app while preserving behavior and delivery velocity  
**Researched:** 2026-03-16

## Critical Pitfalls

### Pitfall 1: Breaking dual-persistence parity during "safe" refactors
**What goes wrong:**
A change is implemented for one persistence path (Supabase or local JSON/GCS) but not the other, causing imports, state reads, or mutations to diverge.

**Why it happens:**
- Logic is duplicated across backends instead of routed through a shared adapter contract.
- Teams optimize one path first and postpone parity fixes.
- No parity-focused integration tests gate merges.

**Consequences:**
- Silent data drift between environments.
- Import/export appears successful while only partial entities are persisted.
- Rollbacks become risky because data shape and behavior are inconsistent.

**Warning signs:**
- "Works in local mode, fails in Supabase mode" bug pattern.
- Endpoint returns success while one backend has missing records.
- Frequent conditional branching by storage mode inside route handlers.

**Prevention strategy:**
- Introduce a backend-agnostic persistence adapter boundary before further feature work.
- Define parity contract tests for critical flows: import/export, player/match/history/racket writes, full-state reads.
- Require every data-path PR to include proof of execution against both backends in CI.
- Use golden fixture comparisons (same input -> equivalent observable state across both stores).

**Suggested phase placement:**
Phase 2 (Data parity and import/export hardening), with CI enforcement finalized in Phase 5 (test expansion).

### Pitfall 2: Auth/security hardening that accidentally changes business behavior
**What goes wrong:**
Security fixes (auth checks, stricter CSP, bypass removal) are deployed without a compatibility strategy, breaking valid admin/user workflows and causing emergency rollbacks.

**Why it happens:**
- Security changes are treated as "purely internal" rather than behavior-affecting.
- No staged rollout or dry-run telemetry.
- Missing route-level authorization regression tests.

**Consequences:**
- Production outages on protected endpoints.
- Pressure to weaken controls to restore service quickly.
- Security debt reintroduced by hotfixes.

**Warning signs:**
- Sudden spike in 401/403 after hardening deploy.
- Admin operations fail despite valid sessions.
- CSP violations spike after removing unsafe directives.

**Prevention strategy:**
- Ship hardening behind release/ops toggles with canary cohort rollout.
- Add explicit auth contract tests: unauthenticated, authenticated non-admin, authenticated admin.
- Introduce CSP in report-only mode first, then enforce once violation baseline is understood.
- Add environment guardrails: fail startup if dev bypass flags are active outside development profile.

**Suggested phase placement:**
Phase 3 (auth/security hardening), with rollout controls prepared in Phase 1 and production canary validation in Phase 6.

### Pitfall 3: Leaving read endpoints with hidden write side-effects
**What goes wrong:**
GET/read paths continue mutating state (expiry confirmation, reconciliation, recompute), creating non-deterministic behavior and latency spikes under traffic.

**Why it happens:**
- "Convenient" colocating of reconciliation inside request handlers.
- No separation between online API path and background maintenance path.
- Legacy behavior relied on side effects and never made explicit.

**Consequences:**
- Slow and unpredictable response times.
- Race conditions and lock contention during read bursts.
- Difficult incident triage because reads unexpectedly mutate data.

**Warning signs:**
- GET latency degrades with dataset size.
- Read endpoints perform writes/transactions in traces.
- Inconsistent state depending on request timing/order.

**Prevention strategy:**
- Enforce read-only semantics for GET handlers (RFC 9110 safe method expectations).
- Move reconciliation/expiry/recompute into idempotent background jobs.
- Add endpoint-level mutation assertions in tests (reads do not change persisted state).
- Instrument mutation counts by endpoint and alert on writes from read routes.

**Suggested phase placement:**
Phase 4 (performance and recompute offloading), with safety assertions added in Phase 5.

### Pitfall 4: Heavy recompute paths causing brownouts and partial updates
**What goes wrong:**
Large recomputation (for example ELO recalculation) runs synchronously in request lifecycle, times out, or applies partial updates when interrupted.

**Why it happens:**
- Full scans and sequential updates are executed inline.
- No chunking, checkpointing, or transactional boundaries.
- Missing idempotency and resume semantics.

**Consequences:**
- API timeouts and degraded user experience.
- Ranking/data inconsistency if job fails mid-flight.
- Operational fear of running maintenance operations.

**Warning signs:**
- Recompute endpoints with extreme execution time variance.
- Manual retries needed after interrupted recompute.
- High CPU/IO saturation during maintenance operations.

**Prevention strategy:**
- Execute recompute asynchronously with job records, progress checkpoints, and retry-safe idempotency keys.
- Process data in bounded batches with explicit commit boundaries.
- Keep "current ranking" reads separated from recompute write path.
- Add reconciliation verifier to detect partial application before publishing results.

**Suggested phase placement:**
Phase 4 (performance and recompute offloading), with verifier tests in Phase 5.

### Pitfall 5: Expanding tests without targeting the highest-risk surfaces
**What goes wrong:**
Team adds many tests, but mostly for low-risk UI or utility logic, leaving auth boundaries, parity paths, and recompute correctness largely untested.

**Why it happens:**
- Existing test harness is frontend-heavy and easiest to extend.
- No risk-based test matrix to prioritize backend critical paths.
- Coverage metrics are used as proxy for risk coverage.

**Consequences:**
- False confidence from test count growth.
- High-severity regressions still escape to production.
- Security and data-integrity incidents despite "green CI".

**Warning signs:**
- Backend route/middleware/parity code has minimal tests.
- New tests do not include auth matrix or dual-backend execution.
- Escaped bugs cluster around untested backend behaviors.

**Prevention strategy:**
- Create a risk-first test matrix as release gate: auth boundaries, import/export parity, recompute/reconciliation, read-only endpoint guarantees.
- Add dual-backend integration suite (run once per backend mode).
- Track escaped-defect mapping back to missing test class and close the gap each sprint.
- Keep property-based tests, but treat them as complement not substitute for contract/integration tests.

**Suggested phase placement:**
Phase 1 (baseline quality gates) and Phase 5 (backend regression and parity test expansion).

## Moderate Pitfalls

### Pitfall 6: Security control debt masked by "temporary" exceptions
**What goes wrong:**
Temporary exceptions (`unsafe-inline`, `unsafe-eval`, local auth bypass flags) stay in place indefinitely and become normalized.

**Warning signs:**
- Security TODOs with no owner or due date.
- Exceptions justified as "needed for now" across multiple releases.
- No startup/runtime alarms for insecure configuration in non-dev envs.

**Prevention strategy:**
- Time-box each exception with owner, expiry date, and removal criterion.
- Add startup hard-fail or prominent warning for insecure config outside development.
- Promote CSP/report findings into tracked backlog items with severity.

**Suggested phase placement:**
Phase 3 for remediation, Phase 6 for enforcement/cleanup.

### Pitfall 7: Rollout strategy omitted for high-blast-radius debt fixes
**What goes wrong:**
Large debt changes are released as all-at-once cutovers, forcing binary success/failure outcomes.

**Warning signs:**
- No feature flags or kill-switches around risky paths.
- No canary cohort or staged enablement plan in release checklist.
- No rollback playbook attached to change request.

**Prevention strategy:**
- Use release toggles + ops kill-switches for risky remediations.
- Canary to a small cohort before full rollout; compare error/latency/business metrics by cohort.
- Define explicit rollback trigger thresholds pre-release.

**Suggested phase placement:**
Phase 1 (delivery safety scaffolding) and Phase 6 (progressive rollout).

## Minor Pitfalls

### Pitfall 8: Legacy code retention increases accidental re-coupling
**What goes wrong:**
Archived/unused modules remain near active runtime paths and are accidentally imported or edited.

**Warning signs:**
- Large *.old/*legacy files in active source tree.
- PRs touching inactive files with no runtime intent.
- Team uncertainty about source of truth for a feature.

**Prevention strategy:**
- Remove dead runtime code or move to explicit archive docs outside executable path.
- Add lint/build guardrails to block imports from archive paths.

**Suggested phase placement:**
Phase 2 (structural cleanup after parity safety net exists).

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Baseline safety gates | Teams rush into refactors before observability/test gates | Require pre-change SLO baseline, auth/parity smoke suite, and rollback criteria |
| Data parity hardening | One backend fixed first, second backend lags | Adapter boundary + dual-backend CI contracts |
| Auth/security hardening | Breaking valid flows while tightening controls | Canary rollout, report-only CSP, auth matrix tests |
| Performance/recompute | Background work still triggered by reads | Enforce GET no-write checks and move jobs off request path |
| Test expansion | High test count but low risk coverage | Risk-weighted test gate and escaped-defect feedback loop |
| Rollout/cleanup | Temporary toggles and exceptions become permanent | Toggle expiration policy and hard cleanup checklist |

## Sources

- Internal project context (HIGH confidence):
  - `.planning/PROJECT.md`
  - `.planning/codebase/CONCERNS.md`
  - `.planning/codebase/TESTING.md`
- HTTP Semantics, RFC 9110 (HIGH confidence): https://datatracker.ietf.org/doc/html/rfc9110
  - Safe method/read-only expectation and method semantics used for read-path side-effect guidance.
- OWASP Authentication Cheat Sheet (MEDIUM-HIGH confidence): https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Content Security Policy Cheat Sheet (MEDIUM-HIGH confidence): https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
- Express Production Security Best Practices (MEDIUM confidence): https://expressjs.com/en/advanced/best-practice-security.html
- Feature Toggles guidance (MEDIUM confidence): https://martinfowler.com/articles/feature-toggles.html
- Transactional Outbox pattern for dual-write consistency principles (LOW-MEDIUM confidence, community source): https://microservices.io/patterns/data/transactional-outbox.html
