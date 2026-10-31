// Removes textbook provenance from user-readable fields (2026-11-01). Course-list rows
// imported from the Rivstart glossary keep their headword and learning content, but:
//   - the "Tags: Rivstart … Kapitel N" section leaves `note` (chapter arrangement),
//   - `source` gets a neutral name ("kursordlista A1–A2"), and `level` the bare level ("A1–A2"),
//   - glossary text left untranslated in the Swedish-definition slot leaves `note`
//     and swedish_explanation (it is regenerated independently, never paraphrased).
// Every old value goes to public.content_audit_archive first (migration 20261101120000);
// the internal source record (learning_object_sources: rivstart-wordlists) stays.
//
//   node --env-file=.env scripts/clean-course-provenance.mjs --held <field-status.ndjson> --verbatim <hits.json> --out <dir>
// Writes <out>/course-provenance.sql, -rollback.sql and -preview.tsv; it never writes to the database.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const outDir = opt("--out", "data/reports/prod/fixes");
mkdirSync(outDir, { recursive: true });
const batch = randomUUID();

// Entries whose Swedish-definition text is glossary text: held by the scan (English /
// not Swedish / spliced lines) or found verbatim in the glossary.
const glossary = new Set();
for (const l of readFileSync(opt("--held"), "utf8").trim().split("\n")) {
  const s = JSON.parse(l);
  if (s.field === "swedish_explanation" && s.detail?.fill === "review" && /english|not_swedish/.test(s.detail.reason)) glossary.add(s.learning_object_id);
}
const verbatim = JSON.parse(readFileSync(opt("--verbatim"), "utf8"));
const verbatimExplanation = new Set(verbatim.filter((h) => h.field === "swedish_explanation" && h.src === "rivstart").map((h) => h.id));
verbatimExplanation.forEach((id) => glossary.add(id));

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
let rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from("learning_objects").select("id, swedish, source, level, note, swedish_explanation").or("source.like.%Rivstart%,level.like.Rivstart%").order("id").range(from, from + 999);
  if (error) throw error;
  rows = rows.concat(data);
  if (data.length < 1000) break;
}

const neutralSource = (s) => (/^kursordlista/.test(s) ? s : /A1\/A2/.test(s) ? "kursordlista A1–A2" : /B1\/B2/.test(s) ? "kursordlista B1–B2" : "kursordlista");
function cleanNote(note, dropExplanation) {
  let out = String(note || "").replace(/^Tags:[^\n]*(\n(?![A-Z][A-Za-z ]+:)[^\n]*)*/m, "");
  if (dropExplanation) out = out.replace(/^Swedish explanation:[^\n]*\n?/m, "");
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const changes = [];
for (const r of rows) {
  const g = glossary.has(r.id);
  const note = cleanNote(r.note, g);
  if (note !== (r.note || "")) changes.push({ id: r.id, swedish: r.swedish, field: "note", old: r.note, value: note, reason: g ? "chapter_tags_and_glossary_text" : "chapter_tags" });
  const source = neutralSource(r.source);
  if (source !== r.source) changes.push({ id: r.id, swedish: r.swedish, field: "source", old: r.source, value: source, reason: "textbook_name" });
  const level = r.level && r.level.replace(/^Rivstart\s*(A1|B1)\/(A2|B2)$/, "$1–$2");
  if (level !== r.level) changes.push({ id: r.id, swedish: r.swedish, field: "level", old: r.level, value: level, reason: "textbook_name" });
  if (verbatimExplanation.has(r.id) && r.swedish_explanation) changes.push({ id: r.id, swedish: r.swedish, field: "swedish_explanation", old: r.swedish_explanation, value: "", reason: "glossary_text_verbatim" });
}

const sql = [`-- Course provenance clean-up ${batch}: ${changes.length} field changes on ${new Set(changes.map((c) => c.id)).size} entries.`, "begin;"];
for (let i = 0; i < changes.length; i += 500) {
  sql.push(`insert into public.content_audit_archive (batch_id, learning_object_id, field, old_value, new_value, reason) values\n  ${changes.slice(i, i + 500).map((c) => `(${q(batch)}, ${q(c.id)}, ${q(c.field)}, ${q(c.old)}, ${q(c.value)}, ${q(c.reason)})`).join(",\n  ")};`);
}
for (const field of ["note", "source", "level", "swedish_explanation"]) {
  sql.push(`update public.learning_objects lo set ${field} = a.new_value from public.content_audit_archive a
  where a.batch_id = ${q(batch)} and a.field = '${field}' and lo.id = a.learning_object_id and lo.${field} is not distinct from a.old_value;`);
}
sql.push("commit;");
writeFileSync(`${outDir}/course-provenance.sql`, sql.join("\n") + "\n");
writeFileSync(`${outDir}/course-provenance-rollback.sql`, ["begin;", ...["note", "source", "level", "swedish_explanation"].map((field) => `update public.learning_objects lo set ${field} = a.old_value from public.content_audit_archive a
  where a.batch_id = ${q(batch)} and a.field = '${field}' and lo.id = a.learning_object_id and lo.${field} is not distinct from a.new_value;`), `delete from public.content_audit_archive where batch_id = ${q(batch)};`, "commit;"].join("\n") + "\n");
writeFileSync(`${outDir}/course-provenance-preview.tsv`, "headword\tfield\treason\told\tnew\n" + changes.map((c) => [c.swedish, c.field, c.reason, JSON.stringify(c.old), JSON.stringify(c.value)].join("\t")).join("\n") + "\n");
const tally = changes.reduce((m, c) => { m[`${c.field} ${c.reason}`] = (m[`${c.field} ${c.reason}`] || 0) + 1; return m; }, {});
console.log(JSON.stringify({ batch, rows: rows.length, changes: changes.length, tally, glossaryEntries: glossary.size }, null, 1));
