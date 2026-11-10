// Round G, ledger K-3: one-word "collocations" (compounds such as "biljettautomat" on automat) move
// to the card's related words — in their base form (SALDO), with their meanings, written as the
// generation writes related words (relatedLines) — and leave the collocations. A word the related
// words already have only leaves the collocations. Nothing is lost: every changed field is archived
// (content_audit_archive, reason round_g_compound_to_related) with the example sentence the
// collocation had. Each write applies only while the field still holds what was read.
//   node --env-file=.env scripts/migrate-compound-collocations.mjs            # dry run (default)
//   node --env-file=.env scripts/migrate-compound-collocations.mjs --apply [--limit N]
//   node --env-file=.env scripts/migrate-compound-collocations.mjs --rollback <batch-uuid>
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { useSaldoFiles, lemmatize } from "../server-lexicon.mjs";
import { relatedLines } from "../server-native.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const APPLY = process.argv.includes("--apply");
const LIMIT = process.argv.includes("--limit") ? Number(arg("--limit")) : Infinity;
const REASON = "round_g_compound_to_related";
const LOG = "data/reports/round-g/compound-migration.jsonl";

if (process.argv.includes("--rollback")) {
  // Every archived field back to its old value, while it still holds what the migration wrote.
  const batch = arg("--rollback");
  const rows = must(await db.from("content_audit_archive").select("learning_object_id, table_name, field, old_value, new_value").eq("batch_id", batch).eq("reason", REASON));
  let n = 0;
  for (const r of rows) {
    if (r.table_name === "learning_object_collocations") { must(await db.from("learning_object_collocations").insert(JSON.parse(r.old_value))); n++; continue; }
    const [lang, field] = r.field.split(":");
    const q = r.table_name === "learning_objects" ? db.from("learning_objects").update({ [field]: r.old_value }).eq("id", r.learning_object_id)
      : db.from("learning_object_translations").update({ [field]: r.old_value }).eq("learning_object_id", r.learning_object_id).eq("native_language", lang);
    const done = must(await q.eq(field, r.new_value).select("id"));
    n += done.length;
  }
  console.log({ batch, archived: rows.length, restored: n });
  process.exit(0);
}

await useSaldoFiles();
const sim = JSON.parse(readFileSync("data/reports/round-g/compound-collocations-sim.json", "utf8")).rows;
const byCard = new Map();
for (const r of sim) (byCard.get(r.id) || byCard.set(r.id, []).get(r.id)).push(r);
const lines = (t) => String(t || "").split("\n").filter((l) => l.trim());
const phraseOf = (l) => l.split("|")[0].trim().replace(/­/g, "").toLowerCase();
const batch = randomUUID();
const tally = { cards: 0, moved: 0, already_related: 0, removed_only: 0, skipped_changed: 0 };
const samples = [];
for (const [id, items] of [...byCard].slice(0, LIMIT)) {
  const lo = must(await db.from("learning_objects").select("id, swedish, part_of_speech, collocations, related_words").eq("id", id).single());
  const trs = must(await db.from("learning_object_translations").select("id, native_language, collocations, related_words").eq("learning_object_id", id));
  const tab = must(await db.from("learning_object_collocations").select("*").eq("learning_object_id", id));
  const words = new Set(items.map((x) => x.word.replace(/­/g, "").toLowerCase()));
  // The related word each one-word collocation becomes (base form, its meanings, its part of speech).
  const related = [];
  for (const x of items) {
    if (x.action !== "move_to_related" && x.action !== "review") { tally[x.action === "remove_duplicate_of_headword" ? "removed_only" : "already_related"]++; continue; }
    const w = x.word.replace(/­/g, "");
    const reading = (await lemmatize(null, w.toLowerCase()))[0];
    const base = reading && reading.lemma.toLowerCase() !== lo.swedish.toLowerCase() ? reading.lemma : w;
    related.push({ word: base, zh: x.zh || "", en: x.en || "", pos: reading?.pos || (w.toLowerCase().endsWith(lo.swedish.toLowerCase()) ? lo.part_of_speech : "other"), from: x.word, example: x.example });
  }
  const change = (text, lang) => {
    const kept = lines(text.collocations).filter((l) => !words.has(phraseOf(l)));
    const have = new Set(lines(text.related_words).map(phraseOf));
    const add = related.filter((r) => !have.has(r.word.toLowerCase()));
    const addLines = relatedLines(add, { lemma: lo.swedish }, lang);
    return { collocations: kept.join("\n"), related_words: [text.related_words, addLines].filter((s) => String(s || "").trim()).join("\n") };
  };
  const writes = [];
  for (const t of trs) {
    const next = change(t, t.native_language);
    for (const f of ["collocations", "related_words"]) if ((t[f] || "") !== next[f]) writes.push({ table: "learning_object_translations", lang: t.native_language, field: f, old: t[f], next: next[f] });
  }
  const nextLo = change(lo, "zh");   // learning_objects keeps the Chinese lines
  for (const f of ["collocations", "related_words"]) if ((lo[f] || "") !== nextLo[f]) writes.push({ table: "learning_objects", lang: "zh", field: f, old: lo[f], next: nextLo[f] });
  const tabGone = tab.filter((c) => words.has(String(c.phrase_text).replace(/­/g, "").toLowerCase()));
  tally.cards++; tally.moved += related.length;
  if (samples.length < 4) samples.push({ swedish: lo.swedish, moved: related.map((r) => `${r.from} → ${r.word} (${r.pos})`), writes: writes.map((w) => `${w.table}.${w.lang}:${w.field}`), tableRows: tabGone.length });
  if (!APPLY) continue;
  // Archive first, then write while unchanged; the collocation index rows last.
  const archive = writes.map((w) => ({ batch_id: batch, learning_object_id: id, table_name: w.table, field: `${w.lang}:${w.field}`, old_value: w.old, new_value: w.next, reason: REASON }));
  archive.push(...tabGone.map((c) => ({ batch_id: batch, learning_object_id: id, table_name: "learning_object_collocations", field: "row", old_value: JSON.stringify(c), new_value: null, reason: REASON })));
  archive.push(...related.filter((r) => r.example).map((r) => ({ batch_id: batch, learning_object_id: id, table_name: "learning_object_translations", field: "moved_collocation_example", old_value: `${r.from} | ${r.example}`, new_value: r.word, reason: REASON })));
  if (archive.length) must(await db.from("content_audit_archive").insert(archive));
  let ok = true;
  for (const w of writes) {
    const q = w.table === "learning_objects" ? db.from("learning_objects").update({ [w.field]: w.next }).eq("id", id)
      : db.from("learning_object_translations").update({ [w.field]: w.next }).eq("learning_object_id", id).eq("native_language", w.lang);
    const done = must(await (w.old == null ? q.is(w.field, null) : q.eq(w.field, w.old)).select("id"));
    if (!done.length) ok = false;
  }
  if (tabGone.length) must(await db.from("learning_object_collocations").delete().in("id", tabGone.map((c) => c.id)));
  if (!ok) tally.skipped_changed++;
  appendFileSync(LOG, JSON.stringify({ batch, id, swedish: lo.swedish, writes: writes.length, tableRows: tabGone.length, ok }) + "\n");
}
console.log(JSON.stringify({ mode: APPLY ? "apply" : "dry run", batch: APPLY ? batch : null, tally, samples }, null, 1));
if (APPLY) writeFileSync(`data/reports/round-g/compound-migration-${batch}.json`, JSON.stringify({ batch, tally }, null, 1));
