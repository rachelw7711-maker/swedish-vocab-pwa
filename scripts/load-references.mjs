// Loads Lexin svenska and Lexin swe–eng (scripts/build-reference-index.mjs output) into
// public.reference_entries (2026-11-03), with each idiom as an extra row under its expression
// match key. Replaces those sources' rows; needs migration 20261103120000.
//
//   node --env-file=.env scripts/load-references.mjs [dir=data/reference]
//   node --env-file=.env scripts/load-references.mjs --folkets [dir]   # only Folkets lexikon (round G):
//     auxiliary evidence, its rows replaced; no idiom rows, so it never makes an expression "listed".
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { useSaldoFiles } from "../server-lexicon.mjs";
import { expressionMatchKey } from "../server-resources.mjs";
import { LEXIN_SV_SOURCE_ID, LEXIN_EN_SOURCE_ID, FOLKETS_SOURCE_ID, idiomSpellings } from "../server-references.mjs";

const FOLKETS = process.argv.includes("--folkets");
const dir = process.argv.slice(2).find((a) => !a.startsWith("--")) || "data/reference";
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
await useSaldoFiles(`${dir}/saldo`);   // match keys put an idiom's verb in the infinitive

const rows = [];
const idiomRows = async (source, headword, idiom, extra) => {
  for (const spelling of idiomSpellings(idiom)) {
    rows.push({ source: `${source}:idiom`, headword: await expressionMatchKey(null, spelling), pos: "", data: { headword, idiom, ...extra } });
  }
};
if (FOLKETS) {
  const folkets = JSON.parse(readFileSync(`${dir}/folkets/index.json`, "utf8"));
  const meta = JSON.parse(readFileSync(`${dir}/folkets/meta.json`, "utf8"));
  const out = [];
  for (const [headword, list] of Object.entries(folkets)) for (const e of list) out.push({ source: FOLKETS_SOURCE_ID, headword, pos: e.pos || "", data: { ...e, licence: meta.licence, sha256: meta.sha256 } });
  const { error } = await db.from("reference_entries").delete().eq("source", FOLKETS_SOURCE_ID);
  if (error) throw error;
  for (let i = 0; i < out.length; i += 1000) {
    const { error: e } = await db.from("reference_entries").insert(out.slice(i, i + 1000));
    if (e) throw e;
  }
  console.log({ source: FOLKETS_SOURCE_ID, rows: out.length });
  process.exit(0);
}
const sv = JSON.parse(readFileSync(`${dir}/lexin-sv/index.json`, "utf8"));
for (const [headword, list] of Object.entries(sv)) for (const e of list) {
  rows.push({ source: LEXIN_SV_SOURCE_ID, headword, pos: e.pos, data: e });
  for (const x of e.lexemes) for (const [idiom, definition] of x.idioms) await idiomRows(LEXIN_SV_SOURCE_ID, headword, idiom, { definition });
}
const en = JSON.parse(readFileSync(`${dir}/lexin/index.json`, "utf8"));
for (const [headword, list] of Object.entries(en)) for (const e of list) {
  rows.push({ source: LEXIN_EN_SOURCE_ID, headword, pos: e.pos, data: e });
  for (const [idiom, english] of e.idioms) await idiomRows(LEXIN_EN_SOURCE_ID, headword, idiom, { english });
}

for (const source of [LEXIN_SV_SOURCE_ID, LEXIN_EN_SOURCE_ID]) {
  for (const s of [source, `${source}:idiom`]) {
    const { error } = await db.from("reference_entries").delete().eq("source", s);
    if (error) throw error;
  }
}
for (let i = 0; i < rows.length; i += 1000) {
  for (let attempt = 1; ; attempt++) {
    const { error } = await db.from("reference_entries").insert(rows.slice(i, i + 1000));
    if (!error) break;
    if (attempt === 4) throw error;
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
}
console.log("rows", rows.length, rows.reduce((a, r) => ((a[r.source] = (a[r.source] || 0) + 1), a), {}));
