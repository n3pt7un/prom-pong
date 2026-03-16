# Test Pong Tech Debt Stabilization

## What This Is

This milestone stabilizes the existing Test Pong platform by reducing high-risk technical debt in frontend orchestration, backend performance paths, and security-sensitive execution points. The goal is to preserve current user-facing behavior while making the codebase safer, easier to change, and less likely to regress under ongoing feature work. It is for maintainers and admins who need faster, safer iteration on the existing product.

## Core Value

The existing app remains feature-equivalent while critical maintenance risk and regression risk are materially reduced.

## Requirements

### Validated

- ✓ League gameplay workflow exists end-to-end (player setup, match logging, rankings, history) — existing
- ✓ Admin and configuration surfaces exist for operating the league — existing
- ✓ Authentication/session handling and protected API access are already integrated — existing
- ✓ Dual persistence paths (Supabase and local JSON/GCS) are already operational — existing
- ✓ Basic frontend test scaffolding exists for major views/components — existing

### Active

- [ ] Refactor monolithic app orchestration in source/App.tsx into focused containers/hooks without behavior regression
- [ ] Split useLeagueHandlers into domain modules with shared mutation/error helper to remove repeated async boilerplate
- [ ] Fix Supabase import parity so players, matches/history, and rackets all import consistently
- [ ] Remove or archive dead legacy settings code from active runtime tree
- [ ] Address highest-risk security/runtime concerns (dynamic formula execution, unsafe CSP, dev auth bypass hardening)
- [ ] Move expensive mutation side effects out of request read paths and reduce synchronous full-file persistence pressure
- [ ] Add backend regression coverage around auth boundaries, import/export parity, and recompute/reconciliation paths

### Out of Scope

- New end-user feature expansion unrelated to tech-debt remediation — priority is stabilization first
- Full architectural rewrite or framework migration — too disruptive for this remediation milestone
- Complete persistence backend replacement in one phase — higher risk than staged hardening

## Context

- Brownfield monorepo with React 18 + TypeScript frontend and Express backend under source.
- Current architecture centralizes substantial orchestration in source/App.tsx and source/hooks/useLeagueHandlers.ts.
- Known bugs and risks are documented in .planning/codebase/CONCERNS.md, including Supabase import gaps, security hardening opportunities, and performance bottlenecks on request paths.
- Dual persistence mode (Supabase and JSON/GCS) increases parity and regression risk for every data-path change.
- Existing frontend tests are present, but backend parity and auth-path coverage are weak relative to risk profile.

## Constraints

- **Behavioral Compatibility**: Existing user/admin workflows must remain behaviorally equivalent — remediation cannot break active operations.
- **Brownfield Incrementalism**: Changes should be phased and reversible — avoid big-bang rewrites.
- **Operational Safety**: Security-hardening changes must preserve required auth and admin flows.
- **Performance**: Read endpoints should avoid hidden mutation work where feasible to keep latency predictable.
- **Tooling Reality**: Current stack and deployment model (Vite + Express + optional Supabase/GCS) remain in place for this milestone.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Prioritize debt by risk class (stability, security, performance, test gaps) | Keeps work tied to operational risk reduction rather than subjective cleanup | — Pending |
| Keep scope remediation-focused and avoid net-new product features | Prevents dilution of effort and faster time-to-stability | — Pending |
| Preserve dual-backend behavior and explicitly test parity-critical paths | Current production modes depend on both storage implementations | — Pending |

---
*Last updated: 2026-03-16 after initialization*
