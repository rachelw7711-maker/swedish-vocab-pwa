const CACHE_NAME = "ordbok-v98";
const ALLOWED_ICON_PATHS = new Set([
  "/icons/app-icon.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon.png",
  "/icons/favicon.ico",
  "/icons/pwa-192x192.png",
  "/icons/pwa-512x512.png",
  "/icons/maskable-icon.png",
  "/icons/enkel-symbol.png",
  "/icons/home-hero-illustration.png",
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
  "./icons/home-hero-illustration.png",
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
  const isSupabaseApi = url.pathname.startsWith("/rest/v1/") || url.pathname.startsWith("/auth/v1/");
  if (networkFirstAsset || isSupabaseApi) {
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

async function networkFirst(request, fallbackPath = null) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
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
  if (response.ok) await cache.put(request, response.clone());
  return response;
}
