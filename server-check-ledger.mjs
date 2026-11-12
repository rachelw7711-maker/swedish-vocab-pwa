// Paid knowledge checks, kept whole and never paid for twice (round G, 2026-11-11; table
// public.knowledge_checks). A check is identified by its task key: the entry, the field, the target,
// a hash of the content it checks and the check's version. Before any AI call:
//   done row        → its result is reused (no call)
//   running row     → another worker holds it while its lease lasts: skipped, not paid twice
//   failed row      → retried, attempts counted
//   none            → claimed (insert; the unique key makes two workers' claims one)
// After the call the whole result is stored at once, before anything else is written; when even that
// fails, it goes to a local file (FALLBACK) that the next run loads back first — a paid answer is
// never thrown away and paid for again.
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, readFileSync, renameSync } from "node:fs";

export const FALLBACK = "data/reports/knowledge-checks-fallback.ndjson";
const LEASE_MS = 30 * 60 * 1000;

export const hashOf = (value) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex").slice(0, 32);
export const taskKey = ({ learningObjectId, field, target, inputHash, checkVersion }) => hashOf([learningObjectId, field, target, inputHash, checkVersion].join("|"));

/** The paid results a crashed write left in FALLBACK, stored now. → number recovered. */
export async function recoverFallback(db) {
  if (!existsSync(FALLBACK)) return 0;
  const rows = readFileSync(FALLBACK, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  for (const r of rows) {
    const { error } = await db.from("knowledge_checks").upsert(r, { onConflict: "task_key" });
    if (error) throw new Error(`fallback not recovered: ${error.message}`);
  }
  renameSync(FALLBACK, `${FALLBACK}.recovered-${Date.now()}`);
  return rows.length;
}

/**
 * Runs `run()` (the paid check) only when the same task has no result yet.
 *   spec: { learningObjectId, headword, pos, field, senseRef, target, input, identity, referencesUsed, checkVersion, ruleVersion, model, batchId, recheckReason }
 *   identity: what makes two checks the same (default input) — e.g. the meaning and the query, not
 *   the sample of sentences a corpus happens to return
 *   run:  async () => ({ result, conflicts, costUsd, calls, usage })
 * → { reused: true, row } | { skipped: "running" } | { row } (a new result) | throws after storing the failure
 */
export async function ledgeredCheck(db, spec, run) {
  const inputHash = hashOf(spec.identity ?? spec.input);
  const key = taskKey({ ...spec, inputHash });
  const { data: prev, error: readError } = await db.from("knowledge_checks").select("*").eq("task_key", key).maybeSingle();
  if (readError) throw readError;
  if (prev?.status === "done") return { reused: true, row: prev };
  if (prev?.status === "running" && Date.now() - Date.parse(prev.started_at) < LEASE_MS) return { skipped: "running" };
  // A new key for an entry already checked this way: say why it is paid for again (round G, 2026-11-12) —
  // its content changed or the method did; a caller's own reason wins.
  let recheckReason = spec.recheckReason || null;
  if (!prev && !recheckReason) {
    const { data: earlier } = await db.from("knowledge_checks").select("check_version, input_hash").eq("learning_object_id", spec.learningObjectId)
      .eq("field", spec.field).eq("target", spec.target).eq("status", "done").order("finished_at", { ascending: false }).limit(1);
    if (earlier?.length) recheckReason = earlier[0].check_version !== spec.checkVersion ? `new_check_version:${earlier[0].check_version}` : "content_changed";
  }
  const base = { task_key: key, learning_object_id: spec.learningObjectId, headword: spec.headword, part_of_speech: spec.pos || null, field: spec.field, sense_ref: spec.senseRef || null,
    target: spec.target, input_hash: inputHash, input: spec.input, references_used: spec.referencesUsed || null, check_version: spec.checkVersion, rule_version: spec.ruleVersion || null,
    model: spec.model || null, batch_id: spec.batchId || null, recheck_reason: recheckReason };
  if (prev) {   // failed, or a lease that ran out: taken over, only while it is still that row
    const { data: took, error } = await db.from("knowledge_checks").update({ ...base, status: "running", attempts: prev.attempts + 1, started_at: new Date().toISOString(), error: null })
      .eq("task_key", key).eq("status", prev.status).eq("started_at", prev.started_at).select("id");
    if (error) throw error;
    if (!took.length) return { skipped: "running" };
  } else {
    const { error } = await db.from("knowledge_checks").insert({ ...base, status: "running" });
    if (error) { if (error.code === "23505") return { skipped: "running" }; throw error; }
  }
  let out;
  try {
    out = await run();
  } catch (e) {
    await db.from("knowledge_checks").update({ status: "failed", error: String(e.message || e).slice(0, 500), finished_at: new Date().toISOString(),
      cost_usd: e.costUsd || 0, calls: e.calls || 0 }).eq("task_key", key);
    throw e;
  }
  const done = { ...base, status: "done", finished_at: new Date().toISOString(), result: out.result, conflicts: out.conflicts || null,
    cost_usd: +(out.costUsd || 0).toFixed(6), calls: out.calls || 0, usage: out.usage || null };
  const { data: row, error } = await db.from("knowledge_checks").update(done).eq("task_key", key).select("*").single();
  if (error) { appendFileSync(FALLBACK, JSON.stringify(done) + "\n"); return { row: done, fallback: true }; }
  return { row };
}

/** What the result did to the card, recorded on its check. */
export async function markAdopted(db, taskKeyValue, adopted, writtenFields = []) {
  const { error } = await db.from("knowledge_checks").update({ adopted, written_fields: writtenFields }).eq("task_key", taskKeyValue);
  if (error) throw error;
}
