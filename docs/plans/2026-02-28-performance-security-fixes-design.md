# Performance & Security Fixes — Approach A Design

**Date**: 2026-02-28
**Status**: Approved
**Scope**: No architectural changes. All fixes are in-place.
**Target**: `source/` directory → deployed via Cloud Run (Supabase PostgreSQL mode)

---

## Problems Being Fixed

### Performance
| Issue | Root Cause |
|---|---|
| Massive initial load | Tailwind CDN (~3 MB runtime JS) loaded in index.html instead of built CSS |
| Slow API responses | No HTTP compression on Express (JSON + static assets served uncompressed) |
| Slow cold starts | `npx tsx server/index.js` transpiles TypeScript at runtime in prod |
| Large vendor bundle | No Vite manual chunk splitting — all deps in one JS file |

### Security
| Issue | Severity |
|---|---|
| Wildcard CORS | Medium — `app.use(cors())` allows any origin |
| 50 MB body limit | High — DoS vector; any request can send 50 MB payloads |
| No rate limiting | High — brute-force / flood attacks unmitigated |
| No security headers | Medium — no CSP, HSTS, X-Frame-Options, etc. |
| Unvalidated avatar URLs | Low-Medium — `javascript:` / `data:` URIs accepted |

### Dependencies
| Issue | Impact |
|---|---|
| `tsx` in `dependencies` | Adds ~30 MB transpiler to prod container |
| `@google-cloud/storage` instantiated unconditionally | GCS client constructed on every startup even in Supabase mode |
| `lucide-react@0.344.0` | ~125 versions behind; older bundle, known minor issues |

---

## Section 1: Frontend Bundle

**Files changed**: `source/index.html`, `source/index.tsx`, new `source/tailwind.config.js`, new `source/postcss.config.js`, new `source/styles.css`, `source/vite.config.ts`

### Tailwind CDN → built CSS
- Remove `<script src="https://cdn.tailwindcss.com">` from `index.html`
- Remove inline `tailwind.config` script block from `index.html`
- Create `tailwind.config.js` with identical cyber theme (colors, fontFamily, boxShadow)
- Create `postcss.config.js` using existing `postcss` + `autoprefixer` devDeps
- Create `styles.css` with `@tailwind base/components/utilities`
- Add `import './styles.css'` to `index.tsx`

### Vite vendor chunk splitting
Add `build.rollupOptions.output.manualChunks` to `vite.config.ts`:
- `vendor-react`: react, react-dom
- `vendor-firebase`: firebase/*
- `vendor-charts`: recharts
- `vendor-ui`: lucide-react

**Expected outcome**: CSS load drops from ~3 MB → ~20–80 KB. Stable vendor chunks cached independently across deploys.

---

## Section 2: Server Runtime + Compression

**Files changed**: `source/server/index.js`, `source/lib/supabase.ts` → `source/lib/supabase.js`, all server route files that import supabase, `source/Dockerfile`, `source/package.json`

### HTTP compression
- `npm install compression`
- Add `app.use(compression())` in `server/index.js` (before static middleware)

### Remove runtime TypeScript transpilation
- Convert `lib/supabase.ts` → `lib/supabase.js` (remove TS type annotations; keep logic identical)
- Update imports in all server route files: `../../lib/supabase.ts` → `../../lib/supabase.js`
- Update `server/index.js` import of `../lib/supabase.ts` → `../lib/supabase.js`
- Update `Dockerfile` CMD: `npx tsx server/index.js` → `node server/index.js`
- Move `tsx` from `dependencies` → `devDependencies` in `package.json`

**Expected outcome**: ~70% smaller API payloads on the wire. Cold start no longer runs a TypeScript transpiler.

---

## Section 3: Security

**Files changed**: `source/server/index.js`, `source/server/routes/players.js`, `source/server/routes/me.js`, `source/package.json`

### Security headers
- `npm install helmet`
- Add `app.use(helmet())` in `server/index.js` (first middleware)

### CORS whitelist
Replace `app.use(cors())` with:
```js
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);
// Always allow localhost in dev
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:5173');
}
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));
```
Set `ALLOWED_ORIGINS=https://cyber-pong-arcade-league-148169217091.us-west1.run.app` in Cloud Run env vars.

### Body size limit
- Change `express.json({ limit: '50mb' })` → `express.json({ limit: '1mb' })`
- Add `express.json({ limit: '5mb' })` scoped only to `/api/import` route

### Rate limiting
- `npm install express-rate-limit`
- General limiter: 120 req / 60 s / IP on all `/api` routes
- Mutation limiter: 30 req / 60 s / IP on POST/PUT/DELETE routes

### Avatar URL validation
Add a helper used in player creation and profile update routes:
```js
function isValidAvatarUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch { return false; }
}
```
Return 400 if avatar URL is provided but fails validation.

---

## Section 4: Dependency Cleanup

**Files changed**: `source/package.json`, `source/server/db/persistence.js`

### lucide-react update
- `npm install lucide-react@latest` (currently `0.344.0` → target `~0.469+`)
- Verify no breaking API changes in used icons (spot-check imports)

### Guard GCS client instantiation
In `server/db/persistence.js`, wrap Storage initialization:
```js
// Before (always runs):
const storage = new Storage();
bucket = storage.bucket(GCS_BUCKET);

// After (only when GCS_BUCKET is set, which it already checks):
if (GCS_BUCKET) {
  const { Storage } = await import('@google-cloud/storage');  // lazy import
  const storage = new Storage();
  bucket = storage.bucket(GCS_BUCKET);
}
```
This prevents the GCS client from being constructed on Supabase-mode startups.

---

## Deployment

1. Apply all source changes
2. Rebuild Docker image: `docker build -t cyber-pong .`
3. Push to Cloud Run (existing pipeline)
4. Set `ALLOWED_ORIGINS` env var in Cloud Run to production URL

## What Is NOT Changed

- App logic, routing, ELO calculations
- Supabase queries and schema
- Firebase authentication flow
- Any frontend component behaviour
- Data models or types
