// Korp (Språkbanken Text) as evidence for entries no dictionary has (2026-11-04).
// A real, correctly used word need not be in a dictionary: corpus use can verify it. Three
// separate checks, never frequency alone:
//  1. existence: lemma hits (the corpus lemmatiser knows the word) in several corpora; a match on
//     the spelling only needs more hits in more corpora — typos and one-off coinages stay out.
//  2. part of speech: enough of the hits are tagged with the entry's part of speech, in more than
//     one corpus (a tagger error or a homograph of another class does not count).
//  3. sense: real sentences sampled from several corpora; one reader maps each sentence to a sense
//     of the entry's meaning (or none), a second reader independently confirms each mapping. Every
//     sense of the meaning needs two confirmed sentences, from at least two corpora.
// Each result keeps the CQP query, counts per corpus and part of speech, the sentences (corpus +
// position) and the readers' notes, so a verdict can be traced and re-checked.
// Used offline (scripts/korp-verify.mjs); card generation never waits for Korp.

const KORP = "https://ws.spraakbanken.gu.se/ws/korp/v8";
export const KORP_CORPORA = ["SUC3", "ROMI", "ROMII", "GP2012", "GP2013", "WEBBNYHETER2012", "WEBBNYHETER2013", "BLOGGMIX2012", "BLOGGMIX2013", "ATTASIDOR"];
// Our parts of speech → SUC tags.
export const KORP_POS = {
  noun: ["NN"], verb: ["VB"], adjective: ["JJ", "PC"], adverb: ["AB"], preposition: ["PP"],
  conjunction: ["KN", "SN"], pronoun: ["PN", "PS", "HP", "HS", "DT"], numeral: ["RG", "RO"], interjection: ["IN"],
  perfekt_particip: ["PC", "JJ"], presens_particip: ["PC", "JJ"],
};
export const THRESHOLDS = {
  lemma: { hits: 10, corpora: 2, perCorpus: 2 },
  spelling: { hits: 20, corpora: 3, perCorpus: 2 },
  multiword: { hits: 5, corpora: 2, perCorpus: 1 },
  pos: { hits: 10, share: 0.2, corpora: 2, perCorpus: 2 },
  posSpelling: { hits: 20, share: 0.5, corpora: 2, perCorpus: 2 },
  sense: { perSense: 2, corpora: 2 },
};

const q = (w) => String(w).replace(/["\\]/g, "");
const PLACEHOLDER = /^(någon|något|några|ngn|ngt|ngns|någons|ngras|x|y)$/i;
const REFLEXIVE = "sig|mig|dig|oss|er|sej|mej|dej";

// The word's own forms (headword + its stored inflections), so that a compound such as
// vuxenutbildning — another word — is not counted; "en"/"ett" stored as a gender is no form.
export function ownForms(text, forms = []) {
  const head = String(text).trim().toLowerCase();
  return [...new Set([head, ...forms.map((f) => String(f).trim().toLowerCase())])]
    .filter((f) => /^[\p{L}-]+$/u.test(f) && (f === head || !["en", "ett"].includes(f)));
}

// "Jaha!", "Det ska bli spännande att ..." → the words themselves.
const bare = (text) => String(text).replace(/[!?.,;:…"”“]+/g, " ").replace(/\s+/g, " ").trim();

// One token per word; "något" / "någon" stand for 1–3 words, "sig" for any reflexive.
export function korpCqp(text, pos = null, { spelling = false, forms = [] } = {}) {
  text = bare(text);
  const words = text.split(/\s+/);
  while (words.length > 1 && PLACEHOLDER.test(words[words.length - 1])) words.pop();
  while (words.length > 1 && PLACEHOLDER.test(words[0])) words.shift();
  if (words.length > 1) {
    return words.map((w) => (PLACEHOLDER.test(w) ? "[]{1,3}" : /^sig$/i.test(w) ? `[word="${REFLEXIVE}"%c]` : `[lemma contains "${q(w)}" | word="${q(w)}"%c]`)).join(" ");
  }
  const tags = pos ? KORP_POS[pos] : null;
  const tag = tags ? ` & (${tags.map((t) => `pos="${t}"`).join(" | ")})` : "";
  const own = `word="${ownForms(text, forms).join("|")}"%c`;
  return spelling ? `[${own}${tag}]` : `[lemma contains "${q(text.toLowerCase())}" & ${own}${tag}]`;
}

async function korpJson(path, params, { timeout = 180000, tries = 3 } = {}) {
  const url = `${KORP}/${path}?${new URLSearchParams(params)}`;
  for (let n = 1; ; n++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(timeout) });
      const d = await r.json();
      if (d.ERROR) throw new Error(d.ERROR.value || "korp error");
      return d;
    } catch (e) {
      if (n >= tries) throw e;
      await new Promise((res) => setTimeout(res, 3000 * n));
    }
  }
}

// Counts per corpus and per part of speech. Lemma first; a word the lemmatiser does not know is
// counted by its spelling (headword + forms) and marked as such.
export async function korpAttestation(text, { forms = [], corpora = KORP_CORPORA } = {}) {
  const multiword = /\s/.test(bare(text));
  const run = async (cqp) => {
    const d = await korpJson("count", { corpus: corpora.join(","), group_by: "pos", cqp });
    const byPos = {}, corpusPos = {}, perCorpus = {};
    for (const r of d.combined?.rows || []) byPos[r.value.pos?.[0] || "?"] = r.absolute;
    for (const [c, v] of Object.entries(d.corpora || {})) {
      perCorpus[c] = v.sums?.absolute || 0;
      corpusPos[c] = Object.fromEntries((v.rows || []).map((r) => [r.value.pos?.[0] || "?", r.absolute]));
    }
    return { cqp, total: d.combined?.sums?.absolute || 0, perCorpus, byPos, corpusPos };
  };
  const lemma = await run(korpCqp(text, null, { forms }));
  if (lemma.total || multiword) return { ...lemma, match: multiword ? "multiword" : "lemma" };
  return { ...(await run(korpCqp(text, null, { spelling: true, forms }))), match: "spelling" };
}

const corporaWith = (counts, min) => Object.entries(counts || {}).filter(([, n]) => n >= min).map(([c]) => c);

// Pure: the existence and part-of-speech verdicts for one attestation.
export function judgeAttestation(a, pos) {
  const t = THRESHOLDS[a.match] || THRESHOLDS.lemma;
  const inCorpora = corporaWith(a.perCorpus, t.perCorpus);
  const exists = a.total >= t.hits && inCorpora.length >= t.corpora
    ? { ok: true, reason: `${a.total} ${a.match} hits in ${inCorpora.length} corpora` }
    : { ok: false, reason: `${a.total} ${a.match} hits in ${inCorpora.length} corpora (needs ${t.hits} in ${t.corpora})` };
  if (a.match === "multiword" || !KORP_POS[pos]) return { exists, pos: { ok: null, reason: "not judged" } };
  const tags = KORP_POS[pos], p = a.match === "spelling" ? THRESHOLDS.posSpelling : THRESHOLDS.pos;
  const hits = tags.reduce((s, tag) => s + (a.byPos[tag] || 0), 0);
  const share = a.total ? hits / a.total : 0;
  const posCorpora = Object.entries(a.corpusPos || {}).filter(([, r]) => tags.reduce((s, tag) => s + (r[tag] || 0), 0) >= p.perCorpus).length;
  const top = Object.entries(a.byPos).sort((x, y) => y[1] - x[1])[0];
  const posVerdict = exists.ok && hits >= p.hits && share >= p.share && posCorpora >= p.corpora
    ? { ok: true, reason: `${hits} hits tagged ${tags.join("/")} (${Math.round(share * 100)}%) in ${posCorpora} corpora` }
    : { ok: false, reason: `${hits} hits tagged ${tags.join("/")} (${Math.round(share * 100)}%) in ${posCorpora} corpora; most common tag ${top ? `${top[0]} ${top[1]}` : "none"}`, differs: !!top && !tags.includes(top[0]) && share < 0.05 && top[1] >= p.hits };
  return { exists, pos: posVerdict };
}

// Real sentences for the query, sampled at random from news, fiction/balanced and blog corpora
// alike (one random draw over all would be mostly blogs, the largest): [{ n, corpus, position, text }].
export const KORP_GROUPS = [["GP2012", "GP2013", "WEBBNYHETER2012", "WEBBNYHETER2013"], ["SUC3", "ROMI", "ROMII", "ATTASIDOR"], ["BLOGGMIX2012", "BLOGGMIX2013"]];
export async function korpSentences(cqp, { count = 12, groups = KORP_GROUPS, seed = 7 } = {}) {
  const per = Math.ceil(count / groups.length), out = [];
  for (const corpora of groups) {
    const d = await korpJson("query", { corpus: corpora.join(","), start: 0, end: per - 1, default_context: "1 sentence", sort: "random", random_seed: seed, cqp });
    for (const k of d.kwic || []) {
      const words = k.tokens.map((t, j) => (j >= k.match.start && j < k.match.end ? `[${t.word}]` : t.word));
      out.push({ n: out.length + 1, corpus: k.corpus, position: k.match.position, text: words.join(" ").replace(/ ([.,!?:;)])/g, "$1").replace(/\( /g, "(").slice(0, 320) });
    }
  }
  return out;
}

const READ_A = `You read real Swedish corpus sentences to check a learner dictionary entry. The headword's occurrence is in [brackets].
First split the entry's meaning into its distinct senses (synonyms and near-paraphrases of one sense count as one sense; keep the meaning's own order).
Then, for each sentence, give the number of the sense the bracketed word expresses there (1 = the first sense), or 0 when it expresses none of them: another sense not in the meaning, another part of speech, a name, a typo, part of a fixed expression with its own meaning, or unclear. Be strict: a sense counts only when the sentence clearly shows it.`;
const READ_B = `You independently check readings of real Swedish corpus sentences. The headword's occurrence is in [brackets].
For each item answer yes only if, in that sentence, the bracketed word clearly means the given gloss and has the given part of speech; otherwise no (another sense, another part of speech, a name, a typo, part of an expression with its own meaning, or unclear).`;
const schemaA = { type: "object", additionalProperties: false, required: ["senses", "readings"], properties: {
  senses: { type: "array", items: { type: "object", additionalProperties: false, required: ["zh", "en"], properties: { zh: { type: "string" }, en: { type: "string" } } } },
  readings: { type: "array", items: { type: "object", additionalProperties: false, required: ["n", "sense", "note"], properties: { n: { type: "integer" }, sense: { type: "integer" }, note: { type: "string" } } } } } };
const schemaB = { type: "object", additionalProperties: false, required: ["items"], properties: { items: { type: "array", items: { type: "object", additionalProperties: false, required: ["key", "yes", "note"], properties: { key: { type: "string" }, yes: { type: "boolean" }, note: { type: "string" } } } } } };

// Pure: a sense is verified when every sense has enough confirmed sentences and the confirmed
// sentences come from enough corpora.
export function senseVerdict(senses, sentences, readings, confirmations) {
  const t = THRESHOLDS.sense;
  const confirmed = readings.filter((r) => r.sense >= 1 && r.sense <= senses.length && confirmations[r.n] === true);
  const perSense = senses.map((s, i) => confirmed.filter((r) => r.sense === i + 1).length);
  const corpora = new Set(confirmed.map((r) => sentences.find((s) => s.n === r.n)?.corpus).filter(Boolean));
  const unattested = senses.filter((s, i) => perSense[i] < t.perSense).map((s) => s.en);
  const ok = senses.length > 0 && !unattested.length && corpora.size >= t.corpora;
  return { ok, perSense, corpora: [...corpora], unattested,
    reason: ok ? `every sense in ≥${t.perSense} confirmed sentences, ${corpora.size} corpora`
      : !senses.length ? "no senses read" : unattested.length ? `not attested: ${unattested.join("; ")}` : `confirmed sentences from ${corpora.size} corpus` };
}

// Two independent readings of the sentences (ai: ({ schemaName, schema, system, user, maxOutputTokens }) → result).
export async function judgeSenseFromSentences({ word, pos, meaningZh, meaningEn, sentences }, ai) {
  if (!sentences.length) return { ok: false, reason: "no sentences", senses: [], readings: [], confirmations: {} };
  const a = await ai({ schemaName: "korp_sense_read", schema: schemaA, system: READ_A, maxOutputTokens: 1500,
    user: JSON.stringify({ word, part_of_speech: pos || "expression", meaning_zh: meaningZh, meaning_en: meaningEn, sentences: sentences.map(({ n, text }) => ({ n, text })) }) });
  const claims = a.readings.filter((r) => r.sense >= 1 && r.sense <= a.senses.length);
  const confirmations = {}, notesB = {};
  if (claims.length) {
    const b = await ai({ schemaName: "korp_sense_confirm", schema: schemaB, system: READ_B, maxOutputTokens: 1200,
      user: JSON.stringify({ word, part_of_speech: pos || "expression", items: claims.map((r) => ({ key: String(r.n), sentence: sentences.find((s) => s.n === r.n)?.text, gloss: `${a.senses[r.sense - 1].en} (${a.senses[r.sense - 1].zh})` })) }) });
    for (const x of b.items) { confirmations[Number(x.key)] = x.yes; notesB[Number(x.key)] = x.note; }
  }
  const v = senseVerdict(a.senses, sentences, a.readings, confirmations);
  return { ...v, senses: a.senses, readings: a.readings.map((r) => ({ ...r, confirmed: confirmations[r.n] ?? null, note_b: notesB[r.n] || "" })), confirmations };
}
