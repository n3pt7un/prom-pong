---
phase: 01-security-guardrails-and-boundary-validation
plan: 01
subsystem: auth
tags: [security, csp, helmet, firebase, runtime-guards, jest, esm]

# Dependency graph
requires: []
provides:
  - Centralized runtime guard module (canUseLocalDevBypass, validateRuntimeGuardrails) with env-injection API
  - Startup fail-fast: process.exit(1) on unsafe LOCAL_DEV combinations before server listens
  - Auth bypass gate moved from inline ad-hoc check to shared guard helper
  - Staged CSP profile builder (buildCspDirectives) with compatibility-first default and hardenedProfile toggle
  - Jest server project configuration for ESM .mjs test files via --experimental-vm-modules
affects:
  - 01-02 (input-validation plan — uses server middleware patterns established here)
  - any future plan touching auth.js or index.js startup
  - CSP hardening rollout (HARDENED_CSP=true flag ready)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Env parameter injection for pure testability of env-reading functions
    - Centralized security module pattern (server/security/)
    - Staged feature flag via env var (HARDENED_CSP=true)
    - ESM test files (.mjs) with NODE_OPTIONS=--experimental-vm-modules

key-files:
  created:
    - source/server/security/runtime-guards.js
    - source/server/security/csp-profile.js
    - source/server/security/__tests__/runtime-guards.test.mjs
    - source/server/security/__tests__/startup-auth.test.mjs
    - source/server/security/__tests__/csp-profile.test.mjs
  modified:
    - source/server/index.js
    - source/server/middleware/auth.js
    - source/jest.config.cjs
    - source/package.json

key-decisions:
  - "Env parameter injection (env = process.env default) used instead of module-level const for testability without cache-busting"
  - "ESM .mjs test files with --experimental-vm-modules chosen over CJS wrappers to keep tests idiomatic"
  - "HARDENED_CSP=true env flag enables staged CSP hardening without code deploys"
  - "unsafe-eval retained in default CSP baseline to preserve Firebase SDK compatibility during initial rollout"

patterns-established:
  - "Pattern 1: security modules in server/security/ with env parameter injection for testability"
  - "Pattern 2: startup guard calls before loadDB/app.listen with process.exit(1) on failure"
  - "Pattern 3: shared helper import in middleware (never inline env logic)"

requirements-completed: [SECU-04, SECU-05]

# Metrics
duration: 35min
completed: 2026-03-16
---

# Phase 1 Plan 01: Runtime Guardrails and Staged CSP Hardening Summary

**Fail-fast startup guards and centralized CSP profile module replace inline env checks in auth middleware and server bootstrap, with env-injection API enabling 30 deterministic server-side tests.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-03-16T10:59:08Z
- **Completed:** 2026-03-16T11:34:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Created `runtime-guards.js` with `canUseLocalDevBypass()` and `validateRuntimeGuardrails()` — both accept optional `env` parameter for pure function testability
- Wired startup fail-fast in `index.js`: server exits with code 1 and diagnostic log before listening when unsafe LOCAL_DEV combinations detected; emits visible warning when bypass is active
- Replaced inline ad-hoc bypass check in `auth.js` with shared `canUseLocalDevBypass()` call
- Created `csp-profile.js` with `buildCspDirectives()` — moves CSP directive construction out of server bootstrap, adds staged hardening toggle (`hardenedProfile: true` removes `unsafe-eval`)
- Established Jest server test project with ESM `.mjs` support; 30 server-side tests across 3 test files, all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Create explicit runtime guardrail contract for local-dev bypass** - `585d646` (feat)
2. **Task 2: Integrate startup fail-fast and auth bypass observability** - `ec1370a` (feat)
3. **Task 3: Externalize staged CSP profile and wire Helmet to compatibility-first baseline** - `132fcd7` (feat)

## Files Created/Modified
- `source/server/security/runtime-guards.js` - Guard helper with canUseLocalDevBypass and validateRuntimeGuardrails
- `source/server/security/csp-profile.js` - Staged CSP profile builder with hardenedProfile toggle
- `source/server/security/__tests__/runtime-guards.test.mjs` - 10 tests for guard helper
- `source/server/security/__tests__/startup-auth.test.mjs` - 8 tests for startup/bypass behavior
- `source/server/security/__tests__/csp-profile.test.mjs` - 12 tests for CSP directives
- `source/server/index.js` - Added guard validation before app.listen; wired buildCspDirectives to Helmet
- `source/server/middleware/auth.js` - Replaced inline bypass check with canUseLocalDevBypass()
- `source/jest.config.cjs` - Added server project config for ESM .mjs test files
- `source/package.json` - Added NODE_OPTIONS=--experimental-vm-modules to test scripts

## Decisions Made
- **Env parameter injection** used instead of module-level constants so env-reading functions are pure and testable without require cache manipulation or process.env mutation in tests
- **ESM .mjs test files** chosen over CJS wrappers: keeps test syntax idiomatic and avoids dynamic import complexity
- **HARDENED_CSP=true** env flag for staged CSP hardening: allows production toggle without code changes — default keeps unsafe-eval for Firebase SDK compatibility
- **unsafe-eval retained in default baseline**: Firebase SDK internals may require it; removing in first deployment requires regression testing beyond this plan's scope

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Converted security modules from CJS to ESM**
- **Found during:** Task 1 (writing tests for runtime-guards.js)
- **Issue:** Existing draft `runtime-guards.js` and `csp-profile.js` used `module.exports` in an ESM package (`"type": "module"`). Node resolved `module.exports` as undefined, meaning modules exported nothing. Integration with ESM `index.js` would fail silently at import time.
- **Fix:** Rewrote both files as proper ESM using `export function`. Added `transform: {}` to jest server config and `NODE_OPTIONS=--experimental-vm-modules` to test scripts to support `.mjs` test files.
- **Files modified:** `source/server/security/runtime-guards.js`, `source/server/security/csp-profile.js`, `source/jest.config.cjs`, `source/package.json`
- **Verification:** `node --check` passes; all 30 server tests pass
- **Committed in:** `585d646` (Task 1 commit), `132fcd7` (Task 3 commit)

**2. [Rule 1 - Bug] Added env parameter injection to guard functions**
- **Found during:** Task 1 (TDD RED phase — module-level const env vars cached at load time)
- **Issue:** Original draft evaluated `isDev`, `isLocalDev`, `hasProdIndicators` as module-level constants, making them snapshot values from when the module loaded — not from current process.env. This made the functions non-testable and also caused subtle runtime issues if env vars change post-load.
- **Fix:** Converted to function-scoped evaluation with optional `env = process.env` parameter.
- **Files modified:** `source/server/security/runtime-guards.js`
- **Verification:** 10 tests covering all env combinations pass without process.env mutation
- **Committed in:** `585d646` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking — CJS-in-ESM, 1 bug — module-level env caching)
**Impact on plan:** Both fixes were prerequisite to any testing or integration. No scope creep.

## Issues Encountered
- Pre-existing frontend test failures (17 tests, 7 suites) discovered when running full test suite. Confirmed pre-existing by stashing changes and re-running. Logged to `deferred-items.md` — out of scope for this plan.

## User Setup Required
None — no external service configuration required. To enable hardened CSP profile, set `HARDENED_CSP=true` in server environment.

## Next Phase Readiness
- Guard module and CSP profile ready to be imported by subsequent plans
- Auth bypass is now explicit and auditable via shared helper — safe for plan 01-02 (input validation) to build on
- Pre-existing frontend test failures should be investigated before phase 2 to avoid accumulating test debt

---
*Phase: 01-security-guardrails-and-boundary-validation*
*Completed: 2026-03-16*
