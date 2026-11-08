// What a new card keeps although no dictionary confirms it, checked against the corpus after it
// is saved (2026-11-08). A collocation or related word no dictionary has is not wrong for that
// alone, nor is one the corpus rarely shows ("ha en räv bakom örat": one hit in ten corpora) —
// but made-up ones ("stjäla med ögonen", "gå på fil", "slagig") were kept by both AI checks of a
// test of 840 cards and have no corpus use at all. So: Korp counts each such item (server-korp,
// cached); one an AI reader, shown that it is in no dictionary and how rarely the corpus has it,
// still calls made up is dropped — dictionary, corpus and reader agreeing; a reader calling it
// right but rare keeps it; anything else stays open. Never decided by frequency alone.
// Offline only, like scripts/korp-verify.mjs: card generation never waits for Korp.
import { korpAttestation, judgeAttestation } from "./server-korp.mjs";
import { collocationEvidence, relatedEvidence } from "./server-language-checks.mjs";

const schema = {
  type: "object", additionalProperties: false, required: ["items"],
  properties: { items: { type: "array", items: { type: "object", additionalProperties: false, required: ["key", "verdict", "note"], properties: {
    key: { type: "string" }, verdict: { type: "string", enum: ["made_up", "correct_rare", "unsure"] }, note: { type: "string" } } } } },
};
const SYSTEM = `You check combinations and words of a Swedish learner's dictionary entry that no Swedish dictionary lists and that a corpus of about 1 billion words of Swedish news, fiction, blogs and the SUC corpus has only rarely or never. Each item has its key, the text, its meaning and how often the corpus has it (the words in this order, any inflection). Absence from dictionaries and corpus is a strong sign but not proof: real, if rare, idioms and natural literal combinations exist ("förankra båten", "ha en räv bakom örat").
- made_up: no Swedish speaker uses it with this meaning: invented, translated word for word, a wrong fixed word or particle (the idiom uses another word), or a made-up derivation ("slagig", "görelse" for an action); say in note what Swedish uses instead.
- correct_rare: correct, natural Swedish with this meaning, only rare (or a literal combination of words whose meanings add up).
- unsure: you can't tell.`;

const low = (a) => !judgeAttestation(a, null).exists.ok;

/**
 * One card's unconfirmed collocations and related words against Korp and an AI reader.
 * card: { lemma, pos, collocations, related }; refs: the headword's references (Lexin);
 * headwordForms: its forms. ask(args) calls the model (callOpenAIJson-shaped) and returns its result.
 * Returns { card (a copy with made-up items removed), dropped, kept, open, korp }.
 */
export async function verifyAgainstCorpus(supabaseAdmin, { card, refs = null, headwordForms = [] }, { ask, korp = korpAttestation } = {}) {
  const out = structuredClone(card);
  const items = [];
  for (const [i, c] of (out.collocations || []).entries()) {
    if (!/\s/.test(String(c.phrase || "").trim())) continue;
    if ((await collocationEvidence(supabaseAdmin, refs, c.phrase, headwordForms)).kind === "dictionary") continue;
    items.push({ key: `c${i}`, kind: "collocation", text: c.phrase, meaning: [c.zh, c.en].filter(Boolean).join(" / ") });
  }
  for (const [i, r] of (out.related || []).entries()) {
    if ((await relatedEvidence(supabaseAdmin, r.word, r.pos, { askWiktionary: false })).kind !== "none") continue;
    items.push({ key: `r${i}`, kind: "related", text: r.word, meaning: [r.zh, r.en].filter(Boolean).join(" / ") });
  }
  const korpCounts = {};
  const rare = [];
  for (const it of items) {
    try {
      const a = await korp(it.text);
      korpCounts[it.text] = { total: a.total, corpora: Object.values(a.perCorpus || {}).filter((n) => n > 0).length, match: a.match };
      if (low(a)) rare.push({ ...it, corpus_hits: a.total, in_corpora: korpCounts[it.text].corpora });
    } catch (error) {
      korpCounts[it.text] = { error: String(error.message || error) };
    }
  }
  const result = { card: out, dropped: [], kept: [], open: [], korp: korpCounts, usage: null };
  if (!rare.length) return result;
  let answer = null;
  try {
    const { result: r, usage } = await ask({ schemaName: "corpus_check", schema, system: SYSTEM, maxOutputTokens: 2000,
      user: JSON.stringify({ headword: card.lemma, pos: card.pos, items: rare.map(({ key, text, meaning, corpus_hits, in_corpora }) => ({ key, text, meaning, corpus_hits, in_corpora })) }) });
    answer = r; result.usage = usage;
  } catch (error) {
    result.open.push(...rare.map((x) => ({ text: x.text, reason: `reader_failed:${error.message}` })));
    return result;
  }
  const verdict = new Map((answer.items || []).map((x) => [x.key, x]));
  const gone = new Set();
  for (const it of rare) {
    const v = verdict.get(it.key);
    if (v?.verdict === "made_up") { gone.add(it.key); result.dropped.push({ kind: it.kind, text: it.text, hits: it.corpus_hits, note: v.note }); }
    else if (v?.verdict === "correct_rare") result.kept.push({ kind: it.kind, text: it.text, hits: it.corpus_hits });
    else result.open.push({ kind: it.kind, text: it.text, hits: it.corpus_hits, reason: v ? "unsure" : "not_answered" });
  }
  out.collocations = (out.collocations || []).filter((_, i) => !gone.has(`c${i}`));
  out.related = (out.related || []).filter((_, i) => !gone.has(`r${i}`));
  return result;
}
