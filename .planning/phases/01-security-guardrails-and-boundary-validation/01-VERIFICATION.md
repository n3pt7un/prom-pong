---
phase: 01-security-guardrails-and-boundary-validation
verified: 2026-03-16T12:00:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 1: Security Guardrails and Boundary Validation — Verification Report

**Phase Goal:** Implement security guardrails, boundary validation, and regression gates so the server is hardened against common attack vectors and the security posture can be verified in CI.
**Verified:** 2026-03-16T12:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Development auth bypass only works in explicitly safe local-dev conditions. | VERIFIED | `auth.js:8` calls `canUseLocalDevBypass()` from `runtime-guards.js`; function requires `NODE_ENV=development` AND `LOCAL_DEV=true` AND no production indicators. |
| 2 | Unsafe environment combinations fail before the server starts serving traffic. | VERIFIED | `index.js:147-152` calls `validateRuntimeGuardrails()` inside `startServer()`, before `loadDB()` and `app.listen()`; exits with code 1 on `guard.ok === false`. |
| 3 | CSP headers remain Firebase-popup compatible while introducing a staged hardening profile. | VERIFIED | `csp-profile.js` exports `buildCspDirectives()` with Firebase/Google origins in `scriptSrc` and `frameSrc`; `hardenedProfile` toggle removes `unsafe-eval` when enabled. `index.js:52` wires it to Helmet. |
| 4 | Invalid payloads on targeted mutating/admin routes return consistent 4xx errors before business logic executes. | VERIFIED | `validateRequest` middleware wired before handlers on all 8 targeted endpoints across `admin.js`, `matches.js`, and `export-import.js`; returns 400 for shape failures, 422 for semantic violations. |
| 5 | Admin/mutation endpoints reject unknown fields rather than silently ignoring unsafe keys. | VERIFIED | All schemas in `schemas.js` declare `strict: true`; `validate-request.js:65-71` rejects unknown keys with 400 and a field-named detail entry. |
| 6 | Error payloads follow one shape with machine-readable code and field-level details. | VERIFIED | `validate-request.js:26-28` defines `{ error, code, details }` contract; 400 uses code `VALIDATION_ERROR`, 422 uses code `SEMANTIC_ERROR`; 27 validation-boundaries tests confirm contract is enforced. |
| 7 | Automated backend tests prove auth/admin boundary allow-deny behavior and malformed payload handling. | VERIFIED | `security-guardrails.test.mjs` (22 tests) covers `validateRuntimeGuardrails`, `canUseLocalDevBypass`, auth 401 boundary, and admin 401/403/pass boundaries. `validation-boundaries.test.mjs` (27 tests) covers 400/422/unknown-key/valid-passthrough paths. |
| 8 | Deployment workflow blocks release when stabilization-critical backend security suites fail. | VERIFIED | `deploy.yml:57-73` inserts "Run phase-critical backend security and validation tests" step before "Build and push Docker image"; runs both suites with `--runInBand`; a failure diagnostic step calls `exit 1`, preventing any further steps. |

**Score:** 8/8 truths verified

---

### Required Artifacts

| Artifact | Plan | Expected | Status | Details |
|----------|------|----------|--------|---------|
| `source/server/security/runtime-guards.js` | 01-01 | Centralized startup/runtime guard evaluation and fail-fast checks. | VERIFIED | 75 lines; exports `canUseLocalDevBypass` and `validateRuntimeGuardrails`; both accept optional `env` param for testability. |
| `source/server/security/csp-profile.js` | 01-01 | Staged CSP directives builder for compatibility-first hardening. | VERIFIED | 44 lines; exports `buildCspDirectives({ hardenedProfile })`; includes Firebase/Google origins; `hardenedProfile` toggle removes `unsafe-eval`. |
| `source/server/index.js` | 01-01 | Startup guard invocation and Helmet CSP wiring through shared profile. | VERIFIED | Guard called at lines 147-158 before `loadDB`/`app.listen`; Helmet CSP wired at line 52 via `buildCspDirectives`. |
| `source/server/middleware/auth.js` | 01-01 | Auth bypass gate uses shared guard conditions instead of ad-hoc checks. | VERIFIED | Line 4 imports `canUseLocalDevBypass`; line 8 uses it as the sole bypass condition. |
| `source/server/middleware/validate-request.js` | 01-02 | Shared route middleware for schema-based payload validation. | VERIFIED | 128 lines; full implementation — unknown key check, required field check, type check (400), enum check, semantic rules (422); calls `next()` on valid payloads. |
| `source/server/validation/schemas.js` | 01-02 | High-risk route schemas for /api/admin/*, /api/matches, and /api/import. | VERIFIED | 192 lines; 8 schemas: `addAdmin`, `updateUser`, `createLeague`, `updateLeague`, `postMatch`, `putMatch`, `importData`, `reset`; all `strict: true`. |
| `source/server/routes/admin.js` | 01-02 | Validation middleware applied to representative admin mutations. | VERIFIED | `validateRequest` wired on `PUT /admin/users/:playerId`, `POST /admin/admins`, `POST /admin/leagues`, `PUT /admin/leagues/:leagueId`. |
| `source/server/routes/matches.js` | 01-02 | Validation middleware applied to POST/PUT match mutations. | VERIFIED | `validateRequest` wired on `POST /matches` and `PUT /matches/:id`. |
| `source/server/routes/export-import.js` | 01-02 | Validation middleware applied to import/reset mutation boundaries. | VERIFIED | `validateRequest` wired on `POST /import` and `POST /reset`; positioned after body parser and auth/admin middleware, before handler. |
| `source/server/__tests__/security-guardrails.test.mjs` | 01-03 | Runtime guard and auth/admin boundary regression tests. | VERIFIED | 22 tests across 4 suites; directly imports `runtime-guards.js`; auth/admin boundary logic replicated inline (no firebase-admin initialization required). |
| `source/server/__tests__/validation-boundaries.test.mjs` | 01-03 | Centralized validation failure/success behavior tests. | VERIFIED | 27 tests across 3 suites; imports `validateRequest` and `schemas` directly; tests 400/422/unknown-key/valid-passthrough for all representative routes. |
| `.github/workflows/deploy.yml` | 01-03 | Blocking pre-deploy test gate for stabilization-critical suites. | VERIFIED | Two gate steps at lines 53-73 precede the Docker build step; no `continue-on-error`; diagnostic step exits with code 1 on failure. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `source/server/index.js` | `source/server/security/runtime-guards.js` | `validateRuntimeGuardrails` before `app.listen` | WIRED | Import at line 13; called at line 147 inside `startServer()` before `loadDB` and `app.listen`. |
| `source/server/middleware/auth.js` | `source/server/security/runtime-guards.js` | `canUseLocalDevBypass` bypass condition | WIRED | Import at line 4; used at line 8 as the sole bypass guard. |
| `source/server/index.js` | `source/server/security/csp-profile.js` | `buildCspDirectives` in Helmet CSP config | WIRED | Import at line 14; used at line 52 in Helmet `contentSecurityPolicy.directives`. |
| `source/server/routes/admin.js` | `source/server/middleware/validate-request.js` | `validateRequest` middleware chain before handler | WIRED | Import at line 4; applied on 4 endpoints as middleware argument before async handler. |
| `source/server/routes/matches.js` | `source/server/validation/schemas.js` | `schemas` binding for request body | WIRED | Import at line 9; `schemas.postMatch` and `schemas.putMatch` passed to `validateRequest`. |
| `source/server/routes/export-import.js` | `source/server/validation/schemas.js` | `schemas.importData` and `schemas.reset` usage | WIRED | Import at line 8; `schemas.importData` and `schemas.reset` passed to `validateRequest`. |
| `.github/workflows/deploy.yml` | `source/server/__tests__/security-guardrails.test.mjs` | mandatory CI step command `npm test` | WIRED | Step at line 57-63 runs `server/__tests__/security-guardrails.test.mjs` explicitly; no bypass. |
| `.github/workflows/deploy.yml` | `source/server/__tests__/validation-boundaries.test.mjs` | mandatory CI step command `npm test` | WIRED | Same step at line 61-63 includes `server/__tests__/validation-boundaries.test.mjs`; runs before Docker build. |
| `source/server/__tests__/validation-boundaries.test.mjs` | `source/server/middleware/validate-request.js` | route-level validation assertions | WIRED | Import at line 15; `validateRequest(schema)` invoked directly in test helper `invoke()`; 27 assertions against returned status/body. |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SECU-04 | 01-01 | Development auth bypass only possible when NODE_ENV=development and explicit local-dev flags are present; unsafe combinations fail fast at startup. | SATISFIED | `runtime-guards.js` enforces triple condition; `index.js` exits before listen on guard failure; `auth.js` uses shared helper. |
| SECU-05 | 01-01 | CSP hardening is staged to remove unsafe directives where feasible while preserving required auth popup/login flows. | SATISFIED | `csp-profile.js` default keeps `unsafe-eval` for Firebase SDK; `hardenedProfile: true` removes it; Firebase origins always present in `scriptSrc`/`frameSrc`. |
| SECU-03 | 01-02 | API mutating and admin routes enforce centralized schema validation with consistent 4xx responses for invalid payloads. | SATISFIED | `validateRequest` middleware wired on 8 high-risk endpoints; returns `{ error, code, details }` with 400/422 status codes. |
| TEST-01 | 01-03 | Backend automated tests cover auth middleware boundaries, admin route protections, and malformed payload handling. | SATISFIED | `security-guardrails.test.mjs` 22 tests; `validation-boundaries.test.mjs` 27 tests; all confirm boundary contracts. |
| TEST-04 | 01-03 | Release checks include risk-focused CI gates for stabilization-critical paths before deployment. | SATISFIED | `deploy.yml` gate at steps 53-73 blocks Docker build and Cloud Run deploy when either security test suite fails. |

No orphaned requirements found — all 5 requirement IDs declared in plan frontmatter are mapped to REQUIREMENTS.md entries and confirmed implemented.

---

### Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `source/server/validation/schemas.js` | `return null` (5 occurrences, lines 74, 118, 126, 150, 188) | Info | Not a stub — these are semantic rule functions that return `null` to signal "no violation found". This is the correct implementation pattern for the `semanticRules` array contract. |

No blockers or warnings found.

---

### Human Verification Required

**1. CSP Header Delivery**

**Test:** Deploy or run server locally with representative routes; inspect response headers on an API call (e.g., `curl -I http://localhost:8080/api/players`).
**Expected:** `Content-Security-Policy` header present with `script-src` including `'self'`, `'unsafe-inline'`, `https://apis.google.com`, `https://*.firebaseapp.com`, and `'unsafe-eval'` (default baseline). `frame-src` includes `https://accounts.google.com` and `https://*.firebaseapp.com`.
**Why human:** Cannot verify runtime HTTP response headers via static code analysis.

**2. Startup Fail-Fast Behavior**

**Test:** Start server with `LOCAL_DEV=true NODE_ENV=production node server/index.js`.
**Expected:** Process logs `[SECURITY] Unsafe environment configuration detected. Server will not start.` and exits with code 1 without binding a port.
**Why human:** Runtime process behavior cannot be confirmed via static analysis; requires executing the server binary with injected env vars.

**3. Firebase Popup Compatibility**

**Test:** Log in to the deployed application using Google sign-in (popup flow).
**Expected:** Auth popup opens, completes authentication, and the session is established without CSP console errors in the browser.
**Why human:** Real-world browser/Firebase interaction needed to confirm CSP baseline does not break the login flow.

---

### Gaps Summary

No gaps. All 8 observable truths are verified, all 12 artifacts exist and are substantive and wired, all 9 key links are connected, and all 5 requirement IDs are satisfied. Three human verification items are noted for runtime/browser confirmation but do not indicate implementation defects.

---

_Verified: 2026-03-16T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
