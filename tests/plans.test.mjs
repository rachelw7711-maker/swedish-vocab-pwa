// Plan allowances: off by default, counted the same way when the switch is on (2026-10-31).
import { test } from "node:test";
import assert from "node:assert/strict";
import { planAllowance } from "../server-plans.mjs";
import { fakeSupabase } from "./fake-supabase.mjs";

const recent = new Date().toISOString();
const base = (commercial) => fakeSupabase({
  app_settings: [{ id: true, commercial_mode: commercial }],
  user_preferences: [{ user_id: "free-user", account_plan: "free" }, { user_id: "sub", account_plan: "standard" }],
  app_admins: [{ user_id: "owner" }],
  plan_limits: [{ plan: "free", feature: "reading_analysis", period: "week", max_count: 1 }, { plan: "free", feature: "shadowing_evaluation", period: "per_text", max_count: 1 }],
  ai_usage_logs: [{ id: 1, user_id: "free-user", feature: "reading_fast_layer", created_at: recent }],
});
// The fake has no head/count support: count is the length of the selected rows.
function withCounts(db) {
  const from = db.from;
  db.from = (t) => { const b = from(t); const then = b.then; b.then = (res, rej) => then.call(b, (r) => res({ ...r, count: r.data?.length ?? 0 }), rej); return b; };
  return db;
}

test("commercial mode off: never blocks, still reports usage", async () => {
  const r = await planAllowance(withCounts(base(false)), "free-user", "reading_analysis");
  assert.deepEqual({ enforced: r.enforced, allowed: r.allowed, used: r.used, limit: r.limit }, { enforced: false, allowed: true, used: 1, limit: 1 });
});

test("commercial mode on: free plan limited, subscriber and owner not", async () => {
  assert.equal((await planAllowance(withCounts(base(true)), "free-user", "reading_analysis")).allowed, false);
  assert.equal((await planAllowance(withCounts(base(true)), "sub", "reading_analysis")).allowed, true);
  assert.equal((await planAllowance(withCounts(base(true)), "owner", "reading_analysis")).limit, null);
  assert.equal((await planAllowance(withCounts(base(true)), "new-user", "shadowing_evaluation", { textResourceId: "t1" })).allowed, true);
});
