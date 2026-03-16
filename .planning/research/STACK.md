# Technology Stack (Tech-Debt Remediation)

**Project:** Test Pong (existing React + Express app)
**Scope:** Staged debt remediation and hardening (no feature expansion)
**Researched:** 2026-03-16

## Recommended 2026 Stack

### Foundation Runtime

| Technology | Version/Range | Purpose | Why for this milestone | Confidence |
|------------|----------------|---------|------------------------|------------|
| Node.js | 24.x LTS target (keep 22.x compatible during transition) | Unified runtime for frontend tooling and backend API | Node 24 is Active LTS in 2026 while 22 is Maintenance LTS; staged upgrade reduces runtime/security drift without forcing a big-bang cutover. | HIGH |
| TypeScript | 5.5+ (prefer latest 5.x) | Shared type safety across UI + API contracts | Tightens correctness during refactors; supports strict mode improvements incrementally. | HIGH |

### Frontend + Build/Test Core

| Technology | Version/Range | Purpose | Why for this milestone | Confidence |
|------------|----------------|---------|------------------------|------------|
| React | Keep current major (18.x) during remediation | UI stability while paying debt | Avoids feature-regression risk from mixing debt work with framework migration. | HIGH |
| Vite | 6.x+ (paired with Vitest) | Build/dev server alignment with test runner | Vitest now requires Vite >= 6 and shares config pipeline, reducing duplicated config debt. | HIGH |
| Vitest | 4.x | Unit/integration runner for TS + Vite codebase | Faster, Vite-native, and simpler than maintaining Jest + ts-jest skew in this repo. | HIGH |
| Playwright | 1.5x latest | End-to-end regression safety for critical league/admin flows | Cross-browser parallel execution and built-in traces reduce release risk during refactors. | HIGH |
| MSW | 2.x | Stable API mocks for UI and integration tests | Network-level mocking gives deterministic frontend tests without coupling to implementation details. | MEDIUM |

### Backend Safety + Contracts

| Technology | Version/Range | Purpose | Why for this milestone | Confidence |
|------------|----------------|---------|------------------------|------------|
| Zod | 4.x | Request/response schema validation at API boundaries | Centralized validation removes ad-hoc checks and prevents malformed input from leaking into handlers. | HIGH |
| Supertest | 7.x | HTTP API integration tests for Express routes/middleware | Fast path to cover auth boundaries, import/export parity, and regression-prone endpoints. | HIGH |
| Testcontainers (Node) | latest stable + PostgreSQL module | Real-service integration tests for Supabase-like DB behavior | Reproduces production-like DB semantics in CI/local, catching parity bugs that mocks miss. | MEDIUM |

### Persistence/Parity Tooling (Supabase + Local Fallback)

| Technology | Version/Range | Purpose | Why for this milestone | Confidence |
|------------|----------------|---------|------------------------|------------|
| Supabase CLI | latest stable in devDependencies | Local Supabase stack, migration workflow, schema type generation | Makes Supabase mode testable locally and in CI with repeatable DB/auth/storage setup. | HIGH |
| Repository/Adapter contract test suite (project code, not library) | N/A | Enforce identical behavior across Supabase and local JSON modes | Critical for this app’s dual persistence design; ensures staged refactors do not split behavior. | HIGH |

### Observability + Runtime Diagnostics

| Technology | Version/Range | Purpose | Why for this milestone | Confidence |
|------------|----------------|---------|------------------------|------------|
| Pino | 9.x latest | Structured JSON logs for API operations | Low overhead logging with better incident triage during high-risk refactors. | MEDIUM |
| OpenTelemetry JS | latest stable SDK + auto-instrumentations-node | Traces/metrics across Express request paths and heavy reconciliation jobs | Makes latency and side-effect hotspots visible while moving work off request paths. | HIGH |

### Linting and Type Discipline

| Technology | Version/Range | Purpose | Why for this milestone | Confidence |
|------------|----------------|---------|------------------------|------------|
| ESLint | 9.x flat config | Unified lint baseline for JS/TS | Modern flat config reduces config sprawl and supports incremental hardening. | HIGH |
| typescript-eslint | 8.x+ (recommended + strict staged) | TS-aware bug-preventing lint rules | Enables staged strictness rollout without blocking all legacy code at once. | HIGH |

## Staged Adoption Plan (Debt-First)

1. **Phase 1: Safety Rails (No behavior change)**
   - Adopt ESLint 9 flat config + typescript-eslint recommended.
   - Add Zod boundary schemas for highest-risk API routes only.
   - Add Supertest smoke coverage for auth/admin and import/export paths.

2. **Phase 2: Test Modernization**
   - Migrate frontend/unit tests from Jest/ts-jest to Vitest 4.
   - Keep temporary compatibility shim only where migration is blocked.
   - Introduce MSW handlers for deterministic frontend/service tests.

3. **Phase 3: Dual-Persistence Parity Hardening**
   - Add adapter contract tests executed against:
     - local JSON fallback mode
     - Supabase-backed mode (local stack via Supabase CLI or Postgres via Testcontainers)
   - Gate merges on parity-critical test suite.

4. **Phase 4: Runtime Hardening + Observability**
   - Add Pino structured logs and request correlation IDs.
   - Add OpenTelemetry auto instrumentation for API traces/metrics.
   - Move expensive mutation side effects out of read paths and verify via perf budgets.

5. **Phase 5: Runtime Upgrade Completion**
   - Upgrade CI/prod default to Node 24 LTS.
   - Remove Node 22 compatibility once deployment parity and tests are green.

## What NOT to Use in This Milestone

| Avoid | Why Not | Use Instead |
|------|---------|-------------|
| New framework migration (React major jump, Next/Nest rewrite) | High regression risk and scope explosion during debt remediation | Stabilize current architecture first; revisit after parity + test goals are met |
| Continuing Jest + ts-jest skew in Vite-first codebase | Ongoing transformer/version friction and slower migration path | Vitest 4 as primary runner; keep Jest only temporarily for unported suites |
| `new Function` for admin-configurable formulas | Code-injection and runtime safety risk | Constrained expression parser/interpreter with allowlisted operations |
| Sync full-file writes on hot request paths (`writeFileSync`) | Latency spikes and contention under load | Async batched writes or DB-backed persistence path |
| Relying on `LOCAL_DEV` bypass outside strict local dev | Security boundary erosion | Environment-guarded auth flow with fail-fast checks in non-dev |

## Installation Baseline

```bash
# Core remediation toolchain
npm install -D typescript@^5.5 eslint@^9 @eslint/js typescript-eslint \
  vitest@^4 @vitest/coverage-v8 @playwright/test msw \
  supertest zod pino \
  @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node \
  supabase

# Optional DB-realism testing for parity/integration
npm install -D testcontainers @testcontainers/postgresql pg
```

## Source Notes

- Node release line and LTS status: https://nodejs.org/en/about/previous-releases (fetched 2026-03-16)
- Express security hardening baseline: https://expressjs.com/en/advanced/best-practice-security.html (fetched 2026-03-16)
- Vitest requirements (Vite >= 6, Node >= 20): https://vitest.dev/guide/ (updated Jan 2026)
- Jest + Vite caveat from official docs: https://jestjs.io/docs/getting-started
- TypeScript strict mode: https://www.typescriptlang.org/tsconfig/strict.html
- Zod 4 + strict-mode requirement: https://zod.dev/
- Playwright E2E and Node support matrix: https://playwright.dev/docs/intro
- MSW 2 docs and API-mocking model: https://mswjs.io/docs/
- Supabase local dev + CLI workflow: https://supabase.com/docs/guides/local-development
- Testcontainers Node guide: https://testcontainers.com/guides/getting-started-with-testcontainers-for-nodejs/
- Supertest usage and ecosystem maturity: https://github.com/forwardemail/supertest
- OpenTelemetry JS for Node: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- Pino documentation and transport guidance: https://getpino.io/#/

## Confidence Summary

| Recommendation Area | Level | Reason |
|---------------------|-------|--------|
| Runtime/LTS strategy | HIGH | Node official release data clearly supports staged 22 -> 24 path |
| Test stack (Vitest + Playwright) | HIGH | Direct official docs and Vite alignment evidence |
| Backend contracts (Zod + Supertest) | HIGH | Mature, stable docs and direct fit to known concerns |
| Dual-mode parity testing approach | HIGH | Strongly supported by app concern profile and proven tooling |
| Observability (Pino + OpenTelemetry) | MEDIUM-HIGH | Official docs strong; exact depth of instrumentation should be phased |
| MSW/Testcontainers optional depth | MEDIUM | Strong fit, but exact project ROI depends on current test gaps and CI budget |
