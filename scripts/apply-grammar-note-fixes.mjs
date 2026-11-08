// Applies reviewed grammar-note fixes (data/reports/round-e/grammar-note-fixes.json) in batches —
// only with --write, and only after approval (2026-11-09). Without --write it prints what it
// would change. Each write:
//   - only rows marked batch (or listed with --ids), and only when the note in the database is
//     still the original the fix was proposed for (a note changed since is skipped, reported);
//   - backs up the rows first (data/reports/round-e/backup-grammar-notes-<time>.json) and writes
//     the rollback (…-rollback.sql) before changing anything;
//   - --limit n: at most n rows (one batch), to be checked in the app before the next.
//   node --env-file=.env scripts/apply-grammar-note-fixes.mjs [--limit 50] [--ids id,id] [--write]
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";

const opt = (name, d = null) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : d; };
const WRITE = process.argv.includes("--write");
const LIMIT = Number(opt("--limit", "50"));
const IDS = opt("--ids") ? new Set(opt("--ids").split(",")) : null;
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { fixes } = JSON.parse(readFileSync("data/reports/round-e/grammar-note-fixes.json", "utf8"));
const chosen = fixes.filter((f) => f.proposed && (IDS ? IDS.has(f.id) : f.batch)).slice(0, LIMIT);

const current = [];
for (const f of chosen) {
  const { data, error } = await db.from("learning_object_translations").select("id, learning_object_id, native_language, grammar_note").eq("learning_object_id", f.id).eq("native_language", f.language).maybeSingle();
  if (error) throw error;
  current.push({ fix: f, row: data });
}
const ready = current.filter((c) => c.row && c.row.grammar_note === c.fix.original);
const changed = current.filter((c) => !c.row || c.row.grammar_note !== c.fix.original);
console.log(`chosen ${chosen.length}, ready ${ready.length}, changed since the proposal (skipped) ${changed.length}`);
for (const c of ready.slice(0, 5)) console.log(`  ${c.fix.swedish} [${c.fix.language}]\n    - ${c.fix.original}\n    + ${c.fix.proposed}`);
if (!WRITE) { console.log("dry run: nothing written (--write to apply)"); process.exit(0); }

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
writeFileSync(`data/reports/round-e/backup-grammar-notes-${stamp}.json`, JSON.stringify(ready.map((c) => c.row), null, 1));
writeFileSync(`data/reports/round-e/backup-grammar-notes-${stamp}-rollback.sql`, ready.map((c) => `update learning_object_translations set grammar_note = ${q(c.row.grammar_note)} where id = ${q(c.row.id)};`).join("\n") + "\n");
let done = 0;
for (const c of ready) {
  const { error } = await db.from("learning_object_translations").update({ grammar_note: c.fix.proposed, updated_at: new Date().toISOString() }).eq("id", c.row.id).eq("grammar_note", c.row.grammar_note);
  if (error) { console.error("stopped:", c.fix.swedish, error.message); break; }
  done++;
}
console.log(`written ${done}; backup and rollback: data/reports/round-e/backup-grammar-notes-${stamp}*`);
