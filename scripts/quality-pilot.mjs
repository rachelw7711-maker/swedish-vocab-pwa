// Language-quality pilot (2026-11-01): a fixed sample of entries and collocations is first
// checked against SALDO (headword, part of speech, every word form in Swedish text), then a
// model screens meanings, explanation, examples and translations with that evidence. Its
// findings are only candidates: they are written to a report for manual verification and
// nothing is changed in the database.
//   node --env-file=.env scripts/quality-pilot.mjs data/reports/quality-pilot-2026-11-01
import fs from "node:fs";
import readline from "node:readline";

const dir = process.argv[2];
const sample = JSON.parse(fs.readFileSync(`${dir}/sample.json`, "utf8"));
const KEY = process.env.OPENAI_API_KEY;
const MODEL = "gpt-5.4";

// SALDO: lemmas by written form, and every inflected form.
const lemmas = new Map();
const forms = new Set();
for await (const line of readline.createInterface({ input: fs.createReadStream("data/reference/saldo/saldo-lemmas.tsv") })) {
  const [, lemgram, written, pos, paradigm] = line.split("\t");
  const k = written.toLowerCase();
  if (!lemmas.has(k)) lemmas.set(k, []);
  lemmas.get(k).push({ lemgram, pos, paradigm });
}
for await (const line of readline.createInterface({ input: fs.createReadStream("data/reference/saldo/saldo-wordforms.tsv") })) {
  forms.add(line.split("\t")[0].toLowerCase());
}
const tokens = (s) => String(s || "").match(/[\p{L}][\p{L}:-]*/gu) || [];
// Word forms SALDO does not know (names and words written with a capital inside a sentence are skipped).
function unknownForms(text) {
  const out = new Set();
  for (const m of String(text || "").matchAll(/[\p{L}][\p{L}:-]*/gu)) {
    const w = m[0];
    const before = text.slice(0, m.index).trimEnd();
    if (/^\p{Lu}/u.test(w) && before && !/[.!?:"”]$/.test(before)) continue;
    const k = w.toLowerCase();
    if (forms.has(k) || k.split("-").every((p) => forms.has(p))) continue;
    out.add(w);
  }
  return [...out];
}
function evidence(headword, texts) {
  const words = headword.toLowerCase().split(/\s+/);
  return {
    saldo_headword: words.length === 1 ? lemmas.get(words[0]) || [] : words.map((w) => ({ word: w, in_saldo: forms.has(w.replace(/[^\p{L}-]/gu, "")) })),
    forms_not_in_saldo: [...new Set(texts.flatMap(unknownForms))],
  };
}

const items = [];
for (const e of sample.entries) {
  const examples = (e.examples || []).length ? e.examples : String(e.legacy_sv || "").split("\n").filter(Boolean).map((sv, i) => ({ sv, zh: i ? null : e.legacy_zh, en: i ? null : e.legacy_en }));
  items.push({ key: `entry:${e.id}`, kind: "entry", stratum: e.stratum, headword: e.swedish, pos: e.pos,
    data: { headword: e.swedish, part_of_speech: e.pos, meaning_zh: e.zh, meaning_en: e.en, meaning_note_zh: e.note_zh || "", meaning_note_en: e.note_en || "",
      swedish_explanation: e.expl || "", examples },
    evidence: evidence(e.swedish, [e.expl, ...examples.map((x) => x.sv)]) });
}
for (const c of sample.collocations) {
  const gloss = (list) => String(list || "").split("\n").map((l) => l.split("|").map((p) => p.trim())).find((p) => p[0]?.toLowerCase() === c.phrase_text.toLowerCase());
  const zh = gloss(c.zh_list), en = gloss(c.en_list);
  items.push({ key: `collocation:${c.id}`, kind: "collocation", stratum: `${c.tier}_collocation`, headword: c.phrase_text, pos: c.pos,
    data: { headword_of_entry: c.head, part_of_speech: c.pos, collocation: c.phrase_text, gloss_zh: zh?.[1] || "", gloss_en: en?.[1] || "", example: zh?.[2] || en?.[2] || "" },
    evidence: evidence(c.phrase_text, [c.phrase_text, zh?.[2] || ""]) });
}

const SYSTEM = `You are a careful reviewer of a Swedish learner's dictionary (explanations in Chinese and English). For each item, check only these things:
1. meaning: do the Chinese and English meanings match the Swedish headword (in the given part of speech)? A narrower or simplified learner gloss is fine; a wrong sense, a wrong part of speech or a misleading gloss is not.
2. explanation: is the Swedish explanation correct, and grammatical natural Swedish?
3. example: is each Swedish example grammatical, natural Swedish that uses the headword in the sense given?
4. translation: do the Chinese and English example translations say what the Swedish says?
5. collocation: is the collocation idiomatic Swedish, and are its glosses right?
Evidence from SALDO is attached: the headword's SALDO lemmas (lemgram, part of speech) and word forms in the Swedish text that SALDO does not know (often a misspelling, sometimes a compound or name SALDO lacks).
Report only real problems you are confident about — an error, or Swedish a native speaker would find clearly unnatural. Do not report style preferences, alternative wordings that are merely also possible, or missing information. Give the exact problem, the exact text concerned, and a corrected version. severity: "error" (wrong) or "unnatural" (understandable but not idiomatic). An item with no problem gets an empty list.`;
const schema = { type: "object", additionalProperties: false, required: ["results"], properties: { results: { type: "array", items: {
  type: "object", additionalProperties: false, required: ["n", "findings"], properties: { n: { type: "integer" }, findings: { type: "array", items: {
    type: "object", additionalProperties: false, required: ["check", "severity", "text", "problem", "correction", "confidence"],
    properties: { check: { type: "string", enum: ["meaning", "explanation", "example", "translation", "collocation"] }, severity: { type: "string", enum: ["error", "unnatural"] },
      text: { type: "string" }, problem: { type: "string" }, correction: { type: "string" }, confidence: { type: "string", enum: ["high", "medium"] } } } } } } } } };

const usage = { in: 0, out: 0 };
async function ask(batch) {
  const user = JSON.stringify(batch.map((it, n) => ({ n, ...it.data, saldo: it.evidence })), null, 1);
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ model: MODEL, reasoning: { effort: "low" }, max_output_tokens: 12000, text: { format: { type: "json_schema", name: "review", strict: true, schema } },
          input: [{ role: "system", content: SYSTEM }, { role: "user", content: user }] }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error?.message);
      usage.in += d.usage.input_tokens; usage.out += d.usage.output_tokens;
      return JSON.parse(d.output.flatMap((o) => o.content || []).find((c) => c.type === "output_text").text).results;
    } catch (e) { if (attempt >= 2) throw e; await new Promise((r) => setTimeout(r, 3000)); }
  }
}
const rows = [];
const batches = [];
for (let i = 0; i < items.length; i += 10) batches.push(items.slice(i, i + 10));
for (let b = 0; b < batches.length; b += 4) {
  const results = await Promise.all(batches.slice(b, b + 4).map(ask));
  results.forEach((res, j) => {
    const batch = batches[b + j];
    const byN = new Map(res.map((r) => [r.n, r.findings]));
    batch.forEach((it, n) => {
      const findings = byN.get(n) || [];
      it.findings = findings;
      if (it.evidence.forms_not_in_saldo.length) it.saldo_flag = it.evidence.forms_not_in_saldo;
    });
  });
  process.stderr.write(`${Math.min(b + 4, batches.length)}/${batches.length} `);
}
fs.writeFileSync(`${dir}/screened.json`, JSON.stringify(items, null, 1));
const cost = (usage.in * 2.5 + usage.out * 15) / 1e6;
fs.writeFileSync(`${dir}/usage.json`, JSON.stringify({ model: MODEL, ...usage, cost_usd: Number(cost.toFixed(3)) }));
console.log("\nitems", items.length, "with findings", items.filter((i) => i.findings.length).length, "findings", items.reduce((s, i) => s + i.findings.length, 0),
  "saldo-flagged items", items.filter((i) => i.saldo_flag).length, "cost $", cost.toFixed(3));
