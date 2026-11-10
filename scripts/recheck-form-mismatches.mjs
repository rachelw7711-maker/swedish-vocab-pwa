// Round G (2026-11-11): every stored form a SALDO check called "mismatch", re-checked with the
// current compareWithSaldo (rule fix F1: a stored group 0 agrees with the homograph SALDO lists
// without a plural). Zero AI. Only mismatch → verified is written, and only while the row is still
// the mismatch read; each change archived (content_audit_archive, reason round_g_form_recheck).
//   node --env-file=.env scripts/recheck-form-mismatches.mjs [--apply]
import { writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { ordered } from "./page-order.mjs";
import { useSaldoFiles, saldoEntries, compareWithSaldo } from "../server-lexicon.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
await useSaldoFiles();
const rows = [];
for (let i = 0; ; i += 1000) {
  const data = must(await ordered(db.from("resource_field_status").select("learning_object_id, field, status, source, detail").eq("status", "mismatch").eq("source", "saldo-morphology-2017").like("field", "form:%"), "resource_field_status").range(i, i + 999));
  rows.push(...data); if (data.length < 1000) break;
}
const ids = [...new Set(rows.map((r) => r.learning_object_id))];
const cards = new Map(), forms = new Map();
for (let i = 0; i < ids.length; i += 25) {   // ≤ 1000 rows a request (word_forms: ~8 a card)
  for (const c of must(await db.from("learning_objects").select("id, swedish, part_of_speech, status").in("id", ids.slice(i, i + 25)))) cards.set(c.id, c);
  for (const f of must(await db.from("word_forms").select("learning_object_id, form_type, form_value").in("learning_object_id", ids.slice(i, i + 25)))) (forms.get(f.learning_object_id) || forms.set(f.learning_object_id, {}).get(f.learning_object_id))[f.form_type] = f.form_value;
}
const now = [];
for (const r of rows) {
  const c = cards.get(r.learning_object_id);
  if (!c) continue;
  const res = compareWithSaldo({ pos: c.part_of_speech, forms: forms.get(c.id) || {} }, await saldoEntries(null, c.swedish, c.part_of_speech));
  const f = res.fields[r.field];
  now.push({ id: c.id, swedish: c.swedish, pos: c.part_of_speech, status: c.status, field: r.field, stored: r.detail?.stored, reference: r.detail?.reference, now: f?.status || "not_checked" });
}
const tally = {};
for (const x of now) tally[x.now] = (tally[x.now] || 0) + 1;
writeFileSync("data/reports/round-g/form-mismatch-recheck.json", JSON.stringify({ tally, rows: now }, null, 1));
console.log({ mismatchRows: rows.length, tally, nowVerified: now.filter((x) => x.now === "verified").map((x) => `${x.swedish} ${x.field} ${x.stored}`) });
if (process.argv.includes("--apply")) {
  const batch = randomUUID();
  const fix = now.filter((x) => x.now === "verified");
  if (fix.length) must(await db.from("content_audit_archive").insert(fix.map((x) => ({ batch_id: batch, learning_object_id: x.id, table_name: "resource_field_status", field: x.field, old_value: "mismatch", new_value: "verified", reason: "round_g_form_recheck" }))));
  let n = 0;
  for (const x of fix) n += must(await db.from("resource_field_status").update({ status: "verified", detail: { recheck: "F1 2026-11-11", was: { stored: x.stored, reference: x.reference } }, updated_at: new Date().toISOString() }).eq("learning_object_id", x.id).eq("field", x.field).eq("status", "mismatch").select("learning_object_id")).length;
  const touched = [...new Set(fix.map((x) => x.id))];
  if (touched.length) must(await db.rpc("refresh_resource_summary", { p_ids: touched }));
  console.log({ batch, written: n, refreshed: touched.length });
}
