// Read-only: what migration 20261110130000 (and later grade writes) would make of every entry's
// summary, against the stored values (staleness, needs_review moves, completeness drift).
//   node --env-file=.env scripts/simulate-grade-summary.mjs
import { createClient } from "@supabase/supabase-js";
import { ordered } from "./page-order.mjs";
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const all = async (t, c) => { const o = []; for (let i = 0; ; i += 1000) { const { data, error } = await ordered(db.from(t).select(c), t).range(i, i + 999); if (error) throw error; o.push(...data); if (data.length < 1000) return o; } };
const lo = await all("learning_objects", "id, object_type, part_of_speech, status, verification_status, completeness, missing_fields");
const rfs = await all("resource_field_status", "learning_object_id, field, status, source, grade");
const by = new Map(); for (const r of rfs) (by.get(r.learning_object_id) || by.set(r.learning_object_id, []).get(r.learning_object_id)).push(r);
const NOFORM = ["adverb","preposition","conjunction","interjection","numeral","pronoun","abbreviation","other","phrase"];
const t = { status: {}, completenessChanged: 0, missingChanged: 0, noRows: 0, toNeedsReview: 0, fromNeedsReview: 0, statusByVisibility: {} };
const inc = (o, k) => (o[k] = (o[k] || 0) + 1);
for (const o of lo) {
  const rs = by.get(o.id); if (!rs) { t.noRows++; continue; }
  const missing = rs.filter((r) => r.status === "missing").map((r) => r.field).sort();
  const v = (newRule) => {
    const mism = rs.filter((r) => r.status === "mismatch").length, ver = rs.filter((r) => r.status === "verified").length;
    const saldoMissing = rs.some((r) => r.status === "missing" && r.source === "saldo-morphology-2017");
    const formsUnchecked = rs.some((r) => r.field.startsWith("form:") && r.status === "present");
    const formsVerified = rs.filter((r) => r.field.startsWith("form:") && r.status === "verified").length;
    const pos = rs.some((r) => r.field === "pos" && r.status === "verified");
    const sense = rs.some((r) => r.field === "sense" && r.status === "verified" && (!newRule || (r.grade ?? (r.source === "audit-2026-11-02" ? "ai_consistent" : "verified")) === "verified"));
    if (mism > 0) return "needs_review"; if (ver === 0) return "unverified";
    if (saldoMissing || formsUnchecked || (o.object_type === "word" && formsVerified === 0 && !NOFORM.includes(o.part_of_speech)) || !pos || !sense) return "partial";
    return "verified";
  };
  const next = v(true), oldRule = v(false);
  inc(t.status, `${o.verification_status}→${next}`);
  if (oldRule !== o.verification_status) inc(t, "staleUnderOldRule");
  if (next === "needs_review" && o.verification_status !== "needs_review") t.toNeedsReview++;
  if (o.verification_status === "needs_review" && next !== "needs_review") t.fromNeedsReview++;
  if ((missing.length ? "incomplete" : "complete") !== o.completeness) t.completenessChanged++;
  if (JSON.stringify(missing) !== JSON.stringify([...(o.missing_fields || [])].sort())) t.missingChanged++;
  if (o.verification_status !== next) inc(t.statusByVisibility, o.status);
}
console.log(lo.length, JSON.stringify(t, null, 1));
