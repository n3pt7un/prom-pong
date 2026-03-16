# External Integrations

**Analysis Date:** 2026-03-16

## APIs & External Services

**Authentication & Identity:**
- Firebase Authentication (Google Sign-In) - End-user login and identity in `source/services/authService.ts` and `source/firebaseConfig.ts`.
  - SDK/Client: `firebase` (`firebase/auth`, `firebase/app`)
  - Auth: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
- Firebase Admin SDK - Server-side Firebase ID token verification in `source/server/middleware/auth.js` with initialization in `source/server/index.js`.
  - SDK/Client: `firebase-admin`
  - Auth: Google Application Default Credentials (documented in `README.md`)

**Database/Realtime Platform:**
- Supabase (PostgreSQL + Realtime) - Optional primary database path and realtime subscriptions in `source/lib/supabase.ts`, `source/server/db/operations.js`, and `source/hooks/useRealtime.ts`.
  - SDK/Client: `@supabase/supabase-js`
  - Auth: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, toggle `USE_SUPABASE`

**Cloud Object Storage:**
- Google Cloud Storage - Optional persistence backend for `db.json` when JSON mode is used in `source/server/db/persistence.js`.
  - SDK/Client: `@google-cloud/storage`
  - Auth: Application Default Credentials + bucket env `GCS_BUCKET`

## Data Storage

**Databases:**
- PostgreSQL (Supabase) in enabled mode, schema defined in `supabase/migrations/001_initial_schema.sql`.
  - Connection: `SUPABASE_URL`
  - Client: `@supabase/supabase-js` via `source/lib/supabase.ts`
- JSON-file persistence in fallback mode (`source/db.json`) managed by `source/server/db/persistence.js`.
  - Connection: local filesystem path from `source/server/config.js` (`DB_FILE`)
  - Client: Node `fs` in `source/server/db/persistence.js`

**File Storage:**
- Google Cloud Storage bucket for JSON database persistence in cloud fallback mode (`source/server/db/persistence.js`).
- Browser local storage/session storage and IndexedDB are used client-side for offline UX and queueing in `source/utils/offlineQueue.ts` and `source/public/sw.js`.

**Caching:**
- Service Worker cache storage for static assets and API GET responses in `source/public/sw.js`.
- No Redis or external cache service detected.

## Authentication & Identity

**Auth Provider:**
- Firebase Authentication with Google provider on the frontend (`source/services/authService.ts`).
  - Implementation: `signInWithPopup` client flow + backend bearer token verification using `admin.auth().verifyIdToken` in `source/server/middleware/auth.js`.

**Authorization model:**
- App-level admin role is stored in database (`admins` table / collection abstraction) and checked in `source/server/middleware/auth.js` and `source/server/routes/admin.js`.
- Auto-promotion by email allow-list using `ADMIN_EMAILS` in `source/server/config.js` and `source/server/middleware/auth.js`.

## Monitoring & Observability

**Error Tracking:**
- Dedicated external error-tracking SaaS not detected.

**Logs:**
- Console logging on server startup, mode selection, auth errors, and API requests in `source/server/index.js` and `source/server/middleware/auth.js`.
- Client/service-worker diagnostic logs in `source/public/sw.js` and `source/lib/supabase.ts`.

## CI/CD & Deployment

**Hosting:**
- Google Cloud Run is the declared deployment target in `README.md`.
- Runtime artifact is built via multi-stage container in `source/Dockerfile`.

**CI Pipeline:**
- Explicit CI config (GitHub Actions/GitLab CI/CircleCI) not detected in repository.

## Environment Configuration

**Required env vars:**
- Frontend Firebase: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` (`source/firebaseConfig.ts`).
- Backend core: `PORT`, `ALLOWED_ORIGINS`, `ADMIN_EMAILS`, optional `LOCAL_DEV`, `DEV_USER_UID` (`source/server/config.js`, `source/server/middleware/auth.js`).
- Supabase mode: `USE_SUPABASE`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (`source/lib/supabase.ts`).
- GCS mode: `GCS_BUCKET` (`source/server/config.js`, `source/server/db/persistence.js`).

**Secrets location:**
- Local development uses env files (`source/.env`, `source/.env.local`, `source/.env.example` exist).
- Cloud deployment is documented to use Cloud Run/Google credentials and optional secret manager patterns in `README.md` and `source/README.md`.

## Webhooks & Callbacks

**Incoming:**
- No webhook endpoints detected in `source/server/routes/*.js`.

**Outgoing:**
- No third-party webhook callback integrations detected.

---

*Integration audit: 2026-03-16*
