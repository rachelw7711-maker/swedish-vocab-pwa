// Round G (2026-11-11), P3: the four public cards whose Korp sense check did not pass (grade disputed).
//   fan    the English false friend: "fan; hand fan" / 风扇；扇子, where Swedish fan is the devil or an
//          admirer (Lexin 4224 / 4225); the card's example is the admirer ("klubbens fans"). Its
//          meanings and explanation set to Lexin 4225; the devil is another word. Sense left present.
//   retur  Lexin's only sense ties the card (R-8b); Korp only failed to show a gloss: verified by the
//          dictionary link, the Korp result kept in detail.previous.
//   sprit, alarm  no dictionary tie, Korp already paid for: left as they are (ledger: pending).
// Every old value archived (content_audit_archive, reason round_g_conflict); --rollback <batch>.
//   node --env-file=.env scripts/round-g-conflicts.mjs [--apply] | --rollback <batch>
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
const FAN = "50eae3a3-6202-400e-aa99-6428096e987c", RETUR = "c21d7680-7baf-40a4-a59c-93ab8bd4a9a2";

if (process.argv.includes("--rollback")) {
  const batch = process.argv[process.argv.indexOf("--rollback") + 1];
  for (const r of must(await db.from("content_audit_archive").select("*").eq("batch_id", batch).eq("reason", "round_g_conflict"))) {
    if (r.table_name === "learning_objects") must(await db.from("learning_objects").update({ [r.field]: r.old_value }).eq("id", r.learning_object_id));
    else if (r.table_name === "learning_object_translations") must(await db.from("learning_object_translations").update({ meaning: r.old_value }).eq("learning_object_id", r.learning_object_id).eq("native_language", r.field));
    else must(await db.from("resource_field_status").upsert({ learning_object_id: r.learning_object_id, field: r.field, ...JSON.parse(r.old_value) }, { onConflict: "learning_object_id,field" }));
  }
  must(await db.rpc("refresh_resource_summary", { p_ids: [FAN, RETUR] }));
  console.log({ rolledBack: batch });
  process.exit(0);
}

const fanNew = { zh: "（球队、明星等的）粉丝，狂热支持者", en: "fan; admirer; supporter", sv: "En fan är en beundrare eller supporter, till exempel av ett idrottslag eller en artist." };
const fan = must(await db.from("learning_objects").select("swedish_explanation").eq("id", FAN).single());
const fanT = must(await db.from("learning_object_translations").select("native_language, meaning").eq("learning_object_id", FAN));
const sense = new Map(must(await db.from("resource_field_status").select("learning_object_id, status, grade, source, detail, rule_version").eq("field", "sense").in("learning_object_id", [FAN, RETUR])).map((r) => [r.learning_object_id, r]));
console.log({ fan: { before: { sv: fan.swedish_explanation, ...Object.fromEntries(fanT.map((t) => [t.native_language, t.meaning])) }, after: fanNew }, retur: "sense → verified (dictionary_sense_link, R-8b 14350)" });
if (!process.argv.includes("--apply")) process.exit(0);
const batch = randomUUID(), now = new Date().toISOString();
const strip = (o) => (({ learning_object_id, ...r }) => r)(o);
must(await db.from("content_audit_archive").insert([
  { batch_id: batch, learning_object_id: FAN, table_name: "learning_objects", field: "swedish_explanation", old_value: fan.swedish_explanation, new_value: fanNew.sv, reason: "round_g_conflict" },
  ...fanT.map((t) => ({ batch_id: batch, learning_object_id: FAN, table_name: "learning_object_translations", field: t.native_language, old_value: t.meaning, new_value: fanNew[t.native_language], reason: "round_g_conflict" })),
  ...[FAN, RETUR].map((id) => ({ batch_id: batch, learning_object_id: id, table_name: "resource_field_status", field: "sense", old_value: JSON.stringify(strip(sense.get(id))), new_value: id === FAN ? "present" : "verified", reason: "round_g_conflict" })),
]));
must(await db.from("learning_objects").update({ swedish_explanation: fanNew.sv }).eq("id", FAN));
for (const l of ["zh", "en"]) must(await db.from("learning_object_translations").update({ meaning: fanNew[l] }).eq("learning_object_id", FAN).eq("native_language", l));
must(await db.from("resource_field_status").upsert({ learning_object_id: FAN, field: "sense", status: "present", grade: "unverified", source: "manual-fix;lexin-sv", rule_version: "kv2-2026-11-11/conflict",
  detail: { fixed: "English false friend: was 'fan; hand fan' / 风扇；扇子", lexin_variant: "4225", previous: strip(sense.get(FAN)) }, updated_at: now }, { onConflict: "learning_object_id,field" }));
must(await db.from("resource_field_status").upsert({ learning_object_id: RETUR, field: "sense", status: "verified", grade: "verified", source: "dictionary_sense_link", rule_version: "kv2-2026-11-11/R-8b",
  detail: { lexin_variant: "14350", shared: ["skickas", "tillbaka"], previous: strip(sense.get(RETUR)) }, updated_at: now }, { onConflict: "learning_object_id,field" }));
must(await db.rpc("refresh_resource_summary", { p_ids: [FAN, RETUR] }));
console.log({ batch });
