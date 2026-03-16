# Phase 1: Security Guardrails and Boundary Validation - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden the existing API boundary and release path so mutating/admin operations are protected by consistent validation and auth controls, CSP is tightened without breaking Firebase auth popup flow, and release promotion is blocked when security-critical checks fail. This phase clarifies HOW to implement these protections, not adding new product capabilities.

</domain>

<decisions>
## Implementation Decisions

### Validation Contract and Failure Shape
- [auto] Selected all gray areas for discussion.
- [auto] Route validation scope: apply centralized schema validation middleware to all mutating routes (`POST`, `PUT`, `PATCH`, `DELETE`) and all `/api/admin/*` endpoints, while allowing read-only routes to remain unchanged unless they accept complex query payloads.
- [auto] Validation error status policy: use `400` for malformed payloads/type violations and reserve `422` only when payload shape is valid but semantic domain rules fail.
- [auto] Validation error body: standardized structure `{ error, code, details }` where `details` is a field-level array when available.
- [auto] Unknown/extra field handling: reject unexpected keys on admin and mutation endpoints to avoid silent partial writes.

### Development Auth Bypass Guardrails
- [auto] Bypass activation policy: allow bypass only when all conditions are true: `NODE_ENV=development`, `LOCAL_DEV=true`, and no production indicators (`GCS_BUCKET` unset; production deploy env vars not set).
- [auto] Unsafe startup combinations: fail-fast at process startup with explicit error messaging if `LOCAL_DEV=true` appears in non-development contexts.
- [auto] Runtime observability: emit a prominent startup warning whenever bypass mode is active, including resolved guard condition values.
- [auto] Non-bypass auth failures: preserve current `401` semantics (`Authentication required` vs `Invalid or expired token`) to avoid frontend behavior regressions.

### CSP Hardening Rollout
- [auto] Rollout strategy: staged tightening with compatibility-first baseline, then remove unsafe directives incrementally after verification of Firebase popup/auth callback behavior.
- [auto] Priority changes: keep required Firebase origins in `script-src` and `frame-src`, but target removal of `'unsafe-eval'` first and isolate any unavoidable inline allowances.
- [auto] Breakage policy: if auth popup flow fails in staging, block production tightening and keep prior safe-compatible profile for that release.
- [auto] Verification checkpoints: smoke-test login popup, token refresh/session restore, and admin page load under hardened CSP before merge.

### Security and Regression Gates
- [auto] Backend test scope for this phase: auth middleware allow/deny, admin middleware boundary checks, and malformed payload validation behavior on representative mutation/admin routes.
- [auto] CI gating policy: deployment workflow must include a mandatory pre-deploy verification stage that fails on backend security test failures.
- [auto] Gate criticality mapping: treat phase-critical suites as blocking (not informational), with no bypass on main branch deploys.
- [auto] Initial route coverage depth: prioritize high-risk routes (`/api/admin/*`, `/api/matches`, `/api/import`) before broadening to full route matrix.

### Claude's Discretion
- Validation library/package selection and schema authoring style.
- Exact middleware composition strategy and shared helper naming.
- Test framework specifics for backend route/auth tests (while preserving Jest-based repository conventions unless a justified exception is needed).
- CI job naming and workflow structure details, as long as phase gates remain blocking.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope and Requirement Mapping
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, and requirement IDs in scope.
- `.planning/REQUIREMENTS.md` — SECU-03/04/05 and TEST-01/04 requirement definitions and constraints.
- `.planning/PROJECT.md` — Stabilization principles: behavior-preserving, risk-first hardening.
- `.planning/STATE.md` — Current execution status and active phase context.

### Security Design Intent
- `docs/plans/2026-02-28-performance-security-fixes-design.md` — Prior approved security hardening approach for CORS, CSP, body size, and rate limiting.
- `docs/plans/2026-02-28-performance-security-fixes.md` — Implementation-oriented security/performance plan details, including middleware and deployment expectations.

### API and Release Operation Constraints
- `docs/API_REFERENCE.md` — Existing API auth contract and response conventions that must remain behavior-compatible.
- `.github/workflows/deploy.yml` — Current deployment gate flow; anchor point for adding blocking security verification before promotion.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `source/server/middleware/auth.js`: Existing `authMiddleware` and `adminMiddleware` provide the baseline boundary enforcement and are the natural integration point for bypass guardrail hardening.
- `source/server/index.js`: Central middleware registration point already includes Helmet, rate limiting, CORS policy, and JSON limits; ideal location for startup guard assertions and CSP profile staging.
- `source/server/routes/me.js` and `source/server/routes/players.js`: Existing localized payload validation patterns can be harvested into centralized reusable schemas.
- `source/server/routes/admin.js`, `source/server/routes/matches.js`, `source/server/routes/export-import.js`: High-risk mutating/admin surfaces to prioritize for standardized validation behavior.

### Established Patterns
- Route handlers currently perform ad-hoc in-handler checks and return `{ error: string }` JSON on failures.
- Auth and admin protection are attached per-route via middleware chaining (`authMiddleware`, `adminMiddleware`).
- Server security middleware order in `source/server/index.js` is already centralized, enabling incremental hardening without route rewrites.
- Test tooling exists via Jest in `source/jest.config.cjs`, but no backend route/auth tests are currently present, so phase work should introduce that layer deliberately.

### Integration Points
- Add validation middleware in the route mounting pipeline in `source/server/index.js` or route-module level wrappers in `source/server/routes/*.js`.
- Strengthen bypass guard condition checks near startup/config initialization (`source/server/index.js` and `source/server/config.js`) so unsafe combinations fail before serving traffic.
- Add backend security tests aligned with route middleware boundaries, then wire them as required checks in `.github/workflows/deploy.yml`.

</code_context>

<specifics>
## Specific Ideas

- [auto] Gray areas selected: Validation contract, dev bypass policy, CSP rollout behavior, and release gating depth.
- [auto] Recommended defaults chosen for all phase questions to maximize safety while preserving current auth/user flow compatibility.
- Keep user-visible behavior stable; prioritize guardrails and explicit failures over silent acceptance.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-security-guardrails-and-boundary-validation*
*Context gathered: 2026-03-16*
