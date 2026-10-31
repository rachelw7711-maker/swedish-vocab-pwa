// Links phrases and expressions to the dictionary words they are built from (2026-11-01),
// so their cards list them under "Relaterade ord" (learning_object_relationships,
// type "related", marked in the archive). Local only: each token is lemmatised with SALDO and linked when
// exactly one word entry with that lemma and part of speech exists. Function words and
// placeholders (någon, något, sig …) are skipped; at most three links per entry.
//
//   node --env-file=.env scripts/link-expressions.mjs [--out data/reports/prod2]
// Writes expression-links.sql, -rollback.sql and -preview.tsv; never writes to the database.
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { useSaldoFiles, lemmatize } from "../server-lexicon.mjs";

const args = process.argv.slice(2);
const outDir = args.includes("--out") ? args[args.indexOf("--out") + 1] : "data/reports/prod2";
const LINKABLE = new Set(["noun", "verb", "adjective", "adverb"]);
const SKIP = new Set("någon något några någonting ngn ngt sig sin sitt sina man en ett den det de dem du jag vi ni han hon hen mig dig oss er inte och eller men som att är var vara ha har hade få får blir bli kan ska skulle vill så här där nu då till vad hur när varför vem vilken vilket mycket bara också igen väl ju nog visst inne ute upp ner in ut av på i om med för från över under efter före bort fram hem kvar tillbaka".split(" "));

await useSaldoFiles();
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
async function all(table, cols) {
  let out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(cols).order("id").range(from, from + 999);
    if (error) throw error;
    out = out.concat(data);
    if (data.length < 1000) return out;
  }
}
const objects = (await all("learning_objects", "id, swedish, part_of_speech, object_type, status")).filter((o) => o.status !== "retired");
const words = new Map();
for (const o of objects.filter((o) => o.object_type === "word")) {
  const k = `${o.swedish.toLowerCase()}|${o.part_of_speech}`;
  words.set(k, words.has(k) ? null : o);   // null: ambiguous, never linked
}
const existing = new Set((await all("learning_object_relationships", "id, from_object_id, to_object_id")).map((r) => `${r.from_object_id}|${r.to_object_id}`));

const links = [];
for (const e of objects.filter((o) => o.object_type !== "word")) {
  const seen = new Set();
  for (const token of e.swedish.toLowerCase().split(/[^\p{L}-]+/u).filter((t) => t.length > 1 && !SKIP.has(t))) {
    if (seen.size >= 3) break;
    const targets = new Set();
    for (const c of await lemmatize(null, token)) {
      if (!LINKABLE.has(c.pos)) continue;
      const w = words.get(`${c.lemma.toLowerCase()}|${c.pos}`);
      if (w) targets.add(w);
    }
    if (targets.size !== 1) continue;   // unknown or more than one possible word
    const w = [...targets][0];
    if (seen.has(w.id) || existing.has(`${e.id}|${w.id}`)) continue;
    seen.add(w.id);
    links.push({ from: e.id, to: w.id, phrase: e.swedish, word: w.swedish });
  }
}

const batch = randomUUID();
const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const sql = [`-- Expression → word links ${batch}: ${links.length}.`, "begin;"];
for (let i = 0; i < links.length; i += 500) {
  sql.push(`insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason) values\n  ${links.slice(i, i + 500).map((l) => `(${q(batch)}, ${q(l.from)}, 'learning_object_relationships', 'component', null, ${q(l.to)}, 'expression_component_link')`).join(",\n  ")};`);
}
sql.push(`insert into public.learning_object_relationships (from_object_id, to_object_id, relationship_type)
  select a.learning_object_id, a.new_value::uuid, 'related' from public.content_audit_archive a where a.batch_id = ${q(batch)}
  and not exists (select 1 from public.learning_object_relationships r where r.from_object_id = a.learning_object_id and r.to_object_id = a.new_value::uuid);`, "commit;");
writeFileSync(`${outDir}/expression-links.sql`, sql.join("\n") + "\n");
writeFileSync(`${outDir}/expression-links-rollback.sql`, ["begin;", `delete from public.learning_object_relationships r using public.content_audit_archive a where a.batch_id = ${q(batch)} and r.from_object_id = a.learning_object_id and r.to_object_id = a.new_value::uuid and r.relationship_type = 'related';`, `delete from public.content_audit_archive where batch_id = ${q(batch)};`, "commit;"].join("\n") + "\n");
writeFileSync(`${outDir}/expression-links-preview.tsv`, "phrase\tword\n" + links.map((l) => `${l.phrase}\t${l.word}`).join("\n") + "\n");
console.log(JSON.stringify({ batch, links: links.length, expressions: new Set(links.map((l) => l.from)).size, of: objects.filter((o) => o.object_type !== "word").length }));
