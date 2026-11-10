// Round G (2026-11-11): applies the zero-AI findings of scripts/withheld-ledger.mjs to the withheld
// cards. Each step archived (content_audit_archive, reason round_g_withheld_<step>) for --rollback.
//   sense    a card whose core sense a dictionary ties to one sense (Lexin sense link, or an
//            expression's own Lexin idiom whose English matches) gets sense verified, grade verified
//            (evidence dictionary_sense_link / dictionary_listing) — never from an English overlap alone
//   retire   a card whose headword is an inflected form of a lemma that has its own card
//            (förändras → förändra), with no learner: retired (never deleted, never reused)
//   refresh  statuses recomputed (refresh_resource_summary)
//   restore  the cards the ledger, rerun on the new statuses, marks "restore": back to their status
//            before the withholding (scripts/withhold-unverified.mjs --restore, per card)
//   node --env-file=.env scripts/withheld-apply.mjs <withhold batch> sense|retire|refresh [--apply]
//   node --env-file=.env scripts/withheld-apply.mjs --rollback <batch>
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
const APPLY = process.argv.includes("--apply");

if (process.argv.includes("--rollback")) {
  const batch = process.argv[process.argv.indexOf("--rollback") + 1];
  const rows = must(await db.from("content_audit_archive").select("learning_object_id, table_name, field, old_value, new_value, reason").eq("batch_id", batch).like("reason", "round_g_withheld_%"));
  let n = 0;
  for (const r of rows) {
    if (r.table_name === "learning_objects") n += must(await db.from("learning_objects").update({ status: r.old_value }).eq("id", r.learning_object_id).eq("status", r.new_value).select("id")).length;
    else if (r.old_value) { must(await db.from("resource_field_status").upsert({ learning_object_id: r.learning_object_id, field: r.field, ...JSON.parse(r.old_value) }, { onConflict: "learning_object_id,field" })); n++; }
    else n += must(await db.from("resource_field_status").delete().eq("learning_object_id", r.learning_object_id).eq("field", r.field).select("learning_object_id")).length;
  }
  must(await db.rpc("refresh_resource_summary", { p_ids: [...new Set(rows.map((r) => r.learning_object_id))] }));
  console.log({ batch, restored: n });
  process.exit(0);
}

const [withholdBatch, step] = process.argv.slice(2);
const ledger = JSON.parse(readFileSync("data/reports/round-g/withheld-ledger.json", "utf8"));
if (ledger.batch !== withholdBatch) throw new Error("ledger is of another batch: rerun scripts/withheld-ledger.mjs");
const batch = randomUUID();
const now = new Date().toISOString();
const archive = (rows) => rows.length && must(db.from("content_audit_archive").insert(rows));

if (step === "sense") {
  const list = ledger.cards.filter((c) => /^dictionary_(sense_link|idiom_english)/.test(c.senseEvidence || "") && !(c.conflicts || []).some((x) => x.field === "sense"));
  const prev = new Map(must(await db.from("resource_field_status").select("learning_object_id, status, source, grade, detail").eq("field", "sense").in("learning_object_id", list.map((c) => c.id))).map((r) => [r.learning_object_id, r]));
  const todo = list.filter((c) => !(prev.get(c.id)?.status === "verified" && prev.get(c.id)?.grade === "verified"));
  console.log({ step, cards: todo.length, list: todo.map((c) => `${c.swedish} ← ${c.senseEvidence}`) });
  if (APPLY) {
    await archive(todo.map((c) => ({ batch_id: batch, learning_object_id: c.id, table_name: "resource_field_status", field: "sense", old_value: prev.get(c.id) ? JSON.stringify((({ learning_object_id, ...r }) => r)(prev.get(c.id))) : null, new_value: "verified", reason: "round_g_withheld_sense" })));
    for (const c of todo) {
      const link = c.senseEvidence.startsWith("dictionary_sense_link");
      must(await db.from("resource_field_status").upsert({ learning_object_id: c.id, field: "sense", status: "verified", grade: "verified", rule_version: "kv2-2026-11-11/withheld",
        source: link ? "dictionary_sense_link" : "dictionary_listing", detail: { evidence: c.senseEvidence, listing: c.listing || null, round: "G withheld review" }, updated_at: now }, { onConflict: "learning_object_id,field" }));
    }
    must(await db.rpc("refresh_resource_summary", { p_ids: todo.map((c) => c.id) }));
    console.log({ batch, written: todo.length });
  }
} else if (step === "retire") {
  const list = ledger.cards.filter((c) => c.headword?.lemmaCard && c.learners === 0);
  console.log({ step, cards: list.length, list: list.map((c) => `${c.swedish} (${c.pos}) → ${c.headword.inflectedOf}`) });
  if (APPLY) {
    await archive(list.map((c) => ({ batch_id: batch, learning_object_id: c.id, table_name: "learning_objects", field: "status", old_value: "draft", new_value: "retired", reason: "round_g_withheld_retire" })));
    let n = 0;
    for (const c of list) n += must(await db.from("learning_objects").update({ status: "retired" }).eq("id", c.id).eq("status", "draft").select("id")).length;
    console.log({ batch, retired: n });
  }
} else if (step === "refresh") {
  must(await db.rpc("refresh_resource_summary", { p_ids: ledger.cards.map((c) => c.id) }));
  console.log({ refreshed: ledger.cards.length });
}
