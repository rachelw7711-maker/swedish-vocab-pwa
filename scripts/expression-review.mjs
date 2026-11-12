// Round G (2026-11-12, owner's item F), and the background review of new multi-word cards (a search keeps
// an unlisted combination a draft and asks no Korp: server-native.mjs). Every multi-word entry not
// retired whose sense is not verified-grade, or that is a draft, goes through:
//   1 program   same match key as another entry (a duplicate) — listed;
//   2 evidence  the dictionaries and Korp (multiwordEvidence: listing, corpus count, association), free;
//   3 AI        the owner's standard (expression-sample.mjs's prompt, check expr-class-1, ledgered — the
//               40 sample answers are reused): keep / fix / exit, with its kind;
//   4 decision  classifyMultiword on the evidence and the AI's kind, then:
//     draft  keep, natural, meaning right, both meanings and an example, and a dictionary lists it or Korp
//            has it → publish_candidate
//            (published only once its sense passes the Korp sense check: --publish);
//     public keep → keep (evidence recorded); fix → fix_list; exit → retire only when the program agrees
//            it is a free combination (classifyMultiword retireable), nobody studies it, no person
//            reviewed it and it is not a whole sentence (SFI sentences are learnt whole); any other exit
//            → human_review. Never for lack of evidence.
// --apply writes the evidence (content_evidence, rule version RULE) and the retirements (status retired,
// archived: content_audit_archive reason round_g_expr_review). --publish <results.json of p3-sense-check>
// makes public the candidates whose sense is now verified. Everything reversible by --rollback <batch>.
//   node --env-file=.env scripts/expression-review.mjs --max-usd <cap> [--tag t] [--apply] [--limit n]
//   node --env-file=.env scripts/expression-review.mjs --publish [--hold "a|b"] [--apply]
//   node --env-file=.env scripts/expression-review.mjs --rollback <batch>
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { useSaldoFiles } from "../server-lexicon.mjs";
import { useReferenceFiles } from "../server-references.mjs";
import { multiwordEvidence, classifyMultiword, EVIDENCE_KINDS } from "../server-evidence.mjs";
import { callOpenAIJson } from "../server-native.mjs";
import { openaiCost } from "../server-prices.mjs";
import { ledgeredCheck } from "../server-check-ledger.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
const opt = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const RULE = "kv2-2026-11-12/expr-review", REASON = "round_g_expr_review", TAG = opt("--tag") || "round_g_fix";
const OUT = "data/reports/round-g/fix/expression-review.json";
const APPLY = process.argv.includes("--apply");

if (process.argv.includes("--rollback")) {
  const batch = opt("--rollback");
  const rows = must(await db.from("content_audit_archive").select("learning_object_id, field, old_value").eq("batch_id", batch).eq("reason", REASON));
  for (const r of rows) must(await db.from("learning_objects").update({ [r.field]: JSON.parse(r.old_value) }).eq("id", r.learning_object_id));
  must(await db.from("content_evidence").delete().eq("rule_version", RULE).eq("source_ref->>batch", batch));
  console.log({ batch, restored: rows.length });
  process.exit(0);
}
async function all(table, cols, f = (q) => q, by = "id") {
  const out = [];
  for (let i = 0; ; i += 1000) { const d = must(await f(db.from(table).select(cols)).order(by).range(i, i + 999)); out.push(...d); if (d.length < 1000) return out; }
}
const batch = randomUUID();

// --publish: candidates whose sense the Korp check verified since.
if (process.argv.includes("--publish")) {
  const review = JSON.parse(readFileSync(OUT, "utf8"));
  const out = [];
  const held = new Set((opt("--hold") || "").split("|").filter(Boolean));   // --hold "a|b": a person looks first
  for (const r of review.filter((x) => x.decision === "publish_candidate" && !held.has(x.swedish))) {
    const o = must(await db.from("learning_objects").select("status").eq("id", r.id).maybeSingle());
    const s = must(await db.from("resource_field_status").select("status, grade").eq("learning_object_id", r.id).eq("field", "sense").maybeSingle());
    const ok = o?.status === "draft" && s?.status === "verified" && s?.grade === "verified";
    out.push({ swedish: r.swedish, ok, sense: s?.grade || s?.status || "none" });
    if (ok && APPLY) {
      must(await db.from("content_audit_archive").insert({ batch_id: batch, learning_object_id: r.id, table_name: "learning_objects", field: "status", old_value: JSON.stringify("draft"), new_value: "ai_generated", reason: REASON }));
      must(await db.from("learning_objects").update({ status: "ai_generated" }).eq("id", r.id).eq("status", "draft"));
      must(await db.rpc("refresh_resource_summary", { p_ids: [r.id] }));
    }
  }
  console.log({ apply: APPLY, batch: APPLY ? batch : null, published: out.filter((x) => x.ok).length, waiting: out.filter((x) => !x.ok).map((x) => `${x.swedish} (${x.sense})`) });
  process.exit(0);
}

await useSaldoFiles();
await useReferenceFiles();
const MAX_USD = Number(opt("--max-usd") || 0), LIMIT = Number(opt("--limit")) || Infinity;
if (!(MAX_USD > 0)) throw new Error("--max-usd <cap of everything under the tag> required");
const spent = async () => (await all("knowledge_checks", "id, cost_usd", (q) => q.eq("rule_version", TAG))).reduce((a, r) => a + Number(r.cost_usd), 0);
const objects = await all("learning_objects", "id, swedish, object_type, status, category, example_sv, match_key", (q) => q.neq("object_type", "word").neq("status", "retired"));
const sense = new Map((await all("resource_field_status", "learning_object_id, status, grade", (q) => q.eq("field", "sense"), "learning_object_id")).map((r) => [r.learning_object_id, r]));
const learners = new Set((await all("user_words", "id, word_id")).map((u) => u.word_id));
const audit = new Map(readFileSync("data/reports/round-g/baseline-audit.ndjson", "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).map((r) => [r.id, r.findings.map((f) => f.code)]));
const byKey = new Map();
for (const o of objects) if (o.match_key) (byKey.get(o.match_key) || byKey.set(o.match_key, []).get(o.match_key)).push(o);
const pool = objects.filter((o) => o.status === "draft" || !(sense.get(o.id)?.status === "verified" && sense.get(o.id)?.grade === "verified")).slice(0, LIMIT);
console.log({ multiword: objects.length, pool: pool.length, spentBefore: +(await spent()).toFixed(4) });

// The prompt and schema of the validation sample (expression-sample.mjs), so its answers are reused.
const SCHEMA = { type: "object", additionalProperties: false, required: ["verdict", "kind", "natural", "meaning_ok", "fix", "reason"], properties: {
  verdict: { type: "string", enum: ["keep", "fix", "exit_free_combination", "exit_wrong_or_unnatural", "exit_duplicate"] },
  kind: { type: "string", enum: ["idiom", "fixed_phrase", "construction_with_slot", "word_with_preposition", "everyday_saying", "typical_collocation", "free_combination", "not_swedish"] },
  natural: { type: "boolean" }, meaning_ok: { type: "boolean" }, fix: { type: "string" }, reason: { type: "string" } } };
const SYSTEM = `You review a multi-word entry of a Swedish learner's dictionary for adult learners (SFI, Komvux). Decide:
keep — real, natural Swedish, meanings right, and worth learning as a whole: an idiom (kasta in handduken), a fixed phrase, a construction with a slot (ha möjlighet att), a verb/adjective with its preposition (vara beroende av, ta ansvar för), a frequent everyday saying, or a strong collocation learners need (fatta ett beslut). A literal meaning is no reason to drop it.
fix — worth keeping, but the meaning, the Chinese/English correspondence, the example or the form is wrong: say what in "fix".
exit_free_combination — a free combination anyone builds from the words (ett stort hus): fine in examples, not an entry of its own.
exit_wrong_or_unnatural — not natural Swedish, or not what it claims to be.
exit_duplicate — the same expression as another entry in another form.
Judge from your knowledge of Swedish and the evidence given; when unsure between keep and exit, choose keep or fix.`;
// The AI's kind as classifyMultiword's verdict.
const VERDICT = { idiom: "idiom", fixed_phrase: "fast_fras", construction_with_slot: "fast_fras", word_with_preposition: "fast_fras", everyday_saying: "fast_fras", typical_collocation: "typical", free_combination: "neither", not_swedish: "neither" };
const sentence = (s) => /[.!?…]$/.test(String(s).trim()) || /^\p{Lu}/u.test(String(s).trim());

const results = [], counts = { reused: 0, newCalls: 0, cost: 0 };
let stop = false;
async function one(o) {
  const m = Object.fromEntries(must(await db.from("learning_object_translations").select("native_language, meaning").eq("learning_object_id", o.id)).map((x) => [x.native_language, x.meaning]));
  const input = { expression: o.swedish, english: m.en || "", chinese: m.zh || "", example: (o.example_sv || "").split("\n")[0], evidence: audit.get(o.id) || [] };
  if ((await spent()) >= MAX_USD) { stop = true; return null; }
  const c = await ledgeredCheck(db, { learningObjectId: o.id, headword: o.swedish, pos: null, field: "classification", target: "expression_classification", input,
    checkVersion: "expr-class-1", ruleVersion: TAG, model: "gpt-5.4-mini", batchId: batch }, async () => {
    const { result, usage } = await callOpenAIJson({ schemaName: "expression_review", schema: SCHEMA, system: SYSTEM, user: JSON.stringify(input), maxOutputTokens: 800 });
    return { result, costUsd: openaiCost(usage).cost, calls: 1 };
  });
  if (c.skipped) return { id: o.id, swedish: o.swedish, decision: "skipped_running" };
  if (c.reused) counts.reused++; else { counts.newCalls++; counts.cost += Number(c.row.cost_usd); }
  const ai = c.row.result;
  const ev = await multiwordEvidence(null, o.swedish, { timeout: 60000 }).catch(() => ({}));
  const cls = classifyMultiword({ ...ev, ai: { verdict: VERDICT[ai.kind] || null } });
  const dup = (byKey.get(o.match_key) || []).filter((x) => x.id !== o.id).map((x) => x.swedish);
  const studied = learners.has(o.id), reviewed = o.status === "human_reviewed";
  const real = !!ev.dictionary?.listing || ev.attestation?.ok === true;
  let decision;
  // A public entry needs both meanings and an example, whatever the review says.
  const complete = !!String(m.en || "").trim() && !!String(m.zh || "").trim() && !!String(o.example_sv || "").trim();
  if (o.status === "draft") decision = ai.verdict === "keep" && ai.natural && ai.meaning_ok && real && complete ? "publish_candidate" : !complete ? "draft_incomplete" : ai.verdict === "keep" || ai.verdict === "fix" ? "draft_kept" : "draft_exit_suggested";
  else if (dup.length) decision = "human_review_duplicate";
  else if (ai.verdict === "keep") decision = "keep";
  else if (ai.verdict === "fix") decision = "fix_list";
  else if (ai.verdict === "exit_free_combination" && cls.retireable && !studied && !reviewed && !sentence(o.swedish)) decision = "retire";
  else decision = "human_review_exit";
  return { id: o.id, swedish: o.swedish, status: o.status, learners: studied, en: m.en, zh: m.zh, ai: { verdict: ai.verdict, kind: ai.kind, natural: ai.natural, meaning_ok: ai.meaning_ok, fix: ai.fix, reason: ai.reason },
    check: c.row.id, evidence: { listing: ev.dictionary?.listing?.text || null, korp_total: ev.attestation?.total ?? null, korp_ok: ev.attestation?.ok ?? null, association: ev.association?.rank ?? null, cls: cls.cls, retireable: cls.retireable, reasons: cls.reasons, list: cls.evidence }, duplicates: dup, decision };
}
const todo = [...pool];
await Promise.all([1, 2, 3].map(async () => {
  while (todo.length && !stop) {
    const o = todo.shift();
    try { const r = await one(o); if (r) results.push(r); } catch (e) { results.push({ id: o.id, swedish: o.swedish, decision: "error", error: String(e.message || e).slice(0, 200) }); }
    if (results.length % 50 === 0) console.log(results.length, "of", pool.length);
  }
}));
mkdirSync("data/reports/round-g/fix", { recursive: true });
writeFileSync(OUT, JSON.stringify(results, null, 1));

if (APPLY) {
  for (const r of results.filter((x) => x.evidence)) {
    const ev = r.evidence.list.map((e) => ({ learning_object_id: r.id, item_type: "classification", item_ref: "", kind: e.kind, result: e.result, strength: EVIDENCE_KINDS[e.kind].strength, source_ref: { batch, ...(e.ref ? { ref: e.ref } : {}) }, rule_version: RULE, note: e.note || "" }));
    ev.push({ learning_object_id: r.id, item_type: "classification", item_ref: "", kind: "ai_one", result: r.ai.verdict.startsWith("exit") ? "refutes" : "supports", strength: EVIDENCE_KINDS.ai_one.strength,
      source_ref: { batch, check: r.check, verdict: r.ai.verdict, kind: r.ai.kind }, rule_version: RULE, note: "" });
    must(await db.from("content_evidence").upsert(ev, { onConflict: "learning_object_id,item_type,item_ref,kind,rule_version" }));
  }
  for (const r of results.filter((x) => x.decision === "retire")) {
    const o = must(await db.from("learning_objects").select("status").eq("id", r.id).single());
    if (learners.has(r.id) || (await db.from("user_words").select("id").eq("word_id", r.id)).data?.length) continue;   // a learner since: kept
    must(await db.from("content_audit_archive").insert({ batch_id: batch, learning_object_id: r.id, table_name: "learning_objects", field: "status", old_value: JSON.stringify(o.status), new_value: "retired", reason: REASON }));
    must(await db.from("learning_objects").update({ status: "retired" }).eq("id", r.id).eq("status", o.status));
  }
}
const tally = {};
for (const r of results) tally[r.decision] = (tally[r.decision] || 0) + 1;
console.log({ apply: APPLY, batch: APPLY ? batch : null, tally, ...counts, cost: +counts.cost.toFixed(4), spentTag: +(await spent()).toFixed(4), file: OUT });
