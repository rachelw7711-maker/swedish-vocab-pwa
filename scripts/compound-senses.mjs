// Senses of transparent compounds, from their parts (2026-11-04; compoundMeaningSupport). No AI.
//   node --env-file=.env scripts/compound-senses.mjs [--write]
// For a one-word entry whose sense no dictionary confirms (status "present"): SALDO splits it
// (compoundRows: språk+kurs), the parts' English equivalents come from the dictionaries, and each
// part of the English meaning must say both. The word must also be attested in Korp (existence:
// the cached korp-verify result, else a fresh count). Verified with the split and the matched
// equivalents in detail.compound; otherwise nothing changes. Results in data/reports/compound-senses.json.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { useSaldoFiles, compoundRows } from "../server-lexicon.mjs";
import { useReferenceFiles, referenceEntries, englishEquivalents, compoundMeaningSupport } from "../server-references.mjs";
import { korpAttestation, judgeAttestation } from "../server-korp.mjs";

const WRITE = process.argv.includes("--write");
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
await useSaldoFiles();
await useReferenceFiles("data/reference", { extra: true });
const korpCache = existsSync("data/reports/korp-verify/results.json") ? JSON.parse(readFileSync("data/reports/korp-verify/results.json", "utf8")) : {};

async function pageAll(build) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const part = must(await build().order("learning_object_id").order("field").range(from, from + 999));
    rows.push(...part);
    if (part.length < 1000) return rows;
  }
}
const senses = await pageAll(() => db.from("resource_field_status").select("learning_object_id, status, source, detail").eq("field", "sense").eq("status", "present"));
const objects = new Map();
const ids = senses.map((s) => s.learning_object_id);
for (let i = 0; i < ids.length; i += 200) {
  for (const o of must(await db.from("learning_objects").select("id, swedish, part_of_speech, object_type, status, learning_object_translations(native_language, meaning)").in("id", ids.slice(i, i + 200)))) objects.set(o.id, o);
}

// The first part's dictionary word: as written, without a linking letter, or with a dropped -a/-e.
async function firstEquivalents(first) {
  for (const f of [...new Set([first, first.replace(/[seauo]$/, ""), first + "a", first + "e"])]) {
    if (f.length < 2) continue;
    const refs = await referenceEntries(null, f);
    const eq = ["noun", "adjective", "verb", "adverb", "preposition"].flatMap((p) => englishEquivalents(refs, p));
    if (eq.length) return { lemma: f, eq };
  }
  return { lemma: null, eq: [] };
}

const out = [], tally = {};
const inc = (k) => (tally[k] = (tally[k] || 0) + 1);
for (const s of senses) {
  const o = objects.get(s.learning_object_id);
  if (!o || o.status === "retired" || o.object_type !== "word" || /\s/.test(o.swedish.trim())) { inc("not_a_word"); continue; }
  const en = o.learning_object_translations.find((t) => t.native_language === "en")?.meaning;
  const rows = await compoundRows(null, o.swedish, o.part_of_speech);
  if (!rows.length) { inc("no_compound_split"); continue; }
  const { first, head } = rows[0].compound;
  const headLemma = head.split("..")[0];
  const headEq = englishEquivalents(await referenceEntries(null, headLemma), o.part_of_speech);
  const f = await firstEquivalents(first);
  if (!headEq.length || !f.eq.length) { inc("part_not_in_dictionary"); continue; }
  if (!compoundMeaningSupport(en, { first, firstEquivalents: f.eq, headEquivalents: headEq })) { inc("meaning_not_from_parts"); continue; }
  let att = korpCache[o.id]?.verdict;
  if (!att) att = judgeAttestation(await korpAttestation(o.swedish), o.part_of_speech);
  if (!att.exists?.ok) { inc("not_attested"); continue; }
  inc("verified");
  out.push({ id: o.id, lemma: o.swedish, pos: o.part_of_speech, en, first, firstLemma: f.lemma, head: headLemma, existence: att.exists.reason, prev: s,
    firstEq: [...new Set(f.eq.map((e) => e.text))].slice(0, 6), headEq: [...new Set(headEq.map((e) => e.text))].slice(0, 6) });
}
writeFileSync("data/reports/compound-senses.json", JSON.stringify(out, null, 1));
console.log(tally);

if (WRITE) {
  const batch = randomUUID(), at = new Date().toISOString();
  for (const x of out) {
    const compound = { first: x.first, first_lemma: x.firstLemma, head: x.head, first_equivalents: x.firstEq, head_equivalents: x.headEq, existence: x.existence };
    must(await db.from("content_audit_archive").insert({ batch_id: batch, learning_object_id: x.id, table_name: "resource_field_status", field: "sense", old_value: JSON.stringify(x.prev), new_value: "verified", reason: "compound_meaning_from_parts" }));
    must(await db.from("resource_field_status").update({ status: "verified", source: `${x.prev.source};compound-rule`, detail: { ...(x.prev.detail || {}), open: undefined, compound }, updated_at: at })
      .eq("learning_object_id", x.id).eq("field", "sense").eq("status", "present"));
  }
  const touched = out.map((x) => x.id);
  for (let i = 0; i < touched.length; i += 200) must(await db.rpc("refresh_resource_summary", { p_ids: touched.slice(i, i + 200) }));
  console.log({ batch, written: out.length });
}
