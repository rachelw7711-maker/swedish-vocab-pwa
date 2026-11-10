// Round G, ledger 3.1: the Lexin senses the baseline audit found missing on a card (code
// lexin_sense_not_covered, English-overlap candidates), sorted without AI into what they are:
//   reworded           Lexin's Swedish definition and the card's Swedish explanation share most
//                      content words: the card has the sense in other English words (no action)
//   taught_unlabelled  the sense's English is in the card's own examples or collocations: the card
//                      teaches it, its meaning list doesn't name it (add the label)
//   gap_salient        not on the card; Lexin gives the sense examples, idioms or compounds (fill first)
//   gap_minor          not on the card; Lexin has the definition only
// Read-only. Output data/reports/round-g/sense-gap-triage.json.
//   node --env-file=.env scripts/sense-gap-triage.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { ordered } from "./page-order.mjs";
import { useSaldoFiles, lemmatize } from "../server-lexicon.mjs";
import { useReferenceFiles, referenceEntries } from "../server-references.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const all = async (t, c, f = (q) => q) => { const o = []; for (let i = 0; ; i += 1000) { const { data, error } = await ordered(f(db.from(t).select(c)), t).range(i, i + 999); if (error) throw error; o.push(...data); if (data.length < 1000) return o; } };
await useSaldoFiles();
await useReferenceFiles("data/reference");

const flagged = [];
for (const l of readFileSync("data/reports/round-g/baseline-audit.ndjson", "utf8").split("\n")) {
  if (!l) continue;
  const r = JSON.parse(l);
  for (const f of r.findings) if (f.code === "lexin_sense_not_covered") flagged.push({ id: r.id, swedish: r.swedish, pos: r.pos, status: r.status, ...f });
}
const ids = new Set(flagged.map((f) => f.id));
const pick = (rows) => rows.filter((r) => ids.has(r.learning_object_id ?? r.id));
const los = new Map(pick(await all("learning_objects", "id, swedish_explanation, meaning_note")).map((o) => [o.id, o]));
const trs = pick(await all("learning_object_translations", "learning_object_id, native_language, meaning, example_translation, collocations, meaning_note"));
const exs = pick(await all("learning_object_examples", "learning_object_id, example_swedish"));

const SV_STOP = new Set("och att det som en ett för med till av på är i om den de man kan har inte från eller när sig så vid ut upp in där än ngn ngt någon något något slags sorts viss vissa olika mycket mer stor liten".split(" "));
const EN_STOP = new Set("the a an of to and or in on for with by at from as be is something someone one's oneself sth sb that this into out up".split(" "));
const lemmaCache = new Map();
async function svLemmas(text) {
  const out = new Set();
  for (const w of String(text || "").toLowerCase().match(/\p{L}+/gu) || []) {
    if (w.length < 3 || SV_STOP.has(w)) continue;
    if (!lemmaCache.has(w)) lemmaCache.set(w, [w, ...(await lemmatize(null, w)).map((c) => c.lemma.toLowerCase())]);
    for (const x of lemmaCache.get(w)) out.add(x);
  }
  return out;
}
const enWords = (t) => new Set((String(t || "").toLowerCase().replace(/\[[^\]]*\]|\([^)]*\)/g, " ").match(/[a-z]+/g) || []).filter((w) => w.length >= 3 && !EN_STOP.has(w)).map((w) => w.replace(/(ies)$/, "y").replace(/(es|s)$/, "")));

const out = [], tally = {};
for (const f of flagged) {
  const lo = los.get(f.id) || {};
  const en = trs.find((t) => t.learning_object_id === f.id && t.native_language === "en") || {};
  const refs = await referenceEntries(null, f.swedish);
  const lexeme = (refs.lexin_sv || []).flatMap((e) => e.lexemes || []).find((x) => x.variant === f.variant) || {};
  const lexEn = (refs.lexin_en || []).find((e) => e.variant === f.variant) || {};
  // 1. reworded: Lexin's Swedish definition against the card's Swedish explanation.
  const def = await svLemmas(f.definition);
  const card = await svLemmas([lo.swedish_explanation, lo.meaning_note].join(" "));
  const shared = [...def].filter((w) => card.has(w));
  const defWords = (String(f.definition).toLowerCase().match(/\p{L}+/gu) || []).filter((w) => w.length >= 3 && !SV_STOP.has(w));
  const reworded = defWords.length >= 1 && shared.length >= Math.max(2, Math.ceil(defWords.length * 0.6));
  // 2. taught: the sense's English in the card's example translations, collocations, notes.
  const senseEn = enWords((f.english || []).join(" "));
  const cardEn = enWords([en.example_translation, en.collocations, en.meaning_note].join(" "));
  const taught = [...senseEn].filter((w) => cardEn.has(w));
  const salience = (lexeme.examples || []).length + (lexeme.idioms || []).length + (lexeme.compounds || []).length + (lexEn.examples || []).length;
  const cls = reworded ? "reworded" : taught.length ? "taught_unlabelled" : salience >= 2 ? "gap_salient" : "gap_minor";
  tally[cls] = (tally[cls] || 0) + 1;
  out.push({ id: f.id, swedish: f.swedish, pos: f.pos, status: f.status, variant: f.variant, definition: f.definition, english: f.english, cls,
    evidence: { sharedSv: shared, taughtEn: taught, salience, lexinExamples: (lexeme.examples || []).slice(0, 2), lexinIdioms: (lexeme.idioms || []).slice(0, 2).map((i) => (Array.isArray(i) ? i[0] : i)) },
    card: { meaningEn: en.meaning, swedishExplanation: lo.swedish_explanation } });
}
const entries = (c) => new Set(out.filter((x) => x.cls === c).map((x) => x.id)).size;
const summary = Object.fromEntries(Object.entries(tally).map(([k, v]) => [k, { senses: v, entries: entries(k) }]));
writeFileSync("data/reports/round-g/sense-gap-triage.json", JSON.stringify({ note: "read-only triage of lexin_sense_not_covered", summary, rows: out }, null, 1));
console.log({ flagged: flagged.length, entries: ids.size, summary });
