/* Home Manager service worker.
 *
 * Strategy:
 *   - Navigation requests: network-first, fall back to cached app shell when offline.
 *   - Same-origin GET assets (vite emits hash-versioned filenames): cache-first.
 *   - Cross-origin / non-GET (e.g. Apps Script POSTs): pass through, never intercept.
 *
 * Because vite hashes asset filenames, redeploys produce new URLs and the
 * cache fills with the new bundle on first fetch. We never need to bump a
 * CACHE_VERSION manually.
 */

const SHELL_CACHE = 'home-manager-shell-v1';
const RUNTIME_CACHE = 'home-manager-runtime-v1';
const SCOPE_PATH = new URL(self.registration.scope).pathname;

const SHELL_URLS = [
  SCOPE_PATH,
  SCOPE_PATH + 'manifest.webmanifest',
  SCOPE_PATH + 'icon.svg',
  SCOPE_PATH + 'icon-192.png',
  SCOPE_PATH + 'icon-512.png',
  SCOPE_PATH + 'apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Best-effort: don't fail the install if one shell URL 404s during dev.
      await Promise.all(
        SHELL_URLS.map((url) =>
          cache.add(url).catch((err) => console.warn('[sw] skip', url, err)),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, RUNTIME_CACHE]);
      const names = await caches.keys();
      await Promise.all(names.filter((n) => !keep.has(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(SCOPE_PATH)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function networkFirstNavigation(request) {
  try {
    const fresh = await fetch(request);
    // Only cache successful shell responses — never poison the offline shell
    // with a 4xx/5xx (e.g. a stale GitHub Pages 404 page).
    if (fresh.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(SCOPE_PATH, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch {
    const cached = await caches.match(SCOPE_PATH);
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}
