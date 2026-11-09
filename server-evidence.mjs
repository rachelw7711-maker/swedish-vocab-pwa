// Evidence for knowledge fields (2026-11-09, knowledge v2: data/reports/round-f/
// knowledge-implementation-plan-2026-11-09.md §1, §3, §13). One set of rules for every field of
// every entry, so that "nothing found" is never taken for "wrong" and an AI's word never makes
// anything verified on its own:
//   supports / refutes — evidence for or against this very item (a sense, an example, a collocation)
//   not_found          — a source was asked and has nothing: no evidence either way
//   lookup_failed      — a source could not be asked: no evidence either way, ask again later
// Each piece has a kind with a fixed strength; only a refutation at least as strong as the best
// support can remove anything (gradeItem). A dictionary's original text and a human's decision are
// the strongest; one AI answer the weakest. Word overlap between an English meaning and a
// dictionary's English is a candidate only — it never verifies a sense by itself (§13.5).
import { lemmatize, saldoEntries } from "./server-lexicon.mjs";
import { referenceEntries, expressionInReferences, meaningSupport } from "./server-references.mjs";
import { korpAttestation, korpRelations, judgeAttestation, useKorpCacheTable } from "./server-korp.mjs";

export const RESULTS = ["supports", "refutes", "not_found", "lookup_failed", "disputed"];

// strength: how much one piece weighs; verifies: whether it can make an item verified at all.
export const EVIDENCE_KINDS = {
  human: { strength: 5, verifies: true },
  dictionary_sense_link: { strength: 5, verifies: true },   // the item tied to one Lexin sense (VariantID)
  dictionary_listing: { strength: 5, verifies: true },      // a Lexin idiom / construction / headword, SALDO multi-word entry
  dictionary_original: { strength: 5, verifies: true },     // a dictionary's own sentence or phrase, used as it stands
  saldo_morphology: { strength: 5, verifies: true },        // forms, part of speech
  program: { strength: 5, verifies: false },                // a rule the program checks (a wrong inflection, two conjunctions)
  korp_sense: { strength: 4, verifies: true },              // corpus sentences two readers confirmed for this sense
  korp_attestation: { strength: 4, verifies: true },        // the word / sequence is in the corpora (existence only)
  korp_association: { strength: 3, verifies: false },       // a strong, typical combination (not proof of a fixed expression)
  candidate_dictionary_overlap: { strength: 3, verifies: false },
  wiktionary: { strength: 3, verifies: false },             // CC BY-SA, crowd-sourced: evidence, never shown
  ai_two_agree: { strength: 2, verifies: false },
  ai_one: { strength: 1, verifies: false },
  legacy_ai: { strength: 1, verifies: false },              // the 2026-11-02 audit's verdicts
};

/** One piece of evidence: { kind, result, source?, ref?, note? } with a known kind and result. */
export function evidence(kind, result, extra = {}) {
  if (!EVIDENCE_KINDS[kind]) throw new Error(`unknown evidence kind ${kind}`);
  if (!RESULTS.includes(result)) throw new Error(`unknown evidence result ${result}`);
  return { kind, result, ...extra };
}

const strengthOf = (e) => EVIDENCE_KINDS[e.kind]?.strength || 0;

/**
 * An item's grade from all its evidence:
 *   verified      — a support that can verify, nothing as strong against it
 *   ai_consistent — supported only by AI answers or candidate overlap, nothing as strong against it
 *   unverified    — no support (not_found / lookup_failed only, or nothing)
 *   disputed      — evidence both ways, the refutation not stronger than the support; or one weak doubt
 *   refuted       — a refutation of strength ≥ 2 stronger than any support (equal only at 5:
 *                   a human or a dictionary against a dictionary). Only this may remove the item.
 * Returns { grade, support, refute, protected, reasons }.
 */
export function gradeItem(list = []) {
  const supports = list.filter((e) => e.result === "supports");
  const refutes = list.filter((e) => e.result === "refutes");
  const disputed = list.some((e) => e.result === "disputed");
  const s = Math.max(0, ...supports.map(strengthOf)), r = Math.max(0, ...refutes.map(strengthOf));
  const verifies = supports.some((e) => EVIDENCE_KINDS[e.kind].verifies);
  const reasons = [];
  let grade;
  if (r >= 2 && (r > s || (r === s && r >= 5))) { grade = "refuted"; reasons.push(`refuted_by:${refutes.filter((e) => strengthOf(e) === r).map((e) => e.kind).join("+")}`); }
  else if (refutes.length || disputed) grade = supports.length || disputed ? "disputed" : "unverified";
  else if (verifies) grade = "verified";
  else if (supports.length) grade = "ai_consistent";
  else grade = "unverified";
  if (grade === "unverified" && refutes.length) reasons.push("weak_doubt");
  if (list.some((e) => e.result === "lookup_failed")) reasons.push("lookup_failed");
  return { grade, support: s, refute: r, protected: s >= 5 && verifies, reasons };
}

/** Whether evidence lets an item be removed: refuted only — never for lack of evidence. */
export const mayRemove = (list) => gradeItem(list).grade === "refuted";

// ---------------------------------------------------------------------------
// Strict dictionary matching for multi-word combinations (§3.3-6, §13.3)
// ---------------------------------------------------------------------------
// The old rule (collocationInLexin) counted a collocation as listed when its other words occurred
// anywhere in any Lexin construction, idiom or example of the headword, in any order and any part
// of speech: "liknande system" or a word met in an example sentence was "in the dictionary" and
// could never be dropped. Here the phrase must stand in the listing in order, each word in one of
// its own forms; a slot in the listing (ngn, ngt, SATS) matches only a slot of the phrase — a
// valency pattern "ngn tänder ngt" does not list "tända eld". An example sentence is evidence that
// the words go together (existence), never that they form a fixed expression.

const PLACEHOLDER_WORDS = new Set(["någon", "något", "några", "någons", "ngn", "ngt", "ngns", "ngras", "nån", "nåt", "x", "y", "a", "s"]);
const REFLEXIVE_WORDS = new Set(["sig", "mig", "dig", "oss", "er", "sej", "mej", "dej"]);

// Tokens of a dictionary listing: lower case; "ngn/ngt" and SLOT words (SATS, VERB, TID, +inf.) are slots.
export function listingTokens(text) {
  return String(text || "").replace(/\+\s*\p{L}+\.?/gu, " SLOT ").split(/[\s,;:!?."”“()[\]]+/u).filter(Boolean).map((t) => {
    if (/^[\p{Lu}]{2,}$/u.test(t) && t !== t.toLowerCase()) return { slot: true };
    const parts = t.toLowerCase().split("/");
    if (parts.every((p) => PLACEHOLDER_WORDS.has(p))) return { slot: true };
    if (parts.some((p) => REFLEXIVE_WORDS.has(p))) return { word: "sig", reflexive: true };
    return { word: parts[0], alternatives: parts };
  });
}

// Optional parts in brackets dropped, and kept: "ngn är beroende (av ngn/ngt)" is both.
export function listingVariants(text) {
  const t = String(text || "");
  return [...new Set([t.replace(/\([^)]*\)/g, " "), t.replace(/[()]/g, " ")].map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean))];
}

/**
 * Whether the phrase stands in a listing, in order: slots = the phrase's words as
 * [{ forms: Set } | { slot: true } | { reflexive: true }]; a slot of the phrase matches a slot of
 * the listing or 1–3 words; a word of the phrase matches a word of the listing that is one of its
 * forms. Pure.
 */
export function phraseInListing(slots, listing) {
  // A phrase that starts or ends with a slot ("ta hand om någon") also matches without it.
  const core = slots.filter((s, k) => !(s.slot && (k === 0 || k === slots.length - 1)));
  for (const variant of listingVariants(listing)) {
    const toks = listingTokens(variant);
    for (const list of [slots, core]) {
      if (!list.length || list.every((s) => s.slot)) continue;
      for (let j = 0; j < toks.length; j++) if (matchWith(list, toks, 0, j)) return true;
    }
  }
  return false;
}

function matchWith(slots, toks, i, j) {
  if (i === slots.length) return true;
  if (j >= toks.length) return false;
  const s = slots[i];
  if (s.slot) {
    if (toks[j].slot) return matchWith(slots, toks, i + 1, j + 1);
    for (let n = 1; n <= 3 && j + n <= toks.length; n++) if (toks.slice(j, j + n).every((t) => !t.slot) && matchWith(slots, toks, i + 1, j + n)) return true;
    return false;
  }
  const t = toks[j];
  if (t.slot) return false;
  if (s.reflexive) return t.reflexive ? matchWith(slots, toks, i + 1, j + 1) : false;
  return (t.alternatives || [t.word]).some((w) => s.forms.has(w)) && matchWith(slots, toks, i + 1, j + 1);
}

/** The phrase's words as slots for phraseInListing, each word with every SALDO form of every reading it has. */
export async function phraseSlots(supabaseAdmin, phrase) {
  const words = String(phrase || "").toLowerCase().replace(/[()]/g, " ").split(/[\s,;:!?.]+/).filter(Boolean);
  const slots = [];
  for (const w of words) {
    const parts = w.split("/");
    if (parts.every((p) => PLACEHOLDER_WORDS.has(p))) { slots.push({ slot: true }); continue; }
    if (REFLEXIVE_WORDS.has(w)) { slots.push({ reflexive: true }); continue; }
    const forms = new Set([w]);
    for (const c of await lemmatize(supabaseAdmin, w)) {
      forms.add(c.lemma.toLowerCase());
      for (const r of await saldoEntries(supabaseAdmin, c.lemma, c.pos)) for (const f of Object.values(r.forms || {}).flat()) forms.add(String(f).toLowerCase());
    }
    slots.push({ forms });
  }
  return slots;
}

const LEXIN_POS = { presens_particip: ["adjective", "verb"], perfekt_particip: ["adjective", "verb"] };
const samePos = (entryPos, pos) => !pos || (LEXIN_POS[pos] || [pos]).includes(entryPos);

/**
 * Where a dictionary lists a multi-word combination under a headword, strictly (pure, with slots
 * from phraseSlots): [{ kind: "idiom" | "construction" | "example", source, variant, text }] —
 * only entries of the headword's part of speech (pos null: any). kind "example" is existence
 * only (dictionaryEvidenceForPhrase).
 */
export function lexinListings(refs, slots, { pos = null } = {}) {
  const hits = [];
  for (const e of refs?.lexin_sv || []) {
    if (!samePos(e.pos, pos)) continue;
    for (const x of e.lexemes || []) {
      for (const c of x.constructions || []) if (phraseInListing(slots, c)) hits.push({ kind: "construction", source: "lexin_sv", variant: x.variant || null, text: c });
      for (const i of x.idioms || []) { const t = Array.isArray(i) ? i[0] : i; if (phraseInListing(slots, t)) hits.push({ kind: "idiom", source: "lexin_sv", variant: x.variant || null, text: t, ...(Array.isArray(i) ? { definition: i[1] } : {}) }); }
      for (const ex of x.examples || []) if (phraseInListing(slots, ex)) hits.push({ kind: "example", source: "lexin_sv", variant: x.variant || null, text: ex });
    }
  }
  for (const e of refs?.lexin_en || []) {
    if (!samePos(e.pos, pos)) continue;
    for (const i of e.idioms || []) { const t = Array.isArray(i) ? i[0] : i; if (phraseInListing(slots, t)) hits.push({ kind: "idiom", source: "lexin_en", variant: e.variant || null, text: t, ...(Array.isArray(i) ? { english: i[1] } : {}) }); }
    for (const ex of e.examples || []) { const t = Array.isArray(ex) ? ex[0] : ex; if (phraseInListing(slots, t)) hits.push({ kind: "example", source: "lexin_en", variant: e.variant || null, text: t, ...(Array.isArray(ex) ? { english: ex[1] } : {}) }); }
  }
  return hits;
}

/**
 * Dictionary evidence for a multi-word combination under its head words: the phrase as a Lexin
 * headword of its own, or a strict listing (idiom / construction) under one of its content words;
 * an example only as existence. { listing: hit | null, example: hit | null, checked: [headwords] }.
 * headwords: [{ lemma, pos }] (the phrase's content words; the caller knows which).
 */
export async function dictionaryEvidenceForPhrase(supabaseAdmin, phrase, headwords = []) {
  const slots = await phraseSlots(supabaseAdmin, phrase);
  const own = await referenceEntries(supabaseAdmin, String(phrase).trim().toLowerCase());
  if ((own.lexin_sv || []).length || (own.lexin_en || []).length) return { listing: { kind: "headword", source: "lexin", text: phrase }, example: null, checked: [phrase] };
  let listing = null, example = null;
  const checked = [];
  for (const h of headwords) {
    const refs = await referenceEntries(supabaseAdmin, h.lemma);
    checked.push(h.lemma);
    for (const hit of lexinListings(refs, slots, { pos: h.pos })) {
      if (hit.kind === "example") example ||= { ...hit, headword: h.lemma };
      else if (!listing || (hit.kind === "idiom" && listing.kind !== "idiom")) listing = { ...hit, headword: h.lemma };
    }
  }
  return { listing, example, checked };
}

// ---------------------------------------------------------------------------
// Multi-word combinations: three separate questions (§13.2)
// ---------------------------------------------------------------------------
// authenticity — is it real, natural Swedish?          supported / not_found / refuted / disputed
// fixedness    — is it a fixed phrase or an idiom?     fixed (F2 / F3) / typical (F1) / free (F0) / undetermined
// placement    — where does it belong?                 own_entry / headword_usage / reading_only
// None is derived from another: "not a fixed expression" never says "wrong", and a free
// combination that is real Swedish keeps authenticity "supported".

// Korp's word-association (lmi, the relations service) is "strong" for a partner among the head's
// top ASSOCIATION.rank partners in that relation with at least ASSOCIATION.lmi. Calibrated on the
// labelled sets (scripts/calibrate-multiword.mjs); a typical combination is strong too (tända eld),
// so strength is never proof of a fixed expression on its own.
export const ASSOCIATION = { rank: 10, lmi: 150 };

/**
 * Pure. input:
 *   dictionary: { listing, example } from dictionaryEvidenceForPhrase (or null: not asked)
 *   attestation: { status: "ok" | "failed", ok, total } — Korp's count of the sequence (null: not asked)
 *   association: { status: "ok" | "failed" | "not_applicable", rank, lmi } — Korp relations
 *   ai: { verdict: "idiom" | "fast_fras" | "neither" | null, made_up: boolean }
 * output: { authenticity, fixedness, cls, placement, review, retireable, reasons, evidence }
 */
export const IDIOM_MIN_HITS = 100;   // provisional, calibration 2026-11-09
export function classifyMultiword({ dictionary = null, attestation = null, association = null, ai = {} } = {}) {
  const ev = [], reasons = [];
  const listing = dictionary?.listing || null;
  // Authenticity.
  if (listing) ev.push(evidence("dictionary_listing", "supports", { ref: listing.text, source: listing.source }));
  else if (dictionary?.example) ev.push(evidence("dictionary_original", "supports", { ref: dictionary.example.text, source: dictionary.example.source }));
  else if (dictionary) ev.push(evidence("dictionary_listing", "not_found"));
  if (attestation?.status === "failed") ev.push(evidence("korp_attestation", "lookup_failed"));
  else if (attestation?.ok) ev.push(evidence("korp_attestation", "supports", { note: `${attestation.total} hits` }));
  else if (attestation) ev.push(evidence("korp_attestation", "not_found", { note: `${attestation.total} hits` }));
  if (ai.made_up) ev.push(evidence("ai_one", "refutes", { note: "ai: not Swedish" }));
  const authenticity = gradeItem(ev);

  // Fixedness.
  const strong = association?.status === "ok" && association.rank != null && association.rank <= ASSOCIATION.rank && association.lmi >= ASSOCIATION.lmi;
  const weak = association?.status === "ok" && !strong;
  const assocUnknown = !association || association.status !== "ok";
  let fixedness = "undetermined", cls = null, review = false;
  if (listing) {
    fixedness = "fixed";
    cls = listing.kind === "idiom" || ai.verdict === "idiom" ? "F3" : "F2";
    if (ai.verdict === "neither") { reasons.push("dictionary_lists_ai_says_free"); review = true; }
    reasons.push(`dictionary_${listing.kind}`);
  } else if (ai.verdict === "idiom") {
    // Not literal by the AI: the corpus must have the expression itself; its sense is verified later
    // from corpus sentences (korp_sense) before it is shown as checked (§13.1-4).
    // At least IDIOM_MIN_HITS in the corpus: in the calibration every free combination the AI could
    // mistake for an idiom had under 100 hits (5–89), every unlisted real idiom over 100 (125–540).
    if (attestation?.ok && attestation.total >= IDIOM_MIN_HITS) { fixedness = "fixed"; cls = "F3"; reasons.push("ai_idiom+corpus_attested"); }
    else if (attestation?.ok) { reasons.push("ai_idiom+corpus_rare"); review = true; }
    else { reasons.push(attestation?.status === "failed" ? "ai_idiom+corpus_unavailable" : "ai_idiom+corpus_not_found"); review = true; }
  } else if (ai.verdict === "fast_fras") {
    // Calibration 2026-11-09 (data/reports/round-f/calibrate-multiword.txt): every typical combination
    // (tända eld, fatta beslut, dricka kaffe …) is as strongly associated as a fixed phrase, so the
    // corpus shows that the words go together, not that the combination is fixed. Fixed rests on the
    // AI alone here: the item goes with its head word (F1) and to review, never to a shared entry.
    if (strong && attestation?.ok !== false) { fixedness = "typical"; cls = "F1"; review = true; reasons.push("ai_fixed+strong_association:fixedness_unconfirmed"); }
    else if (weak) { reasons.push("ai_fixed+weak_association"); review = true; }
    else { reasons.push("ai_fixed+association_unknown"); review = true; }
  } else if (ai.verdict === "neither" || ai.verdict === "typical") {
    if (strong) { fixedness = "typical"; cls = "F1"; reasons.push("strong_association"); }
    else if (weak) { fixedness = "free"; cls = "F0"; reasons.push("weak_association"); }
    else reasons.push("association_unknown");
  } else reasons.push("no_ai_verdict");
  if (assocUnknown && association?.status === "failed") reasons.push("association_lookup_failed");

  const placement = cls === "F2" || cls === "F3" ? "own_entry" : cls === "F1" ? "headword_usage" : "reading_only";
  // A public entry may be retired as "not entry-worthy" only on a determined free combination —
  // never because something was not found or a lookup failed.
  const retireable = cls === "F0" && !listing && authenticity.grade !== "disputed";
  return { authenticity: authenticity.grade, fixedness, cls, placement, review, retireable, reasons, evidence: ev };
}

/** Pure: the association of a partner lemma in Korp's relations of a head: { status, rank, lmi, rel, freq }. */
export function associationOf(relations, head, partner) {
  if (!Array.isArray(relations)) return { status: "failed" };
  const base = (lg) => String(lg || "").split("..")[0].toLowerCase();
  const h = String(head).toLowerCase(), p = String(partner).toLowerCase();
  // Each relation and direction ranked by lmi, one row per partner lemma (a lemma has several senses).
  const groups = new Map();
  for (const r of relations) {
    const headSide = base(r.head) === h, depSide = base(r.dep) === h;
    if (!headSide && !depSide) continue;
    const other = base(headSide ? r.dep : r.head);
    const k = `${r.rel}|${headSide ? "dep" : "head"}`;
    const list = groups.get(k) || groups.set(k, new Map()).get(k);
    if (!list.has(other) || list.get(other).mi < r.mi) list.set(other, r);
  }
  let best = null;
  for (const [k, list] of groups) {
    const ranked = [...list.entries()].sort((a, b) => b[1].mi - a[1].mi);
    const i = ranked.findIndex(([o]) => o === p);
    if (i >= 0 && (!best || i + 1 < best.rank)) best = { status: "ok", rank: i + 1, lmi: Math.round(ranked[i][1].mi), freq: ranked[i][1].freq, rel: k };
  }
  return best || { status: "ok", rank: null, lmi: 0 };
}

// The phrase's content words for Korp's relations: [{ word, lemma, pos, lemgram }] in order — a
// verb followed by a particle as Korp's particle verb (sätta_upp..vbm.1), tried before the verb.
const CONTENT_POS = { noun: "nn", verb: "vb", adjective: "av", adverb: "ab" };
const PARTICLE = new Set(["upp", "ut", "in", "av", "på", "till", "med", "om", "fram", "över", "igenom", "bort", "ner", "ned", "hem", "iväg", "tillbaka", "undan", "efter", "vid", "för", "åt", "emot", "mot", "ihop", "isär", "förbi", "runt", "kvar", "fast", "an", "loss", "ifrån", "från"]);
const FUNCTION_WORDS = new Set(["en", "ett", "den", "det", "de", "denna", "detta", "dessa", "min", "din", "sin", "vår", "er", "hans", "hennes", "deras", "dess", "jag", "du", "han", "hon", "vi", "ni", "man", "mig", "mej", "dig", "dej", "honom", "henne", "oss", "dem", "dom", "som", "och", "eller", "men", "att", "inte", "så",
  "i", "på", "till", "av", "om", "med", "för", "från", "under", "över", "efter", "vid", "mot", "emot", "hos", "utan", "genom", "mellan", "bland", "kring", "omkring", "utmed", "längs", "inom", "trots", "åt", "ur", "bakom", "framför", "bredvid"]);
export async function phraseContentWords(supabaseAdmin, phrase) {
  const words = String(phrase || "").toLowerCase().split(/[\s,;:!?.]+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (PLACEHOLDER_WORDS.has(w) || REFLEXIVE_WORDS.has(w)) continue;
    // Articles, pronouns and prepositions are never content words, whatever rare reading SALDO also
    // has for them ("en" the juniper, "på" an adjective; 2026-11-09 calibration).
    if (FUNCTION_WORDS.has(w)) continue;
    const readings = (await lemmatize(supabaseAdmin, w)).filter((c) => CONTENT_POS[c.pos]);
    if (!readings.length) continue;
    // After a verb or an adjective a noun is meant (ställa en fråga, starkt kaffe); the first word is
    // rather a verb; otherwise the reading spelled like the word.
    const prev = out.at(-1)?.pos;
    const prefer = out.length === 0 ? ["verb"] : ["verb", "adjective"].includes(prev) ? ["noun"] : [];
    const r = prefer.map((p) => readings.find((c) => c.pos === p)).find(Boolean) || readings.find((c) => c.lemma === w) || readings[0];
    const lemgram = (await saldoEntries(supabaseAdmin, r.lemma, r.pos))[0]?.lemgram || `${r.lemma}..${CONTENT_POS[r.pos]}.1`;
    const unit = { word: w, lemma: r.lemma, pos: r.pos, lemgram, all: readings };
    if (r.pos === "verb" && PARTICLE.has(words[i + 1])) unit.particleLemgram = `${r.lemma}_${words[i + 1]}..vbm.1`;
    if (["adverb"].includes(r.pos) && PARTICLE.has(w) && out.at(-1)?.particleLemgram) continue;   // the particle of the verb before
    out.push(unit);
  }
  return out;
}

const withTimeout = (p, ms) => { let t; return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error("timeout")), ms); })]).finally(() => clearTimeout(t)); };

/**
 * Everything classifyMultiword needs about a combination, from the dictionaries and Korp (free):
 * { dictionary, attestation, association, content }. A Korp question that fails or takes longer than
 * `timeout` is "failed" — it decides nothing. korp: { attest, relations } to replace the services (tests).
 */
// need: "all" (scripts) asks everything; "for" + an AI verdict (a reading, where time counts) only
// what can change the class: nothing more once a dictionary lists it, the association for a fixed
// phrase (about half a second), the corpus count (several seconds) for an idiom.
export async function multiwordEvidence(supabaseAdmin, phrase, { korp = {}, timeout = 15000, need = "all", verdict = null } = {}) {
  const attest = korp.attest || korpAttestation, relations = korp.relations || korpRelations;
  if (supabaseAdmin) useKorpCacheTable(supabaseAdmin);   // shared cache, with KORP_DB_CACHE=on
  const content = await phraseContentWords(supabaseAdmin, phrase);
  const heads = content.flatMap((u) => u.all.map((c) => ({ lemma: c.lemma, pos: c.pos })));
  const dictionary = await dictionaryEvidenceForPhrase(supabaseAdmin, phrase, heads);
  if (!dictionary.listing) {
    // A Lexin idiom under another headword, by the expression's match key ("tar hand om något").
    const idiom = (await expressionInReferences(supabaseAdmin, phrase)).find((h) => h.idiom);
    if (idiom) dictionary.listing = { kind: "idiom", source: idiom.source, text: idiom.idiom, headword: idiom.headword };
  }
  const lean = need !== "all";
  if (lean && dictionary.listing) return { dictionary, attestation: null, association: null, content: content.map((u) => u.lemgram) };
  // One word left without its slots ("beställa något") is a word: its count says nothing about a combination.
  const words = String(phrase).toLowerCase().split(/[\s,;:!?.]+/).filter((w) => w && !w.split("/").every((p) => PLACEHOLDER_WORDS.has(p)) && !REFLEXIVE_WORDS.has(w));
  const attestation = words.length < 2 ? { status: "not_applicable" } : lean && verdict !== "idiom" ? null : await withTimeout(attest(phrase), timeout)
    .then((a) => ({ status: "ok", ok: judgeAttestation(a, null).exists.ok, total: a.total }))
    .catch(() => ({ status: "failed" }));
  let association = { status: "not_applicable" };
  if (lean && verdict === "idiom") association = null;
  else if (content.length >= 2) {
    const rel = async (u) => {
      if (u.particleLemgram) { const r = await relations(u.particleLemgram); if (r.length) return { lemma: u.particleLemgram.split("..")[0], list: r }; }
      return { lemma: u.lemma, list: await relations(u.lemgram) };
    };
    try {
      const lists = await withTimeout(Promise.all(content.map(rel)), timeout);
      const pairs = [];
      for (let i = 0; i + 1 < content.length; i++) {
        const [a, b] = [lists[i], lists[i + 1]];
        const ab = associationOf(a.list, a.lemma, content[i + 1].lemma), ba = associationOf(b.list, b.lemma, a.lemma.includes("_") ? content[i].lemma : a.lemma);
        const best = [ab, ba].filter((x) => x.rank != null).sort((x, y) => x.rank - y.rank)[0] || { status: "ok", rank: null, lmi: 0 };
        pairs.push(best);
      }
      // The weakest pair decides: every adjacent pair of content words must go together.
      association = pairs.reduce((w, p) => (p.rank == null || (w.rank != null && p.rank > w.rank) ? p : w), pairs[0]);
    } catch { association = { status: "failed" }; }
  }
  return { dictionary, attestation, association, content: content.map((u) => u.lemgram) };
}

// ---------------------------------------------------------------------------
// Part of speech: one rule for generation and reading (R5, §5.4)
// ---------------------------------------------------------------------------
// Regular conversions dictionaries often don't list (an adjective's -t form as an adverb, an
// adjective or participle as a noun): neither evidence for nor against.
const DERIVED = { adverb: ["adjective", "perfekt_particip", "presens_particip"], noun: ["adjective", "perfekt_particip", "presens_particip"] };
const FUNCTION_CLASSES = new Set(["adverb", "preposition", "conjunction", "subjunction"]);

/**
 * Pure. { pos, references: { saldo, lexin, wiktionary, all }, glossaryPos, wiktionaryStatus, aiSupports }
 * → { pos, status: "confirmed" | "corrected" | "unconfirmed" | "rejected", reason }.
 * A function word's class the references give alone is taken (oavsett: preposition, not adverb).
 * Rejected only when the references give the word other parts of speech, none derivable, and the
 * card check (aiSupports false) agrees — a reference not listing a class is not proof on its own.
 */
export function posDecision({ pos, references = {}, glossaryPos = null, wiktionaryStatus = "found", aiSupports = null }) {
  const known = new Set(references.all || []);
  if (glossaryPos) {
    if (known.size && !known.has(glossaryPos)) return { pos, status: known.has(pos) ? "confirmed" : "rejected", reason: "glossary_not_in_references" };
    if (glossaryPos === pos) return { pos, status: "confirmed", reason: "glossary" };
    return { pos: glossaryPos, status: "corrected", reason: `glossary_says_${glossaryPos}` };
  }
  if (!known.size) return { pos, status: "unconfirmed", reason: wiktionaryStatus === "found" || wiktionaryStatus === "missing" ? "no_reference" : `wiktionary_${wiktionaryStatus}` };
  if (known.has(pos)) return { pos, status: "confirmed", reason: "references" };
  const functionClasses = [...known].filter((p) => FUNCTION_CLASSES.has(p));
  if (FUNCTION_CLASSES.has(pos) && functionClasses.length === 1) return { pos: functionClasses[0], status: "corrected", reason: `references_say_${functionClasses[0]}` };
  if ((DERIVED[pos] || []).some((p) => known.has(p))) return { pos, status: "unconfirmed", reason: `derived_from_${[...known].join("/")}` };
  if (wiktionaryStatus !== "found" && wiktionaryStatus !== "missing") return { pos, status: "unconfirmed", reason: `wiktionary_${wiktionaryStatus}` };
  if (aiSupports === true) return { pos, status: "unconfirmed", reason: `references_say_${[...known].join("/")};ai_supports` };
  return { pos, status: "rejected", reason: `references_say_${[...known].join("/")}` };
}

// ---------------------------------------------------------------------------
// Reuse (R4, §5.3)
// ---------------------------------------------------------------------------

/**
 * Pure: how an existing entry may be reused. status: learning_objects.status.
 * → { reuse: "public" | "pending" | "never", recheck: boolean, label: "verified" | "pending" | null }
 * A draft (a fixed phrase or idiom a reading found, not completed yet) is still linked — readers
 * study it from their reading — but labelled pending and kept out of the shared lists. Content
 * withdrawn as not entry-worthy is retired, never left a draft: a retired entry is never reused
 * (2026-11-09, §13.1-4: withdrawn drafts used to be linked from every new reading).
 */
export function reusePolicy({ status, verification = null }) {
  if (status === "retired") return { reuse: "never", recheck: false, label: null };
  if (status === "draft") return { reuse: "pending", recheck: false, label: "pending" };
  const verified = verification === "verified";
  return { reuse: "public", recheck: !verified, label: verified ? "verified" : "pending" };
}

// ---------------------------------------------------------------------------
// Historical sense status, graded again from evidence (R2, §7.2, §13.5) — pure, dry-run only
// ---------------------------------------------------------------------------

// A part of a meaning that explains rather than names a sense ("used as a general pronoun",
// "relating to Poland, its people, or its language"): it needs no equivalent of its own.
const NOTE = /\b(used|relating|refers?|referring|especially|often|usually|typically|somewhat|informal|formal|old-fashioned|literary|colloquial|figurative(ly)?|e\.g\.|such as|i\.e\.)\b/i;
export function isExplanatoryPart(part) {
  const words = String(part || "").trim().split(/\s+/).filter(Boolean);
  return words.length > 5 || NOTE.test(part);
}

/**
 * One historical entry's sense evidence, part by part:
 *   parts: [{ text, overlap: boolean, lexinLink: boolean, korp: "verified" | "refuted" | null }]
 *   legacy: the 2026-11-02 verdict (true when it said verified)
 * → { exists, pos, parts: [{ text, explanatory, evidence, grade }], entry: grade summary, recheck: [part texts] }
 * Overlap alone and the legacy AI verdict reach ai_consistent at most; a part needs a Lexin sense
 * link, corpus sentences or a human to be verified. A part without evidence affects only itself.
 */
export function regradeLegacySense({ exists = true, posVerified = false, parts = [], legacy = true }) {
  const out = parts.map((p) => {
    const explanatory = isExplanatoryPart(p.text);
    const ev = [];
    if (legacy) ev.push(evidence("legacy_ai", "supports"));
    if (p.overlap) ev.push(evidence("candidate_dictionary_overlap", "supports"));
    if (p.lexinLink) ev.push(evidence("dictionary_sense_link", "supports"));
    if (p.korp === "verified") ev.push(evidence("korp_sense", "supports"));
    if (p.korp === "refuted") ev.push(evidence("korp_sense", "disputed", { note: "not attested in corpus sentences" }));
    return { text: p.text, explanatory, evidence: ev.map((e) => e.kind + ":" + e.result), grade: gradeItem(ev).grade };
  });
  // A meaning written only as an explanation ("a working day between holidays …") is its own core.
  const core = out.some((p) => !p.explanatory) ? out.filter((p) => !p.explanatory) : out;
  const grades = core.map((p) => p.grade);
  const entry = !core.length ? "unverified"
    : grades.every((g) => g === "verified") ? "verified"
    : grades.some((g) => g === "disputed") ? "needs_review"
    : grades.some((g) => g === "verified") ? "partial"
    : grades.every((g) => g === "ai_consistent") ? "ai_consistent" : "unverified";
  return { exists, pos: posVerified ? "verified" : "unverified", parts: out, entry, recheck: core.filter((p) => p.grade !== "verified").map((p) => p.text) };
}

// ---------------------------------------------------------------------------
// Sense coverage (R7, §6.3): which of Lexin's senses a card's English meaning covers
// ---------------------------------------------------------------------------
// A Lexin sense whose every example has the word followed by a particle ("100 man har sagts upp")
// belongs to the particle verb (säga upp), not to this word: never "missing" from its card.
export function particleVerbSense(sense, forms = []) {
  const own = new Set(forms.map((f) => String(f).toLowerCase()));
  const examples = [...(sense.examples || []), ...(sense.idioms || []).map((i) => (Array.isArray(i) ? i[0] : i))].map((x) => String(x).toLowerCase());
  if (!examples.length || !own.size) return false;
  return examples.every((x) => { const w = x.split(/[\s,.;:!?]+/); return w.some((t, i) => own.has(t) && PARTICLE.has(w[i + 1])); });
}

/**
 * refs: the headword's references; meaningEn: the card's English meaning ("a; b; c"); forms: the
 * headword's forms. → [{ variant, definition, english, covered, particleVerb }] for each Lexin sense
 * of this part of speech that has English. A sense is covered when one part of the card's meaning
 * shares a content word with its English (meaningSupport) — a candidate match, not a sense link.
 */
export function senseCoverage(refs, pos, meaningEn, forms = []) {
  const english = (refs?.lexin_en || []).filter((e) => e.pos === pos);
  const parts = String(meaningEn || "").split(";").map((p) => p.trim()).filter(Boolean);
  const out = [];
  for (const e of (refs?.lexin_sv || []).filter((x) => x.pos === pos)) {
    for (const x of e.lexemes || []) {
      // The two Lexin dictionaries share sense ids (VariantID), else the same definition.
      const def = (t) => String(t || "").trim().toLowerCase();
      const en = english.find((y) => (x.variant && y.variant === x.variant) || def(y.definition) === def(x.definition))?.english || [];
      if (!en.length) continue;
      const eqs = en.map((text) => ({ source: "lexin_en", text }));
      out.push({ variant: x.variant || null, definition: x.definition, english: en.slice(0, 4), covered: parts.some((p) => meaningSupport(p, eqs).length > 0), particleVerb: particleVerbSense(x, forms) });
    }
  }
  // Only Lexin's English dictionary has the word: its senses, with their own examples and idioms.
  if (!(refs?.lexin_sv || []).some((x) => x.pos === pos)) {
    for (const y of english.filter((e) => (e.english || []).length)) {
      const eqs = y.english.map((text) => ({ source: "lexin_en", text }));
      const examples = (y.examples || []).map((x) => (Array.isArray(x) ? x[0] : x));
      out.push({ variant: y.variant || null, definition: y.definition, english: y.english.slice(0, 4), covered: parts.some((p) => meaningSupport(p, eqs).length > 0), particleVerb: particleVerbSense({ examples, idioms: y.idioms }, forms) });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Protected content (R8, §7): what a later check may do to an item already confirmed
// ---------------------------------------------------------------------------
/**
 * held: the item's recorded evidence; found: what the new check says (evidence() rows); reason: why
 * (required to remove protected content: "lexin_new_edition", "human_review" …).
 * → { action: "keep" | "dispute" | "remove", grade, why }. Content confirmed by a dictionary link, SALDO,
 * Korp or a person (protected: strength-5 verifying support) is never removed by a check that is
 * weaker or equal without a stated reason — it becomes disputed and goes to review. Unprotected
 * content is removed only when the combined evidence grades "refuted" and not on AI answers alone;
 * never for lack of evidence.
 */
export function removalDecision(held = [], found = [], { reason = "" } = {}) {
  const before = gradeItem(held);
  const all = gradeItem([...held, ...found]);
  const refutes = found.filter((e) => e.result === "refutes");
  if (!refutes.length) return { action: "keep", grade: all.grade, why: "no_refutation" };
  if (before.protected) {
    const r = Math.max(...refutes.map(strengthOf));
    if (r >= before.support && reason) return { action: "remove", grade: "refuted", why: `protected_overridden:${reason}` };
    return { action: "dispute", grade: "disputed", why: reason ? "refutation_weaker_than_protection" : "protected_needs_reason" };
  }
  // AI answers alone never remove anything (decision 4: AI-only cases go to review).
  if (refutes.every((e) => /^(ai_|legacy_ai)/.test(e.kind))) return { action: "dispute", grade: "disputed", why: "ai_only_refutation" };
  return all.grade === "refuted" ? { action: "remove", grade: "refuted", why: all.reasons.join(",") } : { action: "dispute", grade: all.grade === "unverified" ? "unverified" : "disputed", why: "refutation_not_decisive" };
}

// ---------------------------------------------------------------------------
// Recording evidence (public.content_evidence, migration 20261110120000)
// ---------------------------------------------------------------------------
export const RULE_VERSION = "kv2-2026-11-09";
const SOURCE_OF = { lexin: "lexin-sv-2020", lexin_sv: "lexin-sv-2020" };
/**
 * Writes an item's evidence rows (evidence() objects) for an entry: one row per kind and rule version,
 * replaced when recorded again. Only with KNOWLEDGE_EVIDENCE_WRITE=on (after migration A is applied);
 * otherwise, or on any error, nothing is written and { written: 0 } — evidence never blocks content.
 */
export async function recordEvidence(supabaseAdmin, learningObjectId, itemType, itemRef, list, { ruleVersion = RULE_VERSION } = {}) {
  if (process.env.KNOWLEDGE_EVIDENCE_WRITE !== "on" || !supabaseAdmin || !list?.length) return { written: 0 };
  const rows = list.map((e) => ({
    learning_object_id: learningObjectId, item_type: itemType, item_ref: String(itemRef || ""), kind: e.kind, result: e.result,
    strength: strengthOf(e), source_id: SOURCE_OF[e.source] || null,
    source_ref: Object.fromEntries(Object.entries({ ref: e.ref, source: e.source, ...(e.source_ref || {}) }).filter(([, v]) => v != null)),
    rule_version: ruleVersion, note: e.note || "",
  }));
  try {
    const { error } = await supabaseAdmin.from("content_evidence").upsert(rows, { onConflict: "learning_object_id,item_type,item_ref,kind,rule_version" });
    if (error) throw error;
    return { written: rows.length };
  } catch (error) {
    console.warn("[evidence] not recorded", error.message);
    return { written: 0, error: error.message };
  }
}
