// Round G (2026-11-11), P3 reuse: Korp sense checks already paid for (scripts/korp-verify.mjs,
// 2026-11-04, cache data/reports/korp-verify/results.json) that never reached the card's sense row
// — a later AI check had written "present" over them (fixed: senseRowOver). Reused only when the
// check is final (part by part, every part of the meaning in ≥2 confirmed sentences) and the card's
// English meaning is still the one checked; never over a mismatch or a verified-grade row. No AI.
// Written like korp-verify --write (sense verified, grade verified, detail.korp), old row archived
// (content_audit_archive, reason round_g_korp_reuse); statuses recomputed. Dry run by default.
//   node --env-file=.env scripts/reuse-korp-senses.mjs [--apply]
//   node --env-file=.env scripts/reuse-korp-senses.mjs --rollback <batch>
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { meaningParts } from "../server-korp.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };

if (process.argv.includes("--rollback")) {
  const batch = process.argv[process.argv.indexOf("--rollback") + 1];
  const rows = must(await db.from("content_audit_archive").select("learning_object_id, old_value").eq("batch_id", batch).eq("reason", "round_g_korp_reuse"));
  for (const r of rows) must(await db.from("resource_field_status").upsert({ learning_object_id: r.learning_object_id, field: "sense", ...JSON.parse(r.old_value) }, { onConflict: "learning_object_id,field" }));
  if (rows.length) must(await db.rpc("refresh_resource_summary", { p_ids: rows.map((r) => r.learning_object_id) }));
  console.log({ batch, restored: rows.length });
  process.exit(0);
}

const cache = JSON.parse(readFileSync("data/reports/korp-verify/results.json", "utf8"));
const final = Object.entries(cache).filter(([, c]) => c.sense?.ok === true && c.sense.method === "parts");
const ids = final.map(([id]) => id);
const rows = new Map(), en = new Map(), cards = new Map();
for (let i = 0; i < ids.length; i += 25) {
  const part = ids.slice(i, i + 25);
  for (const r of must(await db.from("resource_field_status").select("learning_object_id, status, grade, source, detail, rule_version").eq("field", "sense").in("learning_object_id", part))) rows.set(r.learning_object_id, r);
  for (const t of must(await db.from("learning_object_translations").select("learning_object_id, meaning").eq("native_language", "en").in("learning_object_id", part))) en.set(t.learning_object_id, t.meaning);
  for (const c of must(await db.from("learning_objects").select("id, swedish, status").in("id", part))) cards.set(c.id, c);
}
const same = (a, b) => JSON.stringify(a.map((x) => x.toLowerCase().replace(/[.!?]+$/, "").trim())) === JSON.stringify(b.map((x) => x.toLowerCase().replace(/[.!?]+$/, "").trim()));
const tally = {}, todo = [];
for (const [id, c] of final) {
  const row = rows.get(id), card = cards.get(id);
  const why = !card || card.status === "retired" ? "gone" : row?.grade === "verified" && row?.status === "verified" ? "already_verified" : row?.status === "mismatch" ? "mismatch_open"
    : !same(meaningParts(en.get(id) || ""), c.sense.parts || []) ? "meaning_changed" : "reuse";
  tally[why] = (tally[why] || 0) + 1;
  if (why === "reuse") todo.push({ id, swedish: card.swedish, status: card.status, old: row, korp: c.sense });
}
writeFileSync("data/reports/round-g/korp-reuse.json", JSON.stringify({ tally, todo: todo.map(({ id, swedish, status }) => ({ id, swedish, status })) }, null, 1));
console.log({ finalChecks: final.length, tally, cards: todo.map((t) => `${t.swedish} (${t.status})`) });
if (process.argv.includes("--apply") && todo.length) {
  const batch = randomUUID(), now = new Date().toISOString();
  const strip = (o) => o && (({ learning_object_id, ...r }) => r)(o);
  must(await db.from("content_audit_archive").insert(todo.map((t) => ({ batch_id: batch, learning_object_id: t.id, table_name: "resource_field_status", field: "sense", old_value: JSON.stringify(strip(t.old) || { status: "present", source: null, grade: null, detail: null }), new_value: "verified", reason: "round_g_korp_reuse" }))));
  for (const t of todo) {
    const { sentences, readings, ...korp } = t.korp;   // the sentences stay in the local cache
    must(await db.from("resource_field_status").upsert({ learning_object_id: t.id, field: "sense", status: "verified", grade: "verified", rule_version: "kv2-2026-11-11/korp-reuse",
      source: `${t.old?.source || "ai_check"};korp`, detail: { ...(t.old?.detail || {}), korp: { sense: korp, checked: "2026-11-04", reused: now } }, updated_at: now }, { onConflict: "learning_object_id,field" }));
  }
  must(await db.rpc("refresh_resource_summary", { p_ids: todo.map((t) => t.id) }));
  console.log({ batch, written: todo.length });
}
