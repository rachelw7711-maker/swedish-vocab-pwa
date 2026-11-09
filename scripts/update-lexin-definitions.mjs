// Updates only the Lexin svenska rows of public.reference_entries whose entry changed in a rebuilt
// index (2026-11-09: a sense's own definition instead of its idiom's), in place by row id, so the
// table is never empty while the server reads it. Writes the old rows first; --apply to write.
//
//   node --env-file=.env scripts/update-lexin-definitions.mjs [--apply]
//   node --env-file=.env scripts/update-lexin-definitions.mjs --restore <backup.json>   (rollback)
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { LEXIN_SV_SOURCE_ID } from "../server-references.mjs";
import { ordered } from "./page-order.mjs";

const apply = process.argv.includes("--apply");
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const restore = process.argv.indexOf("--restore");
if (restore > 0) {
  const backup = JSON.parse(readFileSync(process.argv[restore + 1], "utf8"));
  for (const { id, data } of backup) { const { error } = await db.from("reference_entries").update({ data }).eq("id", id); if (error) throw error; }
  console.log({ restored: backup.length });
  process.exit(0);
}
const sv = JSON.parse(readFileSync("data/reference/lexin-sv/index.json", "utf8"));
// jsonb keeps its own key order: compare with keys sorted.
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x));
const strip = (e) => ({ ...e, lexemes: e.lexemes.map(({ definition, ...x }) => x) });
const variants = (e) => e.lexemes.map((x) => x.variant).join(",");

const rows = [];
for (let i = 0; ; i += 1000) {
  const { data, error } = await ordered(db.from("reference_entries").select("id, headword, pos, data").eq("source", LEXIN_SV_SOURCE_ID), "reference_entries").range(i, i + 999);
  if (error) throw error;
  rows.push(...data);
  if (data.length < 1000) break;
}
const changes = [], unmatched = [];
for (const r of rows) {
  // The same entry: everything but the definitions alike (homographs of one pos can share empty variant ids).
  const next = (sv[r.headword] || []).find((e) => e.pos === r.pos && variants(e) === variants(r.data) && canon(strip(e)) === canon(strip(r.data)));
  if (!next) { unmatched.push(r.id); continue; }
  if (canon(next) !== canon(r.data)) changes.push({ id: r.id, headword: r.headword, old: r.data, next });
}
const dir = "data/reports/round-f";
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/lexin-definitions-backup-2026-11-09.json`, JSON.stringify(changes.map(({ id, old }) => ({ id, data: old }))));
console.log({ rows: rows.length, changed: changes.length, unmatched: unmatched.length, sample: changes.slice(0, 3).map((c) => c.headword) });
if (!apply) process.exit(0);
let done = 0;
for (const c of changes) {
  const { error } = await db.from("reference_entries").update({ data: c.next }).eq("id", c.id);
  if (error) throw error;
  done++;
}
// Read back.
let ok = 0;
for (let i = 0; i < changes.length; i += 200) {
  const { data, error } = await db.from("reference_entries").select("id, data").in("id", changes.slice(i, i + 200).map((c) => c.id));
  if (error) throw error;
  for (const d of data) if (canon(d.data) === canon(changes.find((c) => c.id === d.id).next)) ok++;
}
console.log({ updated: done, readBackMatches: ok });
