// Cyber-Pong Arcade League — Service Worker
// Provides offline support via caching strategies and an IndexedDB mutation queue.

const STATIC_CACHE = 'cyberpong-static-v1';
const API_CACHE = 'cyberpong-api-v1';
const EXPECTED_CACHES = [STATIC_CACHE, API_CACHE];

// Maximum age for cached API responses (1 hour)
const API_MAX_AGE_MS = 60 * 60 * 1000;

// Assets to pre-cache on install
const SHELL_ASSETS = [
  '/',
  '/index.html',
];

// ---------- IndexedDB helpers for offline mutation queue ----------

const DB_NAME = 'cyberpong-offline';
const DB_VERSION = 1;
const STORE_NAME = 'queue';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function enqueue(request) {
  const body = await request.clone().text();
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    url: request.url,
    method: request.method,
    body,
    headers: Object.fromEntries(request.headers.entries()),
    timestamp: new Date().toISOString(),
  };
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(entry);
    tx.oncomplete = () => {
      console.log('[SW] Queued offline mutation:', entry.url);
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllQueued() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function removeQueued(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function replayQueue() {
  const items = await getAllQueued();
  if (items.length === 0) return;
  console.log(`[SW] Replaying ${items.length} queued mutations...`);

  let success = 0;
  let failed = 0;

  // Sort oldest first
  items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  for (const item of items) {
    try {
      const resp = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body || undefined,
      });
      if (resp.ok) {
        await removeQueued(item.id);
        success++;
        console.log('[SW] Replayed:', item.url);
      } else {
        failed++;
        console.warn('[SW] Replay failed (server):', item.url, resp.status);
      }
    } catch (err) {
      failed++;
      console.warn('[SW] Replay failed (network):', item.url, err);
    }
  }

  console.log(`[SW] Replay complete: ${success} success, ${failed} failed`);
}

// ---------- Install ----------

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching shell assets');
      return cache.addAll(SHELL_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// ---------- Activate ----------

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !EXPECTED_CACHES.includes(name))
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Claim all clients immediately
  self.clients.claim();
});

// ---------- Fetch ----------

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // --- API mutations (POST, PUT, DELETE to /api/*) ---
  if (url.pathname.startsWith('/api/') && request.method !== 'GET') {
    event.respondWith(handleApiMutation(request));
    return;
  }

  // --- API GET calls (/api/state) — Network-first with cache fallback ---
  if (url.pathname.startsWith('/api/') && request.method === 'GET') {
    event.respondWith(handleApiGet(request));
    return;
  }

  // --- Static assets (JS, CSS, fonts, images) — Cache-first ---
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // --- Navigation requests — Network-first, fallback to cached index.html (SPA) ---
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }
});

function isStaticAsset(pathname) {
  return /\.(js|css|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|webp|ico|webmanifest)(\?.*)?$/i.test(pathname);
}

async function handleStaticAsset(request) {
  const cached = await caches.match(request);
  if (cached) {
    console.log('[SW] Cache hit (static):', request.url);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
      console.log('[SW] Cached (static):', request.url);
    }
    return response;
  } catch (err) {
    console.warn('[SW] Static fetch failed:', request.url, err);
    // Return a basic offline response
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function handleApiGet(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      // Store with a timestamp header so we can check freshness
      const headers = new Headers(response.headers);
      headers.set('sw-cached-at', Date.now().toString());
      const timestampedResponse = new Response(await response.clone().blob(), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
      cache.put(request, timestampedResponse);
      console.log('[SW] Cached (API):', request.url);
    }
    return response;
  } catch (err) {
    console.warn('[SW] API fetch failed, trying cache:', request.url);
    const cached = await caches.match(request);
    if (cached) {
      // Check cache age
      const cachedAt = parseInt(cached.headers.get('sw-cached-at') || '0', 10);
      const age = Date.now() - cachedAt;
      if (age < API_MAX_AGE_MS) {
        console.log('[SW] Cache hit (API, stale):', request.url, `${Math.round(age / 1000)}s old`);
        return cached;
      }
      console.log('[SW] Cache expired (API):', request.url);
    }
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleApiMutation(request) {
  try {
    const response = await fetch(request.clone());
    return response;
  } catch (err) {
    console.warn('[SW] Mutation failed, queuing for later:', request.url);
    await enqueue(request);

    // Register for background sync if available
    if (self.registration.sync) {
      try {
        await self.registration.sync.register('replay-queue');
      } catch (syncErr) {
        console.warn('[SW] Background sync registration failed:', syncErr);
      }
    }

    return new Response(
      JSON.stringify({ queued: true, message: 'Request queued for when you are back online' }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    // Cache the navigation response as our latest index.html
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(new Request('/'), response.clone());
    }
    return response;
  } catch (err) {
    console.warn('[SW] Navigation failed, falling back to cached index.html');
    const cached = await caches.match('/');
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// ---------- Background Sync ----------

self.addEventListener('sync', (event) => {
  if (event.tag === 'replay-queue') {
    console.log('[SW] Background sync triggered: replaying queue');
    event.waitUntil(replayQueue());
  }
});

// Listen for online messages from clients
self.addEventListener('message', (event) => {
  if (event.data === 'replay-queue') {
    console.log('[SW] Client requested queue replay');
    event.waitUntil(replayQueue());
  }
});
