# Performance & Security Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate the Tailwind CDN load (~3 MB), add HTTP compression, remove runtime TypeScript transpilation, and harden the Express server with security headers, CORS whitelist, rate limiting, and body size limits.

**Architecture:** All changes are in-place within `source/`. Frontend bundle is optimized via Vite build config. Server hardening is pure Express middleware added in `server/index.js`. The only structural change is converting `lib/supabase.ts` → `lib/supabase.js` so the server can run under plain `node` instead of `tsx`.

**Tech Stack:** React 18, Vite 5, Express 4, Tailwind CSS 3, Firebase Auth, Supabase (PostgreSQL), Docker / Cloud Run

**Design doc:** `docs/plans/2026-02-28-performance-security-fixes-design.md`

---

## Task 1: Remove Tailwind CDN — create config files

**Why:** `index.html` loads `https://cdn.tailwindcss.com` (~3 MB runtime engine). `tailwindcss`, `postcss`, and `autoprefixer` are already devDeps — we just need to wire them up.

**Files:**
- Create: `source/tailwind.config.js`
- Create: `source/postcss.config.js`
- Create: `source/styles.css`

**Step 1: Create `source/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './context/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#050505',
          panel: '#0a0a0a',
          cyan: '#00f3ff',
          pink: '#ff00ff',
          purple: '#bc13fe',
          yellow: '#fcee0a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Orbitron', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 5px #00f3ff, 0 0 20px rgba(0, 243, 255, 0.5)',
        'neon-pink': '0 0 5px #ff00ff, 0 0 20px rgba(255, 0, 255, 0.5)',
      },
    },
  },
  plugins: [],
};
```

**Step 2: Create `source/postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Step 3: Create `source/styles.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## Task 2: Wire styles into the build + remove CDN from HTML

**Files:**
- Modify: `source/index.tsx` — add CSS import as first line
- Modify: `source/index.html` — remove CDN script and inline tailwind config

**Step 1: Add CSS import to `source/index.tsx`**

Add as the very first line:

```ts
import './styles.css';
```

**Step 2: Edit `source/index.html`**

Remove this entire block (lines 12–42 approximately):

```html
<script src="https://cdn.tailwindcss.com"></script>
```

and:

```html
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: { ... },
        fontFamily: { ... },
        boxShadow: { ... },
      }
    }
  }
</script>
```

Keep the `<style>` block with `.glass-panel`, `.neon-text-cyan`, `.neon-text-pink`, and scrollbar styles — those are hand-written CSS, not Tailwind utilities.

**Step 3: Verify the build succeeds**

```bash
cd source && npm run build
```

Expected: build completes, `dist/` contains `assets/index-*.css` (should be under 200 KB), no Tailwind-related errors.

**Step 4: Spot-check the dev server**

```bash
cd source && npm run dev
```

Open `http://localhost:5173`. Verify the UI still renders with cyber theme colors (dark background, neon accents). If any utility classes appear broken, check that `tailwind.config.js` content paths cover all component files.

---

## Task 3: Add Vite vendor chunk splitting

**Files:**
- Modify: `source/vite.config.ts`

**Why:** Without manual chunks, all deps ship in one bundle. Splitting react/firebase/recharts/lucide into separate files lets the browser cache stable deps independently across deploys.

**Step 1: Update `source/vite.config.ts`**

Replace the current export with:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth'],
          'vendor-charts': ['recharts'],
          'vendor-ui': ['lucide-react'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 8080,
  },
});
```

**Step 2: Verify chunk output**

```bash
cd source && npm run build 2>&1 | grep -E "vendor-|index\."
```

Expected: lines showing `vendor-react`, `vendor-firebase`, `vendor-charts`, `vendor-ui` chunk filenames alongside the main `index` chunk.

---

## Task 4: Add HTTP compression middleware

**Why:** Express serves JSON API responses and static assets uncompressed. Gzip compression reduces payload size ~70%.

**Step 1: Install `compression`**

```bash
cd source && npm install compression
```

Also install types (devDep only):

```bash
cd source && npm install --save-dev @types/compression
```

**Step 2: Add compression middleware to `source/server/index.js`**

Add this import near the top with the other imports:

```js
import compression from 'compression';
```

Add `app.use(compression())` as the **first** middleware call, before `cors()`, `express.json()`, and `express.static()`:

```js
app.use(compression());
app.use(cors());
// ... rest of middleware
```

**Step 3: Verify**

Start the server and check that compressed responses are returned:

```bash
cd source && node --experimental-vm-modules server/index.js &
curl -s -I -H "Accept-Encoding: gzip" http://localhost:8080/api/state \
  -H "Authorization: Bearer test" 2>&1 | grep -i content-encoding
```

Expected: `content-encoding: gzip` in response headers (or a 401 — the header still appears even for auth errors).

Stop the background server after: `kill %1`

---

## Task 5: Convert `lib/supabase.ts` → `lib/supabase.js`

**Why:** The server imports `lib/supabase.ts` with the explicit `.ts` extension, forcing `tsx` to run at runtime. Converting to plain JS lets the server run under `node` directly.

**Files:**
- Create: `source/lib/supabase.js` (from supabase.ts with TS removed)
- Delete (or leave and ignore): `source/lib/supabase.ts`
- Modify imports in: `source/server/index.js`, `source/server/db/mappers.js`, `source/server/db/operations.js`, `source/server/routes/corrections.js`, `source/server/routes/export-import.js`, `source/server/routes/matches.js`

**Step 1: Create `source/lib/supabase.js`**

Exact content (TypeScript types stripped, logic identical):

```js
import { createClient } from '@supabase/supabase-js';

// Support both Node.js (process.env) and Vite (import.meta.env)
const env = typeof process !== 'undefined' && process.env
  ? process.env
  : (typeof import.meta !== 'undefined' && import.meta.env)
    ? import.meta.env
    : {};

const supabaseUrl = env.SUPABASE_URL || '';
const supabaseServiceKey = env.SUPABASE_SERVICE_KEY || '';
const useSupabase = env.USE_SUPABASE === 'true';

let supabase = null;

if (useSupabase && supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      enabled: true,
      params: {
        eventsPerSecond: 10,
      },
    },
  });
  console.log('✅ Supabase client initialized with Realtime enabled');
} else {
  if (useSupabase) {
    console.warn('⚠️ USE_SUPABASE is true but missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  }
}

export { supabase, useSupabase };

export function isSupabaseEnabled() {
  return useSupabase && supabase !== null;
}
```

**Step 2: Update imports in all 6 server files**

In each file below, replace `../../lib/supabase.ts` → `../../lib/supabase.js` (or `../lib/supabase.js` for `server/index.js`):

- `source/server/index.js` line 7: `import { isSupabaseEnabled } from '../lib/supabase.ts'` → `'../lib/supabase.js'`
- `source/server/db/mappers.js` line 1: `../../lib/supabase.ts` → `../../lib/supabase.js`
- `source/server/db/operations.js` line 1: `../../lib/supabase.ts` → `../../lib/supabase.js`
- `source/server/routes/corrections.js` lines 4–5: both imports
- `source/server/routes/export-import.js` lines 4–5: both imports
- `source/server/routes/matches.js` lines 6–7: both imports

**Step 3: Verify server starts with plain node**

```bash
cd source && node server/index.js
```

Expected: server logs appear (`🔐 Firebase Admin SDK initialized`, `📊 Using Supabase PostgreSQL database`, `🚀 Server running on port 8080`) with no import errors. Ctrl-C to stop.

---

## Task 6: Update Dockerfile + move `tsx` to devDependencies

**Files:**
- Modify: `source/Dockerfile`
- Modify: `source/package.json`

**Step 1: Update `source/Dockerfile` CMD**

Change the last line:

```dockerfile
# Before
CMD ["npx", "tsx", "server/index.js"]

# After
CMD ["node", "server/index.js"]
```

**Step 2: Move `tsx` in `source/package.json`**

Remove `"tsx": "^4.21.0"` from `dependencies` and add it to `devDependencies`:

```json
"devDependencies": {
  ...
  "tsx": "^4.21.0"
}
```

**Step 3: Verify prod install works without tsx**

```bash
cd source && npm install --omit=dev --dry-run 2>&1 | grep tsx
```

Expected: no `tsx` in the output (it's a devDep now, omitted from prod install).

---

## Task 7: Add security headers with Helmet

**Files:**
- Modify: `source/server/index.js`
- Modify: `source/package.json` (via npm install)

**Step 1: Install helmet**

```bash
cd source && npm install helmet
```

**Step 2: Add helmet to `source/server/index.js`**

Add import:

```js
import helmet from 'helmet';
```

Add as the **first** `app.use()` call (before compression):

```js
app.use(helmet());
app.use(compression());
app.use(cors());
// ...
```

**Step 3: Verify security headers**

```bash
cd source && node server/index.js &
curl -s -I http://localhost:8080/ | grep -iE "x-frame|x-content|strict-transport|referrer"
kill %1
```

Expected: headers like `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: ...` in the output.

---

## Task 8: CORS whitelist

**Files:**
- Modify: `source/server/index.js`

**Step 1: Replace `app.use(cors())` in `source/server/index.js`**

Replace the current single-line cors call with:

```js
const rawOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const allowedOrigins = new Set([
  ...rawOrigins,
  // Always permit same-origin requests (no Origin header) and localhost in dev
  ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:5173', 'http://localhost:8080'] : []),
]);

app.use(cors({
  origin: (origin, callback) => {
    // No origin = same-origin request (server-to-server, curl, etc.) — allow
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    callback(new Error(`CORS: origin not allowed: ${origin}`));
  },
  credentials: true,
}));
```

**Step 2: Set env var for production (Cloud Run)**

Document in the design doc (already done) that `ALLOWED_ORIGINS=https://cyber-pong-arcade-league-148169217091.us-west1.run.app` must be set as a Cloud Run env var. No code change needed here — just note it.

**Step 3: Verify CORS blocks unknown origins**

```bash
cd source && node server/index.js &
curl -s -I -H "Origin: https://evil.example.com" http://localhost:8080/api/state | head -5
kill %1
```

Expected: response does NOT contain `Access-Control-Allow-Origin: https://evil.example.com`.

---

## Task 9: Reduce body limit + scoped import limit

**Files:**
- Modify: `source/server/index.js`
- Modify: `source/server/routes/export-import.js`

**Step 1: Change global body limit in `source/server/index.js`**

```js
// Before
app.use(express.json({ limit: '50mb' }));

// After
app.use(express.json({ limit: '1mb' }));
```

**Step 2: Add scoped 5 MB parser to `source/server/routes/export-import.js`**

The import endpoint receives a full league data export, which can be several MB. Add a scoped parser before its route handler.

At the top of the file, add:

```js
import express from 'express';
```

Then, on the POST `/import` route, add the larger parser as route-level middleware before the handler. Find the `router.post('/import', authMiddleware, ...)` line and change it to:

```js
router.post('/import', express.json({ limit: '5mb' }), authMiddleware, async (req, res) => {
```

**Step 3: Verify 413 on oversized requests**

```bash
cd source && node server/index.js &
# Generate ~2MB JSON payload and POST it to a regular endpoint
python3 -c "import json; print(json.dumps({'data': 'x' * 2_000_000}))" > /tmp/big.json
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/players \
  -H "Content-Type: application/json" -d @/tmp/big.json
kill %1
```

Expected: `413` response code.

---

## Task 10: Rate limiting

**Files:**
- Modify: `source/server/index.js`
- Modify: `source/package.json` (via npm install)

**Step 1: Install express-rate-limit**

```bash
cd source && npm install express-rate-limit
```

**Step 2: Add rate limiters to `source/server/index.js`**

Add import:

```js
import rateLimit from 'express-rate-limit';
```

Add limiters after the cors/body middleware, before routes:

```js
// General API limiter: 120 requests per minute per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Mutation limiter: 30 writes per minute per IP
const mutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use('/api', generalLimiter);
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return mutationLimiter(req, res, next);
  }
  next();
});
```

Place these lines **before** the `app.use('/api', stateRoutes)` block.

**Step 3: Verify rate limiting returns 429**

```bash
cd source && node server/index.js &
# Fire 35 quick POST requests to exceed the mutation limit
for i in $(seq 1 35); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/api/players \
    -H "Content-Type: application/json" -d '{}'
done | sort | uniq -c
kill %1
```

Expected: mostly `401` (auth required) but last few return `429`.

---

## Task 11: Avatar URL validation

**Why:** The `avatar` field in player creation and profile update routes accepts arbitrary strings including `javascript:` URIs and internal addresses.

**Files:**
- Modify: `source/server/routes/players.js`
- Modify: `source/server/routes/me.js`

**Step 1: Add validation helper to `source/server/routes/players.js`**

Add after the imports, before the router definition:

```js
function isValidAvatarUrl(url) {
  if (!url) return true; // empty is fine
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
```

**Step 2: Add validation to `POST /players` in `source/server/routes/players.js`**

Find where `avatar` is read from `req.body` (around line 17). Add this check right before the player object is constructed:

```js
if (req.body.avatar && !isValidAvatarUrl(req.body.avatar)) {
  return res.status(400).json({ error: 'Invalid avatar URL' });
}
```

**Step 3: Add same helper + checks to `source/server/routes/me.js`**

Add the same `isValidAvatarUrl` function after the imports.

In `POST /me/setup` (around line 63, where `avatar: req.body.avatar || req.user.picture || ''` is set):

```js
if (req.body.avatar && !isValidAvatarUrl(req.body.avatar)) {
  return res.status(400).json({ error: 'Invalid avatar URL' });
}
```

In `PUT /me/profile` (around line 146, where `updates.avatar = req.body.avatar`):

```js
if (req.body.avatar !== undefined) {
  if (!isValidAvatarUrl(req.body.avatar)) {
    return res.status(400).json({ error: 'Invalid avatar URL' });
  }
  updates.avatar = req.body.avatar;
}
```

(Replace the existing `if (req.body.avatar !== undefined) updates.avatar = req.body.avatar;` line.)

**Step 4: Write unit tests for the helper**

Create `source/utils/validation.test.ts`:

```ts
import { describe, it, expect } from '@jest/globals';

// Copy of the helper (to test in isolation — keep in sync with routes)
function isValidAvatarUrl(url: string): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

describe('isValidAvatarUrl', () => {
  it('accepts https URLs', () => expect(isValidAvatarUrl('https://example.com/avatar.png')).toBe(true));
  it('accepts http URLs', () => expect(isValidAvatarUrl('http://example.com/avatar.png')).toBe(true));
  it('rejects javascript: URIs', () => expect(isValidAvatarUrl('javascript:alert(1)')).toBe(false));
  it('rejects data: URIs', () => expect(isValidAvatarUrl('data:text/html,<h1>hi</h1>')).toBe(false));
  it('rejects plain strings', () => expect(isValidAvatarUrl('not-a-url')).toBe(false));
  it('accepts empty string', () => expect(isValidAvatarUrl('')).toBe(true));
});
```

**Step 5: Run the test**

```bash
cd source && npm test -- --testPathPattern=validation
```

Expected: 6 passing tests.

---

## Task 12: Dependency cleanup — lucide-react update + GCS guard

**Files:**
- Modify: `source/package.json` (via npm install)
- Modify: `source/server/db/persistence.js`

**Step 1: Update lucide-react**

```bash
cd source && npm install lucide-react@latest
```

**Step 2: Verify no broken imports**

```bash
cd source && npm run build 2>&1 | grep -i "lucide\|error\|Error"
```

Expected: build succeeds with no lucide-related errors. If any icon name changed, check the Lucide migration guide for the specific version diff and update the import.

**Step 3: Guard GCS instantiation in `source/server/db/persistence.js`**

The current code creates a `Storage()` client at module load time even in Supabase mode. Change it to only initialize when `GCS_BUCKET` is set (it already checks this, but the `Storage` import runs unconditionally).

Find this block at the top of `persistence.js`:

```js
import { Storage } from '@google-cloud/storage';
...
let bucket = null;
if (GCS_BUCKET) {
  const storage = new Storage();
  bucket = storage.bucket(GCS_BUCKET);
}
```

Replace with a lazy dynamic import:

```js
let bucket = null;
if (GCS_BUCKET) {
  const { Storage } = await import('@google-cloud/storage');
  const storage = new Storage();
  bucket = storage.bucket(GCS_BUCKET);
}
```

Since this is at module top-level in an ES module, wrap the lazy init in `loadDB` instead (which is already `async`). Move the bucket init inside `loadDB` before the GCS branch:

```js
// At top of file — remove the static import of Storage
// let bucket = null; stays as a module-level var

export const loadDB = async () => {
  // Lazy-init GCS bucket only when needed
  if (GCS_BUCKET && !bucket) {
    const { Storage } = await import('@google-cloud/storage');
    bucket = new Storage().bucket(GCS_BUCKET);
  }
  // ... rest of existing loadDB logic unchanged
```

Also move the same lazy init into `saveDB`:

```js
export const saveDB = async () => {
  try {
    const data = JSON.stringify(db, null, 2);
    if (bucket) {
      await bucket.file('db.json').save(data, { contentType: 'application/json', resumable: false });
    } else if (GCS_BUCKET) {
      // bucket not initialized yet — initialize now
      const { Storage } = await import('@google-cloud/storage');
      bucket = new Storage().bucket(GCS_BUCKET);
      await bucket.file('db.json').save(data, { contentType: 'application/json', resumable: false });
    } else {
      fs.writeFileSync(DB_FILE, data);
    }
  } catch (err) {
    console.error('❌ Error saving DB:', err);
  }
};
```

**Step 4: Verify server still starts in Supabase mode**

```bash
cd source && USE_SUPABASE=true node server/index.js
```

Expected: server starts with `📊 Using Supabase PostgreSQL database` and no `@google-cloud/storage` errors. Ctrl-C to stop.

---

## Final Verification

**Step 1: Full production build**

```bash
cd source && npm run build
```

Expected: clean build, `dist/` contains separate chunk files (`vendor-react-*.js`, `vendor-firebase-*.js`, etc.), CSS file is under 200 KB.

**Step 2: Confirm no `tsx` in production runtime**

```bash
cd source && grep "tsx" Dockerfile
```

Expected: `tsx` appears only in devDependencies, NOT in the Dockerfile CMD line.

**Step 3: Smoke-test full server**

```bash
cd source && node server/index.js &
curl -s -I http://localhost:8080/ | grep -iE "content-encoding|x-frame|x-content"
kill %1
```

Expected: `X-Frame-Options`, `X-Content-Type-Options` present; `Content-Encoding: gzip` on HTML response.
