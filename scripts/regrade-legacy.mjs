// Knowledge v2, R2 (2026-11-09): what the evidence model makes of the senses the
// content audit marked "verified" (audit-2026-11-02, an AI check). Reads the database, the
// references and the Korp results already stored; writes nothing but a report. No AI.
// The old audit is one piece of evidence (legacy_ai, strength 1); a word overlap with Lexin's
// English is a candidate (strength 3) — together at most ai_consistent, never verified. Verified
// needs a Lexin sense link or a Korp sense check; a Korp sense that was not attested is "disputed"
// for that part only. Nothing is removed: the grade only says what is still to be checked.
//   node --env-file=.env scripts/regrade-legacy.mjs [--sample 50]                 dry run
//   node --env-file=.env scripts/regrade-legacy.mjs --apply --batch 50 [--limit N]  write (approved 2026-11-09)
// --apply, per batch: evidence rows (rule version R2_VERSION) and the sense row's grade, then
// refresh_resource_summary and a read back; stops at the first batch that does not read back.
// It never removes or hides anything: a disputed part makes the grade "disputed" (the entry stays
// public, shown as not yet verified) — lack of evidence is not an error. Rollback:
//   delete from content_evidence where rule_version = '<R2_VERSION>';
//   update resource_field_status set grade = null, rule_version = null where rule_version = '<R2_VERSION>';
//   then refresh_resource_summary over the ids in data/reports/round-f/r2-batches.jsonl.
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, appendFileSync } from "node:fs";
import { useReferenceFiles, referenceEntries, englishEquivalents, meaningSupport } from "../server-references.mjs";
import { regradeLegacySense, recordEvidence, RULE_VERSION } from "../server-evidence.mjs";
import { ordered } from "./page-order.mjs";

const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);
const SAMPLE = Number(arg("--sample")) || 50;
const APPLY = process.argv.includes("--apply");
const BATCH = Number(arg("--batch")) || 50;
const LIMIT = Number(arg("--limit")) || Infinity;
export const R2_VERSION = `${RULE_VERSION}/r2`;
// The entry grade of regradeLegacySense → the sense row's grade (the column's values).
const DB_GRADE = { verified: "verified", ai_consistent: "ai_consistent", partial: "ai_consistent", needs_review: "disputed", unverified: "unverified" };
await useReferenceFiles("data/reference", { extra: true });
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
async function all(table, columns, filter = (q) => q) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await ordered(filter(db.from(table).select(columns)), table).range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

const entries = new Map((await all("learning_objects", "id, swedish, part_of_speech, object_type, status, verification_status", (q) => q.eq("object_type", "word").neq("status", "retired"))).map((o) => [o.id, o]));
const english = new Map((await all("learning_object_translations", "learning_object_id, meaning", (q) => q.eq("native_language", "en"))).map((t) => [t.learning_object_id, t.meaning || ""]));
const rows = await all("resource_field_status", "learning_object_id, field, status, source, detail, grade, rule_version", (q) => q.in("field", ["sense", "pos"]));
const pos = new Map(rows.filter((r) => r.field === "pos").map((r) => [r.learning_object_id, r]));
const legacy = rows.filter((r) => r.field === "sense" && r.status === "verified" && r.source === "audit-2026-11-02" && entries.has(r.learning_object_id))
  .filter((r) => !APPLY || r.rule_version !== R2_VERSION);   // --apply resumes where it stopped
const pending = [];

const tally = { entries: legacy.length, grade: {}, parts: {}, evidence: {}, change: {} };
const add = (o, k) => (o[k] = (o[k] || 0) + 1);
const byGrade = {};
for (const r of legacy) {
  const o = entries.get(r.learning_object_id);
  const refs = await referenceEntries(null, o.swedish);
  const eqs = englishEquivalents(refs, o.part_of_speech);
  const korp = r.detail?.korp?.sense;
  // The stored Korp sense check (scripts/korp-verify.mjs): the parts it asked about, the corpus
  // sentences with the parts each was confirmed for, and "not attested: a; b" for the rest.
  const kParts = (korp?.parts || []).map((x) => String(x).toLowerCase());
  const notAttested = new Set(String(korp?.reason || "").match(/not attested: (.*)$/)?.[1].split("; ").map((x) => x.trim().toLowerCase()) || []);
  const korpOf = (text) => {
    const i = kParts.indexOf(text.toLowerCase());
    if (i < 0) return null;
    if ((korp.sentences || []).some((s) => s.confirmed?.[i + 1])) return "verified";
    return notAttested.has(text.toLowerCase()) ? "refuted" : null;
  };
  const parts = (english.get(o.id) || "").split(";").map((p) => p.trim()).filter(Boolean).map((text) => ({
    text,
    overlap: eqs.length > 0 && meaningSupport(text, eqs).length > 0,
    lexinLink: false,   // no sense is tied to a Lexin VariantID yet (learning_object_senses, R7)
    korp: korpOf(text),
  }));
  for (const p of parts) add(tally.evidence, `${p.overlap ? "overlap" : "no_overlap"}${p.korp ? `+korp_${p.korp}` : ""}`);
  const posVerified = pos.get(o.id)?.status === "verified";
  const g = regradeLegacySense({ exists: true, posVerified, parts, legacy: true });
  add(tally.grade, g.entry);
  for (const p of g.parts) add(tally.parts, `${p.explanatory ? "explanatory" : "core"}:${p.grade}`);
  add(tally.change, `${o.verification_status} → sense ${g.entry}`);
  if (APPLY) pending.push({ id: o.id, swedish: o.swedish, grade: DB_GRADE[g.entry], parts: g.parts });
  (byGrade[g.entry] ||= []).push({ id: o.id, swedish: o.swedish, pos: o.part_of_speech, english: english.get(o.id), parts: g.parts, recheck: g.recheck });
}
if (APPLY) {
  process.env.KNOWLEDGE_EVIDENCE_WRITE = "on";
  const todo = pending.slice(0, LIMIT);
  console.log({ pending: pending.length, now: todo.length, batch: BATCH, ruleVersion: R2_VERSION });
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH), ids = batch.map((b) => b.id);
    const { data: before, error: e0 } = await db.from("learning_objects").select("id, status, verification_status").in("id", ids);
    if (e0) throw e0;
    for (const b of batch) for (const p of b.parts) {
      const r = await recordEvidence(db, b.id, "sense", p.text, p.list.map((e) => ({ ...e, note: e.note || "R2 legacy regrade" })), { ruleVersion: R2_VERSION });
      if (r.error) throw new Error(`evidence for ${b.swedish}: ${r.error}`);
    }
    for (const g of new Set(batch.map((b) => b.grade))) {
      const { error } = await db.from("resource_field_status").update({ grade: g, rule_version: R2_VERSION })
        .eq("field", "sense").eq("source", "audit-2026-11-02").eq("status", "verified").in("learning_object_id", batch.filter((b) => b.grade === g).map((b) => b.id));
      if (error) throw error;
    }
    const { error: e1 } = await db.rpc("refresh_resource_summary", { p_ids: ids });
    if (e1) throw e1;
    // Read back: every sense row graded as planned, every entry's visibility unchanged, none hidden.
    const { data: graded, error: e2 } = await db.from("resource_field_status").select("learning_object_id, grade").eq("field", "sense").eq("rule_version", R2_VERSION).in("learning_object_id", ids);
    const { data: after, error: e3 } = await db.from("learning_objects").select("id, status, verification_status").in("id", ids);
    if (e2 || e3) throw e2 || e3;
    const want = new Map(batch.map((b) => [b.id, b.grade])), was = new Map(before.map((o) => [o.id, o]));
    const bad = [...graded.filter((r) => want.get(r.learning_object_id) !== r.grade).map((r) => r.learning_object_id),
      ...after.filter((o) => o.status !== was.get(o.id).status || o.verification_status === "needs_review" && was.get(o.id).verification_status !== "needs_review").map((o) => o.id)];
    if (graded.length !== batch.length || bad.length) { console.error("READ BACK FAILED", { batch: i / BATCH, graded: graded.length, of: batch.length, bad }); process.exit(1); }
    const moved = {}; for (const o of after) { const k = `${was.get(o.id).verification_status}→${o.verification_status}`; moved[k] = (moved[k] || 0) + 1; }
    appendFileSync("data/reports/round-f/r2-batches.jsonl", JSON.stringify({ at: new Date().toISOString(), batch: i / BATCH, ids, grades: Object.fromEntries(batch.map((b) => [b.id, b.grade])), moved }) + "\n");
    console.log(`batch ${i / BATCH}: ${batch.length} ok`, JSON.stringify(moved));
  }
  process.exit(0);
}
const sample = Object.fromEntries(Object.entries(byGrade).map(([k, v]) => [k, v.filter((_, i) => i % Math.max(1, Math.floor(v.length / SAMPLE)) === 0).slice(0, SAMPLE)]));
const out = `data/reports/round-f/regrade-legacy-dry-${new Date().toISOString().slice(0, 10)}.json`;
writeFileSync(out, JSON.stringify({ note: "dry run — nothing written to the database", tally, sample }, null, 1));
console.log(JSON.stringify(tally, null, 1));
console.log("written", out);
