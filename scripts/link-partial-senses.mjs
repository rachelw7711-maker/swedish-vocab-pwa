// Round G (2026-11-11), owner's batches P1/P2: the core sense of public "partial" cards tied to
// independent evidence, zero AI. The evidence is recomputed here (never taken from the simulation):
//   --mode link      R-8: Lexin ties the card to one sense (lexinSenseLink)            → dictionary_sense_link
//   --mode unique    R-8b: Lexin's only sense of the word (lexinUniqueSenseLink)        → dictionary_sense_link
//   --mode compound  a transparent SALDO compound whose every English part is its parts' (compoundMeaningSupport),
//                    the compound in Korp (existence and part of speech, judgeAttestation)  → compound_rule
// Written: resource_field_status "sense" status verified, grade verified, the old row (the AI's
// verdict and its source) kept inside detail.previous and archived (content_audit_archive, reason
// round_g_core_<mode>); statuses recomputed. Only cards still public and still without a verified
// sense are touched. Dry run by default.
//   node --env-file=.env scripts/link-partial-senses.mjs --mode link|unique|compound [--apply] [--limit n]
//   node --env-file=.env scripts/link-partial-senses.mjs --rollback <batch>
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { useSaldoFiles, compoundRows } from "../server-lexicon.mjs";
import { useReferenceFiles, referenceEntries, englishEquivalents, compoundMeaningSupport } from "../server-references.mjs";
import { lexinSenseLink, lexinUniqueSenseLink } from "../server-evidence.mjs";
import { korpAttestation, judgeAttestation } from "../server-korp.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);

if (process.argv.includes("--rollback")) {
  const batch = arg("--rollback");
  const rows = must(await db.from("content_audit_archive").select("learning_object_id, old_value").eq("batch_id", batch).like("reason", "round_g_core_%"));
  for (const r of rows) {
    const old = JSON.parse(r.old_value);
    must(await db.from("resource_field_status").upsert({ learning_object_id: r.learning_object_id, field: "sense", ...old }, { onConflict: "learning_object_id,field" }));
  }
  for (let i = 0; i < rows.length; i += 500) must(await db.rpc("refresh_resource_summary", { p_ids: rows.slice(i, i + 500).map((r) => r.learning_object_id) }));
  console.log({ batch, restored: rows.length });
  process.exit(0);
}

const MODE = arg("--mode");
const CLASS = { link: "dictionary_link", unique: "dictionary_candidate", compound: "compound_rule" }[MODE];
if (!CLASS) throw new Error("--mode link|unique|compound");
const APPLY = process.argv.includes("--apply");
const LIMIT = Number(arg("--limit")) || Infinity;
await useSaldoFiles();
await useReferenceFiles("data/reference", { extra: true });
const sim = JSON.parse(readFileSync("data/reports/round-g/partial-core-sim.json", "utf8")).cards.filter((c) => c.cls === CLASS);

const results = [], tally = {};
for (let i = 0; i < sim.length && results.filter((r) => r.linked).length < LIMIT; i += 25) {
  const part = sim.slice(i, i + 25), ids = part.map((c) => c.id);
  const cards = new Map(must(await db.from("learning_objects").select("id, swedish, part_of_speech, status, verification_status, swedish_explanation").in("id", ids)).map((c) => [c.id, c]));
  const en = new Map(must(await db.from("learning_object_translations").select("learning_object_id, meaning").eq("native_language", "en").in("learning_object_id", ids)).map((t) => [t.learning_object_id, t.meaning]));
  const sense = new Map(must(await db.from("resource_field_status").select("learning_object_id, field, status, grade, source, detail, rule_version").eq("field", "sense").in("learning_object_id", ids)).map((r) => [r.learning_object_id, r]));
  const forms = new Map();
  for (const f of must(await db.from("word_forms").select("learning_object_id, form_value").in("learning_object_id", ids))) (forms.get(f.learning_object_id) || forms.set(f.learning_object_id, []).get(f.learning_object_id)).push(f.form_value);
  for (const s of part) {
    const c = cards.get(s.id), old = sense.get(s.id);
    if (!c || !["published", "human_reviewed", "ai_generated"].includes(c.status) || c.verification_status !== "partial" || (old?.status === "verified" && old?.grade === "verified") || old?.status === "mismatch") { tally.skipped = (tally.skipped || 0) + 1; continue; }
    const opts = { meaningEn: en.get(c.id) || "", swedishExplanation: c.swedish_explanation, forms: [c.swedish, ...(forms.get(c.id) || [])] };
    let r;
    if (MODE === "link") r = await lexinSenseLink(null, await referenceEntries(null, c.swedish), c.part_of_speech, opts);
    else if (MODE === "unique") r = await lexinUniqueSenseLink(null, await referenceEntries(null, c.swedish), c.part_of_speech, opts);
    else {
      const comp = await compoundRows(null, c.swedish, c.part_of_speech);
      if (!comp.length || comp[0].compound.ambiguous) r = { linked: false, reason: "no_unambiguous_split" };
      else {
        const [first, head] = [comp[0].compound.first.split("..")[0], comp[0].compound.head.split("..")[0]];
        const fr = await referenceEntries(null, first);
        const meaning = compoundMeaningSupport(opts.meaningEn, { first, firstEquivalents: [...englishEquivalents(fr, "noun"), ...englishEquivalents(fr, c.part_of_speech)], headEquivalents: englishEquivalents(await referenceEntries(null, head), c.part_of_speech), strict: true });
        if (!meaning) r = { linked: false, reason: "meaning_not_its_parts" };
        else {
          const a = await korpAttestation(c.swedish, { forms: opts.forms }).catch((e) => ({ error: e.message }));
          const v = a.error ? null : judgeAttestation(a, c.part_of_speech);
          r = !v ? { linked: false, reason: "korp_failed" } : v.exists.ok && v.pos.ok !== false ? { linked: true, rule: "compound", split: `${first}+${head}`, korp: { exists: v.exists.reason, pos: v.pos.reason } } : { linked: false, reason: `korp: ${v.exists.ok ? v.pos.reason : v.exists.reason}` };
        }
      }
    }
    tally[r.linked ? "linked" : r.reason] = (tally[r.linked ? "linked" : r.reason] || 0) + 1;
    results.push({ id: c.id, swedish: c.swedish, pos: c.part_of_speech, en: opts.meaningEn, linked: r.linked, reason: r.reason, variant: r.variant, shared: r.shared, split: r.split, korp: r.korp, old });
  }
}
const linked = results.filter((r) => r.linked).slice(0, LIMIT);
writeFileSync(`data/reports/round-g/core-${MODE}.json`, JSON.stringify({ tally, results }, null, 1));
console.log({ mode: MODE, candidates: sim.length, tally });
if (APPLY && linked.length) {
  const batch = randomUUID(), now = new Date().toISOString();
  const strip = (o) => o && (({ learning_object_id, field, ...r }) => r)(o);
  for (let i = 0; i < linked.length; i += 200) must(await db.from("content_audit_archive").insert(linked.slice(i, i + 200).map((r) => ({ batch_id: batch, learning_object_id: r.id, table_name: "resource_field_status", field: "sense", old_value: JSON.stringify(strip(r.old) || { status: "present", source: null, grade: null, detail: null }), new_value: "verified", reason: `round_g_core_${MODE}` }))));
  for (const r of linked) {
    must(await db.from("resource_field_status").upsert({ learning_object_id: r.id, field: "sense", status: "verified", grade: "verified", rule_version: `kv2-2026-11-11/${MODE === "unique" ? "R-8b" : MODE === "link" ? "R-8" : "compound"}`,
      source: MODE === "compound" ? "compound_rule+korp" : "dictionary_sense_link",
      detail: { lexin_variant: r.variant || null, shared: r.shared || null, split: r.split || null, korp: r.korp || null, previous: strip(r.old) || null }, updated_at: now }, { onConflict: "learning_object_id,field" }));
  }
  for (let i = 0; i < linked.length; i += 500) must(await db.rpc("refresh_resource_summary", { p_ids: linked.slice(i, i + 500).map((r) => r.id) }));
  appendFileSync("data/reports/round-g/core-batches.log", JSON.stringify({ at: now, mode: MODE, batch, written: linked.length }) + "\n");
  console.log({ batch, written: linked.length });
}
