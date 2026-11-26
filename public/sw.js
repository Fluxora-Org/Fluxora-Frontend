/* Fluxora service worker — minimal app-shell + offline fallback.
 *
 * Strategy
 * --------
 * - Precache a small, hand-maintained shell (index.html, offline.html,
 *   manifest, icons). Hashed Vite assets are picked up lazily by the
 *   runtime cache below — avoids maintaining a build-time manifest for
 *   this first increment (follow-up tracked in #2045).
 * - Navigations: network-first, fall back to cached /index.html when the
 *   network fails, then to /offline.html if we have no shell cached.
 * - Hashed /assets/ requests: cache-first (safe because Vite fingerprints
 *   them; a new build changes the URL, so stale copies are never served
 *   for new code).
 * - Everything else (API, Soroban RPC, cross-origin): pass straight
 *   through. No interception.
 *
 * Update flow
 * -----------
 * - A new worker version bumps CACHE_VERSION, which gives it a new cache
 *   name. On `activate` we delete any cache not in the current set, so
 *   old shells never linger. The client is prompted to reload via the
 *   `waiting -> SKIP_WAITING` message handshake in registerServiceWorker.
 */

const CACHE_VERSION = 'v1';
const SHELL_CACHE = `fluxora-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `fluxora-runtime-${CACHE_VERSION}`;

const SHELL_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/src/public/Icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  // Allow the page to activate a waiting worker on the user's "Reload" tap.
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isSameOrigin(url) {
  try {
    return new URL(url).origin === self.location.origin;
  } catch {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET; never touch cross-origin (wallet, Soroban, analytics).
  if (req.method !== 'GET' || !isSameOrigin(req.url)) return;

  const url = new URL(req.url);

  // Never cache API responses (future-proof: no /api/ today, but keep the guard).
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: network-first, fall back to the cached shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy));
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(SHELL_CACHE);
          return (
            (await cache.match('/index.html')) ||
            (await cache.match('/offline.html')) ||
            new Response('Offline', { status: 503, statusText: 'Offline' })
          );
        }),
    );
    return;
  }

  // Hashed assets: cache-first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
  }
});
