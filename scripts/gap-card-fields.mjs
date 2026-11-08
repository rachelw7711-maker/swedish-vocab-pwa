// Read-only for the database: the fields a reviewer asked to be written again for a reviewed gap
// card (data/reports/round-e/gap-decisions.json, "ask"), one field at a time with the card's
// Lexin reference (senses, idioms, phrases, compounds) — never the whole card again (2026-11-09).
// Writes data/reports/round-e/gap-asked-fields.json for review; nothing is applied here.
//   node --env-file=.env scripts/gap-card-fields.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { useReferenceFiles, referenceEntries, lexinPromptLine } from "../server-references.mjs";
import { callOpenAIJson } from "../server-native.mjs";

await useReferenceFiles("data/reference", { extra: true });
const decisions = JSON.parse(readFileSync("data/reports/round-e/gap-decisions.json", "utf8"));
const cards = Object.fromEntries(JSON.parse(readFileSync("data/reports/round-e/gap-cards-review.json", "utf8")).cards.map((c) => [c.id, c]));
const SYSTEM = `You write single fields of a Swedish learner's dictionary entry (B1 learners; translations in Simplified Chinese and English). You get the headword, its part of speech, what the entry already has, Lexin's reference for it, and an instruction for each field to write. Write only those fields. Every Swedish sentence must be natural, grammatical, everyday Swedish and use the headword as exactly this part of speech and sense — never another part of speech of the same spelling. Prefer Lexin's own phrases and idioms where they fit. Return empty lists for fields not asked.`;
const item = { type: "object", additionalProperties: false, required: ["swedish", "zh", "en"], properties: { swedish: { type: "string" }, zh: { type: "string" }, en: { type: "string" } } };
const colloc = { type: "object", additionalProperties: false, required: ["phrase", "zh", "en", "example"], properties: { phrase: { type: "string" }, zh: { type: "string" }, en: { type: "string" }, example: { type: "string" } } };
const schema = { type: "object", additionalProperties: false, required: ["examples", "collocations"], properties: { examples: { type: "array", items: item }, collocations: { type: "array", items: colloc } } };

const out = {};
let cost = 0, calls = 0;
for (const [id, d] of Object.entries(decisions)) {
  const ask = { ...(d.ask || {}) };
  delete ask.card; delete ask.senses;   // a whole card or a sense is written by generation, not here
  if (!Object.keys(ask).length) continue;
  const c = cards[id];
  const refs = await referenceEntries(null, c.swedish);
  const user = JSON.stringify({
    headword: c.swedish, part_of_speech: c.pos, meaning_zh: d.set?.zh || c.zh, meaning_en: d.set?.en || c.en,
    keeps: { examples: (c.examples || []).filter((x) => !(d.drop_ex || []).includes(x) && !(x in (d.replace_ex || {}))), collocations: (c.collocations_zh || "").split("\n").map((l) => l.split(" | ")[0]).filter((p) => p && !(d.drop_col || []).includes(p)) },
    reference: lexinPromptLine(refs, c.pos) || "(Lexin has nothing for this part of speech)",
    write: ask,
  });
  const { result, usage } = await callOpenAIJson({ schemaName: "gap_card_fields", schema, system: SYSTEM, user, maxOutputTokens: 3000 });
  calls++; cost += ((usage.input_tokens || 0) * 0.75 + (usage.output_tokens || 0) * 4.5) / 1e6;
  out[id] = { asked: ask, ...result };
  console.log(`${c.swedish} [${c.pos}]`);
  for (const x of result.examples) console.log(`  ex: ${x.swedish} | ${x.zh} | ${x.en}`);
  for (const x of result.collocations) console.log(`  col: ${x.phrase} | ${x.zh} | ${x.en} | ${x.example}`);
}
writeFileSync("data/reports/round-e/gap-asked-fields.json", JSON.stringify({ calls, cost, fields: out }, null, 1));
console.log({ calls, cost: cost.toFixed(4) });
