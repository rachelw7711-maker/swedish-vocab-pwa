// Full-lexicon AI audit (the 2026-11-02 audit, brought into the repo and fixed 2026-11-09,
// knowledge v2 S7; data/reports/round-f/knowledge-audit-2026-11-09.md §8). READ-ONLY: it never
// writes to the content tables; answers go to a results file. Its answers are one AI check —
// evidence of kind ai_one / legacy_ai, never "verified" on their own; anything written from them
// goes through the evidence model (server-evidence.mjs gradeItem) in a separate, approved step.
// Costs money: it refuses to start without --budget (USD) and stops when the cost reaches it.
//   node --env-file=.env scripts/audit-full.mjs --budget 5 [--pilot 40] [--ids a,b] [--concurrency 3]
// Fixes against the old run (2,527 of 3,785 calls were retries; 32 items lost without a trace):
//   - 3 entries a call instead of 8: a missing example key cost a whole entry's retry;
//   - a task that fails is written to the results file and counted, never skipped silently;
//   - the run is resumable from the results file and records the rule version it ran under;
//   - ids are paged in a fixed order (R10).
import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { auditItems } from "./audit-full-items.mjs";
import { aiSenseCheck, CHECK_VERSION } from "../server-language-checks.mjs";
import { ordered } from "./page-order.mjs";

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const budget = Number(arg("--budget", 0));
if (!(budget > 0)) { console.error("Refusing to run: an AI audit costs money. Pass --budget <USD> (approved)."); process.exit(2); }
const pilot = Number(arg("--pilot", 0));
const conc = Number(arg("--concurrency", 3));
const onlyIds = arg("--ids", "") ? arg("--ids").split(",") : null;
const CHUNK = 3, PER_TASK = 12;
const RULE_VERSION = `audit-full/${CHECK_VERSION}/chunk${CHUNK}`;

const dir = "data/reports/audit-full";
mkdirSync(dir, { recursive: true });
const OUT = `${dir}/${pilot ? "pilot" : "audit"}.jsonl`, USAGE = `${dir}/${pilot ? "pilot" : "audit"}-usage.json`;
const prior = existsSync(OUT) ? readFileSync(OUT, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
// Done: an answer under this rule version. A failure is tried again on the next run.
const done = new Set(prior.filter((r) => r.check && r.rule_version === RULE_VERSION).map((r) => r.id));
const usage = existsSync(USAGE) ? JSON.parse(readFileSync(USAGE, "utf8")) : { input_tokens: 0, output_tokens: 0, calls: 0, cost: 0, retries: 0, failed_calls: 0, items: 0, failed_items: 0, failed_tasks: 0, retry_reasons: {} };

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
async function all(table, select, filter = (q) => q) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await ordered(filter(sb.from(table).select(select)), table).range(from, from + 999);
    if (error) throw error; out.push(...data); if (data.length < 1000) return out;
  }
}
let ids = onlyIds || (await all("learning_objects", "id", (q) => q.neq("status", "retired"))).map((r) => r.id);
ids = ids.filter((id) => !done.has(id));
if (pilot) ids = ids.sort(() => Math.random() - 0.5).slice(0, pilot);
console.log("to audit", ids.length, "done before", done.size, "rule", RULE_VERSION, "budget $", budget);

let next = 0, stop = false;
const t0 = Date.now();
const record = (row) => appendFileSync(OUT, JSON.stringify({ ...row, rule_version: RULE_VERSION, at: new Date().toISOString() }) + "\n");
async function worker() {
  while (next < ids.length && !stop) {
    const slice = ids.slice(next, next + PER_TASK); next += PER_TASK;
    let items = [], out;
    try {
      items = await auditItems(sb, slice);
      out = await aiSenseCheck(sb, items, { feature: "audit_full", chunk: CHUNK, audit: true });
    } catch (e) {
      // Recorded and counted, never skipped silently (the old run lost 32 items here).
      usage.failed_tasks++;
      for (const id of slice) { usage.items++; usage.failed_items++; record({ id, check: null, failure: [`task_failed:${e.message}`] }); }
      continue;
    }
    for (const k of ["input_tokens", "output_tokens", "calls", "cost", "retries", "failed_calls"]) usage[k] += out.usage[k] || 0;
    for (const [k, v] of Object.entries(out.usage.retry_reasons || {})) usage.retry_reasons[k] = (usage.retry_reasons[k] || 0) + v;
    for (const id of slice) {
      const it = items.find((x) => x.id === id);
      const check = out.checks.get(id) || null;
      usage.items++; if (!check) usage.failed_items++;
      if (!it) { record({ id, check: null, failure: ["not_found"] }); continue; }
      const { entry, references, ...rest } = it;
      record({ ...rest, entry, references: { ...references, wiktionary: { status: references.wiktionary?.status } }, check, failure: check ? null : (out.failures.get(id) || ["no_answer"]) });
    }
    writeFileSync(USAGE, JSON.stringify(usage));
    if (usage.cost >= budget) { stop = true; console.log("budget reached: stopping"); }
    console.log(new Date().toISOString().slice(11, 19), "items", usage.items, "failed", usage.failed_items, "cost", usage.cost.toFixed(3), "per item", (usage.cost / Math.max(1, usage.items)).toFixed(5), "min", ((Date.now() - t0) / 60000).toFixed(1));
  }
}
await Promise.all(Array.from({ length: conc }, worker));
console.log(stop ? "STOPPED (budget)" : "FINISHED", usage);
