import "dotenv/config";
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
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
      'src="/app.js?v=119"',
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
      'const CACHE_NAME = "ordbok-v48";',
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
    "vocab-data.js",
    "document-vocab-data.js",
    "manifest.webmanifest",
    "sw.js",
  ];
  for (const file of filesToCopy) {
    await copyPath(join(ROOT, file), join(DIST, file));
  }

  await copyPath(join(ROOT, "src"), join(DIST, "src"));
  await injectSupabaseBrowserConfig();
  await copyPath(
    join(ROOT, "node_modules/@supabase/supabase-js/dist/umd/supabase.js"),
    join(DIST, "node_modules/@supabase/supabase-js/dist/umd/supabase.js"),
  );
  await copyPath(join(ROOT, "audio"), join(DIST, "audio"));
  await copyPath(join(ROOT, "icons"), join(DIST, "icons"));
  await copyPath(join(ROOT, ".openai"), join(DIST, ".openai"));
  await writeSitesServerEntry();
  await removeUnsupportedServerAssets(join(DIST, "server"));
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

async function writeSitesServerEntry() {
  const source = await readFile(join(ROOT, "server.mjs"), "utf8");
  const productionServer = source
    .replace(/^import ['"]dotenv\/config['"];?\n/, "")
    .replace('import { createClient } from "@supabase/supabase-js";\n', supabaseRestClientShim());
  await mkdir(join(DIST, "server"), { recursive: true });
  await writeFile(join(DIST, "server/index.js"), productionServer);
}

function supabaseRestClientShim() {
  return `function createClient(url, key, options = {}) {
  const authHeader = options?.global?.headers?.Authorization || \`Bearer \${key}\`;
  const baseHeaders = {
    apikey: key,
    Authorization: authHeader,
  };
  const requestJson = async (path, init = {}) => {
    const response = await fetch(\`\${url}\${path}\`, {
      ...init,
      headers: {
        ...baseHeaders,
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...(init.headers || {}),
      },
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) return { data: null, error: data || { message: response.statusText } };
    return { data, error: null };
  };
  const executeBuilder = async (builder) => {
    const params = new URLSearchParams();
    if (builder.selectColumns) params.set("select", builder.selectColumns);
    builder.filters.forEach(([column, value]) => params.append(column, \`eq.\${value}\`));
    if (builder.orderBy) params.set("order", \`\${builder.orderBy.column}.\${builder.orderBy.ascending ? "asc" : "desc"}\`);
    const headers = {};
    if (builder.rangeBounds) {
      headers["range-unit"] = "items";
      headers.range = \`\${builder.rangeBounds.from}-\${builder.rangeBounds.to}\`;
    }
    if (builder.method !== "GET") headers.prefer = builder.returnSingle || builder.selectColumns ? "return=representation" : "return=minimal";
    if (builder.returnSingle) headers.accept = "application/vnd.pgrst.object+json";
    const query = params.toString();
    const result = await requestJson(\`/rest/v1/\${builder.table}\${query ? \`?\${query}\` : ""}\`, {
      method: builder.method,
      headers,
      body: builder.body ? JSON.stringify(builder.body) : undefined,
    });
    if (builder.returnSingle && Array.isArray(result.data)) result.data = result.data[0] || null;
    return result;
  };
  const from = (table) => {
    const builder = {
      table,
      method: "GET",
      body: null,
      filters: [],
      selectColumns: "*",
      orderBy: null,
      rangeBounds: null,
      returnSingle: false,
      select(columns = "*") {
        this.selectColumns = columns;
        return this;
      },
      update(payload) {
        this.method = "PATCH";
        this.body = payload;
        return this;
      },
      eq(column, value) {
        this.filters.push([column, value]);
        return this;
      },
      order(column, options = {}) {
        this.orderBy = { column, ascending: options.ascending !== false };
        return this;
      },
      range(from, to) {
        this.rangeBounds = { from, to };
        return this;
      },
      single() {
        this.returnSingle = true;
        return this;
      },
      then(resolve, reject) {
        return executeBuilder(this).then(resolve, reject);
      },
    };
    return builder;
  };
  return {
    auth: {
      getUser: (token) => requestJson("/auth/v1/user", {
        headers: { Authorization: \`Bearer \${token}\` },
      }),
    },
    from,
    storage: {
      from(bucket) {
        return {
          async upload(path, body, options = {}) {
            const response = await fetch(\`\${url}/storage/v1/object/\${bucket}/\${path}\`, {
              method: "POST",
              headers: {
                ...baseHeaders,
                "content-type": options.contentType || "application/octet-stream",
                "x-upsert": options.upsert ? "true" : "false",
              },
              body,
            });
            const text = await response.text();
            const data = text ? JSON.parse(text) : null;
            if (!response.ok) return { data: null, error: data || { message: response.statusText } };
            return { data, error: null };
          },
        };
      },
    },
  };
}
`;
}

async function removeUnsupportedServerAssets(root) {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      await removeUnsupportedServerAssets(fullPath);
    } else if (/\.(ico|png|jpg|jpeg|gif|svg)$/i.test(entry.name)) {
      await rm(fullPath, { force: true });
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
