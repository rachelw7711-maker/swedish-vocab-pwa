// Round G (2026-11-11), P3: the core sense of cards with no independent evidence checked against real
// sentences — Korp first (free: is the word there, as this part of speech?), then two AI readings of
// up to 12 Korp sentences, part by part (judgeSenseFromSentences, gpt-5.4-mini; the method of the
// 2026-11-04 run whose results are verified-grade evidence). Order (each card once, by id):
//   1 public cards with learners   2 the withheld drafts (round G 287) whose part of speech is verified
//   3 cards whose sense was just corrected (--ids-first <file>)   4 the other public cards, most frequent first
// Before anything is paid for:
//   - the sense row is re-read: a verified-grade sense or an open mismatch is left alone;
//   - a finished Korp check of the same meaning (data/reports/korp-verify/results.json) is reused —
//     passed, or failed with its reason — and never asked again;
//   - every check goes through public.knowledge_checks (server-check-ledger.mjs): a check made before
//     with the same meaning and query is reused, one running elsewhere skipped; the whole result
//     (sentences, both readings, verdict, cost) is stored before the card is touched.
// Spending: the round's checks (knowledge_checks, batch tag round_g_p3) never pass --max-usd.
// Written only on a pass: sense verified, grade verified (source …;korp), old row archived
// (content_audit_archive, reason round_g_p3_korp); a failed check changes nothing on the card.
//   node --env-file=.env scripts/p3-sense-check.mjs --max-usd 11.8 [--limit n] [--ids-first file] [--dry]
//   node --env-file=.env scripts/p3-sense-check.mjs --rollback <batch>
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { korpAttestation, judgeAttestation, korpCqp, korpSentences, judgeSenseFromSentences, meaningParts } from "../server-korp.mjs";
import { callOpenAIJson } from "../server-native.mjs";
import { openaiCost } from "../server-prices.mjs";
import { ledgeredCheck, recoverFallback, markAdopted } from "../server-check-ledger.mjs";
import { ordered } from "./page-order.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
const opt = (n, d = null) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const MODEL = "gpt-5.4-mini", CHECK_VERSION = "korp-sense-parts-2026-11-04", TAG = "round_g_p3";
const OUT = "data/reports/round-g/p3/";

if (process.argv.includes("--rollback")) {
  const batch = opt("--rollback");
  const rows = must(await db.from("content_audit_archive").select("learning_object_id, old_value").eq("batch_id", batch).eq("reason", "round_g_p3_korp"));
  for (const r of rows) must(await db.from("resource_field_status").upsert({ learning_object_id: r.learning_object_id, field: "sense", ...JSON.parse(r.old_value) }, { onConflict: "learning_object_id,field" }));
  for (let i = 0; i < rows.length; i += 200) must(await db.rpc("refresh_resource_summary", { p_ids: rows.slice(i, i + 200).map((r) => r.learning_object_id) }));
  console.log({ batch, restored: rows.length });
  process.exit(0);
}

const MAX_USD = Number(opt("--max-usd", "0"));
const LIMIT = Number(opt("--limit")) || Infinity;
const DRY = process.argv.includes("--dry");
const { mkdirSync } = await import("node:fs"); mkdirSync(OUT, { recursive: true });
console.log({ recoveredFromFallback: await recoverFallback(db) });
const all = async (t, c, f) => { const o = []; for (let i = 0; ; i += 1000) { const d = must(await ordered(f(db.from(t).select(c)), t).range(i, i + 999)); o.push(...d); if (d.length < 1000) return o; } };
const spentSoFar = async () => (await all("knowledge_checks", "id, cost_usd", (q) => q.like("check_version", `${CHECK_VERSION}%`).eq("rule_version", TAG))).reduce((s, r) => s + Number(r.cost_usd), 0);

// ---- the order ----
const PUBLIC = ["published", "human_reviewed", "ai_generated"];
const sense = new Map((await all("resource_field_status", "learning_object_id, status, grade, source, detail", (q) => q.eq("field", "sense"))).map((r) => [r.learning_object_id, r]));
const posOk = new Set((await all("resource_field_status", "learning_object_id, status", (q) => q.eq("field", "pos").eq("status", "verified"))).map((r) => r.learning_object_id));
const cards = await all("learning_objects", "id, swedish, part_of_speech, object_type, status, verification_status, frequency_rank, cefr_level", (q) => q.in("status", [...PUBLIC, "draft"]));
const learners = new Set((await all("user_words", "word_id", (q) => q)).map((u) => u.word_id));
const withheld = new Set(readFileSync("data/reports/round-g/withheld-287-ids.txt", "utf8").split(/\s+/).filter(Boolean));
const first = opt("--ids-first") ? JSON.parse(readFileSync(opt("--ids-first"), "utf8")) : [];
const needs = (c) => { const s = sense.get(c.id); return !(s?.status === "verified" && s?.grade === "verified") && s?.status !== "mismatch"; };
const isPublic = (c) => PUBLIC.includes(c.status);
const CEFR = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
const rank = (c) => [c.frequency_rank ?? 1e9, CEFR[c.cefr_level] ?? 9];
const groups = [
  cards.filter((c) => isPublic(c) && learners.has(c.id) && needs(c)),
  cards.filter((c) => c.status === "draft" && withheld.has(c.id) && (c.object_type !== "word" || posOk.has(c.id)) && needs(c)),
  cards.filter((c) => first.includes(c.id) && needs(c)),
  cards.filter((c) => isPublic(c) && c.verification_status === "partial" && needs(c)).sort((a, b) => rank(a)[0] - rank(b)[0] || rank(a)[1] - rank(b)[1]),
];
const seen = new Set(), queue = [];
groups.forEach((g, gi) => { for (const c of g) if (!seen.has(c.id)) { seen.add(c.id); queue.push({ ...c, group: gi + 1 }); } });
console.log({ group1_learners: groups[0].length, group2_drafts: groups[1].length, group3_first: groups[2].length, group4_public: groups[3].length, queue_after_dedupe: queue.length });

// ---- reuse of finished Korp checks ----
const cache = existsSync("data/reports/korp-verify/results.json") ? JSON.parse(readFileSync("data/reports/korp-verify/results.json", "utf8")) : {};
const norm = (a) => JSON.stringify((a || []).map((x) => x.toLowerCase().replace(/[.!?]+$/, "").trim()));

const RES = OUT + (DRY ? "dry-results.json" : "results.json");
const results = !DRY && existsSync(RES) ? JSON.parse(readFileSync(RES, "utf8")) : {};
const save = () => writeFileSync(RES, JSON.stringify(results, null, 1));
const batch = randomUUID();
let spent = await spentSoFar(), stop = false, checked = 0;
console.log({ spentBefore: +spent.toFixed(4), cap: MAX_USD, batch });

async function one(c) {
  const t = await db.from("learning_object_translations").select("native_language, meaning").eq("learning_object_id", c.id);
  const m = Object.fromEntries(must(t).map((x) => [x.native_language, x.meaning]));
  const parts = meaningParts(m.en || "");
  const cached = cache[c.id]?.sense;
  if (cached && cached.method === "parts" && norm(cached.parts) === norm(parts)) return { outcome: cached.ok ? "reused_korp_pass" : "reused_korp_fail", reason: cached.open || cached.reason };
  if (cached?.open === "korp_not_attested") return { outcome: "reused_korp_fail", reason: "korp_not_attested" };
  if (!parts.length) return { outcome: "no_meaning" };
  const pos = c.object_type === "word" ? c.part_of_speech : null;
  const forms = must(await db.from("word_forms").select("form_value").eq("learning_object_id", c.id)).map((f) => f.form_value);
  const attestation = await korpAttestation(c.swedish, { forms });
  const verdict = judgeAttestation(attestation, pos);
  if (!verdict.exists.ok) return { outcome: "korp_not_attested", reason: verdict.exists.reason };
  if (pos && !verdict.pos.ok && !posOk.has(c.id)) return { outcome: "korp_pos_unconfirmed", reason: verdict.pos.reason };
  const cqp = attestation.match === "multiword" ? attestation.cqp : korpCqp(c.swedish, pos, { spelling: attestation.match === "spelling", forms });
  const sentences = await korpSentences(cqp, { count: 12 });
  if (!sentences.length) return { outcome: "korp_no_sentences" };
  if (DRY) return { outcome: "would_check" };
  if (spent >= MAX_USD) { stop = true; return { outcome: "budget_reached" }; }
  const spec = { learningObjectId: c.id, headword: c.swedish, pos, field: "sense", senseRef: "meaning_en", target: "korp_sense_parts",
    identity: { meaning_en: m.en, meaning_zh: m.zh, parts, cqp }, input: { meaning_en: m.en, meaning_zh: m.zh, parts, cqp, sentences, attestation: { total: attestation.total, perCorpus: attestation.perCorpus, byPos: attestation.byPos } },
    referencesUsed: { korp: { exists: verdict.exists, pos: verdict.pos }, pos_status: posOk.has(c.id) ? "verified" : null }, checkVersion: CHECK_VERSION, ruleVersion: TAG, model: MODEL, batchId: batch };
  const r = await ledgeredCheck(db, spec, async () => {
    let cost = 0, calls = 0; const usage = [];
    const ai = async (args) => { const { result, usage: u } = await callOpenAIJson(args); const k = openaiCost(u, MODEL); cost += k.cost; calls++; usage.push({ input: k.input, cached: k.cached, output: k.output }); return result; };
    try {
      const judged = await judgeSenseFromSentences({ word: c.swedish, pos, meaningZh: m.zh || "", meaningEn: m.en || "", sentences }, ai);
      return { result: { ok: judged.ok, reason: judged.reason, parts: judged.parts, unattested: judged.unattested, corpora: judged.corpora, readings: judged.readings }, conflicts: judged.ok ? null : { unconfirmed_parts: judged.unattested }, costUsd: cost, calls, usage };
    } catch (e) { e.costUsd = cost; e.calls = calls; throw e; }
  });
  if (r.skipped) return { outcome: "skipped_running" };
  if (!r.reused) spent += Number(r.row.cost_usd);
  const res = r.row.result;
  if (!res.ok) { await markAdopted(db, r.row.task_key, false, []); return { outcome: r.reused ? "reused_ledger_fail" : "checked_fail", reason: res.reason, unattested: res.unattested, cost: r.reused ? 0 : Number(r.row.cost_usd) }; }
  // the row is written only while it is still the one read
  const prev = must(await db.from("resource_field_status").select("status, grade, source, detail, rule_version").eq("learning_object_id", c.id).eq("field", "sense").maybeSingle());
  if (prev?.status === "mismatch" || (prev?.status === "verified" && prev?.grade === "verified")) return { outcome: "changed_meanwhile" };
  must(await db.from("content_audit_archive").insert({ batch_id: batch, learning_object_id: c.id, table_name: "resource_field_status", field: "sense", old_value: JSON.stringify(prev || { status: "present", source: null, grade: null, detail: null }), new_value: "verified", reason: "round_g_p3_korp" }));
  must(await db.from("resource_field_status").upsert({ learning_object_id: c.id, field: "sense", status: "verified", grade: "verified", rule_version: "kv2-2026-11-11/p3-korp",
    source: `${prev?.source || "ai_check"};korp`, detail: { ...(prev?.detail || {}), open: undefined, korp: { check: r.row.id, parts: res.parts, corpora: res.corpora, reason: res.reason, checked: r.row.finished_at } }, updated_at: new Date().toISOString() }, { onConflict: "learning_object_id,field" }));
  must(await db.rpc("refresh_resource_summary", { p_ids: [c.id] }));
  await markAdopted(db, r.row.task_key, true, ["resource_field_status.sense"]);
  return { outcome: r.reused ? "reused_ledger_pass" : "checked_pass", cost: r.reused ? 0 : Number(r.row.cost_usd) };
}

const todo = queue.filter((c) => !results[c.id] || ["skipped_running", "error"].includes(results[c.id].outcome)).slice(0, LIMIT);
async function worker() {
  while (todo.length && !stop) {
    const c = todo.shift();
    try { results[c.id] = { swedish: c.swedish, group: c.group, ...(await one(c)), batch }; }
    catch (e) { results[c.id] = { swedish: c.swedish, group: c.group, outcome: "error", reason: String(e.message).slice(0, 200), batch }; }
    if (++checked % 25 === 0) { save(); console.log("done", checked, "left", todo.length, `$${spent.toFixed(3)}`); }
  }
}
await Promise.all([1, 2, 3, 4].map(worker));
save();
const tally = {};
for (const r of Object.values(results)) { const k = `g${r.group}:${r.outcome}`; tally[k] = (tally[k] || 0) + 1; }
console.log({ tally, spentTotal: +(await spentSoFar()).toFixed(4), batch });
