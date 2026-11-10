// Shows reviewed draft expressions (2026-11-09, G4): ai_candidate drafts whose sense Korp verified
// (every part of the meaning in real sentences, two readings) and whose whole-card check found
// nothing (check-entries report), each then read by the reviewer; the ones the reviewer held stay
// drafts. Only rows still draft with a verified sense are changed (draft → ai_generated, as a
// generated card that passes is saved), at most --limit a batch; each batch backs the rows up and
// writes the rollback SQL first, then reads them back.
//   node --env-file=.env scripts/promote-reviewed-drafts.mjs --ids <json> [--hold <json>] [--limit 50] [--write]
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";

const opt = (n, d = null) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const WRITE = process.argv.includes("--write"), LIMIT = Number(opt("--limit", "50"));
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const hold = new Set(opt("--hold") ? JSON.parse(readFileSync(opt("--hold"), "utf8")).map((h) => h.id || h) : []);
const ids = JSON.parse(readFileSync(opt("--ids"), "utf8")).map((c) => c.id || c).filter((id) => !hold.has(id));

const rows = [];
for (let i = 0; i < ids.length; i += 100) {
  const part = ids.slice(i, i + 100);
  const { data: lo, error } = await db.from("learning_objects").select("id, swedish, status, content_origin, updated_at").in("id", part);
  if (error) throw error;
  const { data: st } = await db.from("resource_field_status").select("learning_object_id, status, grade").eq("field", "sense").in("learning_object_id", part);
  // Shown only on independent evidence (Korp's sense check: grade verified), never an AI check alone.
  for (const o of lo) { const s = st.find((x) => x.learning_object_id === o.id); rows.push({ ...o, sense: s?.status === "verified" && s.grade === "verified" ? "verified" : s?.status }); }
}
const ready = rows.filter((r) => r.status === "draft" && r.sense === "verified").slice(0, LIMIT);
const done = rows.filter((r) => r.status === "ai_generated").length;
console.log(`asked ${ids.length} (held ${hold.size}), shown before ${done}, this batch ${ready.length}, not draft+verified (skipped) ${rows.length - done - rows.filter((r) => r.status === "draft" && r.sense === "verified").length}`);
if (!WRITE || !ready.length) process.exit(0);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const base = `data/reports/round-e/promote-drafts-${stamp}`;
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
writeFileSync(`${base}.json`, JSON.stringify(ready, null, 1));
writeFileSync(`${base}-rollback.sql`, ["begin;", ...ready.map((r) => `update public.learning_objects set status = 'draft', updated_at = ${q(r.updated_at)} where id = ${q(r.id)} and status = 'ai_generated';`),
  `select public.refresh_resource_summary(array[${ready.map((r) => `${q(r.id)}::uuid`).join(",")}]);`, "commit;"].join("\n") + "\n");
const now = new Date().toISOString();
const { error } = await db.from("learning_objects").update({ status: "ai_generated", updated_at: now }).in("id", ready.map((r) => r.id)).eq("status", "draft");
if (error) throw error;
await db.rpc("refresh_resource_summary", { p_ids: ready.map((r) => r.id) });
const { data: back } = await db.from("learning_objects").select("id, status").in("id", ready.map((r) => r.id));
const wrong = back.filter((b) => b.status !== "ai_generated");
console.log(`written ${ready.length}, read back ${back.length}, not shown ${wrong.length}; backup and rollback ${base}*`);
if (wrong.length) process.exit(1);
