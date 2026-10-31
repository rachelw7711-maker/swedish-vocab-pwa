// Scans words, fixed phrases and idiomatic expressions for missing or unverified
// fields (2026-10-31). Read-only: it never writes to learning_objects.
//
//   node --env-file=.env scripts/scan-resources.mjs [--backup <dir>] [--out <dir>] [--write-status]
//
// --backup reads a JSON backup (Backups/…/*.json.gz) instead of the live database.
// Every missing field is classified as
//   local — SALDO (local reference data) can supply it: scripts/fill-local.mjs
//   ai    — needs generated text: queued for scripts/enrich-batch.mjs
// and stored forms are checked against SALDO (verified / mismatch).
// Writes <out>/scan-report.json (counts) and <out>/field-status.ndjson (one line
// per entry field, the rows of public.resource_field_status). --write-status also
// upserts those rows into the database (needs the shared-resources migration).
import { createClient } from "@supabase/supabase-js";
import { gunzipSync } from "node:zlib";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { useSaldoFiles, saldoEntries, compareWithSaldo, SALDO_CHECK_ONLY } from "../server-lexicon.mjs";
import { requiredFields } from "../server-resources.mjs";

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const backupDir = opt("--backup");
const outDir = opt("--out") || "data/reports";
mkdirSync(outDir, { recursive: true });

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
async function load(table, columns) {
  if (backupDir) return JSON.parse(gunzipSync(readFileSync(`${backupDir}/${table}.json.gz`)));
  let rows = [], from = 0;
  for (;;) {
    const { data, error } = await db.from(table).select(columns).order("id").range(from, from + 999);
    if (error) throw error;
    rows = rows.concat(data);
    if (data.length < 1000) return rows;
    from += 1000;
  }
}

// Course-list rows (document-vocab-data.js import) carry their Swedish definition
// inside `note` ("Swedish explanation: …") but not in swedish_explanation.
function noteExplanation(note) {
  const m = String(note || "").match(/^Swedish explanation:[ \t]*(.+)$/m);
  const text = m ? m[1].trim() : "";
  return text.length >= 3 && !/behöver kontrolleras/i.test(text) ? text : "";
}

const started = Date.now();
const saldo = await useSaldoFiles();
const [objects, forms, translations, examples] = await Promise.all([
  load("learning_objects", "id, swedish, part_of_speech, object_type, status, source, cefr_level, chinese, swedish_explanation, example_sv, passiv_s, countability, note"),
  load("word_forms", "id, learning_object_id, form_type, form_value"),
  load("learning_object_translations", "id, learning_object_id, native_language, meaning"),
  load("learning_object_examples", "id, learning_object_id, example_swedish"),
]);

const formsById = new Map();
forms.forEach((f) => { if (f.form_value) (formsById.get(f.learning_object_id) ?? formsById.set(f.learning_object_id, {}).get(f.learning_object_id))[f.form_type] = f.form_value; });
const meaning = new Map();
translations.forEach((t) => { if (t.meaning) meaning.set(`${t.learning_object_id}|${t.native_language}`, true); });
const hasExample = new Set(examples.filter((e) => e.example_swedish).map((e) => e.learning_object_id));

const report = { scannedAt: new Date().toISOString(), source: backupDir ? `backup ${backupDir}` : "live database", saldo, byType: {}, saldoCoverage: {}, mismatchSamples: [] };
const statusLines = [];
const bump = (type, field, status) => {
  const t = (report.byType[type] ??= { entries: 0, complete: 0, fields: {} });
  const f = (t.fields[field] ??= {});
  f[status] = (f[status] || 0) + 1;
};

for (const o of objects) {
  if (o.status === "retired") continue;
  const type = o.object_type === "word" ? "word" : o.object_type === "phrase" ? "phrase" : "expression";
  const entry = {
    pos: o.part_of_speech, forms: formsById.get(o.id) || {}, passiv_s: o.passiv_s, countability: o.countability,
    meaning_zh: meaning.get(`${o.id}|zh`) || Boolean(o.chinese), meaning_en: meaning.get(`${o.id}|en`) || false,
    swedish_explanation: Boolean(o.swedish_explanation), example: hasExample.has(o.id) || Boolean(o.example_sv), cefr_level: Boolean(o.cefr_level),
  };
  const t = (report.byType[type] ??= { entries: 0, complete: 0, fields: {} });
  t.entries++;
  let complete = true;
  const record = (field, status, source, detail) => {
    bump(type, field, status);
    statusLines.push(JSON.stringify({ learning_object_id: o.id, field, status, source, detail }));
    if (status !== "verified" && status !== "present" && status !== "not_applicable") complete = false;
  };

  // Checks SALDO can make (forms, s-passive, groups, countability) for words.
  let saldoFields = {};
  if (type === "word") {
    const rows = await saldoEntries(null, o.swedish, o.part_of_speech);
    const cov = (report.saldoCoverage[o.part_of_speech] ??= { entries: 0, found: 0 });
    cov.entries++;
    if (rows.length) cov.found++;
    saldoFields = compareWithSaldo(entry, rows).fields;
    for (const [field, r] of Object.entries(saldoFields)) {
      // A noun stored as uncountable has no plural on purpose.
      if (r.status === "missing" && /^form:plural_/.test(field) && o.countability === "uncountable") record(field, "not_applicable", "existing");
      else if (r.status === "missing" && SALDO_CHECK_ONLY.has(field)) record(field, "missing", null, { fill: "ai", reference: r.reference });
      else if (r.status === "missing") record(field, "missing", "saldo-morphology-2017", { fill: "local", reference: r.reference });
      else if (r.status === "mismatch") {
        record(field, "mismatch", "saldo-morphology-2017", { stored: r.stored, reference: r.reference });
        if (report.mismatchSamples.length < 400) report.mismatchSamples.push({ swedish: o.swedish, pos: o.part_of_speech, field, stored: r.stored, saldo: r.reference });
      } else if (r.status === "present") record(field, "present", "existing");
      else record(field, "verified", "saldo-morphology-2017");
    }
  }
  // Fields only text generation can supply (or forms SALDO doesn't know).
  for (const field of requiredFields(type, o.part_of_speech)) {
    if (field in saldoFields) continue;
    const present = field.startsWith("form:") ? Boolean(entry.forms[field.slice(5)]) : Boolean(entry[field]);
    const fromNote = field === "swedish_explanation" && !present ? noteExplanation(o.note) : "";
    if (!present && /^form:plural_/.test(field) && o.countability === "uncountable") record(field, "not_applicable", "existing");
    else if (present) record(field, "present", "existing");
    else if (fromNote) record(field, "missing", "existing-note", { fill: "local", reference: fromNote });
    else record(field, "missing", null, { fill: "ai" });
  }
  if (complete) t.complete++;
}

// Roll-ups: how much is locally fixable vs needs AI.
for (const t of Object.values(report.byType)) {
  t.missingLocal = 0; t.missingAi = 0; t.mismatches = 0;
  for (const f of Object.values(t.fields)) { t.mismatches += f.mismatch || 0; }
}
const typeById = new Map(objects.map((o) => [o.id, o.object_type === "word" ? "word" : o.object_type === "phrase" ? "phrase" : "expression"]));
const entriesNeedingAi = {};
for (const line of statusLines) {
  const s = JSON.parse(line);
  if (s.status !== "missing") continue;
  const t = report.byType[typeById.get(s.learning_object_id)];
  if (s.detail?.fill === "local") t.missingLocal++;
  else { t.missingAi++; (entriesNeedingAi[typeById.get(s.learning_object_id)] ??= new Set()).add(s.learning_object_id); }
}
for (const [type, ids] of Object.entries(entriesNeedingAi)) report.byType[type].entriesNeedingAi = ids.size;
report.seconds = Math.round((Date.now() - started) / 1000);

writeFileSync(`${outDir}/scan-report.json`, JSON.stringify(report, null, 1));
writeFileSync(`${outDir}/field-status.ndjson`, statusLines.join("\n") + "\n");

if (args.includes("--write-status")) {
  const rows = statusLines.map((l) => JSON.parse(l)).map((s) => ({ ...s, updated_at: new Date().toISOString() }));
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await db.from("resource_field_status").upsert(rows.slice(i, i + 1000), { onConflict: "learning_object_id,field" });
    if (error) throw error;
  }
  const ids = [...new Set(rows.map((r) => r.learning_object_id))];
  for (let i = 0; i < ids.length; i += 500) {
    const { error } = await db.rpc("refresh_resource_summary", { p_ids: ids.slice(i, i + 500) });
    if (error) throw error;
  }
}
console.log(JSON.stringify({ byType: Object.fromEntries(Object.entries(report.byType).map(([k, v]) => [k, { entries: v.entries, complete: v.complete, missingLocal: v.missingLocal, missingAi: v.missingAi, entriesNeedingAi: v.entriesNeedingAi, mismatches: v.mismatches }])), saldoCoverage: report.saldoCoverage, seconds: report.seconds }, null, 1));
