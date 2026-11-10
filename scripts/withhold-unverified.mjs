// Round G (2026-11-11, owner's rule): a card nothing has verified (verification_status unverified)
// is not in the shared library, and one whose checks conflict (needs_review) is withheld until it
// is fixed. Such cards become drafts — out of the shared lists, search and new-word picks; a reader
// who saved or studies one keeps it, marked "Ej verifierad" — never deleted. Every status change is
// archived (content_audit_archive, reason round_g_withhold) and restored per card with --restore
// once the card is verified or fixed (only while it is still the draft this script made).
//   node --env-file=.env scripts/withhold-unverified.mjs                 # dry run
//   node --env-file=.env scripts/withhold-unverified.mjs --apply
//   node --env-file=.env scripts/withhold-unverified.mjs --restore <batch> [--ids file]
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { ordered } from "./page-order.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const REASON = "round_g_withhold";
const PUBLIC = ["published", "human_reviewed", "ai_generated"];

if (process.argv.includes("--restore")) {
  const batch = arg("--restore");
  const only = arg("--ids") ? new Set(readFileSync(arg("--ids"), "utf8").match(/[0-9a-f-]{36}/g)) : null;
  const rows = must(await db.from("content_audit_archive").select("learning_object_id, old_value").eq("batch_id", batch).eq("reason", REASON));
  let n = 0;
  for (const r of rows.filter((r) => !only || only.has(r.learning_object_id))) {
    n += must(await db.from("learning_objects").update({ status: r.old_value }).eq("id", r.learning_object_id).eq("status", "draft").select("id")).length;
  }
  console.log({ batch, restored: n });
  process.exit(0);
}

const all = [];
for (let i = 0; ; i += 1000) {
  const data = must(await ordered(db.from("learning_objects").select("id, swedish, object_type, status, verification_status").in("status", PUBLIC).in("verification_status", ["unverified", "needs_review"]), "learning_objects").range(i, i + 999));
  all.push(...data); if (data.length < 1000) break;
}
const tally = {};
for (const r of all) tally[`${r.object_type} ${r.status} ${r.verification_status}`] = (tally[`${r.object_type} ${r.status} ${r.verification_status}`] || 0) + 1;
console.log({ cards: all.length, tally });
if (!process.argv.includes("--apply")) process.exit(0);
const batch = randomUUID();
for (let i = 0; i < all.length; i += 200) {
  const part = all.slice(i, i + 200);
  must(await db.from("content_audit_archive").insert(part.map((r) => ({ batch_id: batch, learning_object_id: r.id, table_name: "learning_objects", field: "status", old_value: r.status, new_value: "draft", reason: REASON }))));
  for (const r of part) must(await db.from("learning_objects").update({ status: "draft" }).eq("id", r.id).eq("status", r.status));
}
const back = must(await db.from("learning_objects").select("id, status").in("id", all.map((r) => r.id).slice(0, 1000)));
writeFileSync(`data/reports/round-g/withhold-${batch}.json`, JSON.stringify({ batch, tally, cards: all }, null, 1));
console.log({ batch, drafts: back.filter((r) => r.status === "draft").length, of: all.length });
