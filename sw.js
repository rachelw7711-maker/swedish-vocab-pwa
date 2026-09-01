const CACHE_NAME = "ordbok-v134";
const ALLOWED_ICON_PATHS = new Set([
  "/icons/app-icon.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon.png",
  "/icons/favicon.ico",
  "/icons/pwa-192x192.png",
  "/icons/pwa-512x512.png",
  "/icons/maskable-icon.png",
  "/icons/enkel-symbol.png",
]);

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./node_modules/@supabase/supabase-js/dist/umd/supabase.js",
  "./src/lib/db.js",
  "./src/lib/supabase.js",
  "./src/lib/supabase.ts",
  "./src/lib/sync-outbox.js",
  "./src/lib/shadowing-store.js",
  "./src/data/shadowingItems.json",
  "./manifest.webmanifest",
  "./icons/app-icon.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon.png",
  "./icons/favicon.ico",
  "./icons/pwa-192x192.png",
  "./icons/pwa-512x512.png",
  "./icons/maskable-icon.png",
  "./icons/enkel-symbol.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => caches.open(CACHE_NAME))
      .then(cleanupIconAndManifestCache)
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, "./index.html"));
    return;
  }
  const url = new URL(event.request.url);
  const networkFirstAsset =
    event.request.destination === "style" ||
    event.request.destination === "script" ||
    event.request.destination === "manifest" ||
    url.pathname.endsWith("/styles.css") ||
    url.pathname.endsWith("/app.js") ||
    url.pathname.endsWith("/manifest.webmanifest");
  // 2026-07-30 fix: Supabase REST/Auth calls (cross-origin) were falling
  // through to cacheFirst like a static asset, so once a query URL (e.g.
  // "all of this user's reading_items") was cached, later real changes to
  // that same data (a new highlight/note, anything) stayed invisible on
  // reload until the next deploy's cache-name bump wiped it — found while
  // verifying sentence highlights/notes didn't survive a reload. API data
  // should prefer live network and only fall back to cache when actually
  // offline, same as networkFirst already does for the app shell.
  // 2026-08-07 fix: /storage/v1/ (Shadowing's standard-audio signed URLs)
  // had the same gap and a worse failure mode — cacheFirst calls
  // cache.put() on every ok response, but the browser's <audio> element
  // requests these with a Range header, so the server answers 206 Partial
  // Content, and the Cache API throws on cache.put() with a 206 response
  // ("Partial response (status code 206) is unsupported"). That throw
  // breaks the fetch event's respondWith() promise, which left the
  // audio element's request stuck at "stalled" forever — silent, no
  // error event, no console output (the throw happens inside the SW's own
  // execution context) — this is what made Läsning-to-Shadowing audio look
  // like it "played" (button showed Spelar) while producing no sound.
  // Signed URLs are also single-use/expiring, so caching them was never
  // useful to begin with.
  const isSupabaseApi =
    url.pathname.startsWith("/rest/v1/") || url.pathname.startsWith("/auth/v1/") || url.pathname.startsWith("/storage/v1/");
  // 2026-08-29 fix (SprakLab-Audit-Report.md §4.4): the two fixes above
  // only covered Supabase's own domain — this app's own same-origin
  // GET /api/words (src/lib/db.js's loadWordsThroughServerFallback, used
  // when the anon key hits a permission error) fell through to cacheFirst
  // like a static asset, same staleness risk as the original bug: if that
  // fallback ever fires, its stale response would then be served from
  // cache indefinitely, even after the underlying permission issue is
  // fixed, until the next deploy's cache-name bump.
  const isOwnApi = url.pathname.startsWith("/api/");
  if (networkFirstAsset || isSupabaseApi || isOwnApi) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  event.respondWith(cacheFirst(event.request));
});

async function cleanupIconAndManifestCache(cache) {
  const requests = await cache.keys();
  await Promise.all(
    requests.map((request) => {
      const url = new URL(request.url);
      const isExtraIcon = url.pathname.startsWith("/icons/") && !ALLOWED_ICON_PATHS.has(url.pathname);
      const isVersionedManifest = url.pathname.endsWith("/manifest.webmanifest") && url.search;
      return isExtraIcon || isVersionedManifest ? cache.delete(request) : Promise.resolve(false);
    }),
  );
}

// 2026-08-07: the Cache API throws on cache.put() for a 206 Partial
// Content response ("Partial response (status code 206) is unsupported").
// Range-header requests (exactly what an <audio>/<video> element issues)
// get 206 answers from a server that supports ranges, so an unconditional
// `response.ok` check (206 is in the 200-299 "ok" range) let that throw
// reach callers — inside networkFirst it re-threw as "no cache entry
// exists" after the failed put, and inside cacheFirst it broke the fetch
// event's respondWith() promise outright, leaving the request stuck at
// "stalled" forever with no error surfaced anywhere.
function isCacheableResponse(response) {
  return response.ok && response.status !== 206;
}

async function networkFirst(request, fallbackPath = null) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackPath) return cache.match(fallbackPath);
    throw new Error("Network request failed and no cache entry exists.");
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheableResponse(response)) await cache.put(request, response.clone());
  return response;
}
