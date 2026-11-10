// Round G (2026-11-11), decision 6: the lexeme key of the existing word cards whose spelling SALDO
// has as several words of one part of speech that inflect differently (regel: regler / reglar).
// Decided by the card's own forms only (lexemeKeyOf); a card its forms don't tell apart keeps null.
// Zero AI; writes only where lexeme_key is null, archived (reason round_g_lexeme_key) for --rollback.
//   node --env-file=.env scripts/backfill-lexeme-keys.mjs [--apply | --rollback <batch>]
import { writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { ordered } from "./page-order.mjs";
import { useSaldoFiles, saldoEntries, lexemesConflict, lexemeKeyOf } from "../server-lexicon.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
const REASON = "round_g_lexeme_key";
if (process.argv.includes("--rollback")) {
  const batch = process.argv[process.argv.indexOf("--rollback") + 1];
  const rows = must(await db.from("content_audit_archive").select("learning_object_id, new_value").eq("batch_id", batch).eq("reason", REASON));
  let n = 0;
  for (const r of rows) n += must(await db.from("learning_objects").update({ lexeme_key: null }).eq("id", r.learning_object_id).eq("lexeme_key", r.new_value).select("id")).length;
  console.log({ batch, restored: n });
  process.exit(0);
}
await useSaldoFiles();
const all = async (t, c, f = (q) => q) => { const o = []; for (let i = 0; ; i += 1000) { const data = must(await ordered(f(db.from(t).select(c)), t).range(i, i + 999)); o.push(...data); if (data.length < 1000) return o; } };
const cards = await all("learning_objects", "id, swedish, part_of_speech, lexeme_key, status", (q) => q.eq("object_type", "word").neq("status", "retired"));
const formsOf = new Map();
for (const f of await all("word_forms", "learning_object_id, form_value")) (formsOf.get(f.learning_object_id) || formsOf.set(f.learning_object_id, []).get(f.learning_object_id)).push(f.form_value);
const out = [], undecided = [];
for (const c of cards) {
  if (c.lexeme_key) continue;
  const rows = await saldoEntries(null, c.swedish, c.part_of_speech);
  if (!rows.some((a, i) => rows.slice(i + 1).some((b) => lexemesConflict(a, b, c.part_of_speech)))) continue;
  const key = await lexemeKeyOf(null, c.swedish, c.part_of_speech, [c.swedish, ...(formsOf.get(c.id) || [])]);
  (key ? out : undecided).push({ id: c.id, swedish: c.swedish, pos: c.part_of_speech, key, status: c.status, forms: formsOf.get(c.id) || [], lemgrams: rows.map((r) => r.lemgram) });
}
writeFileSync("data/reports/round-g/lexeme-keys.json", JSON.stringify({ keyed: out, undecided }, null, 1));
console.log({ homographSpellingCards: out.length + undecided.length, keyed: out.length, undecided: undecided.length, sample: out.slice(0, 8).map((x) => `${x.swedish} → ${x.key}`) });
if (process.argv.includes("--apply")) {
  const batch = randomUUID();
  must(await db.from("content_audit_archive").insert(out.map((x) => ({ batch_id: batch, learning_object_id: x.id, table_name: "learning_objects", field: "lexeme_key", old_value: null, new_value: x.key, reason: REASON }))));
  let n = 0;
  for (const x of out) n += must(await db.from("learning_objects").update({ lexeme_key: x.key }).eq("id", x.id).is("lexeme_key", null).select("id")).length;
  console.log({ batch, written: n });
}
