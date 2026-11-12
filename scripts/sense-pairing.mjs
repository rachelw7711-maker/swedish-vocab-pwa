// Round G validation (2026-11-12), REPORT ONLY: a card's English and Chinese meanings paired into
// senses, each sense with the evidence it has. Nothing on a card is changed.
// The pieces: English split at ";" and between sentences, Chinese at "；" and after "。". The model
// (gpt-5.4-mini, through the check ledger: never paid twice) puts every piece into a sense or into
// the notes (usage, grammar, register, spelling remarks), and says whether a sense is doubtful for the
// Swedish word. The program then checks the pairing — every piece placed once (a piece in two senses
// marks both "shared"), notes never in a sense — and a sense with pieces in one language only is a
// completeness finding (a public sense needs both). Evidence per sense: the dictionaries' English for
// the card's part of speech (meaningPartSupported), the latest Korp sense check (round_g_p3 parts).
// Exit simulation, never applied: a sense is an exit candidate only when it is not the first, no
// dictionary supports it, Korp was asked and did not show it, and the model calls it doubtful; any
// other unconfirmed sense is "targeted_check".
//   node --env-file=.env scripts/sense-pairing.mjs --ids <file.json> --out <name> --max-usd <n> [--tag t]
// --tag books the pairings under another batch tag; --max-usd caps everything paid under that tag.
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { useReferenceFiles, referenceEntries, englishEquivalents, meaningPartSupported } from "../server-references.mjs";
import { callOpenAIJson } from "../server-native.mjs";
import { openaiCost } from "../server-prices.mjs";
import { ledgeredCheck } from "../server-check-ledger.mjs";
import { enPieces, zhPieces } from "../server-senses.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
const opt = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const MAX_USD = Number(opt("--max-usd") || 0), TAG = opt("--tag") || "round_g_validate";
await useReferenceFiles("data/reference", { extra: true });

const key = (s) => s.toLowerCase().replace(/[.!?。]+$/, "").trim();
const spent = async () => must(await db.from("knowledge_checks").select("cost_usd").eq("rule_version", TAG)).reduce((a, r) => a + Number(r.cost_usd), 0);

const SCHEMA = { type: "object", additionalProperties: false, required: ["senses", "notes"], properties: {
  senses: { type: "array", items: { type: "object", additionalProperties: false, required: ["en", "zh", "label", "doubtful"], properties: {
    en: { type: "array", items: { type: "integer" } }, zh: { type: "array", items: { type: "integer" } }, label: { type: "string" }, doubtful: { type: "boolean" } } } },
  notes: { type: "object", additionalProperties: false, required: ["en", "zh"], properties: { en: { type: "array", items: { type: "integer" } }, zh: { type: "array", items: { type: "integer" } } } } } };
const SYSTEM = `A Swedish learner's dictionary entry has an English and a Chinese meaning, split into numbered pieces. Group the pieces into the senses of the Swedish word.
- A sense is one distinct meaning of the Swedish word. Pieces that say the same meaning in other words (synonyms, paraphrases) belong to the same sense.
- Every piece goes into exactly one sense, or into notes when it is not a meaning but a remark (usage, register, grammar, inflection, spelling, comparison with another word). A piece that itself covers two senses may be listed under both.
- Never force a match: a sense may have pieces in one language only when the other language truly lacks that meaning.
- Keep the senses in the order of the pieces. label: a short English label of the sense.
- doubtful: true only when you believe this sense is not an established meaning of the Swedish word (as this part of speech). Rare or formal senses are not doubtful.`;

async function pair(c, en, zh) {
  const E = enPieces(en), Z = zhPieces(zh);
  const r = await ledgeredCheck(db, { learningObjectId: c.id, headword: c.swedish, pos: c.part_of_speech, field: "sense", target: "sense_pairing", input: { E, Z },
    checkVersion: "sense-pair-1", ruleVersion: TAG, model: "gpt-5.4-mini" }, async () => {
    const { result, usage } = await callOpenAIJson({ schemaName: "sense_pairing", schema: SCHEMA, system: SYSTEM, maxOutputTokens: 1500,
      user: JSON.stringify({ word: c.swedish, part_of_speech: c.part_of_speech, english: E.map((t, n) => ({ n, t })), chinese: Z.map((t, n) => ({ n, t })) }) });
    return { result, costUsd: openaiCost(usage).cost, calls: 1 };
  });
  if (r.skipped) return { error: "running" };
  const res = r.row.result, problems = [];
  const senses = (res.senses || []).map((s) => ({ ...s, en: [...new Set(s.en)].filter((n) => n >= 0 && n < E.length), zh: [...new Set(s.zh)].filter((n) => n >= 0 && n < Z.length) }));
  const notes = { en: (res.notes?.en || []).filter((n) => n >= 0 && n < E.length), zh: (res.notes?.zh || []).filter((n) => n >= 0 && n < Z.length) };
  for (const [lang, P] of [["en", E], ["zh", Z]]) P.forEach((_, n) => {
    const inS = senses.filter((s) => s[lang].includes(n)).length, inN = notes[lang].includes(n);
    if (!inS && !inN) problems.push(`${lang}${n}_unplaced`);
    if (inS && inN) problems.push(`${lang}${n}_note_and_sense`);
    if (inS > 1) senses.filter((s) => s[lang].includes(n)).forEach((s) => (s.shared = true));
  });
  return { E, Z, senses, notes, problems, cost: r.reused ? 0 : Number(r.row.cost_usd) };
}

const out = [];
for (const id of JSON.parse(readFileSync(opt("--ids"), "utf8"))) {
  if (MAX_USD && (await spent()) >= MAX_USD) { console.log("budget reached"); break; }
  const c = must(await db.from("learning_objects").select("id, swedish, part_of_speech, object_type, verification_status").eq("id", id).single());
  const m = Object.fromEntries(must(await db.from("learning_object_translations").select("native_language, meaning").eq("learning_object_id", id)).map((x) => [x.native_language, x.meaning]));
  const learners = must(await db.from("user_words").select("id").eq("word_id", id)).length;
  const p = await pair(c, m.en, m.zh);
  if (p.error) { out.push({ id, swedish: c.swedish, error: p.error }); continue; }
  const eq = c.object_type === "word" && c.part_of_speech ? englishEquivalents(await referenceEntries(null, c.swedish), c.part_of_speech) : [];
  const korp = must(await db.from("knowledge_checks").select("result, finished_at").eq("learning_object_id", id).eq("target", "korp_sense_parts").eq("status", "done").order("finished_at", { ascending: false }).limit(1))[0]?.result;
  const un = new Set((korp?.unattested || []).map(key)), asked = new Set((korp?.parts || []).map(key));
  const senses = p.senses.map((s, i) => {
    const en = s.en.map((n) => p.E[n]), zh = s.zh.map((n) => p.Z[n]);
    const dictionary = eq.length > 0 && en.some((x) => meaningPartSupported(x, eq));
    const k = en.map(key).filter((x) => asked.has(x));
    const korpSays = !k.length ? "not_checked" : k.some((x) => !un.has(x)) ? "attested" : "not_attested";
    const complete = en.length > 0 && zh.length > 0;
    const evidence = dictionary || korpSays === "attested";
    const fate = !complete ? "incomplete" : evidence ? "public_ok" : i > 0 && !s.shared && korpSays === "not_attested" && s.doubtful ? "exit_candidate" : "targeted_check";
    return { label: s.label, en, zh, doubtful: s.doubtful, shared: !!s.shared, dictionary, korp: korpSays, fate };
  });
  out.push({ id, swedish: c.swedish, pos: c.part_of_speech, status: c.verification_status, learners, en: m.en, zh: m.zh, notes: { en: p.notes.en.map((n) => p.E[n]), zh: p.notes.zh.map((n) => p.Z[n]) }, problems: p.problems, senses, cost: p.cost });
  if (out.length % 20 === 0) console.log(out.length, `$${(await spent()).toFixed(4)}`);
}
writeFileSync(`data/reports/round-g/${opt("--out")}.json`, JSON.stringify(out, null, 1));
const tally = {};
for (const c of out) for (const s of c.senses || []) tally[s.fate] = (tally[s.fate] || 0) + 1;
console.log({ cards: out.length, pairingProblems: out.filter((c) => c.problems?.length).length, senses: tally, spentValidate: +(await spent()).toFixed(4) });
