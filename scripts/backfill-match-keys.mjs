// Normalised match keys for existing fixed phrases and expressions (2026-10-31),
// plus a report of rows that now share a key — candidates for review, never
// merged automatically (ids carry learning records).
//
//   node --env-file=.env scripts/backfill-match-keys.mjs [--backup <dir>] [--sql <file>] [--apply]
import { createClient } from "@supabase/supabase-js";
import { gunzipSync } from "node:zlib";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { useSaldoFiles } from "../server-lexicon.mjs";
import { expressionMatchKey } from "../server-resources.mjs";

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
await useSaldoFiles();

let rows;
if (opt("--backup")) rows = JSON.parse(gunzipSync(readFileSync(`${opt("--backup")}/learning_objects.json.gz`)));
else {
  rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("learning_objects").select("id, swedish, object_type, status, category").in("object_type", ["phrase", "expression"]).order("id").range(from, from + 999);
    if (error) throw error;
    rows = rows.concat(data);
    if (data.length < 1000) break;
  }
}
rows = rows.filter((r) => (r.object_type === "phrase" || r.object_type === "expression") && r.status !== "retired");
const keyed = [];
for (const r of rows) keyed.push({ ...r, match_key: await expressionMatchKey(null, r.swedish) });
const groups = {};
keyed.forEach((r) => (groups[r.match_key] ??= []).push(r));
const duplicates = Object.entries(groups).filter(([, g]) => g.length > 1)
  .map(([key, g]) => ({ key, crossModule: new Set(g.map((r) => r.object_type)).size > 1, rows: g.map((r) => ({ id: r.id, swedish: r.swedish, object_type: r.object_type, category: r.category, status: r.status })) }));
mkdirSync("data/reports", { recursive: true });
writeFileSync("data/reports/expression-duplicates.json", JSON.stringify({ rows: keyed.length, changedKeys: keyed.filter((r) => r.match_key !== r.swedish.toLowerCase().trim()).length, duplicates }, null, 1));
console.log(JSON.stringify({ rows: keyed.length, duplicateGroups: duplicates.length, crossModule: duplicates.filter((d) => d.crossModule).length }));

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
if (opt("--sql")) {
  writeFileSync(opt("--sql"), `begin;\nupdate public.learning_objects o set match_key = v.k from (values\n  ${keyed.map((r) => `(${q(r.id)}::uuid, ${q(r.match_key)})`).join(",\n  ")}\n) v(id, k) where o.id = v.id;\ncommit;\n`);
}
if (args.includes("--apply")) {
  for (const r of keyed) {
    const { error } = await db.from("learning_objects").update({ match_key: r.match_key }).eq("id", r.id);
    if (error) throw error;
  }
  console.log("applied");
}
