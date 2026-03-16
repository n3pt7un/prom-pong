# Technology Stack

**Analysis Date:** 2026-03-16

## Languages

**Primary:**
- TypeScript (5.x) - Frontend application and shared utilities in `source/*.ts`, `source/*.tsx`, `source/services/*.ts`, and `source/hooks/*.ts`.
- JavaScript (ESM on Node.js) - Backend API and data layer in `source/server/index.js`, `source/server/routes/*.js`, and `source/server/db/*.js`.

**Secondary:**
- SQL (PostgreSQL dialect) - Database schema and policies in `supabase/migrations/001_initial_schema.sql`.
- CSS (Tailwind/PostCSS pipeline) - Styling pipeline configured in `source/tailwind.config.js` and `source/postcss.config.js`.

## Runtime

**Environment:**
- Node.js 22 runtime for build and production containers, defined in `source/Dockerfile` (`node:22` build stage, `node:22-slim` runtime stage).
- Browser runtime for React SPA entrypoint in `source/index.tsx`.

**Package Manager:**
- npm (lockfile-based workflow) via `source/package.json` scripts.
- Lockfile: present (`source/package-lock.json`).

## Frameworks

**Core:**
- React 18 (`react`, `react-dom`) for UI composition and stateful components in `source/App.tsx` and `source/components/*.tsx`.
- Express 4 (`express`) for REST API routing and middleware in `source/server/index.js`.

**Testing:**
- Jest 30 + ts-jest (`source/jest.config.cjs`) for unit/component tests.
- Testing Library (`@testing-library/react`, `@testing-library/jest-dom`) for React behavior tests in files such as `source/components/Leaderboard.test.tsx`.
- fast-check + `@fast-check/jest` for property-based tests (`source/utils/*.test.ts`).

**Build/Dev:**
- Vite 5 (`source/vite.config.ts`) for dev server, bundling, and API proxying.
- `tsx` for running server entrypoint in dev (`source/package.json` script `dev`).
- Tailwind CSS + PostCSS + Autoprefixer in `source/tailwind.config.js` and `source/postcss.config.js`.
- `concurrently` for dual-process local development (`source/package.json`).

## Key Dependencies

**Critical:**
- `firebase` - Client-side Google Sign-In auth initialization in `source/firebaseConfig.ts` and `source/services/authService.ts`.
- `firebase-admin` - Server-side Firebase ID token verification in `source/server/middleware/auth.js`.
- `@supabase/supabase-js` - Supabase client for optional PostgreSQL mode and realtime subscriptions in `source/lib/supabase.ts` and `source/hooks/useRealtime.ts`.
- `@google-cloud/storage` - Optional cloud persistence for JSON database file in `source/server/db/persistence.js`.

**Infrastructure:**
- `helmet`, `cors`, `compression`, `express-rate-limit` for HTTP hardening and API protection in `source/server/index.js`.
- `recharts` for charting in frontend analytics views (referenced in dependency graph and Vite chunking in `source/vite.config.ts`).
- Radix UI packages (`@radix-ui/*`) + `class-variance-authority`, `tailwind-merge`, `clsx` for UI primitives and variant styling in `source/components/ui/*.tsx`.

## Configuration

**Environment:**
- Runtime config is env-driven through `process.env` and `import.meta.env` in `source/server/config.js`, `source/firebaseConfig.ts`, and `source/lib/supabase.ts`.
- `.env` files are present (`source/.env`, `source/.env.local`, `source/.env.example`) and should be used for local setup; values are not committed to analysis docs.
- Frontend Firebase config requires `VITE_FIREBASE_*` keys in `source/firebaseConfig.ts`.
- Backend mode switches use `USE_SUPABASE`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GCS_BUCKET`, `PORT`, `ALLOWED_ORIGINS`, and auth/admin toggles in `source/server/config.js` and `source/server/middleware/auth.js`.

**Build:**
- TypeScript compiler settings and aliasing are in `source/tsconfig.json` (notably `@/*` path alias).
- Vite bundling, chunk splitting, proxy target, and ports are in `source/vite.config.ts`.
- Dockerized production build/run path is in `source/Dockerfile`.
- Test runner setup is in `source/jest.config.cjs` and `source/jest.setup.cjs`.

## Platform Requirements

**Development:**
- Node.js 22+ expectation documented in `README.md` and enforced by Docker image selection in `source/Dockerfile`.
- Local dev runs two services from `source/package.json`: Vite on `5173` and Express API on `8080`.
- Optional local Firebase Admin credentials via `gcloud auth application-default login` documented in `README.md`.

**Production:**
- Containerized deployment serving built SPA + API from Express (`source/server/index.js`) on port `8080`.
- Deployment target documented as Google Cloud Run in `README.md`.

---

*Stack analysis: 2026-03-16*
