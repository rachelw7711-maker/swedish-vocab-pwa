// Korp (Språkbanken Text) as evidence for entries no dictionary has (2026-11-04).
// A real, correctly used word need not be in a dictionary: corpus use can verify it. Three
// separate checks, never frequency alone:
//  1. existence: lemma hits (the corpus lemmatiser knows the word) in several corpora; a match on
//     the spelling only needs more hits in more corpora — typos and one-off coinages stay out.
//  2. part of speech: enough of the hits are tagged with the entry's part of speech, in more than
//     one corpus (a tagger error or a homograph of another class does not count).
//  3. sense: real sentences sampled from several corpora; one reader marks which parts of the
//     entry's English meaning (split at ";") each sentence shows, a second reader independently
//     confirms each mark. Every part needs two confirmed sentences; together from two corpora.
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
// A slot written "+ verb" / "+ inf." stands for words like "något"; other regex signs are dropped.
const bare = (text) => String(text).replace(/\+\s*[\p{L}.]+/gu, " x ").replace(/[!?.,;:…"”“+*()[\]{}|\\^$]+/g, " ").replace(/\s+/g, " ").trim();

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

// One answer per query, shared by every script (KORP_CACHE_DIR, default data/reports/korp-cache):
// the same count or sample is never asked of Språkbanken twice. The corpora don't change.
const CACHE_DIR = process.env.KORP_CACHE_DIR || "data/reports/korp-cache";
async function cached(url) {
  try {
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(`${CACHE_DIR}/${await digest(url)}.json`, "utf8"));
  } catch { return null; }
}
async function store(url, d) {
  try {
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(`${CACHE_DIR}/${await digest(url)}.json`, JSON.stringify(d));
  } catch { /* a cache that can't be written only costs a query */ }
}
const digest = async (s) => (await import("node:crypto")).createHash("sha1").update(s).digest("hex");

async function korpJson(path, params, { timeout = 180000, tries = 3 } = {}) {
  // KORP_OFFLINE: Korp is not asked (tests; an operator's switch): callers get an error, decide nothing.
  if (process.env.KORP_OFFLINE) throw new Error("korp offline");
  const url = `${KORP}/${path}?${new URLSearchParams(params)}`;
  const hit = await cached(url);
  if (hit) return hit;
  // KORP_CACHE_ONLY: only what was asked before (a replay that must give the same answers).
  if (process.env.KORP_CACHE_ONLY) throw new Error("korp: not cached");
  for (let n = 1; ; n++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(timeout) });
      const d = await r.json();
      if (d.ERROR) throw new Error(d.ERROR.value || "korp error");
      await store(url, d);
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

// The meaning's own parts ("steam; steam along" → two): each must be shown by the sentences on
// its own. A reader may not merge them — merging let a wrong or unused part pass with the others.
export function meaningParts(meaningEn) {
  return [...new Set(String(meaningEn || "").split(";").map((x) => x.trim().replace(/[.。]$/, "")).filter(Boolean))];
}

const READ_A = `You read real Swedish corpus sentences to check a learner dictionary entry. The headword's occurrence is in [brackets].
The entry's English meaning is given as numbered glosses. For each sentence, list the numbers of every gloss that correctly describes what the bracketed word means in that sentence (several when glosses are synonyms), or an empty list when none does: another sense, another part of speech, a name, a typo, part of a fixed expression with its own meaning, or unclear. Be strict: a gloss counts only when the sentence clearly shows that meaning.`;
const READ_B = `You independently check readings of real Swedish corpus sentences. The headword's occurrence is in [brackets].
For each item answer yes only if, in that sentence, the bracketed word clearly means the given gloss and has the given part of speech; otherwise no (another sense, another part of speech, a name, a typo, part of an expression with its own meaning, or unclear).`;
const schemaA = { type: "object", additionalProperties: false, required: ["readings"], properties: {
  readings: { type: "array", items: { type: "object", additionalProperties: false, required: ["n", "glosses", "note"], properties: { n: { type: "integer" }, glosses: { type: "array", items: { type: "integer" } }, note: { type: "string" } } } } } };
const schemaB = { type: "object", additionalProperties: false, required: ["items"], properties: { items: { type: "array", items: { type: "object", additionalProperties: false, required: ["key", "yes", "note"], properties: { key: { type: "string" }, yes: { type: "boolean" }, note: { type: "string" } } } } } };

// Pure: verified when every part of the meaning has enough sentences both readers agree on, and
// those sentences come from enough corpora. confirmations: { "n:gloss": true | false }.
export function senseVerdict(parts, sentences, readings, confirmations) {
  const t = THRESHOLDS.sense;
  // the same sentence twice (a news item repeated) is one piece of evidence
  const textOf = (n) => String(sentences.find((s) => s.n === n)?.text || n).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const agreed = readings.flatMap((r) => (r.glosses || []).filter((g) => g >= 1 && g <= parts.length && confirmations[`${r.n}:${g}`] === true).map((g) => ({ n: r.n, g })));
  const perPart = parts.map((p, i) => new Set(agreed.filter((x) => x.g === i + 1).map((x) => textOf(x.n))).size);
  const corpora = new Set(agreed.map((x) => sentences.find((s) => s.n === x.n)?.corpus).filter(Boolean));
  const unattested = parts.filter((p, i) => perPart[i] < t.perSense);
  const ok = parts.length > 0 && !unattested.length && corpora.size >= t.corpora;
  return { ok, perPart, corpora: [...corpora], unattested,
    reason: ok ? `every part of the meaning in ≥${t.perSense} confirmed sentences, ${corpora.size} corpora`
      : !parts.length ? "no meaning" : unattested.length ? `not attested: ${unattested.join("; ")}` : `confirmed sentences from ${corpora.size} corpus` };
}

// Two independent readings of the sentences (ai: ({ schemaName, schema, system, user, maxOutputTokens }) → result).
export async function judgeSenseFromSentences({ word, pos, meaningZh, meaningEn, sentences }, ai) {
  const parts = meaningParts(meaningEn);
  if (!sentences.length || !parts.length) return { ok: false, reason: !parts.length ? "no meaning" : "no sentences", parts, readings: [], method: "parts" };
  const a = await ai({ schemaName: "korp_sense_read", schema: schemaA, system: READ_A, maxOutputTokens: 1500,
    user: JSON.stringify({ word, part_of_speech: pos || "expression", meaning_zh: meaningZh, glosses: parts.map((p, i) => ({ number: i + 1, gloss: p })), sentences: sentences.map(({ n, text }) => ({ n, text })) }) });
  const claims = a.readings.flatMap((r) => (r.glosses || []).filter((g) => g >= 1 && g <= parts.length).map((g) => ({ n: r.n, g })));
  const confirmations = {}, notesB = {};
  if (claims.length) {
    const b = await ai({ schemaName: "korp_sense_confirm", schema: schemaB, system: READ_B, maxOutputTokens: 2000,
      user: JSON.stringify({ word, part_of_speech: pos || "expression", items: claims.map((c) => ({ key: `${c.n}:${c.g}`, sentence: sentences.find((s) => s.n === c.n)?.text, gloss: parts[c.g - 1] })) }) });
    for (const x of b.items) { confirmations[x.key] = x.yes; notesB[x.key] = x.note; }
  }
  const v = senseVerdict(parts, sentences, a.readings, confirmations);
  return { ...v, parts, method: "parts",
    readings: a.readings.map((r) => ({ n: r.n, glosses: r.glosses, note: r.note, confirmed: Object.fromEntries((r.glosses || []).map((g) => [g, confirmations[`${r.n}:${g}`] ?? null])), note_b: (r.glosses || []).map((g) => notesB[`${r.n}:${g}`]).filter(Boolean).join(" / ") })) };
}

// ---------------------------------------------------------------------------
// Forms (2026-11-04): a stored form is attested when the corpus has it, lemmatised to this word
// and tagged as that very inflection (NN.UTR.PLU.DEF.NOM for a definite plural), in several
// corpora. A form the corpus never shows for the word stays unconfirmed; when the corpus shows
// another spelling for that inflection many times instead, that is reported, not applied.
export const FORM_MSD = {
  singular_indefinite: /^NN\.(UTR|NEU)\.SIN\.IND\.NOM$/,
  singular_definite: /^NN\.(UTR|NEU)\.SIN\.DEF\.NOM$/,
  plural_indefinite: /^NN\.(UTR|NEU)\.PLU\.IND\.NOM$/,
  plural_definite: /^NN\.(UTR|NEU)\.PLU\.DEF\.NOM$/,
  base_form: /^(JJ\.POS|PC\.PRF)\.UTR\.SIN\.IND\.NOM$/,
  en_form: /^(JJ\.POS|PC\.PRF)\.UTR\.SIN\.IND\.NOM$/,
  // an indeclinable adjective (dåvarande, bra) is tagged for both genders and numbers at once
  neuter_form: /^(JJ\.POS|PC\.PRF)\.NEU\.SIN\.IND\.NOM$|^(JJ\.POS|PC\.PRS)\.UTR\+NEU\.SIN\+PLU\.IND\+DEF\.NOM$/,
  ett_form: /^(JJ\.POS|PC\.PRF)\.NEU\.SIN\.IND\.NOM$/,
  plural_form: /^(JJ\.POS|PC\.PRF)\.UTR\+NEU\.(PLU\.IND\+DEF|SIN\.DEF)\.NOM$|^(JJ\.POS|PC\.PRS)\.UTR\+NEU\.SIN\+PLU\.IND\+DEF\.NOM$/,
  comparative: /^JJ\.KOM\./,
  superlative_indefinite: /^JJ\.SUV\..*\.IND\.NOM$/,
  superlative_definite: /^JJ\.SUV\..*\.DEF\.NOM$/,
  infinitive: /^VB\.INF\.AKT$/,
  present: /^VB\.PRS\.AKT$/,
  preteritum: /^VB\.PRT\.AKT$/,
  supinum: /^VB\.SUP\.AKT$/,
  imperative: /^VB\.IMP\.AKT$/,
};
// Pure: the comparison as one paradigm. When one of comparative / superlatives is attested and the
// three are built by the same rule — mer/mest + the positive and its -a form, or -are / -ast /
// -aste — the others follow from it (a predicative "mest professionell" is rare in any corpus).
export function comparisonByRule(base, plural, forms, attested) {
  const [c, si, sd] = ["comparative", "superlative_indefinite", "superlative_definite"].map((t) => String(forms[t] || "").trim().toLowerCase());
  const b = String(base).toLowerCase(), p = String(plural || "").toLowerCase();
  const periphrastic = c === `mer ${b}` && si === `mest ${b}` && p && sd === `mest ${p}`;
  const stem = c.endsWith("are") ? c.slice(0, -3) : null;
  const synthetic = stem && si === `${stem}ast` && sd === `${stem}aste`;
  if (!(periphrastic || synthetic)) return null;
  return ["comparative", "superlative_indefinite", "superlative_definite"].some((t) => attested[t]) ? (periphrastic ? "mer/mest" : "-are/-ast/-aste") : null;
}

export const FORM_THRESHOLD = { hits: 3, corpora: 2, contradicted: { hits: 20, corpora: 3 } };
const LEMMA_TAGS = { noun: "NN", adjective: "JJ|PC", perfekt_particip: "PC|JJ", presens_particip: "PC|JJ", verb: "VB" };

// Every form of the lemma in the corpora: [{ word, msd, corpus, n }].
export async function korpFormReadings(lemma, pos, { corpora = KORP_CORPORA } = {}) {
  const tags = LEMMA_TAGS[pos];
  if (!tags) return { cqp: null, readings: [] };
  const cqp = `[lemma contains "${q(String(lemma).toLowerCase())}" & pos="${tags}"]`;
  const d = await korpJson("count", { corpus: corpora.join(","), group_by: "word,msd", cqp });
  const readings = [];
  for (const [corpus, v] of Object.entries(d.corpora || {})) for (const r of v.rows || []) readings.push({ word: String(r.value.word?.[0] || "").toLowerCase(), msd: r.value.msd?.[0] || "", corpus, n: r.absolute });
  return { cqp, readings };
}

// Hits and corpora of an exact word sequence ("mer abstrakt", "de kursiva stilarna").
export async function korpSequence(words, { corpora = KORP_CORPORA } = {}) {
  const cqp = String(words).trim().split(/\s+/).map((w) => `[word="${q(w)}"%c]`).join(" ");
  const d = await korpJson("count", { corpus: corpora.join(","), group_by: "word", cqp });
  const perCorpus = Object.fromEntries(Object.entries(d.corpora || {}).map(([c, v]) => [c, v.sums?.absolute || 0]));
  return { cqp, hits: d.combined?.sums?.absolute || 0, corpora: Object.values(perCorpus).filter((n) => n > 0).length };
}

// Pure: one single-word form against the lemma's readings. "—" (no plural) is confirmed when the
// word is common enough and its plural all but absent (under 2% of its uses).
export function judgeForm(formType, value, readings) {
  const pattern = FORM_MSD[formType];
  if (!pattern) return { ok: null, reason: `no tag for ${formType}` };
  if (/^[—–-]$/.test(String(value).trim())) {
    if (!/^plural/.test(formType)) return { ok: null, reason: "no form" };
    const total = readings.reduce((n, r) => n + r.n, 0), plural = readings.filter((r) => /\.PLU\./.test(r.msd)).reduce((n, r) => n + r.n, 0);
    const ok = total >= 20 && plural / total < 0.02;
    return { ok, hits: plural, corpora: 0, reason: `plural ${plural} of ${total} uses (${total ? Math.round((plural / total) * 1000) / 10 : 0}%)` };
  }
  const word = String(value).trim().toLowerCase();
  const mine = readings.filter((r) => r.word === word && pattern.test(r.msd));
  const hits = mine.reduce((s, r) => s + r.n, 0), corpora = new Set(mine.map((r) => r.corpus)).size;
  const t = FORM_THRESHOLD;
  if (hits >= t.hits && corpora >= t.corpora) return { ok: true, hits, corpora, reason: `${hits} hits as ${formType} in ${corpora} corpora` };
  const others = {};
  for (const r of readings) if (r.word !== word && pattern.test(r.msd)) (others[r.word] ||= { hits: 0, corpora: new Set() }).hits += r.n, others[r.word].corpora.add(r.corpus);
  const [alt, a] = Object.entries(others).sort((x, y) => y[1].hits - x[1].hits)[0] || [];
  const contradicted = !hits && a && a.hits >= t.contradicted.hits && a.corpora.size >= t.contradicted.corpora;
  return { ok: false, hits, corpora, reason: `${hits} hits as ${formType} in ${corpora} corpora`, ...(contradicted ? { corpus_form: alt, corpus_form_hits: a.hits } : {}) };
}

// The noun's declension group from its forms (null when the forms don't decide it).
export function groupFromForms(sing, pl, genus) {
  const s = String(sing || "").toLowerCase(), p = String(pl || "").toLowerCase();
  if (!s || !p || /\s|\//.test(p)) return null;
  if (p === s) return "5";
  if (p === s.replace(/a$/, "") + "or" && s.endsWith("a")) return "1";
  if (p === s + "ar" || p === s.replace(/[ae]$/, "") + "ar" || p === s.replace(/e([lnr])$/, "$1") + "ar") return "2";
  if (genus === "ett" && p === s + "n") return "4";
  if (p === s + "er" || p === s + "r" || p === s.replace(/e([lnr])$/, "$1") + "er" || p === s.replace(/um$/, "") + "er") return "3";
  return null;
}

// Word associations of a lemgram (2026-11-09, knowledge v2): Korp's relations service — each
// syntactic partner (object, attribute, prepositional, adverbial, subject) with its frequency and
// lmi. Used to tell a typical combination (tända eld) from a free one (liknande system); never as
// proof of a fixed expression on its own (server-evidence.mjs classifyMultiword). Cached like
// every Korp answer. [{ head, rel, dep, freq, mi }] (mi is Korp's lmi).
export async function korpRelations(lemgram, { corpora = KORP_CORPORA } = {}) {
  const d = await korpJson("relations", { corpus: corpora.join(","), word: lemgram, type: "lemgram" });
  return (d.relations || []).map((r) => ({ head: r.head, rel: r.rel, dep: r.dep, freq: r.freq, mi: r.mi }));
}
