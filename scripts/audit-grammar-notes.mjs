// Read-only: every grammar note (learning_objects and each language's translation) against
// SALDO (server-grammar-consistency.mjs). Writes data/reports/grammar-note-conflicts.json with
// each conflict and, where SALDO alone settles it, a note written again from SALDO. Changes
// nothing in the database.
//   node --env-file=.env scripts/audit-grammar-notes.mjs
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { useSaldoFiles } from "../server-lexicon.mjs";
import { useReferenceFiles, referenceEntries } from "../server-references.mjs";
import { grammarNoteConflicts, plainGrammarNote } from "../server-grammar-consistency.mjs";

await useSaldoFiles();
await useReferenceFiles("data/reference", { extra: true });
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
async function all(table, columns, filter) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await filter(db.from(table).select(columns)).range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) return out;
  }
}
const entries = await all("learning_objects", "id, swedish, part_of_speech, access_tier, status, countability", (q) => q.in("part_of_speech", ["noun", "verb"]).neq("status", "retired"));
const byId = new Map(entries.map((e) => [e.id, e]));
const notes = await all("learning_object_translations", "learning_object_id, native_language, grammar_note", (q) => q.not("grammar_note", "is", null));
const conflicts = [];
let checked = 0;
for (const n of notes) {
  const e = byId.get(n.learning_object_id);
  if (!e || !n.grammar_note?.trim()) continue;
  checked++;
  const refs = await referenceEntries(null, e.swedish);
  const found = await grammarNoteConflicts(null, { lemma: e.swedish, pos: e.part_of_speech, note: n.grammar_note, refs });
  if (!found.length) continue;
  const review = found.every((c) => c.kind.endsWith("_unconfirmed"));
  const plain = review ? null : await plainGrammarNote(null, { lemma: e.swedish, pos: e.part_of_speech, refs });
  conflicts.push({ id: e.id, review_only: review, swedish: e.swedish, pos: e.part_of_speech, tier: e.access_tier, countability: e.countability, language: n.native_language, note: n.grammar_note, conflicts: found, proposed: plain ? plain[n.native_language] || null : null });
}
const count = (f) => conflicts.reduce((m, c) => { for (const k of f(c)) m[k] = (m[k] || 0) + 1; return m; }, {});
const summary = { checked, with_conflict: conflicts.length, entries: new Set(conflicts.map((c) => c.id)).size, by_kind: count((c) => c.conflicts.map((x) => x.kind)), by_language: count((c) => [c.language]), by_tier: count((c) => [c.tier]), with_proposal: conflicts.filter((c) => c.proposed).length, review_only: conflicts.filter((c) => c.review_only).length };
writeFileSync("data/reports/grammar-note-conflicts.json", JSON.stringify({ summary, conflicts }, null, 1));
console.log(JSON.stringify(summary, null, 1));
