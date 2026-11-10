// Integration test of server-check-ledger.mjs against public.knowledge_checks (no AI; the "paid"
// step is a counter). Its rows (target ledger_test) are deleted at the end.
//   node --env-file=.env scripts/check-ledger-test.mjs
import assert from "node:assert/strict";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { ledgeredCheck, recoverFallback, FALLBACK, hashOf, taskKey } from "../server-check-ledger.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: card } = await db.from("learning_objects").select("id, swedish").eq("swedish", "påverka").limit(1).single();
const spec = { learningObjectId: card.id, headword: card.swedish, field: "sense", target: "ledger_test", input: { meaning: "influence", n: Date.now() }, checkVersion: "t1", model: "none" };
let paid = 0;
const run = async () => { paid++; await new Promise((r) => setTimeout(r, 300)); return { result: { ok: true }, costUsd: 0.001, calls: 2 }; };
try {
  // 1. Two workers at once: one pays, the other is told it is running.
  const [a, b] = await Promise.all([ledgeredCheck(db, spec, run), ledgeredCheck(db, spec, run)]);
  assert.equal(paid, 1); assert.ok([a, b].some((x) => x.skipped === "running"));
  // 2. A restart: the stored result is reused, nothing paid.
  const again = await ledgeredCheck(db, spec, run);
  assert.equal(again.reused, true); assert.equal(paid, 1); assert.equal(again.row.result.ok, true);
  // 3. Changed content is a new task (paid once more); the old result stays.
  await ledgeredCheck(db, { ...spec, input: { ...spec.input, meaning: "affect" } }, run);
  assert.equal(paid, 2);
  // 4. A failed call is stored as failed and retried, attempts counted.
  const failSpec = { ...spec, input: { ...spec.input, fail: true } };
  await assert.rejects(ledgeredCheck(db, failSpec, async () => { throw new Error("boom"); }));
  const retried = await ledgeredCheck(db, failSpec, run);
  assert.equal(retried.row.attempts, 2); assert.equal(paid, 3);
  // 5. A result the database didn't take (kept in the fallback file) is recovered, then reused.
  const lostSpec = { ...spec, input: { ...spec.input, lost: true } };
  const key = taskKey({ ...lostSpec, inputHash: hashOf(lostSpec.input) });
  if (existsSync(FALLBACK)) throw new Error("a real fallback file exists: recover it first");
  writeFileSync(FALLBACK, JSON.stringify({ task_key: key, learning_object_id: card.id, headword: card.swedish, field: "sense", target: "ledger_test", input_hash: hashOf(lostSpec.input), input: lostSpec.input, check_version: "t1", status: "done", result: { ok: true, recovered: true }, cost_usd: 0.001, calls: 2 }) + "\n");
  assert.equal(await recoverFallback(db), 1);
  const back = await ledgeredCheck(db, lostSpec, run);
  assert.equal(back.reused, true); assert.equal(back.row.result.recovered, true); assert.equal(paid, 3);
  console.log("ledger: concurrency, restart reuse, new content, failure retry, fallback recovery — all pass");
} finally {
  await db.from("knowledge_checks").delete().eq("target", "ledger_test");
  for (const f of [FALLBACK]) if (existsSync(f)) unlinkSync(f);
}
