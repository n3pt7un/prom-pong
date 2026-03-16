---
phase: 01-security-guardrails-and-boundary-validation
plan: "02"
subsystem: server-validation
tags: [validation, security, middleware, express, tdd]
dependency_graph:
  requires: []
  provides:
    - server/middleware/validate-request.js
    - server/validation/schemas.js
  affects:
    - server/routes/admin.js
    - server/routes/matches.js
    - server/routes/export-import.js
tech_stack:
  added: []
  patterns:
    - Express middleware factory with schema-based validation
    - 400/422 error contract with machine-readable code + field-level details
    - Strict unknown-key rejection on all admin and mutation schemas
key_files:
  created:
    - source/server/middleware/validate-request.js
    - source/server/validation/schemas.js
    - source/server/validation/__tests__/validate-request.test.mjs
    - source/server/__tests__/admin-validation.test.mjs
    - source/server/__tests__/import-reset-validation.test.mjs
  modified:
    - source/server/routes/admin.js
    - source/server/routes/matches.js
    - source/server/routes/export-import.js
decisions:
  - Semantic validation (422) uses enum checks + domain rule functions — keeps shape/type separation clean
  - updateUser schema allows empty body (all fields optional) since partial updates are valid
  - reset mode is optional — no mode triggers seed behavior (existing behavior preserved)
  - Ad-hoc shape checks removed where schema fully supersedes them; domain-only checks (e.g., score rules) kept in route handlers
metrics:
  duration: 5 minutes
  completed_date: "2026-03-16"
  tasks_completed: 3
  files_created: 5
  files_modified: 3
---

# Phase 1 Plan 02: Centralized Payload Validation Summary

**One-liner:** Centralized Express validation middleware with strict unknown-key rejection and 400/422 error contract wired to all high-risk admin, match, and import/reset mutation endpoints.

## Objective

Add centralized payload validation across high-risk mutating and admin routes with consistent error contract and strict unknown-field rejection. Prevent partial execution or silent key filtering on invalid payloads while keeping route auth/authorization behavior stable.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Define centralized validation contract and high-risk schemas | daa0739 | validate-request.js, schemas.js, validate-request.test.mjs |
| 2 | Apply validation middleware to admin and match mutation routes | b3d8861 | admin.js, matches.js, admin-validation.test.mjs |
| 3 | Apply validation on import/reset mutation boundary | 611014b | export-import.js, import-reset-validation.test.mjs |

## What Was Built

### validate-request.js (middleware factory)

`validateRequest(schema)` returns an Express middleware that:
- Rejects unknown keys (strict mode) with 400
- Rejects missing/null required fields with 400
- Rejects wrong type values with 400
- Rejects enum violations with 422
- Rejects domain semantic rule violations with 422
- Calls `next()` on all-valid payloads

Error contract: `{ error: string, code: string, details: Array<{ field, message }> }`

### schemas.js (schema catalog)

Strict schemas for all targeted routes:
- `addAdmin` — `firebaseUid` required string
- `updateUser` — 13 optional player fields, no extras
- `createLeague` — `name` required, blank-name semantic rule
- `updateLeague` — `name` / `description` optional
- `postMatch` — full match payload with type/matchFormat enums, 0-0 draw rule
- `putMatch` — winners/losers/scores required
- `importData` — players/matches required arrays
- `reset` — mode optional with `[season|fresh|seed]` enum

### Route wiring

- `PUT /admin/users/:playerId` — validateRequest(schemas.updateUser) replaces ad-hoc allowedFields filter
- `POST /admin/admins` — validateRequest(schemas.addAdmin) replaces manual firebaseUid check
- `POST /admin/leagues` — validateRequest(schemas.createLeague) replaces manual name check
- `PUT /admin/leagues/:leagueId` — validateRequest(schemas.updateLeague) added
- `POST /matches` — validateRequest(schemas.postMatch) replaces type/array/score shape checks
- `PUT /matches/:id` — validateRequest(schemas.putMatch) replaces manual array/score checks
- `POST /import` — validateRequest(schemas.importData) replaces in-handler array check
- `POST /reset` — validateRequest(schemas.reset) added with mode enum enforcement

## Test Coverage

34 tests across 3 test suites, all green:

| Suite | Tests | Coverage |
|-------|-------|---------|
| validate-request.test.mjs | 8 | Middleware unit: shape/type 400, semantic 422, unknown keys, valid pass-through |
| admin-validation.test.mjs | 13 | Admin/match schema integration: invalid rejection, 4xx contract, valid pass-through |
| import-reset-validation.test.mjs | 13 | Import/reset: malformed arrays, mode constraints, valid payloads |

## Verification

- All 6 server-side test suites pass
- 7 pre-existing frontend test failures confirmed pre-existing (identical before and after changes)
- `node --check` passes for all 5 created/modified server files

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

All created files verified on disk. All 3 task commits found in git history:
- daa0739: feat(01-02): define centralized validation contract and high-risk schemas
- b3d8861: feat(01-02): apply validation middleware to admin and match mutation routes
- 611014b: feat(01-02): apply validation on import/reset boundaries with strict unknown-key policy
