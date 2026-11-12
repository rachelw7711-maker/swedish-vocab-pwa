// Round G validation (2026-11-12), REPORT ONLY: a sample of the 642 multi-word entries the baseline
// audit left for review (data/reports/round-g/baseline-audit.ndjson: public without entry evidence,
// idiom by AI and corpus only, undecided draft, typical combination as own entry), ten of each, each
// classified by the owner's standard: real and natural Swedish, accurate meaning, a structure worth
// learning whole for SFI/Komvux learners (fixed phrase, idiom, construction with a slot, a verb or
// adjective with its preposition, a frequent everyday saying) — a literal meaning is no reason to
// drop it; a free combination (ett stort hus) or a wrong/unnatural one is not an entry of its own.
// The model (gpt-5.4-mini, ledgered) proposes keep / fix / exit with reasons and the evidence it was
// given; an entry with learners is never proposed for exit (fix instead). Nothing is changed.
//   node --env-file=.env scripts/expression-sample.mjs --max-usd <n>
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { callOpenAIJson } from "../server-native.mjs";
import { openaiCost } from "../server-prices.mjs";
import { ledgeredCheck } from "../server-check-ledger.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
const opt = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const MAX_USD = Number(opt("--max-usd") || 0), TAG = "round_g_validate";
const CODES = ["public_without_entry_evidence", "idiom_by_ai_and_corpus_only", "undecided_draft", "typical_combination_as_own_entry"];
const audit = readFileSync("data/reports/round-g/baseline-audit.ndjson", "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.type !== "word");
const hash = (s) => createHash("md5").update(s + "x4").digest("hex");
const picked = new Set(), sample = [];
for (const code of CODES) for (const r of audit.filter((a) => a.findings.some((f) => f.code === code) && !picked.has(a.id)).sort((a, b) => hash(a.id).localeCompare(hash(b.id))).slice(0, 10)) { picked.add(r.id); sample.push({ ...r, code }); }

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

const spent = async () => must(await db.from("knowledge_checks").select("cost_usd").eq("rule_version", TAG)).reduce((a, r) => a + Number(r.cost_usd), 0);
const out = [];
for (const r of sample) {
  if (MAX_USD && (await spent()) >= MAX_USD) { console.log("budget reached"); break; }
  const o = must(await db.from("learning_objects").select("id, swedish, object_type, status, category, example_sv").eq("id", r.id).maybeSingle());
  if (!o) { out.push({ swedish: r.swedish, gone: true }); continue; }
  const m = Object.fromEntries(must(await db.from("learning_object_translations").select("native_language, meaning").eq("learning_object_id", r.id)).map((x) => [x.native_language, x.meaning]));
  const learners = must(await db.from("user_words").select("id").eq("word_id", r.id)).length;
  const evidence = r.findings.map((f) => f.code);
  const input = { expression: o.swedish, english: m.en || "", chinese: m.zh || "", example: (o.example_sv || "").split("\n")[0], evidence };
  const c = await ledgeredCheck(db, { learningObjectId: r.id, headword: o.swedish, pos: null, field: "classification", target: "expression_classification", input,
    checkVersion: "expr-class-1", ruleVersion: TAG, model: "gpt-5.4-mini" }, async () => {
    const { result, usage } = await callOpenAIJson({ schemaName: "expression_review", schema: SCHEMA, system: SYSTEM, user: JSON.stringify(input), maxOutputTokens: 800 });
    return { result, costUsd: openaiCost(usage).cost, calls: 1 };
  });
  const v = c.row.result;
  const verdict = learners && v.verdict.startsWith("exit") ? "fix" : v.verdict;
  out.push({ id: r.id, swedish: o.swedish, code: r.code, type: o.object_type, status: o.status, category: o.category, learners, en: m.en, zh: m.zh, example: input.example, evidence, ai: v, verdict });
}
writeFileSync("data/reports/round-g/expression-sample.json", JSON.stringify(out, null, 1));
const tally = {};
for (const x of out) if (x.verdict) tally[`${x.code}:${x.verdict}`] = (tally[`${x.code}:${x.verdict}`] || 0) + 1;
console.log({ n: out.length, tally, spentValidate: +(await spent()).toFixed(4) });
