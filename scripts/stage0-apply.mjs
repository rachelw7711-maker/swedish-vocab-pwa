// Round G stage 0 (2026-11-12): the form rows still "present" on cards whose sense is verified, marked
// verified where SALDO (one lexeme, or homographs that inflect alike) gives the very form the card
// shows — re-checked here form by form; a card with any form SALDO does not give alike is left whole.
// Old rows archived (content_audit_archive, reason round_g_stage0); verification_status recomputed.
//   node --env-file=.env scripts/stage0-apply.mjs --ids <file.json> [--write]
//   node --env-file=.env scripts/stage0-apply.mjs --rollback <batch>
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { saldoEntries, saldoFormsDiffer, cardFieldsFromSaldo } from "../server-lexicon.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
const opt = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const norm = (s) => String(s || "").toLowerCase().split(/[\/,]/).map((x) => x.trim()).filter(Boolean).sort().join("/");

if (opt("--rollback")) {
  const rows = must(await db.from("content_audit_archive").select("learning_object_id, field, old_value").eq("batch_id", opt("--rollback")).eq("reason", "round_g_stage0"));
  for (const r of rows) if (JSON.parse(r.old_value).absent) must(await db.from("resource_field_status").delete().eq("learning_object_id", r.learning_object_id).eq("field", r.field));
  else must(await db.from("resource_field_status").upsert({ learning_object_id: r.learning_object_id, field: r.field, ...JSON.parse(r.old_value) }, { onConflict: "learning_object_id,field" }));
  const ids = [...new Set(rows.map((r) => r.learning_object_id))];
  if (ids.length) must(await db.rpc("refresh_resource_summary", { p_ids: ids }));
  console.log({ restoredRows: rows.length, cards: ids.length });
  process.exit(0);
}

const WRITE = process.argv.includes("--write"), batch = randomUUID(), out = [];
for (const id of JSON.parse(readFileSync(opt("--ids"), "utf8"))) {
  const c = must(await db.from("learning_objects").select("id, swedish, part_of_speech, verification_status").eq("id", id).single());
  const rows = must(await db.from("resource_field_status").select("field, status, source, detail, grade, rule_version").eq("learning_object_id", id));
  const sense = rows.find((r) => r.field === "sense"), pos = rows.find((r) => r.field === "pos");
  // A card with no part-of-speech row: SALDO gives that class, and only that class, for the spelling.
  const posFromSaldo = !pos && (await saldoEntries(db, c.swedish, c.part_of_speech)).length > 0 && (await saldoEntries(db, c.swedish, c.part_of_speech)).length === (await saldoEntries(db, c.swedish)).length;
  if (!(sense?.status === "verified" && sense.grade === "verified") || (pos ? pos.status !== "verified" : !posFromSaldo) || rows.some((r) => r.status === "mismatch")) { out.push({ swedish: c.swedish, skip: "sense_pos_or_mismatch" }); continue; }
  const open = rows.filter((r) => r.field.startsWith("form:") && r.status === "present");
  if (rows.some((r) => r.field.startsWith("form:") && r.status === "missing")) { out.push({ swedish: c.swedish, skip: "form_missing" }); continue; }
  const saldo = await saldoEntries(db, c.swedish, c.part_of_speech);
  if (!saldo.length || (saldo.length > 1 && saldoFormsDiffer(saldo, c.part_of_speech))) { out.push({ swedish: c.swedish, skip: "saldo" }); continue; }
  const want = cardFieldsFromSaldo(saldo[0], c.part_of_speech).forms;
  const shown = Object.fromEntries(must(await db.from("word_forms").select("form_type, form_value").eq("learning_object_id", id)).map((f) => [f.form_type, f.form_value]));
  const bad = open.map((r) => r.field.slice(5)).filter((t) => !want[t] || norm(want[t]) !== norm(shown[t]));
  if (bad.length) { out.push({ swedish: c.swedish, skip: "form_differs", bad }); continue; }
  if (WRITE) {
    if (!pos) {
      must(await db.from("content_audit_archive").insert({ batch_id: batch, learning_object_id: id, table_name: "resource_field_status", field: "pos", old_value: JSON.stringify({ absent: true }), new_value: "verified", reason: "round_g_stage0" }));
      must(await db.from("resource_field_status").insert({ learning_object_id: id, field: "pos", status: "verified", source: "saldo-morphology-2017", rule_version: "kv2-2026-11-12/stage0", detail: { saldo: { pos: c.part_of_speech, checked: "2026-11-12" } } }));
    }
    for (const r of open) {
      must(await db.from("content_audit_archive").insert({ batch_id: batch, learning_object_id: id, table_name: "resource_field_status", field: r.field, old_value: JSON.stringify({ status: r.status, source: r.source, detail: r.detail, grade: r.grade, rule_version: r.rule_version }), new_value: "verified", reason: "round_g_stage0" }));
      must(await db.from("resource_field_status").update({ status: "verified", source: "saldo-morphology-2017", rule_version: "kv2-2026-11-12/stage0", detail: { ...(r.detail || {}), saldo: { form: shown[r.field.slice(5)], checked: "2026-11-12" } }, updated_at: new Date().toISOString() }).eq("learning_object_id", id).eq("field", r.field).eq("status", "present"));
    }
    must(await db.rpc("refresh_resource_summary", { p_ids: [id] }));
  }
  const after = must(await db.from("learning_objects").select("verification_status").eq("id", id).single()).verification_status;
  out.push({ swedish: c.swedish, forms: open.length, before: c.verification_status, after });
}
console.log(JSON.stringify({ write: WRITE, batch: WRITE ? batch : null, out }));
