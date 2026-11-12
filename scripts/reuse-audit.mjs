// Round G (2026-11-12), READ-ONLY: what the paid checks already left behind and whether it can be
// reused — the ledger (knowledge_checks) by target / version / status / cost, results stored per sense,
// paid rows without a stored result, evidence rows by kind, the Korp cache, and AI usage rows that
// carry a cost outside the ledger.
//   node --env-file=.env scripts/reuse-audit.mjs
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
async function all(table, cols, f = (q) => q) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await f(db.from(table).select(cols)).range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) return out;
  }
}
const tally = (rows, k) => rows.reduce((m, r) => { const key = k(r); m[key] = m[key] || { n: 0, usd: 0 }; m[key].n++; m[key].usd = +(m[key].usd + Number(r.cost_usd || 0)).toFixed(4); return m; }, {});

const kc = await all("knowledge_checks", "target, check_version, rule_version, status, cost_usd, attempts, sense_ref, result, learning_object_id, recheck_reason");
console.log("ledger rows", kc.length, "objects", new Set(kc.map((r) => r.learning_object_id)).size);
console.log("by target/version/status", tally(kc, (r) => `${r.target}|${r.check_version}|${r.status}`));
console.log("by rule_version", tally(kc, (r) => r.rule_version));
console.log("paid without result", kc.filter((r) => Number(r.cost_usd) > 0 && !r.result).length, "failed", kc.filter((r) => r.status === "failed").length,
  "attempts>1", kc.filter((r) => r.attempts > 1).length, "with sense_ref", kc.filter((r) => r.sense_ref).length, "recheck_reason", kc.filter((r) => r.recheck_reason).length);
const perObj = {};
for (const r of kc.filter((r) => r.status === "done")) (perObj[`${r.learning_object_id}|${r.target}`] ||= []).push(r);
console.log("objects with >1 done row of the same target", Object.values(perObj).filter((v) => v.length > 1).length);

const ev = await all("content_evidence", "item_type, kind, result, rule_version");
console.log("evidence rows", ev.length, tally(ev, (r) => `${r.item_type}|${r.kind}|${r.result}`));
const { count: korp } = await db.from("korp_cache").select("key", { count: "exact", head: true });
const { count: senses } = await db.from("learning_object_senses").select("id", { count: "exact", head: true });
console.log("korp_cache", korp, "learning_object_senses", senses);
const since = new Date(Date.now() - 30 * 864e5).toISOString();
const logs = await all("ai_usage_logs", "feature, actual_cost, created_at", (q) => q.gte("created_at", since));
console.log("ai_usage_logs 30d", tally(logs.map((l) => ({ ...l, cost_usd: l.actual_cost })), (r) => r.feature));
