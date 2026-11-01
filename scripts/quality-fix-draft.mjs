// Drafts corrections for a reviewed batch (2026-11-01). Input: screened.json with each finding's manual
// verdict. The model applies only the confirmed findings, leaves false positives and uncertain points as
// they are, and makes every example translation a complete translation of exactly that Swedish line
// (an existing faithful translation is kept verbatim). The drafts are reviewed by hand before any SQL.
//   node --env-file=.env scripts/quality-fix-draft.mjs data/reports/quality-batch1-2026-11-01
import fs from "node:fs";

const dir = process.argv[2];
const items = JSON.parse(fs.readFileSync(`${dir}/screened.json`, "utf8")).filter((i) => i.kind === "entry");
const KEY = process.env.OPENAI_API_KEY;
const MODEL = "gpt-5.4";
const SYSTEM = `You correct entries of a Swedish learner's dictionary (Chinese and English explanations). For each entry you get its current data, the review findings a human CONFIRMED (apply these), and findings the human REJECTED or left UNCERTAIN (do not act on these points). Return the corrected entry:
- meaning_zh, meaning_en, swedish_explanation: change only where a confirmed finding requires it; otherwise return the current text unchanged, character for character.
- examples: one item per current example line, same order, same count. sv: the Swedish line, unchanged unless a confirmed finding says it is wrong. zh and en: a complete, faithful translation of exactly that Swedish line (every sentence in it, nothing added — no notes like "常见问候语", no glosses like "说“嗨”"). If the current translation already is such a translation, return it unchanged. A translation that belongs to another line moves to that line.
- Chinese is Simplified Chinese with Chinese punctuation; keep names and Swedish words as they are where a translation would keep them.
Never change anything else, and do not "improve" text that is correct.`;
const ex = { type: "object", additionalProperties: false, required: ["sv", "zh", "en"], properties: { sv: { type: "string" }, zh: { type: "string" }, en: { type: "string" } } };
const schema = { type: "object", additionalProperties: false, required: ["results"], properties: { results: { type: "array", items: { type: "object", additionalProperties: false,
  required: ["n", "meaning_zh", "meaning_en", "swedish_explanation", "examples"],
  properties: { n: { type: "integer" }, meaning_zh: { type: "string" }, meaning_en: { type: "string" }, swedish_explanation: { type: "string" }, examples: { type: "array", items: ex } } } } } };
const usage = { in: 0, out: 0 };
async function ask(batch) {
  const input = batch.map((it, n) => ({ n, headword: it.data.headword, meaning_zh: it.data.meaning_zh, meaning_en: it.data.meaning_en, swedish_explanation: it.data.swedish_explanation,
    examples: it.data.examples.map((e) => ({ sv: e.sv, zh: e.zh || "", en: e.en || "" })),
    confirmed: it.findings.filter((f, j) => it.verified[j] === "confirmed").map((f) => ({ check: f.check, text: f.text, problem: f.problem, suggestion: f.correction })),
    do_not_change: it.findings.filter((f, j) => it.verified[j] !== "confirmed").map((f) => ({ check: f.check, text: f.text, rejected_suggestion: f.correction })) }));
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ model: MODEL, reasoning: { effort: "low" }, max_output_tokens: 16000, text: { format: { type: "json_schema", name: "fix", strict: true, schema } },
          input: [{ role: "system", content: SYSTEM }, { role: "user", content: JSON.stringify(input, null, 1) }] }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error?.message);
      usage.in += d.usage.input_tokens; usage.out += d.usage.output_tokens;
      return JSON.parse(d.output.flatMap((o) => o.content || []).find((c) => c.type === "output_text").text).results;
    } catch (e) { if (attempt >= 2) throw e; await new Promise((r) => setTimeout(r, 3000)); }
  }
}
const batches = [];
for (let i = 0; i < items.length; i += 10) batches.push(items.slice(i, i + 10));
const drafts = {};
for (let b = 0; b < batches.length; b += 4) {
  const res = await Promise.all(batches.slice(b, b + 4).map(ask));
  res.forEach((r, j) => r.forEach((x) => { const it = batches[b + j][x.n]; if (it) drafts[it.key] = x; }));
  process.stderr.write(`${Math.min(b + 4, batches.length)}/${batches.length} `);
}
fs.writeFileSync(`${dir}/drafts.json`, JSON.stringify(drafts, null, 1));
const cost = (usage.in * 2.5 + usage.out * 15) / 1e6;
fs.writeFileSync(`${dir}/draft-usage.json`, JSON.stringify({ model: MODEL, ...usage, cost_usd: Number(cost.toFixed(3)) }));
console.log("\ndrafts", Object.keys(drafts).length, "of", items.length, "cost $", cost.toFixed(3));
