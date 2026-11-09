// Knowledge v2 S6 (2026-11-09) — DRY RUN: the cleanup list for approval. Reads the database, writes
// only a report and two SQL files (forward and rollback) under data/reports/round-f; applies nothing.
//   1. Six free or typical combinations the reading made shared drafts of: retired (status 'retired'
//      — never deleted: a delete would cascade to user rows; one SQL line restores each).
//   2. Match keys under the R9 rule (a leading participle kept): updated.
//   3. Duplicates under the match key (stanna hemma / stannar hemma …): the copy no learner uses is
//      retired in favour of the kept one when it is AI-written; a copy with any user reference, or
//      two reviewed copies, are only listed, untouched (moving a learner's words, reviews or notes,
//      or choosing between reviewed course entries, is a separate decision).
// User references counted: user_words, review_events, content_reports (word_id), user_notes
// (source_id), text_analysis.selected_expressions (expression_id), user_preferences (activeWords).
// study_history / study_session_items reference the old table words, not learning_objects.
//   node --env-file=.env scripts/s6-cleanup.mjs
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { useSaldoFiles } from "../server-lexicon.mjs";
import { expressionMatchKey } from "../server-resources.mjs";
import { ordered } from "./page-order.mjs";

await useSaldoFiles();
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
const rows = [];
for (let from = 0; ; from += 1000) {
  const part = must(await ordered(db.from("learning_objects").select("id, swedish, object_type, status, match_key, updated_at").in("object_type", ["phrase", "expression"]).neq("status", "retired"), "learning_objects").range(from, from + 999));
  rows.push(...part);
  if (part.length < 1000) break;
}
const byId = new Map(rows.map((r) => [r.id, r]));

async function userRefs(id) {
  const count = async (table, col) => (await db.from(table).select(col, { count: "exact", head: true }).eq(col, id)).count ?? null;
  const out = {
    user_words: await count("user_words", "word_id"),
    review_events: await count("review_events", "word_id"),
    user_notes: await count("user_notes", "source_id"),
    content_reports: await count("content_reports", "word_id"),
    text_analysis: (await db.from("text_analysis").select("id", { count: "exact", head: true }).filter("selected_expressions", "cs", JSON.stringify([{ expression_id: id }]))).count ?? null,
    user_preferences: (await db.from("user_preferences").select("user_id", { count: "exact", head: true }).filter("preferences->activeWords", "cs", JSON.stringify([{ id }]))).count ?? null,
  };
  out.total = Object.values(out).reduce((a, b) => a + (b || 0), 0);
  out.unknown = Object.entries(out).filter(([, v]) => v === null).map(([k]) => k);
  return out;
}

// Checked 2026-11-10 against the library classification (classify-library-multiword-2026-11-09):
// these three are F1 (a typical combination of their head word: no entry of its own, decision 1).
// sätta upp regler för något, gå ner till stranden and liknande system were on the first list but
// are unclassified (AI "fixed phrase", weak association: too little evidence) — kept as drafts, to review.
const RETIRE = ["växande intresse", "ta flera beslut", "tända eldar"];
// Reviewed course pairs checked one by one 2026-11-10 (meanings, examples, sources, user references
// in every user table: none): the same learning point → the richer or more natural one kept.
// Hur många…? / Hur många? (a frame vs a question) and Va?! / Va? (disbelief vs not hearing) are
// different learning points: both kept.
const REVIEWED_SAME = { "Det låter bra.": "Det låter bra!", "Mums.": "Mums!", "Det hade jag ingen aning om!": "Det hade jag ingen aning om." };
const plan = { retire: [], match_key: [], duplicates: [], blocked: [] };
for (const s of RETIRE) {
  const r = rows.find((x) => x.swedish === s);
  if (!r) { plan.blocked.push({ swedish: s, why: "not found (already retired?)" }); continue; }
  const refs = await userRefs(r.id);
  (refs.total || refs.unknown.length ? plan.blocked : plan.retire).push({ ...r, reason: "not_entry_worthy (S6, knowledge v2 §13.2)", refs });
}
const keys = new Map();
for (const r of rows) {
  const k = await expressionMatchKey(null, r.swedish);
  if (k !== r.match_key && !plan.retire.some((x) => x.id === r.id)) plan.match_key.push({ id: r.id, swedish: r.swedish, from: r.match_key, to: k });
  (keys.get(k) || keys.set(k, []).get(k)).push(r);
}
const rank = (r) => ({ published: 0, human_reviewed: 0, ai_generated: 1, draft: 2 }[r.status] ?? 3);
for (const [k, list] of keys) {
  const live = list.filter((r) => !plan.retire.some((x) => x.id === r.id));
  if (live.length < 2) continue;
  // Kept: the most public, then the one spelled as a headword (no capital, no punctuation),
  const plain = (r) => (/^[a-zåäö]/.test(r.swedish) && !/[.!?]$/.test(r.swedish) ? 0 : 1);
  // … and among those the base form, spelled as its key (stanna hemma, not stannar hemma).
  const base = (r) => (r.swedish.toLowerCase() === k ? 0 : 1);
  const sorted = [...live].sort((a, b) => rank(a) - rank(b) || plain(a) - plain(b) || base(a) - base(b) || a.id.localeCompare(b.id));
  const [keep, ...dups] = sorted;
  for (const d of dups) {
    const refs = await userRefs(d.id);
    const item = { key: k, keep: { id: keep.id, swedish: keep.swedish, status: keep.status }, retire: { id: d.id, swedish: d.swedish, status: d.status, updated_at: d.updated_at }, refs };
    // Two reviewed entries (course lists: "Det låter bra!" and "Det låter bra.") may be meant apart:
    // listed for a decision, not retired.
    const pair = [keep, d].find((r) => REVIEWED_SAME[r.swedish]);
    if (pair) {
      const keepR = live.find((r) => r.swedish === REVIEWED_SAME[pair.swedish]);
      const refsR = await userRefs(pair.id);
      const it = { key: k, keep: { id: keepR.id, swedish: keepR.swedish, status: keepR.status }, retire: { id: pair.id, swedish: pair.swedish, status: pair.status, updated_at: pair.updated_at }, refs: refsR };
      (refsR.total || refsR.unknown.length ? plan.blocked : plan.duplicates).push(it);
    } else if (["human_reviewed", "published"].includes(d.status)) plan.blocked.push({ ...item, why: "both reviewed, different learning points: both kept" });
    else (refs.total || refs.unknown.length ? plan.blocked : plan.duplicates).push(item);
  }
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const fwd = ["begin;"], back = ["begin;"];
for (const r of plan.retire) {
  fwd.push(`update public.learning_objects set status = 'retired', updated_at = now() where id = ${q(r.id)} and status = ${q(r.status)};`);
  back.push(`update public.learning_objects set status = ${q(r.status)}, updated_at = ${q(r.updated_at)} where id = ${q(r.id)} and status = 'retired';`);
}
for (const m of plan.match_key) {
  fwd.push(`update public.learning_objects set match_key = ${q(m.to)} where id = ${q(m.id)} and match_key is not distinct from ${m.from === null ? "null" : q(m.from)};`);
  back.push(`update public.learning_objects set match_key = ${m.from === null ? "null" : q(m.from)} where id = ${q(m.id)} and match_key = ${q(m.to)};`);
}
for (const d of plan.duplicates) {
  fwd.push(`update public.learning_objects set status = 'retired', updated_at = now() where id = ${q(d.retire.id)} and status = ${q(d.retire.status)};  -- duplicate of ${d.keep.swedish}`);
  back.push(`update public.learning_objects set status = ${q(d.retire.status)}, updated_at = ${q(d.retire.updated_at)} where id = ${q(d.retire.id)} and status = 'retired';`);
}
const touched = [...plan.retire.map((r) => r.id), ...plan.match_key.map((m) => m.id), ...plan.duplicates.map((d) => d.retire.id)];
if (touched.length) { const arr = `array[${touched.map((id) => `${q(id)}::uuid`).join(",")}]`; fwd.push(`select public.refresh_resource_summary(${arr});`); back.push(`select public.refresh_resource_summary(${arr});`); }
fwd.push("commit;"); back.push("commit;");
const stamp = new Date().toISOString().slice(0, 10);
writeFileSync(`data/reports/round-f/s6-cleanup-${stamp}.json`, JSON.stringify({ note: "dry run — nothing applied", plan }, null, 1));
writeFileSync(`data/reports/round-f/s6-cleanup-${stamp}.sql`, fwd.join("\n") + "\n");
writeFileSync(`data/reports/round-f/s6-cleanup-${stamp}-rollback.sql`, back.join("\n") + "\n");
console.log(JSON.stringify({ retire: plan.retire.map((r) => r.swedish), match_key: plan.match_key.map((m) => `${m.swedish}: ${m.from} → ${m.to}`), duplicates: plan.duplicates.map((d) => `${d.retire.swedish} (${d.retire.status}) → keep ${d.keep.swedish} (${d.keep.status})`), blocked: plan.blocked.map((b) => `${b.swedish || b.retire?.swedish}${b.keep ? ` / ${b.keep.swedish}` : ""}: ${b.why || JSON.stringify(b.refs)}`) }, null, 1));
