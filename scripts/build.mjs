// Production build (2026-10-31): the legacy web app is retired — SpråkLab is the iOS
// app, and this deployment only hosts its API (/api/*, Vercel functions). dist/ gets
// a short notice page, the icons it uses, and a service worker that removes the old
// web app (and its cached word lists) from browsers that had installed it.
// The old build is kept as scripts/build-legacy-pwa.mjs for reference.
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const DIST = join(ROOT, "dist");

await rm(DIST, { recursive: true, force: true });
await mkdir(join(DIST, "icons"), { recursive: true });
for (const icon of ["favicon.ico", "favicon.png", "apple-touch-icon.png", "app-icon.png"]) {
  await copyFile(join(ROOT, "icons", icon), join(DIST, "icons", icon));
}

await writeFile(join(DIST, "index.html"), `<!doctype html>
<html lang="sv">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>SpråkLab</title>
  <link rel="icon" href="/icons/favicon.png">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #fafafa; color: #1c1c1e;
           font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; }
    main { max-width: 22rem; padding: 2rem 1.5rem; text-align: center; }
    img { width: 72px; height: 72px; border-radius: 16px; }
    h1 { font-size: 1.4rem; margin: 1rem 0 .5rem; }
    p { color: #6e6e73; margin: 0; }
  </style>
</head>
<body>
  <main>
    <img src="/icons/app-icon.png" alt="">
    <h1>SpråkLab</h1>
    <p>Webbversionen är avslutad. SpråkLab finns nu som app för iPhone.</p>
  </main>
  <script>
    // Remove the retired web app from browsers that installed it.
    if ("serviceWorker" in navigator) navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
    if (window.caches) caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  </script>
</body>
</html>
`);

// Replaces the old service worker: clears its caches, unregisters, reloads open tabs.
await writeFile(join(DIST, "sw.js"), `self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: "window" })) client.navigate(client.url);
  })());
});
`);

console.log(`Dist built at ${relative(ROOT, DIST)} (API host + notice page)`);
