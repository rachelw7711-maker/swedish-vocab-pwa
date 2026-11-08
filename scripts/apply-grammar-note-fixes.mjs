// Applies reviewed grammar-note fixes (data/reports/round-e/grammar-note-fixes.json) in batches —
// only with --write, and only after approval (granted 2026-11-08 for the 481 cross-checked fixes, 50 a batch). Without --write it prints what it
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
const chosen = fixes.filter((f) => f.proposed && (IDS ? IDS.has(f.id) : f.batch));

const current = [];
for (const f of chosen) {
  const { data, error } = await db.from("learning_object_translations").select("id, learning_object_id, native_language, grammar_note").eq("learning_object_id", f.id).eq("native_language", f.language).maybeSingle();
  if (error) throw error;
  current.push({ fix: f, row: data });
}
// A batch is the next LIMIT rows still holding their original note; rows already holding the
// fix were done by an earlier batch, any other note was changed since the proposal (skipped).
const done0 = current.filter((c) => c.row && c.row.grammar_note === c.fix.proposed);
const ready = current.filter((c) => c.row && c.row.grammar_note === c.fix.original).slice(0, LIMIT);
const changed = current.filter((c) => !c.row || (c.row.grammar_note !== c.fix.original && c.row.grammar_note !== c.fix.proposed));
console.log(`fixes ${chosen.length}: applied before ${done0.length}, this batch ${ready.length}, changed since the proposal (skipped) ${changed.length}`);
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
// Read back: each written row must now hold exactly the fix.
const { data: back, error: backError } = await db.from("learning_object_translations").select("id, grammar_note").in("id", ready.slice(0, done).map((c) => c.row.id));
if (backError) throw backError;
const wrong = ready.slice(0, done).filter((c) => back.find((b) => b.id === c.row.id)?.grammar_note !== c.fix.proposed);
console.log(`written ${done}, read back ${back.length}, not as written ${wrong.length}; backup and rollback: data/reports/round-e/backup-grammar-notes-${stamp}*`);
if (wrong.length) { console.error("read-back mismatch", wrong.map((c) => c.fix.swedish)); process.exit(1); }
