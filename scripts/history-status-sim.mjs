// Ledger item 7.1 (2026-11-10), READ-ONLY simulation: every sense row still "verified" without a
// grade, its evidence read from its source, the grade it should carry and the entry status that
// follows (refresh_resource_summary's rule of migration 20261110130000). Writes a per-entry list and
// a forward / rollback SQL for approval; changes nothing.
// Evidence of a source (the parts of the source string; recorded by scripts of 2026-11-02 … 11-05):
//   korp            Korp sense check (scripts/korp-verify.mjs: corpus sentences per sense)  → verified
//   compound-rule   SALDO split + every part's dictionary English + Korp existence (no AI)   → verified
//   dictionary-en,  the English meaning shares a word with Lexin's English: a candidate       → ai_consistent
//   references:dictionary-english
//   lexin-sv-2020   (in "ai_check+…+lexin-sv-2020") the word is in Lexin: existence, not sense → ai_consistent
//   manual_review   the assistant's reading of the AI check (2026-11-02 session), no person  → ai_consistent
//   ai_check, audit-2026-11-02, fix   an AI answer                                         → ai_consistent
// A grade never changes the content or a learner's data; ai_consistent shows "Ej verifierad ännu".
//   node --env-file=.env scripts/history-status-sim.mjs
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";
import { ordered } from "./page-order.mjs";
import { evidenceOfSource, lexinSenseLink } from "../server-evidence.mjs";
import { useSaldoFiles } from "../server-lexicon.mjs";
import { useReferenceFiles, referenceEntries } from "../server-references.mjs";

export const RULE = "kv2-2026-11-10/history";

if (process.argv[1]?.endsWith("history-status-sim.mjs")) {
  const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const all = async (t, c, f = (q) => q) => { const o = []; for (let i = 0; ; i += 1000) { const { data, error } = await ordered(f(db.from(t).select(c)), t).range(i, i + 999); if (error) throw error; o.push(...data); if (data.length < 1000) return o; } };
  await useSaldoFiles();
  await useReferenceFiles("data/reference");
  const objects = new Map((await all("learning_objects", "id, swedish, part_of_speech, object_type, status, verification_status, swedish_explanation")).map((o) => [o.id, o]));
  const meaningEn = new Map((await all("learning_object_translations", "learning_object_id, meaning", (q) => q.eq("native_language", "en"))).map((t) => [t.learning_object_id, t.meaning]));
  const formsOf = new Map();
  for (const f of await all("word_forms", "learning_object_id, form_value")) (formsOf.get(f.learning_object_id) || formsOf.set(f.learning_object_id, []).get(f.learning_object_id)).push(f.form_value);
  const rows = await all("resource_field_status", "learning_object_id, field, status, source, grade");
  const by = new Map(); for (const r of rows) (by.get(r.learning_object_id) || by.set(r.learning_object_id, []).get(r.learning_object_id)).push(r);
  const NOFORM = ["adverb", "preposition", "conjunction", "interjection", "numeral", "pronoun", "abbreviation", "other", "phrase"];
  // refresh_resource_summary of 20261110130000, with grades as given.
  const statusOf = (o, rs) => {
    const mism = rs.filter((r) => r.status === "mismatch").length, ver = rs.filter((r) => r.status === "verified").length;
    if (mism) return "needs_review"; if (!ver) return "unverified";
    const saldoMissing = rs.some((r) => r.status === "missing" && r.source === "saldo-morphology-2017");
    const formsUnchecked = rs.some((r) => r.field.startsWith("form:") && r.status === "present");
    const formsVerified = rs.filter((r) => r.field.startsWith("form:") && r.status === "verified").length;
    const pos = rs.some((r) => r.field === "pos" && r.status === "verified");
    const sense = rs.some((r) => r.field === "sense" && r.status === "verified" && (r.grade ?? (r.source === "audit-2026-11-02" ? "ai_consistent" : "verified")) === "verified");
    if (saldoMissing || formsUnchecked || (o.object_type === "word" && !formsVerified && !NOFORM.includes(o.part_of_speech)) || !pos || !sense) return "partial";
    return "verified";
  };
  const list = [], tally = { byKind: {}, move: {}, byKindMove: {} };
  const inc = (o, k) => (o[k] = (o[k] || 0) + 1);
  for (const [id, rs] of by) {
    const o = objects.get(id);
    if (!o || o.status === "retired") continue;
    const sense = rs.find((r) => r.field === "sense");
    if (!sense || sense.status !== "verified" || sense.grade != null) continue;
    let ev = evidenceOfSource(sense.source);
    // Weaker than verified: a dictionary sense link (two signals on one Lexin sense) still verifies.
    let link = null;
    if (ev.grade === "ai_consistent" && o.object_type === "word") {
      link = await lexinSenseLink(null, await referenceEntries(null, o.swedish), o.part_of_speech, { meaningEn: meaningEn.get(id), swedishExplanation: o.swedish_explanation, forms: [o.swedish, ...(formsOf.get(id) || [])] });
      if (link.linked) ev = { kind: `${ev.kind}+dictionary_sense_link`, grade: "verified", why: `Lexin sense ${link.variant}: English and Swedish definition agree (${link.shared.join(", ")})` };
    }
    const now = o.verification_status;
    const next = ev.grade ? statusOf(o, rs.map((r) => (r === sense ? { ...r, grade: ev.grade } : r))) : now;
    inc(tally.byKind, ev.kind); inc(tally.move, `${now}→${next}`); inc(tally.byKindMove, `${ev.kind}: ${now}→${next}`);
    list.push({ id, swedish: o.swedish, pos: o.part_of_speech, type: o.object_type, status: o.status, verification: now, senseSource: sense.source, evidence: ev.kind, grade: ev.grade, next, why: ev.why, link: link && !link.linked ? link.reason : undefined, linkVariant: link?.linked ? link.variant : undefined, meaningEn: meaningEn.get(id), swedishExplanation: o.swedish_explanation });
  }
  mkdirSync("data/reports/round-g", { recursive: true });
  writeFileSync("data/reports/round-g/history-status-sim.json", JSON.stringify({ note: "simulation — nothing written", tally, list }, null, 1));
  const csv = ["id,swedish,pos,type,status,verification,next,evidence,senseSource", ...list.map((x) => [x.id, x.swedish, x.pos, x.type, x.status, x.verification, x.next, x.evidence, x.senseSource].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))];
  writeFileSync("data/reports/round-g/history-status-sim.csv", csv.join("\n") + "\n");
  const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
  const graded = list.filter((x) => x.grade);
  const fwd = ["begin;"], back = ["begin;"];
  for (const g of ["verified", "ai_consistent"]) {
    const ids = graded.filter((x) => x.grade === g).map((x) => `${q(x.id)}::uuid`);
    for (let i = 0; i < ids.length; i += 500) fwd.push(`update public.resource_field_status set grade = ${q(g)}, rule_version = ${q(RULE)} where field = 'sense' and status = 'verified' and grade is null and learning_object_id = any (array[${ids.slice(i, i + 500).join(",")}]);`);
  }
  // The Lexin sense a link names, kept in the row's detail (removed again by the rollback).
  for (const x of graded.filter((x) => x.linkVariant)) fwd.push(`update public.resource_field_status set detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object('dictionary_sense_link', ${q(x.linkVariant)}) where field = 'sense' and rule_version = ${q(RULE)} and learning_object_id = ${q(x.id)}::uuid;`);
  back.push(`update public.resource_field_status set detail = detail - 'dictionary_sense_link' where field = 'sense' and rule_version = ${q(RULE)} and detail ? 'dictionary_sense_link';`);
  back.push(`update public.resource_field_status set grade = null, rule_version = null where field = 'sense' and rule_version = ${q(RULE)};`);
  const all_ = graded.map((x) => `${q(x.id)}::uuid`);
  for (let i = 0; i < all_.length; i += 500) { const s = `select public.refresh_resource_summary(array[${all_.slice(i, i + 500).join(",")}]);`; fwd.push(s); back.push(s); }
  fwd.push("commit;"); back.push("commit;");
  writeFileSync("data/reports/round-g/history-status-fix.sql", fwd.join("\n") + "\n");
  writeFileSync("data/reports/round-g/history-status-fix-rollback.sql", back.join("\n") + "\n");
  console.log(JSON.stringify(tally, null, 1));
}
