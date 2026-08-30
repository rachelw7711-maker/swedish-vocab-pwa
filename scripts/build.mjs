import "dotenv/config";
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

const ROOT = process.cwd();
const DIST = join(ROOT, "dist");
const CLIENT = join(DIST, "client");

const checks = [
  {
    file: "manifest.webmanifest",
    mustInclude: [
      '"start_url": "/"',
      '"name": "SpråkLab"',
      '"short_name": "SpråkLab"',
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
      "<title>SpråkLab</title>",
      'name="apple-mobile-web-app-title" content="SpråkLab"',
      'href="/manifest.webmanifest?v=25"',
      'href="/icons/favicon.png?v=22"',
      'href="/icons/favicon.ico?v=22"',
      'href="/icons/apple-touch-icon.png?v=22"',
      'src="/icons/app-icon.png?v=22"',
      'src="/app.js?v=193"',
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
      'const CACHE_NAME = "ordbok-v123";',
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
      '"./src/lib/sync-outbox.js"',
      '"./src/lib/feedback.js"',
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
  await mkdir(CLIENT, { recursive: true });

  const filesToCopy = [
    "index.html",
    "styles.css",
    "app.js",
    "vocab-data.js",
    "document-vocab-data.js",
    "manifest.webmanifest",
    "sw.js",
  ];
  for (const file of filesToCopy) {
    await copyPath(join(ROOT, file), join(DIST, file));
    await copyPath(join(ROOT, file), join(CLIENT, file));
  }

  await copyPath(join(ROOT, "src"), join(DIST, "src"));
  await copyPath(join(ROOT, "src"), join(CLIENT, "src"));
  await injectSupabaseBrowserConfig();
  await copyPath(
    join(ROOT, "node_modules/@supabase/supabase-js/dist/umd/supabase.js"),
    join(DIST, "node_modules/@supabase/supabase-js/dist/umd/supabase.js"),
  );
  await copyPath(
    join(ROOT, "node_modules/@supabase/supabase-js/dist/umd/supabase.js"),
    join(CLIENT, "node_modules/@supabase/supabase-js/dist/umd/supabase.js"),
  );
  await copyPath(join(ROOT, "audio"), join(DIST, "audio"));
  await copyPath(join(ROOT, "audio"), join(CLIENT, "audio"));
  await copyPath(join(ROOT, "icons"), join(DIST, "icons"));
  await copyPath(join(ROOT, "icons"), join(CLIENT, "icons"));
  await removeLegacyPwaIcons();
}

async function injectSupabaseBrowserConfig() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://ppdackgoghffpgcmvjgr.supabase.co";
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_GEmmm6tacHIbrTtAo4PwjA_fucB7hlL";
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY for browser config injection.");
  }
  const target = join(DIST, "src/lib/supabase.js");
  const source = await readFile(target, "utf8");
  const next = source.replace(
    "const env = import.meta.env || {};",
    `const env = ${JSON.stringify({ VITE_SUPABASE_URL: supabaseUrl, VITE_SUPABASE_ANON_KEY: supabaseAnonKey })};`,
  );
  await writeFile(target, next);
  await writeFile(join(CLIENT, "src/lib/supabase.js"), next);
}

async function removeLegacyPwaIcons() {
  for (const iconsDir of [join(DIST, "icons"), join(CLIENT, "icons")]) {
    const entries = await readdir(iconsDir, { withFileTypes: true });
    await removeLegacyIconsFromDir(iconsDir, entries);
  }
}

async function removeLegacyIconsFromDir(iconsDir, entries) {
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
