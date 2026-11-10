// The word-card check (checkNewWordCard: dictionaries and program rules first, then the AI checks,
// as every newly generated card passes before it is saved) for stored entries that never had it
// (2026-11-09). Which entries:
//   --reading      phrases and idioms collected by reading analyses (content_origin
//                  reading_expression; G4: saved as drafts with a meaning and the text's sentence,
//                  completed later by scripts/ai-complete.mjs, never checked);
//   --drafts-only  their drafts only (after an ai-complete batch: a reading draft the check
//                  passes becomes ai_generated, as a generated card that passes is saved). Other
//                  drafts — the ai_candidate expressions the library hides on purpose — are never
//                  promoted here: showing them is the owner's decision;
//   --from-report <file>  record the results of an earlier run (no check is made, nothing paid);
//   --reused       entries the app reused for a search or a reading that the server marked
//                  (resource_field_status "reuse_check", server-native.mjs noteReuse; G6);
//   --ids <file>   the ids in a JSON array.
// An entry whose sense check is "verified", or was made by the current check version
// (CHECK_VERSION), is reused as it is and never checked — or paid for — again; with --recheck
// also older "present"/"mismatch" results are checked. Entry content is never changed here:
// what the check would change (a sense, an example, a collocation) is recorded with the result
// (detail.proposed_changes, open) and goes to the report for review. With --write the result is
// recorded (resource_field_status "sense", with check_version; previous rows in a rollback SQL),
// the entry's "reuse_check" mark is closed, and drafts whose sense is verified are promoted.
//   node --env-file=.env scripts/check-entries.mjs --reading|--drafts-only|--reused|--ids f [--recheck] [--limit N] [--write]
import { createClient } from "@supabase/supabase-js";
import { senseGrade } from "../server-language-checks.mjs";
import { RULE_VERSION } from "../server-evidence.mjs";
import { readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { useSaldoFiles } from "../server-lexicon.mjs";
import { useReferenceFiles } from "../server-references.mjs";
import { checkNewWordCard, CHECK_VERSION } from "../server-language-checks.mjs";

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const WRITE = args.includes("--write"), RECHECK = args.includes("--recheck");
const MODE = ["--reading", "--drafts-only", "--reused", "--ids", "--from-report"].find((m) => args.includes(m));
if (!MODE) { console.error("one of --reading, --drafts-only, --reused, --ids <file>, --from-report <file>"); process.exit(1); }
const LIMIT = Number(opt("--limit")) || Infinity;
await useSaldoFiles();
await useReferenceFiles("data/reference", { extra: true });
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const inChunks = async (table, cols, column, ids, extra = (q) => q) => {
  const out = [];
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await extra(db.from(table).select(cols).in(column, ids.slice(i, i + 100)));
    if (error) throw error;
    out.push(...data);
  }
  return out;
};
const ENTRY = "id, swedish, status, content_origin, part_of_speech, swedish_explanation, example_sv, example_zh, cefr_level, collocations, related_words";
let entries;
const earlierReport = MODE === "--from-report" ? JSON.parse(readFileSync(opt("--from-report"), "utf8")) : null;
const earlier = earlierReport?.rows || null;
// Recorded with the version that made the check, not this one: a result of an older version is
// checked again by the next run of the current one.
const VERSION = earlierReport?.check_version || CHECK_VERSION;
if (MODE === "--ids") entries = await inChunks("learning_objects", ENTRY, "id", JSON.parse(readFileSync(opt("--ids"), "utf8")));
else if (earlier) entries = await inChunks("learning_objects", ENTRY, "id", earlier.map((r) => r.id));
else if (MODE === "--reused") {
  const { data: marks, error } = await db.from("resource_field_status").select("learning_object_id").eq("field", "reuse_check").eq("status", "present");
  if (error) throw error;
  entries = await inChunks("learning_objects", ENTRY, "id", marks.map((m) => m.learning_object_id));
} else {
  let q = db.from("learning_objects").select(ENTRY).neq("status", "retired");
  q = q.eq("content_origin", "reading_expression");
  if (MODE === "--drafts-only") q = q.eq("status", "draft");
  const { data, error } = await q;
  if (error) throw error;
  entries = data;
}
entries = entries.filter((e) => e.status !== "retired");
const senses = await inChunks("resource_field_status", "learning_object_id, status, source, detail, updated_at", "learning_object_id", entries.map((e) => e.id), (q) => q.eq("field", "sense"));
const senseOf = (id) => senses.find((s) => s.learning_object_id === id);
const current = (s) => s && (s.status === "verified" || s.detail?.check_version === CHECK_VERSION);
// From a report: what an earlier batch already recorded (its version, by this script) is not
// recorded again, so --limit writes the report in batches.
const recorded = (s) => s?.detail?.check_version === VERSION && (s.detail.checked_by === "check-entries" || s.source === "check-entries");
// With --recheck a report made after the stored result replaces it (an entry corrected and checked
// again — the same check version recorded before must not hide the new result).
const reportAt = earlier ? statSync(opt("--from-report")).mtime : null;
const older = (s) => !s || new Date(s.updated_at) < reportAt;
const todo = earlier ? entries.filter((e) => (RECHECK ? older(senseOf(e.id)) : !current(senseOf(e.id)) && !recorded(senseOf(e.id)))).slice(0, LIMIT)
  : entries.filter((e) => e.status === "draft" || !senseOf(e.id) || (!current(senseOf(e.id)) && (RECHECK || MODE === "--reused" || MODE === "--ids"))).slice(0, LIMIT);
const skipped = entries.filter((e) => !todo.includes(e));
console.log(`entries ${entries.length}; check on record and current (reused as it is) ${skipped.filter((e) => current(senseOf(e.id))).length}; to check ${todo.length}`);

// The stored card in the shape the check takes (as generation returns it).
const ids = todo.map((e) => e.id);
const translations = await inChunks("learning_object_translations", "learning_object_id, native_language, meaning, example_translation, collocations, related_words", "learning_object_id", ids);
const examples = await inChunks("learning_object_examples", "id, learning_object_id, example_swedish, sort_order", "learning_object_id", ids);
const exampleTr = await inChunks("learning_object_example_translations", "example_id, native_language, translation", "example_id", examples.map((x) => x.id));
const forms = await inChunks("word_forms", "learning_object_id, form_type, form_value", "learning_object_id", ids);
const tr = (id, l) => translations.find((t) => t.learning_object_id === id && t.native_language === l) || {};
const lines = (t) => String(t || "").split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p) => p[0]);
function cardOf(e) {
  const zh = tr(e.id, "zh"), en = tr(e.id, "en");
  const own = examples.filter((x) => x.learning_object_id === e.id).sort((a, b) => a.sort_order - b.sort_order).map((x) => ({
    swedish: x.example_swedish,
    zh: exampleTr.find((t) => t.example_id === x.id && t.native_language === "zh")?.translation || "",
    en: exampleTr.find((t) => t.example_id === x.id && t.native_language === "en")?.translation || "",
  }));
  const exs = own.length ? own : e.example_sv ? [{ swedish: e.example_sv, zh: zh.example_translation || e.example_zh || "", en: en.example_translation || "" }] : [];
  const colZh = lines(zh.collocations || e.collocations), colEn = lines(en.collocations);
  const relZh = lines(zh.related_words || e.related_words), relEn = lines(en.related_words);
  return {
    meaning_zh: zh.meaning || "", meaning_en: en.meaning || "", swedish_explanation: e.swedish_explanation || "", cefr_level: e.cefr_level || "",
    examples: exs,
    collocations: colZh.map(([phrase, m, example]) => ({ phrase, zh: m || "", en: colEn.find((c) => c[0] === phrase)?.[1] || "", example: example || "" })),
    related: relZh.map(([word, m]) => ({ word, zh: m || "", en: relEn.find((r) => r[0] === word)?.[1] || "" })),
  };
}

const out = [];
const usage = { calls: 0, input: 0, output: 0, cost: 0 };
const started = Date.now();
const promotable = (e) => e.status === "draft" && e.content_origin === "reading_expression";
// Only a sense the references confirm is shown: "present" (the AI check alone, or open items) is
// not verified, and a draft stays a draft (the owner, 2026-11-09).
// A draft is shown only on independent evidence (knowledge v2): an AI check alone is ai_consistent.
const passes = (r) => r.ok && !r.failed && !r.changes.length && r.sense?.status === "verified" && r.sense?.grade === "verified";
// An earlier run's results, recorded as they are (its entries changed since are left out).
if (earlier) for (const e of todo) {
  const r = earlier.find((x) => x.id === e.id);
  if (r) out.push({ ...r, before: senseOf(e.id) || null, status: e.status, promote: promotable(e) && passes(r) });
}
const queue = earlier ? [] : [...todo];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) {
    const e = queue.shift();
    const result = cardOf(e);
    const isPhrase = /\s/.test(e.swedish.trim());
    const t0 = Date.now();
    let checked;
    try {
      checked = await checkNewWordCard(db, { lemma: e.swedish, pos: isPhrase ? "other" : e.part_of_speech, result, isPhrase,
        forms: forms.filter((f) => f.learning_object_id === e.id).map((f) => ({ type: f.form_type, value: f.form_value })) });
    } catch (err) { checked = { ok: false, reason: `check_failed: ${err.message}` }; }
    const u = checked.usage || {};
    usage.calls += u.calls || 0; usage.input += u.input_tokens || 0; usage.output += u.output_tokens || 0; usage.cost += u.cost || 0;
    const after = checked.result;
    const changes = !after ? [] : [
      ...["meaning_zh", "meaning_en", "swedish_explanation"].filter((f) => (after[f] || "") !== (result[f] || "")).map((f) => ({ field: f, from: result[f], to: after[f] })),
      ...result.examples.filter((x) => !(after.examples || []).some((y) => y.swedish === x.swedish)).map((x) => ({ field: "example", from: x.swedish, to: null })),
      ...result.collocations.filter((x) => !(after.collocations || []).some((y) => y.phrase === x.phrase)).map((x) => ({ field: "collocation", from: x.phrase, to: null })),
      ...result.related.filter((x) => !(after.related || []).some((y) => y.word === x.word)).map((x) => ({ field: "related", from: x.word, to: null })),
    ];
    const failed = !checked.ok && /^check_failed|ai_check_failed/.test(checked.reason || "") || checked.sense?.source === "ai_check_failed";
    out.push({ id: e.id, swedish: e.swedish, status: e.status, before: senseOf(e.id) || null, ok: checked.ok, failed, reason: checked.reason || null, sense: checked.sense || null, changes,
      seconds: (Date.now() - t0) / 1000, promote: promotable(e) && passes({ ok: checked.ok, failed, changes, sense: checked.sense }) });
    console.log(`${e.swedish}: ${failed ? "check failed" : checked.ok ? checked.sense?.status : `not ok ${checked.reason}`}${changes.length ? ` (would change ${changes.map((c) => c.field).join(", ")})` : ""}`);
  }
}));

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
mkdirSync("data/reports/round-e", { recursive: true });
const report = `data/reports/round-e/check-entries${MODE.replace(/^-+/, "-")}-${stamp}.json`;
const tally = (f) => out.reduce((m, r) => { const k = f(r); m[k] = (m[k] || 0) + 1; return m; }, {});
const summary = { mode: MODE, check_version: CHECK_VERSION, entries: entries.length, reused_as_is: entries.length - todo.length, checked: out.length,
  by: tally((r) => (r.failed ? "check_failed" : r.ok ? r.sense?.status : "not_ok")), with_changes: out.filter((r) => r.changes.length).length, promote: out.filter((r) => r.promote).length,
  usage, seconds: (Date.now() - started) / 1000, seconds_per_entry: out.length ? out.reduce((s, r) => s + r.seconds, 0) / out.length : 0 };
writeFileSync(report, JSON.stringify({ summary, rows: out }, null, 1));
console.log(JSON.stringify(summary, null, 1), "\nreport", report);
if (!WRITE) process.exit(0);

// Recorded: previous rows into the rollback SQL; a failed check is not recorded (the entry stays
// marked and is tried by the next run, not in a loop).
const q = (v) => (v === null || v === undefined ? "null" : `'${String(typeof v === "object" ? JSON.stringify(v) : v).replace(/'/g, "''")}'`);
const done = out.filter((r) => !r.failed);
const rollback = ["begin;"];
for (const r of done) {
  rollback.push(r.before
    ? `update public.resource_field_status set status = ${q(r.before.status)}, source = ${q(r.before.source)}, detail = ${q(r.before.detail)}::jsonb, updated_at = ${q(r.before.updated_at)} where learning_object_id = ${q(r.id)} and field = 'sense';`
    : `delete from public.resource_field_status where learning_object_id = ${q(r.id)} and field = 'sense';`);
  rollback.push(`update public.resource_field_status set status = 'present' where learning_object_id = ${q(r.id)} and field = 'reuse_check';`);
  if (r.promote) rollback.push(`update public.learning_objects set status = 'draft' where id = ${q(r.id)} and status = 'ai_generated';`);
}
if (done.length) rollback.push(`select public.refresh_resource_summary(array[${done.map((r) => `${q(r.id)}::uuid`).join(",")}]);`);
rollback.push("commit;");
writeFileSync(report.replace(/\.json$/, "-rollback.sql"), rollback.join("\n") + "\n");
const now = new Date().toISOString();
for (const r of done) {
  const sense = r.ok
    ? { ...r.sense, detail: { ...r.sense.detail, check_version: VERSION, checked_by: "check-entries", ...(r.changes.length ? { proposed_changes: r.changes, open: "content_unverified" } : {}) } }
    : { status: "mismatch", source: "check-entries", detail: { check_version: VERSION, reason: r.reason } };
  if (r.changes.length && sense.status === "verified") sense.status = "present";
  const { error: e1 } = await db.from("resource_field_status").upsert({ learning_object_id: r.id, field: "sense", status: sense.status, source: sense.source, detail: sense.detail, grade: senseGrade(sense.status, sense.grade), rule_version: RULE_VERSION, updated_at: now }, { onConflict: "learning_object_id,field" });
  if (e1) throw e1;
  await db.from("resource_field_status").update({ status: "not_applicable", detail: { check_version: VERSION, checked_at: now }, updated_at: now }).eq("learning_object_id", r.id).eq("field", "reuse_check");
  if (r.promote) {
    const { error: e2 } = await db.from("learning_objects").update({ status: "ai_generated", updated_at: now }).eq("id", r.id).eq("status", "draft");
    if (e2) throw e2;
  }
}
if (done.length) await db.rpc("refresh_resource_summary", { p_ids: done.map((r) => r.id) });
console.log(`recorded ${done.length}, promoted ${done.filter((r) => r.promote).length}, failed (left for the next run) ${out.length - done.length}; rollback ${report.replace(/\.json$/, "-rollback.sql")}`);
