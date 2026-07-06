import { copyFile, mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

const ROOT = process.cwd();
const DIST = join(ROOT, "dist");

const checks = [
  {
    file: "manifest.webmanifest",
    mustInclude: [
      '"start_url": "/"',
      '"name": "Åka"',
      '"short_name": "Åka"',
      '"/icons/pwa-192x192.png?v=22"',
      '"/icons/pwa-512x512.png?v=22"',
      '"/icons/maskable-icon.png?v=22"',
      '"/icons/app-icon.png?v=22"',
      '"sizes": "192x192"',
      '"sizes": "512x512"',
      '"sizes": "1024x1024"',
      '"purpose": "maskable"',
    ],
    mustNotMatch: [
      [/aka-(edgecut|spec|clean|bleed|refresh|sharp|ultraclean|noglow)\.png/, "legacy A/B test icon"],
      [/icon\.svg/, "legacy SVG icon"],
      [/final-\d{4}\.png/, "legacy dated final icon"],
      [/v[1-4]\.png/, "legacy versioned icon"],
    ],
  },
  {
    file: "index.html",
    mustInclude: [
      "<title>Åka</title>",
      'name="apple-mobile-web-app-title" content="Åka"',
      'href="/manifest.webmanifest?v=22"',
      'href="/icons/favicon.png?v=22"',
      'href="/icons/favicon.ico?v=22"',
      'href="/icons/apple-touch-icon.png?v=22"',
      'src="/icons/app-icon.png?v=22"',
      'src="/app.js?v=111"',
      'rel="shortcut icon"',
      'rel="apple-touch-icon"',
      'type="image/png"',
    ],
    mustNotMatch: [
      [/aka-(edgecut|spec|clean|bleed|refresh|sharp|ultraclean|noglow)\.png/, "legacy A/B test icon"],
      [/icon\.svg/, "legacy SVG icon"],
      [/final-\d{4}\.png/, "legacy dated final icon"],
      [/v[1-4]\.png/, "legacy versioned icon"],
    ],
  },
  {
    file: "sw.js",
    mustInclude: [
      'const CACHE_NAME = "ordbok-v38";',
      '"./node_modules/@supabase/supabase-js/dist/umd/supabase.js"',
      '"./icons/app-icon.png"',
      '"./icons/apple-touch-icon.png"',
      '"./icons/favicon.png"',
      '"./icons/favicon.ico"',
      '"./icons/pwa-192x192.png"',
      '"./icons/pwa-512x512.png"',
      '"./icons/maskable-icon.png"',
      '"./src/lib/db.js"',
      '"./src/lib/supabase.js"',
      '"./src/lib/supabase.ts"',
      '"./src/lib/shadowing-store.js"',
      '"./src/data/shadowingItems.json"',
      "cleanupIconAndManifestCache",
    ],
    mustNotMatch: [
      [/aka-(edgecut|spec|clean|bleed|refresh|sharp|ultraclean|noglow)\.png/, "legacy A/B test icon"],
      [/icon\.svg/, "legacy SVG icon"],
      [/swedish-vocab-pwa-v\d+/, "legacy cache name"],
      [/v[1-4]\.png/, "legacy versioned icon"],
      [/final-\d{4}\.png/, "legacy dated final icon"],
    ],
  },
];

for (const check of checks) {
  const text = await readFile(join(ROOT, check.file), "utf8");
  for (const expected of check.mustInclude) {
    if (!text.includes(expected)) {
      throw new Error(`${check.file} is missing required reference: ${expected}`);
    }
  }
  for (const [pattern, label] of check.mustNotMatch || []) {
    if (pattern.test(text)) {
      throw new Error(`${check.file} still references old icon asset: ${label}`);
    }
  }
}

for (const file of [
  "public/icons/app-icon.png",
  "public/icons/apple-touch-icon.png",
  "public/icons/favicon.png",
  "public/icons/favicon.ico",
  "public/icons/pwa-192x192.png",
  "public/icons/pwa-512x512.png",
  "public/icons/maskable-icon.png",
  "icons/app-icon.png",
  "icons/apple-touch-icon.png",
  "icons/favicon.png",
  "icons/favicon.ico",
  "icons/pwa-192x192.png",
  "icons/pwa-512x512.png",
  "icons/maskable-icon.png",
]) {
  await stat(join(ROOT, file));
}

await buildDist();
console.log("Build validation complete.");
console.log(`Dist built at ${relative(ROOT, DIST)}`);

async function buildDist() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  const filesToCopy = [
    "index.html",
    "styles.css",
    "app.js",
    "manifest.webmanifest",
    "sw.js",
  ];
  for (const file of filesToCopy) {
    await copyPath(join(ROOT, file), join(DIST, file));
  }

  await copyPath(join(ROOT, "src"), join(DIST, "src"));
  await copyPath(
    join(ROOT, "node_modules/@supabase/supabase-js/dist/umd/supabase.js"),
    join(DIST, "node_modules/@supabase/supabase-js/dist/umd/supabase.js"),
  );
  await copyPath(join(ROOT, "audio"), join(DIST, "audio"));
  await copyPath(join(ROOT, "icons"), join(DIST, "icons"));
  await removeLegacyPwaIcons();
}

async function removeLegacyPwaIcons() {
  const iconsDir = join(DIST, "icons");
  const entries = await readdir(iconsDir, { withFileTypes: true });
  const allowed = new Set([
    "app-icon.png",
    "apple-touch-icon.png",
    "favicon.png",
    "favicon.ico",
    "pwa-192x192.png",
    "pwa-512x512.png",
    "maskable-icon.png",
    "enkel-symbol.png",
    "home-hero-illustration.png",
  ]);
  for (const entry of entries) {
    const looksLikeIcon = /^(app-icon|apple-touch-icon|favicon|maskable|pwa|icon)(?:[-.].*)?\.(png|ico|svg)$/i.test(entry.name);
    if (entry.isFile() && looksLikeIcon && !allowed.has(entry.name)) {
      await rm(join(iconsDir, entry.name), { force: true });
    }
  }
}

async function copyPath(source, target) {
  const sourceStat = await stat(source);
  if (sourceStat.isDirectory()) {
    await mkdir(target, { recursive: true });
    const entries = await readdir(source, { withFileTypes: true });
    for (const entry of entries) {
      await copyPath(join(source, entry.name), join(target, entry.name));
    }
    return;
  }
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
}
