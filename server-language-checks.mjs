// Language checks on what the AI writes (2026-11-02), in layers:
//   1. the dictionary and SALDO — forms and the parts of speech a word can have; Lexin
//      (Isof, 2026-11-03) — parts of speech, senses with English equivalents, plurals;
//   2. Swedish Wiktionary — when SALDO doesn't have the word, or for the senses of each
//      part of speech;
//   3. an AI check of meaning against context and references — only for what the two
//      dictionaries can't decide (which sense, translations), several items per call;
//   4. before saving — part of speech, meanings, forms and examples must agree.
// Each check says what it found: confirmed, corrected, or not confirmed (no evidence
// either way) — "the forms match SALDO" is never taken to mean the entry is right.

import { formReadings, saldoPartsOfSpeech, saldoEntries, compoundRows, multiWordVerbRows, saldoHasExpression } from "./server-lexicon.mjs";
import { lookupWiktionary, wiktionaryReadings } from "./server-wiktionary.mjs";
import { referenceEntries, referencePos, lexinSenses, englishEquivalents, meaningSupport, collocationInLexin, expressionInReferences, homographEquivalents, LEXIN_SV_SOURCE_ID } from "./server-references.mjs";
import { korpAttestation, judgeAttestation } from "./server-korp.mjs";
import { callOpenAIJson, logUsage } from "./server-native.mjs";

const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const ARTICLE = /^(en|ett)\s+/i;

/**
 * The part of speech a textbook word list entry gives its word: "en torka" → noun,
 * "drabba, drabbas" / "att agera" → verb, "ofantlig, -t" → adjective. Null when the
 * entry doesn't say ("blöt", "hållbar").
 */
export function glossaryPartOfSpeech(printed) {
  const parts = String(printed || "").split(",").map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  const first = parts[0].toLowerCase();
  if (ARTICLE.test(first)) return { lemma: first.replace(ARTICLE, "").split(/\s+/)[0], pos: "noun" };
  if (/^att\s+/.test(first)) return { lemma: first.replace(/^att\s+/, "").split(/\s+/)[0], pos: "verb" };
  const lemma = first.split(/\s+/)[0];
  const second = (parts[1] || "").toLowerCase().split(/\s+/)[0];
  if (!second) return null;
  if (second === "-t" || second === "-tt") return { lemma, pos: "adjective" };
  // "drabba, drabbas", "påverka, påverkar", "införa, inför", "smälta, smälter, smälte, smält"
  if (!second.startsWith("-") && /[rs]$/.test(second) && /[aeiouyåäö]$/.test(lemma) && second.slice(0, 2) === lemma.slice(0, 2)) return { lemma, pos: "verb" };
  return null;
}

/** lemma → part of speech from the whole word list, for words it names one for. */
export function glossaryPartsOfSpeech(glossary = []) {
  const map = new Map();
  for (const g of glossary || []) {
    const found = glossaryPartOfSpeech(g?.word);
    if (found && !map.has(found.lemma)) map.set(found.lemma, found.pos);
  }
  return map;
}

/**
 * The parts of speech the references give a headword: SALDO and Lexin first, Wiktionary
 * only when neither has one (a compound like "klimatflykting") or when asked. { saldo, lexin,
 * wiktionary, wiktionaryStatus, all, refs } — wiktionaryStatus "skipped" when it wasn't asked;
 * refs: the Lexin entries (server-references.mjs), for callers that need their senses.
 */
export async function referencePartsOfSpeech(supabaseAdmin, lemma, { askWiktionary = false } = {}) {
  const saldo = await saldoPartsOfSpeech(supabaseAdmin, lemma);
  const refs = await referenceEntries(supabaseAdmin, lemma);
  const byDictionary = referencePos(refs);
  const lexin = [...new Set([...byDictionary.lexin_sv, ...byDictionary.lexin_en])].filter((p) => p !== "other" && p !== "name");
  let wiktionary = [];
  let wiktionaryStatus = "skipped";
  if (askWiktionary || (!saldo.length && !lexin.length)) {
    const page = await lookupWiktionary(supabaseAdmin, lemma);
    wiktionaryStatus = page.status;
    wiktionary = [...new Set(wiktionaryReadings(page).filter((r) => !r.form).map((r) => r.pos))];
  }
  return { saldo, lexin, wiktionary, wiktionaryStatus, all: [...new Set([...saldo, ...lexin, ...wiktionary])], refs };
}

/**
 * A keyword's part of speech against the evidence. The textbook's own word list decides
 * when it names one ("en torka" → noun); otherwise the AI's choice must be one the
 * references give the word. A word no reference knows is kept as unconfirmed — not
 * missing from a dictionary doesn't make it wrong.
 *   { pos, status: "confirmed" | "corrected" | "unconfirmed" | "rejected", reason }
 */
// Regular conversions dictionaries often don't list: an adjective's -t form used as an
// adverb ("explicit", "konsekvent"), an adjective or participle used as a noun
// ("anställd", "vuxen"). Not evidence for the part of speech, not against it either.
const DERIVED = { adverb: ["adjective"], noun: ["adjective"] };

const FUNCTION_CLASSES = new Set(["adverb", "preposition", "conjunction", "subjunction"]);

export function checkKeywordPos({ pos, glossaryPos = null, referencePos = [], wiktionaryStatus = "found" }) {
  const known = new Set(referencePos);
  if (glossaryPos) {
    if (known.size && !known.has(glossaryPos)) return { pos, status: known.has(pos) ? "confirmed" : "rejected", reason: "glossary_not_in_references" };
    if (glossaryPos === pos) return { pos, status: "confirmed", reason: "glossary" };
    return { pos: glossaryPos, status: "corrected", reason: `glossary_says_${glossaryPos}` };
  }
  if (!known.size) return { pos, status: "unconfirmed", reason: wiktionaryStatus === "found" || wiktionaryStatus === "missing" ? "no_reference" : `wiktionary_${wiktionaryStatus}` };
  if (known.has(pos)) return { pos, status: "confirmed", reason: "references" };
  if ((DERIVED[pos] || []).some((p) => known.has(p))) return { pos, status: "unconfirmed", reason: `derived_from_${[...known].join("/")}` };
  // Function-word classes are drawn differently from one dictionary to the next ("oavsett":
  // adverb to the AI, preposition to SALDO): the one class the references give is taken.
  const functionClasses = (list) => list.filter((p) => FUNCTION_CLASSES.has(p));
  if (FUNCTION_CLASSES.has(pos) && functionClasses([...known]).length === 1) return { pos: functionClasses([...known])[0], status: "corrected", reason: `references_say_${functionClasses([...known])[0]}` };
  // Wiktionary not reached: SALDO alone doesn't reject.
  if (wiktionaryStatus !== "found" && wiktionaryStatus !== "missing") return { pos, status: "unconfirmed", reason: `wiktionary_${wiktionaryStatus}` };
  return { pos, status: "rejected", reason: `references_say_${[...known].join("/")}` };
}

// Open slots of a multi-word lemma: "skynda sig" is "vi skyndade oss", "ta hand om någon"
// "tar hand om barnen", "göra sitt bästa" "gjorde mitt bästa".
const REFLEXIVE = new Set(["sig", "mig", "dig", "oss", "er", "sej", "mej", "dej"]);
const POSSESSIVE = new Set(["min", "mitt", "mina", "din", "ditt", "dina", "sin", "sitt", "sina", "vår", "vårt", "våra", "er", "ert", "era", "hans", "hennes", "hens", "dess", "deras"]);
const SLOT = new Set(["någon", "något", "några", "någons", "ngn", "ngt", "ngns"]);

/**
 * Whether an example sentence uses the word in one of its forms. A form may hold variants
 * ("säger / säjer", as SALDO's forms are stored: matched as either, 2026-11-08 — joined they
 * matched nothing and correct examples were dropped). A multi-word lemma or particle verb is
 * used when all its words are in the sentence, in any order (a particle can stand apart: "jag
 * håller inte med"); its sig takes any reflexive pronoun, sin/sitt/sina any possessive, and
 * någon/något stand for any words. Its verb's inflected forms come in `forms` as whole phrases
 * ("håller med", phraseForms).
 */
export function exampleUsesWord(sentence, forms) {
  const tokens = new Set((String(sentence || "").toLowerCase().match(/\p{L}+/gu) || []));
  // A part in brackets is optional ("hålla med (någon)"): it never has to be in the sentence.
  const list = [...forms].flatMap((f) => String(f || "").toLowerCase().replace(/\([^)]*\)/g, " ").split(/\s*\/\s*/)).map((f) => f.trim().replace(/\s+/g, " ")).filter(Boolean);
  if (list.some((f) => tokens.has(f))) return true;
  const hasWord = (w) => tokens.has(w)
    || (REFLEXIVE.has(w) && w !== "er" && [...REFLEXIVE].some((r) => tokens.has(r)))
    || (/^(sin|sitt|sina)$/.test(w) && [...POSSESSIVE].some((r) => tokens.has(r)));
  return list.some((f) => {
    const words = f.split(/\s+/).filter((w) => !SLOT.has(w));
    return f.includes(" ") && words.length > 0 && words.every(hasWord);
  });
}

/**
 * The inflected forms of a multi-word verb lemma, as whole phrases: "hålla med" → "håller med",
 * "höll med", "hållit med" …, "skynda sig" → "skyndar sig" … — its first word's forms from
 * SALDO, the rest kept. A verb SALDO has only with its sig ("bete sig", "förlova sig") is
 * inflected as its multi-word entry says (multiWordVerbRows: betedde sig); a second verb after
 * "och" takes the same tense ("vara ute och cykla": är ute och cyklar, var ute och cyklade); an
 * adjective in it may agree ("ta något för givet": "tar hennes hjälp för given"), 2026-11-08 —
 * 27 right examples of such verbs were dropped as not using the word. [] when SALDO has no
 * such verb (the lemma itself still counts).
 */
export async function phraseForms(supabaseAdmin, lemma) {
  const words = String(lemma || "").trim().toLowerCase().split(/\s+/);
  if (words.length < 2) return [];
  const msds = ["inf aktiv", "pres ind aktiv", "pret ind aktiv", "sup aktiv", "imper"];
  let rows = await saldoEntries(supabaseAdmin, words[0], "verb");
  if (!rows.length) {
    // The multi-word entry's forms carry the rest of the expression; only the verb is wanted here.
    const own = await multiWordVerbRows(supabaseAdmin, words.slice(0, 2).join(" "));
    rows = own.map((r) => ({ forms: Object.fromEntries(Object.entries(r.forms).map(([m, list]) => [m, list.map((f) => f.split(" ")[0])])) }));
  }
  const heads = msds.map((m) => [...new Set(rows.flatMap((r) => r.forms?.[m] || []).filter((f) => !/\s/.test(f)))]);
  // A second verb joined by "och" (pseudo-coordination) in the same tense as the first.
  const och = words.indexOf("och");
  const second = och > 0 && och < words.length - 1 ? await saldoEntries(supabaseAdmin, words[och + 1], "verb") : [];
  const seconds = msds.map((m) => [...new Set(second.flatMap((r) => r.forms?.[m] || []).filter((f) => !/\s/.test(f)))]);
  // Adjectives of the expression in their other forms (givet → given, givna).
  const readings = await formReadings(supabaseAdmin, words.slice(1));
  const agree = new Map();
  for (const w of words.slice(1)) {
    const adjectives = (readings.get(w) || []).filter((r) => r.pos === "adjective");
    const forms = (await Promise.all(adjectives.map((r) => saldoEntries(supabaseAdmin, r.lemma, "adjective"))))
      .flat().flatMap((r) => ["pos indef sg u nom", "pos indef sg n nom", "pos indef pl nom"].flatMap((m) => r.forms?.[m] || []));
    if (forms.includes(w)) agree.set(w, [...new Set(forms)]);
  }
  const out = new Set();
  heads.forEach((list, i) => {
    for (const h of list) {
      const rest = words.slice(1).map((w, j) => (j + 1 === och + 1 && seconds[i].length ? seconds[i] : [w]));
      let phrases = [[h]];
      for (const options of rest) phrases = phrases.flatMap((p) => options.map((o) => [...p, o]));
      for (const p of phrases) {
        out.add(p.join(" "));
        for (const [w, forms] of agree) for (const f of forms) out.add(p.map((x) => (x === w ? f : x)).join(" "));
      }
    }
  });
  return [...out];
}

function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[b.length];
}

/**
 * Words of a sentence that are a wrong inflection of the headword (2026-11-08): SALDO knows
 * them neither as a word nor as a compound, and they are one or two letters from one of the
 * headword's forms, beginning alike — "svikade" (svek), "hälde" (hällde), "vänjde" (vande). In
 * the 2,532 examples and collocations of a test of 280 cards this found 7 words, all wrong.
 */
export async function misinflections(supabaseAdmin, sentence, forms) {
  const own = [...new Set(forms.flatMap((f) => String(f || "").toLowerCase().split(/[\s/]+/)).filter((t) => t.length >= 4))];
  const near = [...new Set(String(sentence || "").toLowerCase().match(/\p{L}+/gu) || [])]
    .filter((t) => t.length >= 4 && !own.includes(t) && own.some((f) => t.slice(0, 3) === f.slice(0, 3) && editDistance(t, f) <= 2));
  if (!near.length) return [];
  const known = await formReadings(supabaseAdmin, near);
  const wrong = [];
  for (const t of near) {
    if (known.get(t)?.length) continue;
    let compound = false;
    for (const pos of ["noun", "verb", "adjective", "adverb"]) if (!compound && (await compoundRows(supabaseAdmin, t, pos)).length) compound = true;
    if (!compound) wrong.push(t);
  }
  return wrong;
}

// ---------------------------------------------------------------------------
// Letters of another script (2026-11-08): "保持 актуальность" in a Chinese meaning, "gällа"
// with a Cyrillic а in a Swedish word.
// ---------------------------------------------------------------------------

/** Letters a field of this language can't have: anything but Latin in Swedish and English; anything but Han or Latin in Chinese. */
export function foreignLetters(text, lang) {
  const allowed = lang === "zh" ? /[\p{Script=Han}\p{Script=Latin}]/u : /\p{Script=Latin}/u;
  return [...String(text || "")].filter((ch) => /\p{L}/u.test(ch) && !allowed.test(ch));
}

// Cyrillic and Greek letters that look like Latin ones.
const LOOKALIKE = {
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "і": "i", "ј": "j", "ѕ": "s", "ԁ": "d", "ӏ": "l",
  "А": "A", "В": "B", "Е": "E", "К": "K", "М": "M", "Н": "H", "О": "O", "Р": "P", "С": "C", "Т": "T", "Х": "X", "І": "I", "Ј": "J", "Ѕ": "S",
  "ο": "o", "Ο": "O", "Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H", "Ι": "I", "Κ": "K", "Μ": "M", "Ν": "N", "Ρ": "P", "Τ": "T", "Χ": "X", "Υ": "Y",
};

/**
 * Swedish text with look-alike letters inside Latin words put back ("gällа" → "gälla"). A word
 * with no Latin letter is left as it is (it is another language, for foreignLetters to find).
 */
export function latinLookalikes(text) {
  return String(text ?? "").replace(/\p{L}+/gu, (word) => (/\p{Script=Latin}/u.test(word) && [...word].every((ch) => /\p{Script=Latin}/u.test(ch) || LOOKALIKE[ch])
    ? [...word].map((ch) => LOOKALIKE[ch] || ch).join("") : word));
}

/** SALDO readings of each word of a text, for the candidate list and the checks. */
export async function textReadings(supabaseAdmin, tokens) {
  return formReadings(supabaseAdmin, tokens);
}

// ---------------------------------------------------------------------------
// AI check of meaning (layer 3)
// ---------------------------------------------------------------------------

const exampleCheck = {
  type: "object",
  additionalProperties: false,
  properties: {
    key: { type: "string" },
    sv_start: { type: "string" },
    fits_entry: { type: "boolean" },
    translation_zh_ok: { type: "boolean" },
    translation_en_ok: { type: "boolean" },
    translation_zh_fixed: { type: "string" },
    translation_en_fixed: { type: "string" },
  },
  required: ["key", "sv_start", "fits_entry", "translation_zh_ok", "translation_en_ok", "translation_zh_fixed", "translation_en_fixed"],
};
const itemCheck = {
  type: "object",
  additionalProperties: false,
  properties: {
    key: { type: "string" },
    lemma: { type: "string" },
    pos: { type: "string" },
    pos_supported: { type: "boolean" },
    other_pos_senses: { type: "array", items: { type: "string" } },
    unsupported_senses: { type: "array", items: { type: "string" } },
    meaning_zh_fixed: { type: "string" },
    meaning_en_fixed: { type: "string" },
    swedish_explanation_fixed: { type: "string" },
    examples: { type: "array", items: exampleCheck },
    context_matches_entry: { type: "string", enum: ["yes", "no", "n/a"] },
    verdict: { type: "string", enum: ["ok", "fixed", "unsure"] },
    note: { type: "string" },
  },
  required: ["key", "lemma", "pos", "pos_supported", "other_pos_senses", "unsupported_senses", "meaning_zh_fixed", "meaning_en_fixed", "swedish_explanation_fixed", "examples", "context_matches_entry", "verdict", "note"],
};

const SENSE_CHECK_SYSTEM = `You check Swedish learner's-dictionary entries for one problem class: content that does not belong to the entry's part of speech and sense. Each item has a lemma, its part of speech, the entry's meanings (Chinese, English, Swedish explanation) and examples with translations, and reference evidence: the parts of speech SALDO gives the lemma and, when available, Lexin's senses of this part of speech (Swedish definitions with English equivalents, from the learner's dictionaries of Isof) and Swedish Wiktionary's senses per part of speech with their English equivalents. Some items also have a context: a sentence from a text and what the word means there.

Every item has a key ("i1", "i2", …) and every example a key ("i1.e0", "i1.e1", …). Answer every item and, inside it, every one of its examples — never leave an example out, never answer one item with another item's content. Echo the item's key, lemma and pos exactly, and for each example its key and sv_start = its first three words exactly as written.

For each item:
- pos_supported: whether the references support this part of speech for the lemma (when they give none, judge from your knowledge and say so in note).
- other_pos_senses: (look hardest when the item has "also_exists_as": the same spelling is also those parts of speech, and their senses are often written into the wrong entry) senses in THIS entry's meanings that belong to ANOTHER part of speech of the same spelling (e.g. the noun sense "干旱" written into the verb entry "torka") — each one quoted exactly as it is written in this entry's meaning_zh, meaning_en or swedish_explanation; empty if none. Judge each item only by its own fields.
- unsupported_senses: senses in this entry that neither the references nor ordinary Swedish usage support for this lemma and part of speech, quoted exactly from its fields — empty if none. Don't list a sense just because the references are short.
- meaning_zh_fixed / meaning_en_fixed / swedish_explanation_fixed: only when something must change — the corrected text for THIS part of speech, keeping every supported sense and the entry's style (concise, Simplified Chinese for zh). When the only problem is a sense that doesn't belong, delete just that sense and leave the rest exactly as it was, word for word (don't reword or "improve" it). Never copy Wiktionary's wording. "" when the field is fine.
- examples: for each example (by key), fits_entry = the Swedish sentence uses the word in this part of speech and one of the entry's senses; translation_*_ok = the translation renders the WHOLE sentence correctly — go through the Swedish sentence word by word and check each content word's meaning is in the translation; a fragment, a gloss of only the headword, a translation of a different sentence, or a zh translation in traditional characters is not ok; translation_*_fixed = a correct full translation when not ok, else "". zh translations in Simplified Chinese. Keep every pronoun's person and gender (hon = 她 / she, han = 他 / he, de = 他们 / they, vi = 我们) and add nothing that is not in the Swedish. An example may carry "flags" from a program check (e.g. "zh_too_short", "zh_traditional"): look at those especially carefully.
- context_matches_entry: when a context is given, "yes" if one of the entry's (fixed) senses is the one the sentence uses, else "no"; "n/a" without a context.
- verdict: "ok" if nothing needed changing, "fixed" if you gave corrections, "unsure" if the evidence isn't enough to decide — then change nothing and say why in note.
Be conservative: change only what is clearly wrong.`;

// The whole-entry audit (2026-11-02): the sense check plus missing senses, grammar
// (countability, forms, grammar note) and collocations — all answers, like the examples,
// matched by key and checked against the item before they count.
const collocationCheck = {
  type: "object", additionalProperties: false,
  properties: {
    key: { type: "string" },
    phrase_start: { type: "string" },
    verdict: { type: "string", enum: ["keep", "free_combination", "duplicate", "wrong_meaning", "bad_example"] },
    zh_fixed: { type: "string" },
    en_fixed: { type: "string" },
  },
  required: ["key", "phrase_start", "verdict", "zh_fixed", "en_fixed"],
};
const grammarCheck = {
  type: "object", additionalProperties: false,
  properties: {
    countability: { type: "string", enum: ["countable", "uncountable", "both", "unsure", "not_noun"] },
    forms_wrong: { type: "array", items: { type: "object", additionalProperties: false, properties: { type: { type: "string" }, value: { type: "string" }, correct: { type: "string" } }, required: ["type", "value", "correct"] } },
    grammar_note_wrong: { type: "string" },
  },
  required: ["countability", "forms_wrong", "grammar_note_wrong"],
};
const auditItemCheck = {
  ...itemCheck,
  properties: { ...itemCheck.properties, missing_common_senses: { type: "array", items: { type: "string" } }, grammar: grammarCheck, collocations: { type: "array", items: collocationCheck } },
  required: [...itemCheck.required, "missing_common_senses", "grammar", "collocations"],
};

// A new card's collocations and related words (2026-11-08): two thirds of the serious errors a
// test of 840 generated cards found were there — made-up or unidiomatic combinations ("dö på
// posten", "stjäla med ögonen"), words that don't exist ("lärsighet") — and nothing checked them.
const cardCollocationCheck = {
  ...collocationCheck,
  properties: { ...collocationCheck.properties, verdict: { type: "string", enum: ["keep", "not_swedish", "free_combination", "not_with_headword", "wrong_meaning", "bad_example"] } },
};
const relatedCheck = {
  type: "object", additionalProperties: false,
  properties: {
    key: { type: "string" },
    word_start: { type: "string" },
    verdict: { type: "string", enum: ["keep", "not_a_word", "not_related", "wrong_meaning", "wrong_pos"] },
    zh_fixed: { type: "string" },
    en_fixed: { type: "string" },
    pos_fixed: { type: "string", enum: ["noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction", "numeral", "interjection", "present_participle", "perfect_participle", "other", ""] },
  },
  required: ["key", "word_start", "verdict", "zh_fixed", "en_fixed", "pos_fixed"],
};
const cardItemCheck = {
  ...itemCheck,
  properties: { ...itemCheck.properties, collocations: { type: "array", items: cardCollocationCheck }, related: { type: "array", items: relatedCheck } },
  required: [...itemCheck.required, "collocations", "related"],
};
const CARD_EXTRA = `

This is a new entry, checked before it is saved: each item also has entry.collocations (keys "i1.c0", …: phrase, zh, en, example) and entry.related (keys "i1.r0", …: word, pos, zh, en). Answer every one of them too (echo its key, and phrase_start / word_start = its first word exactly). entry.headword_forms are the headword's inflected forms: any of them is the headword. Judge by standard Swedish as SAOL and Svensk ordbok describe it, strictly: a learner will memorise these.
- collocations: a collocation is a combination with the headword that a learner must learn as a unit: a fixed verb, preposition or particle choice ("ta på sig glasögon", "vara rädd för", "gå till fots"), or a typical strong partner word ("starkt kaffe"). "keep" = an established Swedish combination of that kind, its meanings right and its example a correct, natural Swedish sentence that contains it. "not_swedish" = not an established combination: made up, translated word for word from another language, unidiomatic, or with a wrong form, preposition or particle (a combination you would not expect in a Swedish dictionary or corpus). "free_combination" = correct, but any similar word would do the same and nothing is fixed ("dricka mjölk", "läsa en bok", "springa fort"). "not_with_headword" = a single word (a compound such as "fotboll" for fot) or a phrase in which the headword doesn't occur. "wrong_meaning" = real, but its zh or en meaning is wrong: give zh_fixed and/or en_fixed for what is wrong, else "". "bad_example" = its example is ungrammatical or unnatural (look at every verb form and agreement), or doesn't contain it.
- related: "keep" = an existing Swedish word related to the headword: a word-family member (ögonblick for öga, sår for sårbarhet), a synonym or near-synonym (placera for lägga), an antonym, or a word closely tied to its meaning (anstalt for fängelse) — with right meanings and part of speech. "not_a_word" = no such Swedish word (made up, misspelt, a word of another language). "not_related" = it exists but has nothing to do with the headword's meaning or family (it only looks alike: fågel for få, lagom for lag). "wrong_meaning" = give zh_fixed and/or en_fixed — check each meaning against the word itself, not the headword. "wrong_pos" = give pos_fixed. pos_fixed is "" unless the verdict is wrong_pos.
- A collocation or related word may carry "flags" from a program check: "headword_not_found" (no form of the headword in the phrase), "example_without_headword" (no form of the headword in its example: often a wrong verb form such as "svikade" for svek), "no_dictionary" (neither SALDO, a large Swedish lexicon, nor Lexin nor Swedish Wiktionary has the word, nor can it be split into words SALDO has: keep it only if you know it as a word used in Swedish today, with the meaning given — a derivation that merely follows a Swedish pattern is not_a_word), "only_compound" / "only_wiktionary" (no dictionary lists it, but it splits into words SALDO has / Wiktionary has a page). A flag is a reason to look hard, not a verdict: "gå till fots" is right although "fots" is an old form.
- A related word with dictionary_meaning is in Lexin with that meaning: its zh and en must fit it (wrong_meaning otherwise — glasöga is an artificial eye, not a lens). A collocation with in_dictionary is listed in Lexin: it is real (but its meanings or example may still be wrong).
Every zh / zh_fixed is Simplified Chinese only, every en / en_fixed English only — no word of another language or script. A meaning, translation or Swedish text with letters of another script (Cyrillic, Greek, Japanese …) is wrong wherever it is: give the corrected text.`;

const AUDIT_EXTRA = `

This is a full audit: besides the above, each item may have entry.grammar (countability, declension or verb group, gender, forms as "type=value", a grammar note), entry.collocations (each with a key "i1.c0", …) and more references (saldo_paradigm: SALDO's inflection class, where nn_0… means no plural forms; korp: corpus counts of the noun's singular and plural forms, plural_share = plural / all).
- missing_common_senses: common senses of this lemma IN THIS PART OF SPEECH that a learner meets often and that the entry lacks (judge with the references; in Simplified Chinese, a few words each) — empty if none. Never a sense of another part of speech, never a rare or technical one.
- grammar.countability: for a noun, as its senses are used: "countable" (räknebart), "uncountable" (oräknebart: mass or abstract, normally no plural), "both" (one sense countable, another a mass sense, e.g. kaffe: the drink / "två kaffe"), "unsure" when the evidence doesn't settle it; "not_noun" for other parts of speech. A rare plural doesn't make a noun uncountable; corpus plurals of a mass noun meaning "kinds of" don't make it countable.
- grammar.forms_wrong: each listed form that is wrong for this lemma (type, the value as listed, the correct value — "" when the form shouldn't exist, e.g. a plural given to a noun without one); empty if all are right. grammar.grammar_note_wrong: what is false in the grammar note (a wrong group, a plural for a noun without one, a wrong ending), "" if nothing.
- collocations: answer every one (echo key and phrase_start = its first word exactly): "keep" (worth learning as a unit: fixed verb/preposition/particle choice or a typical strong partner), "free_combination" (an ordinary free combination with nothing fixed to learn), "duplicate" (the same learning point as an earlier collocation of this entry, only another form or slot), "wrong_meaning" (its zh or en meaning is wrong: give zh_fixed / en_fixed, else ""), "bad_example" (its example doesn't contain it or is wrong).`;

// Characters only traditional Chinese uses (common ones): a zh field is Simplified Chinese.
const TRADITIONAL = /[乾淨國這說們會來時對學過還長無與開關見發後電話書車門問題觀點記讓應樣種經變當實現燒鍋魚鳥麵飯雞錢買賣寫聽讀從裡為麼誰嗎幾體邊遠給錯樂歡氣將專業級總親愛顏場歲頭腦臉髮兒媽爺覺廳館區園離準備辦幫將應該較雖際網號碼個們]/u;

/** Program checks on an example's translations, passed to the AI check as flags. */
export function translationFlags(example) {
  const flags = [];
  const words = (String(example.sv || "").match(/\p{L}+/gu) || []).length;
  const zh = String(example.zh || "").replace(/[\s，。！？、；：,.!?]/gu, "");
  const en = (String(example.en || "").match(/\p{L}+/gu) || []).length;
  if (example.zh !== undefined && words >= 4 && zh.length < words * 0.8) flags.push("zh_too_short");
  if (TRADITIONAL.test(zh)) flags.push("zh_traditional");
  if (example.en !== undefined && words >= 4 && en < Math.ceil(words / 2)) flags.push("en_too_short");
  if (example.zh && pronounMismatch(example.sv, example.zh)) flags.push("zh_pronoun");
  if (example.zh && words >= 3 && zh.length > words * 4 + 6) flags.push("zh_too_long");
  if (foreignLetters(example.zh, "zh").length || foreignLetters(example.en, "en").length) flags.push("foreign_script");
  return flags;
}

/**
 * A Chinese translation that gets a pronoun's gender wrong: the Swedish has only "hon"
 * (henne, hennes) and the Chinese only 他, or only "han" and the Chinese only 她. A
 * pronoun left out is normal Chinese, and 他 for another person in the sentence ("hon
 * ringde sin fästman … 告诉他") is fine — neither is judged.
 */
export function pronounMismatch(sv, zh) {
  const words = new Set((String(sv || "").toLowerCase().match(/\p{L}+/gu) || []));
  const she = words.has("hon") || words.has("henne") || words.has("hennes");
  const he = words.has("han") || words.has("honom") || words.has("hans");
  const text = String(zh || "");
  const hasShe = text.includes("她"), hasHe = /他(?!们)/u.test(text);
  if (she && !he) return hasHe && !hasShe;
  if (he && !she) return hasShe && !hasHe;
  return false;
}

const norm = (text) => String(text || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(Boolean);
const startsAlike = (echo, sentence) => {
  const a = norm(echo).slice(0, 3), b = norm(sentence).slice(0, 3);
  return a.length > 0 && a.every((w, i) => w === b[i]);
};

/**
 * Whether one returned check really answers this item (2026-11-02, after a batch answered
 * one entry with another's content and left examples out): the echoed lemma and part of
 * speech, every example by key with its first words, no example twice, and answers that
 * are consistent (a translation judged wrong comes with a correction that passes the
 * program checks). Returns a list of problems — empty when the check can be used.
 */
export function checkProblems(item, c) {
  const problems = [];
  if (!c) return ["missing"];
  if (item.entry?.collocations || item.entry?.grammar) {
    const colls = item.entry.collocations || [];
    const seen = new Set();
    for (const x of c.collocations || []) {
      const own = colls.find((k) => k.key === x.key);
      if (!own) { problems.push(`unknown_collocation:${x.key}`); continue; }
      if (seen.has(x.key)) problems.push(`duplicate_collocation:${x.key}`);
      seen.add(x.key);
      if (norm(x.phrase_start)[0] !== norm(own.phrase)[0]) problems.push(`collocation_echo:${x.key}`);
      if (x.verdict === "wrong_meaning" && !x.zh_fixed && !x.en_fixed) problems.push(`no_collocation_fix:${x.key}`);
      if (x.zh_fixed && TRADITIONAL.test(x.zh_fixed)) problems.push(`bad_collocation_fix:${x.key}`);
    }
    for (const k of colls) if (!seen.has(k.key)) problems.push(`collocation_missing:${k.key}`);
    for (const x of c.collocations || []) if (foreignLetters(x.zh_fixed, "zh").length || foreignLetters(x.en_fixed, "en").length) problems.push(`bad_collocation_fix:${x.key}`);
    const listed = new Set((item.entry.grammar?.forms || []).map((f) => String(f).split("=")[0]));
    for (const f of c.grammar?.forms_wrong || []) if (!listed.has(f.type)) problems.push(`unknown_form:${f.type}`);
    if (item.pos === "noun" && c.grammar?.countability === "not_noun") problems.push("countability_not_noun");
  }
  if (item.entry?.related) {
    const own = item.entry.related;
    const seen = new Set();
    for (const x of c.related || []) {
      const r = own.find((k) => k.key === x.key);
      if (!r) { problems.push(`unknown_related:${x.key}`); continue; }
      if (seen.has(x.key)) problems.push(`duplicate_related:${x.key}`);
      seen.add(x.key);
      if (norm(x.word_start)[0] !== norm(r.word)[0]) problems.push(`related_echo:${x.key}`);
      if (x.verdict === "wrong_meaning" && !x.zh_fixed && !x.en_fixed) problems.push(`no_related_fix:${x.key}`);
      if (x.verdict === "wrong_pos" && !x.pos_fixed) problems.push(`no_related_fix:${x.key}`);
      if (TRADITIONAL.test(x.zh_fixed || "") || foreignLetters(x.zh_fixed, "zh").length || foreignLetters(x.en_fixed, "en").length) problems.push(`bad_related_fix:${x.key}`);
    }
    for (const r of own) if (!seen.has(r.key)) problems.push(`related_missing:${r.key}`);
  }
  for (const f of ["meaning_zh_fixed", "meaning_en_fixed", "swedish_explanation_fixed"]) {
    if (foreignLetters(c[f], f === "meaning_zh_fixed" ? "zh" : f === "meaning_en_fixed" ? "en" : "sv").length) problems.push(`bad_fix:${f}`);
  }
  if (norm(c.lemma).join(" ") !== norm(item.lemma).join(" ")) problems.push(`lemma_echo:${c.lemma}`);
  if (c.pos !== item.pos) problems.push(`pos_echo:${c.pos}`);
  const examples = item.entry?.examples || [];
  const seen = new Set();
  for (const x of c.examples || []) {
    const idx = examples.findIndex((e) => e.key === x.key);
    if (idx < 0) { problems.push(`unknown_example:${x.key}`); continue; }
    if (seen.has(x.key)) problems.push(`duplicate_example:${x.key}`);
    seen.add(x.key);
    const e = examples[idx];
    if (!startsAlike(x.sv_start, e.sv)) problems.push(`example_echo:${x.key}`);
    if (!x.translation_zh_ok && e.zh !== undefined) {
      if (!x.translation_zh_fixed) problems.push(`no_zh_fix:${x.key}`);
      else if (TRADITIONAL.test(x.translation_zh_fixed) || pronounMismatch(e.sv, x.translation_zh_fixed) || foreignLetters(x.translation_zh_fixed, "zh").length) problems.push(`bad_zh_fix:${x.key}`);
    }
    if (!x.translation_en_ok && e.en !== undefined && !x.translation_en_fixed) problems.push(`no_en_fix:${x.key}`);
    else if (!x.translation_en_ok && e.en !== undefined && foreignLetters(x.translation_en_fixed, "en").length) problems.push(`bad_en_fix:${x.key}`);
  }
  for (const e of examples) if (!seen.has(e.key)) problems.push(`example_missing:${e.key}`);
  // A sense said not to belong must be one this entry has: words quoted from another item
  // of the batch mean the answer mixed items up.
  const own = norm(`${item.entry?.meaning_zh || ""} ${item.entry?.meaning_en || ""} ${item.entry?.swedish_explanation || ""}`).join(" ");
  const ownZh = String(item.entry?.meaning_zh || "") + String(item.entry?.swedish_explanation || "") + String(item.entry?.meaning_en || "");
  for (const quote of [...(c.other_pos_senses || []), ...(c.unsupported_senses || [])]) {
    const q = norm(quote).join(" ");
    const parts = String(quote).split(/[\/／|]/).map((x) => x.trim()).filter(Boolean);
    const inEntry = (q && own.includes(q)) || parts.some((p) => ownZh.includes(p) || (norm(p).length && own.includes(norm(p).join(" "))));
    if (!inEntry) problems.push(`foreign_sense:${quote}`);
  }
  const hasFix = c.meaning_zh_fixed || c.meaning_en_fixed || c.swedish_explanation_fixed || (c.examples || []).some((x) => !x.translation_zh_ok || !x.translation_en_ok || !x.fits_entry);
  if (c.verdict === "ok" && hasFix) c.verdict = "fixed";      // the answers decide, not the label
  return problems;
}

/**
 * Checks entries' meanings and examples against their part of speech, the references
 * and (optionally) a sentence they're used in — several items per call. Every answer is
 * matched to its item by key AND checked against it (checkProblems); an item whose
 * answer is missing, misplaced or incomplete is asked again on its own once, and if that
 * fails too it is reported in `failures` — never counted as checked.
 * Returns { checks: Map(id → check), failures: Map(id → problems), usage }.
 * A check's examples carry `index` (position in item.entry.examples) besides the key.
 */
export async function aiSenseCheck(supabaseAdmin, items, { userId = null, textResourceId = null, feature = "sense_check", chunk = 8, audit = false, card = false } = {}) {
  const checks = new Map();
  const failures = new Map();
  const usage = { input_tokens: 0, output_tokens: 0, calls: 0, cost: 0, retries: 0, failed_calls: 0, retry_reasons: {} };
  const keyed = items.map((item, n) => {
    const key = `i${n + 1}`;
    // The spelling's other parts of speech, named, so mixing them in is looked for.
    const others = [...new Set([...(item.references?.saldo_pos || []), ...((item.references?.wiktionary?.entries || []).map((e) => e.pos))])]
      .filter((p) => p && p !== item.pos && p !== "other");
    return { item, prompt: {
      ...item, id: undefined, key,
      ...(others.length ? { also_exists_as: others } : {}),
      entry: {
        ...item.entry,
        examples: (item.entry?.examples || []).map((e, j) => { const flags = translationFlags(e); return { key: `${key}.e${j}`, ...e, ...(flags.length ? { flags } : {}) }; }),
        ...(audit ? { collocations: (item.entry?.collocations || []).map((c, j) => ({ key: `${key}.c${j}`, ...c })), grammar: item.entry?.grammar || {} } : {}),
        ...(card ? { collocations: (item.entry?.collocations || []).map((c, j) => ({ key: `${key}.c${j}`, ...c })), related: (item.entry?.related || []).map((r, j) => ({ key: `${key}.r${j}`, ...r })) } : {}),
      },
    } };
  });
  const ask = async (group) => {
    const { result, usage: u } = await callOpenAIJson({
      schemaName: "sense_check",
      schema: { type: "object", additionalProperties: false, properties: { items: { type: "array", items: audit ? auditItemCheck : card ? cardItemCheck : itemCheck } }, required: ["items"] },
      system: audit ? SENSE_CHECK_SYSTEM + AUDIT_EXTRA : card ? SENSE_CHECK_SYSTEM + CARD_EXTRA : SENSE_CHECK_SYSTEM,
      user: JSON.stringify(group.map((g) => g.prompt)),
      maxOutputTokens: (audit || card ? 2000 : 1200) + (audit ? 1400 : card ? 1200 : 800) * group.length,
    });
    const cost = ((u.input_tokens || 0) * 0.75 + (u.output_tokens || 0) * 4.5) / 1e6;
    usage.input_tokens += u.input_tokens || 0;
    usage.output_tokens += u.output_tokens || 0;
    usage.calls += 1;
    usage.cost += cost;
    if (supabaseAdmin) await logUsage(supabaseAdmin, { userId, textResourceId, feature, model: MODEL, inputTokens: u.input_tokens, outputTokens: u.output_tokens, cost });
    return result.items || [];
  };
  const settle = (group, answers, final) => {
    const retry = [];
    for (const g of group) {
      const mine = answers.filter((c) => c.key === g.prompt.key);
      const c = mine.length === 1 ? mine[0] : null;
      const problems = mine.length > 1 ? ["duplicate_item"] : checkProblems(g.prompt, c);
      if (!problems.length) {
        c.examples = c.examples.map((x) => ({ ...x, index: g.prompt.entry.examples.findIndex((e) => e.key === x.key) }));
        checks.set(g.item.id, { ...c, id: g.item.id });
        failures.delete(g.item.id);
      } else if (final) failures.set(g.item.id, problems);
      else {
        failures.set(g.item.id, problems); retry.push(g);
        // What made answers unusable, by kind ("example_missing", "collocation_echo" …).
        for (const p of problems) { const kind = String(p).split(":")[0]; usage.retry_reasons[kind] = (usage.retry_reasons[kind] || 0) + 1; }
      }
    }
    return retry;
  };
  // Batches never hold two items of the same lemma (an answer about one torka was
  // carried over to the other).
  const groups = [];
  for (const k of keyed) {
    const lemma = norm(k.item.lemma).join(" ");
    let g = groups.find((x) => x.length < chunk && !x.some((y) => norm(y.item.lemma).join(" ") === lemma));
    if (!g) groups.push((g = []));
    g.push(k);
  }
  for (const group of groups) {
    let retry = group;
    try {
      retry = settle(group, await ask(group), false);
    } catch (error) {
      usage.failed_calls += 1;
      group.forEach((g) => failures.set(g.item.id, [`call_failed:${error.message}`]));
    }
    for (const g of retry) {
      usage.retries += 1;
      try {
        settle([g], await ask([g]), true);
      } catch (error) {
        usage.failed_calls += 1;
        failures.set(g.item.id, [...(failures.get(g.item.id) || []), `call_failed:${error.message}`]);
      }
    }
  }
  return { checks, failures, usage };
}

/** The Wiktionary evidence an AI check gets: senses and English equivalents per part of speech. */
export function wiktionaryEvidence(page) {
  if (page?.status !== "found") return { status: page?.status || "skipped" };
  return {
    status: "found",
    entries: page.entries.filter((e) => !e.formOf).map((e) => ({ pos: e.pos, senses: e.senses.map((s) => s.text).slice(0, 6), english: e.english.flat().slice(0, 8) })),
  };
}

/** Records a check on an entry (resource_field_status "pos" / "sense") and refreshes its summary. */
export async function recordCheck(supabaseAdmin, entryId, field, status, source, detail = null) {
  try {
    await supabaseAdmin.from("resource_field_status").upsert(
      { learning_object_id: entryId, field, status, source, detail, updated_at: new Date().toISOString() },
      { onConflict: "learning_object_id,field" },
    );
    await supabaseAdmin.rpc("refresh_resource_summary", { p_ids: [entryId] });
  } catch (error) {
    console.warn("[checks] could not record", field, entryId, error.message);
  }
}

// A related word's part of speech as compoundRows takes it (participles inflect as adjectives).
const RELATED_AS_SALDO = { noun: "noun", verb: "verb", adjective: "adjective", adverb: "adverb", present_participle: "adjective", perfect_participle: "adjective" };

/**
 * Letters of another script left in a card after its corrections (2026-11-08): such an
 * example, collocation or related word is dropped and a tip emptied, in place. Returns what
 * was dropped and the meaning fields that have them — a card with those is not saved.
 */
export function dropForeignScript(card) {
  const foreign = [];
  card.examples = (card.examples || []).filter((e) => {
    const bad = foreignLetters(e.swedish, "sv").length || foreignLetters(e.zh, "zh").length || foreignLetters(e.en, "en").length;
    if (bad) foreign.push(e.swedish);
    return !bad;
  });
  card.collocations = (card.collocations || []).filter((c) => {
    const bad = foreignLetters(c.phrase, "sv").length || foreignLetters(c.example, "sv").length || foreignLetters(c.zh, "zh").length || foreignLetters(c.en, "en").length;
    if (bad) foreign.push(c.phrase);
    return !bad;
  });
  card.related = (card.related || []).filter((r) => {
    const bad = foreignLetters(r.word, "sv").length || foreignLetters(r.zh, "zh").length || foreignLetters(r.en, "en").length;
    if (bad) foreign.push(r.word);
    return !bad;
  });
  for (const [f, lang] of [["memory_tip_zh", "zh"], ["memory_tip_en", "en"]]) if (foreignLetters(card[f], lang).length) { foreign.push(f); card[f] = ""; }
  const badMeaning = [["meaning_zh", "zh"], ["meaning_en", "en"], ["swedish_explanation", "sv"]].filter(([f, lang]) => foreignLetters(card[f], lang).length).map(([f]) => f);
  return { foreign, badMeaning };
}

// ---------------------------------------------------------------------------
// Dictionary evidence for a card's related words and collocations (2026-11-08)
// ---------------------------------------------------------------------------

// Endings that make a derivation, not a compound: "slagig", "svikfull", "befogande" split as
// slag + ig or svik + full look like compounds but are words made by pattern, and of a test of
// 840 cards the ones no dictionary had were mostly made up.
const DERIVATION = /(ig|full|lös|ande|ende|else|ning|het|lig|bar|sam|aktig|skap|isk|are|eri)$/;

/** Up to two Lexin senses of a word, any part of speech: "definition (english, …)". */
function dictionaryGloss(refs) {
  const out = [];
  for (const e of refs.lexin_sv || []) for (const x of e.lexemes) if (x.definition && out.length < 2) out.push(`${e.pos}: ${x.definition}`);
  for (const e of refs.lexin_en || []) if (out.length < 2 && e.english?.length) out.push(`${e.pos}: ${e.english.slice(0, 4).join(", ")}`);
  return out;
}

/**
 * What the dictionaries say about a related word: { kind, gloss? }. kind "dictionary" (SALDO has
 * the word or form, or Lexin the headword or expression), "wiktionary" (a Swedish Wiktionary
 * page), "compound" (SALDO has its parts: musmatta = mus + matta), or "none". A word the
 * dictionaries have is never called made up; one none has is a reason to look hard.
 */
export async function relatedEvidence(supabaseAdmin, word, pos = "noun", { askWiktionary = true } = {}) {
  const w = String(word || "").trim().toLowerCase();
  if (!w) return { kind: "none" };
  if (/\s/.test(w)) {
    if (await saldoHasExpression(supabaseAdmin, [w])) return { kind: "dictionary" };
    const hits = await expressionInReferences(supabaseAdmin, w);
    if (hits.length) return { kind: "dictionary", ...(hits[0].definition || hits[0].english ? { gloss: [String(hits[0].definition || [].concat(hits[0].english).join(", "))] } : {}) };
    return { kind: "none" };
  }
  const refs = await referenceEntries(supabaseAdmin, w);
  const gloss = dictionaryGloss(refs);
  // The dictionaries' English for the word (any part of speech when its own has none), to hold
  // the card's meaning of it against.
  const english = englishEquivalents(refs, pos).length ? englishEquivalents(refs, pos) : Object.values(refs).flat().filter((e) => e.english?.length).flatMap((e) => e.english.map((t) => ({ source: "any", text: t })));
  if ((await formReadings(supabaseAdmin, [w])).get(w)?.length || gloss.length) return { kind: "dictionary", ...(gloss.length ? { gloss } : {}), ...(english.length ? { english } : {}) };
  const parts = (await compoundRows(supabaseAdmin, w, RELATED_AS_SALDO[pos] || "noun"))[0]?.compound;
  if (parts && !DERIVATION.test(w) && w.length - parts.first.length >= 4) return { kind: "compound", parts: `${parts.first}+${String(parts.head).split("..")[0]}` };
  if (askWiktionary) {
    const page = await lookupWiktionary(supabaseAdmin, w);
    if (page.status === "found") return { kind: "wiktionary" };
  }
  return { kind: "none" };
}

/** Whether the dictionaries list a collocation: a Lexin construction, idiom or example with its fixed words, or a SALDO or Lexin expression. */
export async function collocationEvidence(supabaseAdmin, refs, phrase, headwordForms = []) {
  const lexin = refs ? collocationInLexin(refs, phrase, headwordForms) : [];
  if (lexin.length) return { kind: "dictionary", text: lexin[0].text };
  const p = String(phrase || "").trim().toLowerCase();
  if (/\s/.test(p) && ((await saldoHasExpression(supabaseAdmin, [p])) || (await expressionInReferences(supabaseAdmin, p)).length)) return { kind: "dictionary", text: p };
  return { kind: "none" };
}

// ---------------------------------------------------------------------------
// The second, focused check of a new card (2026-11-08)
// ---------------------------------------------------------------------------
// The whole-card check missed most wrong senses (fart "a part of a journey"), ungrammatical
// examples ("Min gammal telefon …") and made-up collocations and words ("stjäla med ögonen",
// "slagig") in a test of 840 cards: it is asked too much at once. This one asks each question
// on its own, with the dictionaries' evidence, and runs alongside it. Neither decides alone:
// checkNewWordCard drops or changes only what both checks, or a check and the dictionaries,
// agree on, and leaves the rest marked open (not verified).

const detailSchema = {
  type: "object", additionalProperties: false, required: ["senses", "meaning_en_without_wrong", "swedish_explanation_without_wrong", "examples", "collocations", "related"],
  properties: {
    senses: { type: "array", items: { type: "object", additionalProperties: false, required: ["key", "english", "verdict", "reason"], properties: {
      key: { type: "string" }, english: { type: "string" }, verdict: { type: "string", enum: ["matches_reference", "valid_unlisted", "wrong_sense", "other_word", "unsure"] }, reason: { type: "string" } } } },
    meaning_en_without_wrong: { type: "string" },
    swedish_explanation_without_wrong: { type: "string" },
    examples: { type: "array", items: { type: "object", additionalProperties: false, required: ["key", "verdict", "corrected"], properties: {
      key: { type: "string" }, verdict: { type: "string", enum: ["ok", "ungrammatical", "unidiomatic"] }, corrected: { type: "string" } } } },
    collocations: { type: "array", items: { type: "object", additionalProperties: false, required: ["key", "verdict", "correct_form"], properties: {
      key: { type: "string" }, verdict: { type: "string", enum: ["fixed_expression", "common_combination", "free_combination", "made_up", "wrong_form", "wrong_meaning", "bad_example"] }, correct_form: { type: "string" } } } },
    related: { type: "array", items: { type: "object", additionalProperties: false, required: ["key", "verdict"], properties: {
      key: { type: "string" }, verdict: { type: "string", enum: ["exists", "not_a_word", "unsure"] } } } },
  },
};

const DETAIL_SYSTEM = `You are a strict Swedish lexicographer checking one new entry of a learner's dictionary, part by part. Judge by standard Swedish as SAOL, Svensk ordbok and Lexin describe it. Answer every keyed part (echo its key); be concise.

senses (the entry's Chinese meanings, one per key, with its English meaning and Swedish explanation for context): english = what the Chinese word itself means in English, translated literally from the Chinese (1–4 words, not copied from the entry's English); then compare it with the reference senses (Lexin, Wiktionary) of this lemma and part of speech, and with the requested sense when one is given.
- matches_reference: it renders one of the reference senses (wording may differ: a free or partial translation, a narrower or broader Chinese word for the same sense, is fine).
- valid_unlisted: the references don't list it but it is a real, current sense of this word in this part of speech.
- wrong_sense: not a sense of this word (a near-synonym's sense, a mistranslation, a sense made up by analogy): e.g. fart "旅程中的一段" (fart is speed or travel/traffic, not a leg of a journey), fil "车道线" (fil is the lane, not the line).
- other_word: a sense of another word with the same spelling (another part of speech, or a homograph of another gender or inflection: lag "法律" is en lag, the team is ett lag) when the entry is for one of them.
- unsure: you can't tell. Only call a sense wrong when you are sure; never for wording.
meaning_en_without_wrong / swedish_explanation_without_wrong: only when a sense is wrong_sense or other_word: the English meaning / Swedish explanation with exactly that sense deleted and nothing else changed; "" otherwise or if nothing in it needs deleting.

examples: each Swedish sentence on its own: "ok", "ungrammatical" (a grammar error: agreement, definiteness after a possessive or demonstrative — "min gammal" → "min gamla", gender, verb form, word order, a reflexive sin/sitt/sina whose antecedent is not the subject of its clause, a missing finite verb, two conjunctions for one link — "nämligen eftersom") or "unidiomatic" (grammatical but no Swedish speaker would say it). corrected = the sentence corrected with the fewest changes, "" when ok.

collocations: what each combination with the headword is:
- fixed_expression: an established fixed combination or idiom (a fixed verb, preposition or particle, an idiom) a learner must learn as a unit;
- common_combination: correct and very frequent, worth learning for its typical partner word, but not fixed ("dricka kaffe", "besöka ett museum", "hälla upp mjölk");
- free_combination: correct but arbitrary, nothing to learn ("glass med jordgubbar", "blå färg");
- made_up: not used in Swedish in this sense (invented, translated word for word, the wrong fixed word: "stjäla med ögonen", "gå på fil" for walking in single file — it is "gå på led", "dö på posten");
- wrong_form: the right expression in a wrong form (wrong gender, article, number or inflection: "ett plan över området" → "en plan", "ögat för ögat" → "öga för öga"); correct_form = the right one;
- wrong_meaning: real, but its zh or en meaning is wrong ("enkel säng" is a simple bed, not a single bed);
- bad_example: the combination is fine but its example sentence is ungrammatical or unidiomatic.
A collocation with "dictionary" evidence is listed in a dictionary: it is not made up (but may still be wrong_form, wrong_meaning or bad_example). correct_form is "" unless wrong_form.

related: only the related words no dictionary or only a compound analysis has: "exists" (a word in use in Swedish today with roughly the meaning given), "not_a_word" (made up, misspelt, a derivation that merely follows a Swedish pattern — "slagig", "görelse", "musig", "befoga" — or an expression nobody uses), "unsure".`;

/** Problems with a detail check's answer: every part answered once by key, nothing else. */
export function detailProblems(prompt, c) {
  if (!c) return ["missing"];
  const problems = [];
  for (const [field, list] of [["senses", prompt.senses], ["examples", prompt.examples], ["collocations", prompt.collocations], ["related", prompt.related]]) {
    const keys = list.map((x) => x.key);
    const answered = (c[field] || []).map((x) => x.key);
    for (const k of keys) if (answered.filter((a) => a === k).length !== 1) problems.push(`${field}:${k}`);
    for (const a of answered) if (!keys.includes(a)) problems.push(`${field}_unknown:${a}`);
  }
  for (const f of ["meaning_en_without_wrong", "swedish_explanation_without_wrong"]) if (foreignLetters(c[f], f.startsWith("meaning") ? "en" : "sv").length) problems.push(`bad_fix:${f}`);
  return problems;
}

/** The entry's Chinese meaning split into senses ("文件；车道；队列"). */
// Errors the program can see in a sentence the focused check corrected: two conjunctions for one
// link ("nämligen eftersom", "eftersom att"), or a possessive or demonstrative before an
// adjective that the correction puts in the definite form ("min gammal telefon" → "min gamla").
const DOUBLE_CONJ = /(?<!\p{L})(nämligen eftersom|nämligen för att|eftersom att|ändå att|fast att|trots att att|medan att|innan att)(?!\p{L})/iu;
const DETERMINER = new Set(["min", "mitt", "mina", "din", "ditt", "dina", "sin", "sitt", "sina", "vår", "vårt", "våra", "er", "ert", "era", "hans", "hennes", "deras", "dess", "denna", "detta", "dessa", "den", "det", "de"]);
export function grammarSlip(sentence, corrected) {
  if (DOUBLE_CONJ.test(sentence) && !DOUBLE_CONJ.test(corrected)) return true;
  const a = norm(sentence), b = norm(corrected);
  if (a.length !== b.length) return false;
  const changed = a.map((w, i) => [w, b[i], i]).filter(([w, v]) => w !== v);
  return changed.length === 1 && changed[0][2] > 0 && DETERMINER.has(a[changed[0][2] - 1]) && changed[0][1].endsWith("a") && !changed[0][0].endsWith("a")
    && changed[0][1].slice(0, 3) === changed[0][0].slice(0, 3);
}

// A predicative adjective that doesn't agree with its subject (2026-11-09): "Barnet känner sig
// säker", "Något är säker om …" were kept by both AI checks in a test of 840 cards. Program
// only, for the headword itself: a neuter subject (något, allt, detta, or a SALDO neuter noun in
// the definite singular: barnet) or a plural one (vi, de, a definite plural noun) before a
// copula (är, blir, känner sig …) and the headword's common-gender form, where the card's forms
// give another neuter or plural form. Attributive uses ("Det är säker mark") are not judged.
const COPULA = new Set(["är", "var", "blir", "blev", "varit", "bli", "vara", "verkar", "verkade", "förblir", "förblev", "känns", "kändes", "låter", "lät", "ser"]);
const FEEL = new Set(["känner", "kände", "känt", "känna"]);
const DEGREE = new Set(["inte", "mycket", "så", "helt", "väldigt", "ganska", "för", "alltid", "ofta", "aldrig", "rätt", "lite", "mer", "också", "ändå", "nog", "inte", "riktigt"]);
const NEUTER_PRONOUN = new Set(["något", "allt", "detta", "inget", "ingenting", "vilket"]);
const PLURAL_PRONOUN = new Set(["vi", "de", "dom", "alla", "båda", "dessa"]);
export async function agreementSlip(supabaseAdmin, sentence, { lemma, forms = [] }) {
  const value = (t) => String((forms || []).find((f) => f.type === t)?.value || "").trim().toLowerCase();
  const base = String(lemma || "").toLowerCase(), neuter = value("neuter_form"), plural = value("plural_form");
  if (!base || /\s/.test(base) || (!neuter && !plural)) return null;
  const tokens = String(sentence || "").toLowerCase().match(/[\p{L}]+/gu) || [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] !== base) continue;
    let j = i - 1;
    while (j >= 0 && DEGREE.has(tokens[j])) j--;
    if (j >= 1 && tokens[j] === "sig" && FEEL.has(tokens[j - 1])) j -= 1;
    else if (j >= 1 && tokens[j] === "ut" && tokens[j - 1] === "ser") j -= 1;
    else if (!(j >= 0 && COPULA.has(tokens[j]) && tokens[j] !== "ser")) continue;
    const subject = tokens[j - 1];
    if (!subject) continue;
    // The next word a noun: the adjective is attributive ("är säker mark"), not judged.
    const next = tokens[i + 1];
    const nextReadings = next ? (await formReadings(supabaseAdmin, [next])).get(next) || [] : [];
    if (nextReadings.length && nextReadings.every((r) => r.pos === "noun")) continue;
    let want = null;
    if (NEUTER_PRONOUN.has(subject)) want = neuter;
    else if (PLURAL_PRONOUN.has(subject)) want = plural;
    else {
      const nouns = [...new Set(((await formReadings(supabaseAdmin, [subject])).get(subject) || []).filter((r) => r.pos === "noun").map((r) => r.lemma))];
      for (const r of (await Promise.all(nouns.map((l) => saldoEntries(supabaseAdmin, l)))).flat()) {
        if (r.pos !== "nn") continue;
        const f = r.forms || {}, has = (k) => (f[k] || []).map((x) => String(x).toLowerCase()).includes(subject);
        if (has("sg def nom") && /^nn_\w?n_/.test(r.paradigm || "")) want = neuter;
        else if (has("pl def nom") || has("pl indef nom") && !has("sg indef nom")) want = plural;
        if (want) break;
      }
    }
    if (want && want !== base) return { subject, said: base, want };
  }
  return null;
}

export function zhSenses(meaningZh) {
  return String(meaningZh || "").split(/\s*[；;]\s*/).map((s) => s.trim()).filter(Boolean);
}

/**
 * The second check of a new card (above): asked once, and once more if its answer is unusable.
 * Returns { check, usage, failed }.
 */
export async function cardDetailCheck(supabaseAdmin, prompt, { userId = null, textResourceId = null } = {}) {
  const usage = { input_tokens: 0, output_tokens: 0, calls: 0, cost: 0 };
  let problems = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { result, usage: u } = await callOpenAIJson({ schemaName: "card_detail_check", schema: detailSchema, system: DETAIL_SYSTEM, user: JSON.stringify(prompt), maxOutputTokens: 4000 });
      const cost = ((u.input_tokens || 0) * 0.75 + (u.output_tokens || 0) * 4.5) / 1e6;
      usage.input_tokens += u.input_tokens || 0; usage.output_tokens += u.output_tokens || 0; usage.calls += 1; usage.cost += cost;
      if (supabaseAdmin) await logUsage(supabaseAdmin, { userId, textResourceId, feature: "word_card_detail_check", model: MODEL, inputTokens: u.input_tokens, outputTokens: u.output_tokens, cost });
      problems = detailProblems(prompt, result);
      if (!problems.length) return { check: result, usage, failed: null };
    } catch (error) {
      problems = [`call_failed:${error.message}`];
    }
  }
  return { check: null, usage, failed: problems };
}

/** Whether `after` only deletes from `before`: every word of it is a word of before. */
export function onlyDeletes(before, after) {
  const words = new Set(norm(before));
  const out = norm(after);
  return out.length > 0 && out.length < norm(before).length && out.every((w) => words.has(w));
}

// ---------------------------------------------------------------------------
// Before a new word card is saved (layer 4)
// ---------------------------------------------------------------------------

/**
 * A generated word card checked before it is saved: the part of speech asked for and
 * one the references give the lemma (a card SALDO and Wiktionary contradict is not
 * saved); examples that don't use the word are dropped; then one AI check of meanings,
 * examples and translations against the part of speech, the references and the sense
 * the text uses, and of the collocations and related words (2026-11-08), whose corrections
 * are applied; last, what is left in another script is dropped (dropForeignScript). Returns
 *   { ok, reason, result, pos: { status, source }, sense: { status, source, detail }, usage }.
 */
// Korp's count for a collocation no dictionary lists, asked while the AI checks run and never
// waited on longer than they are worth: { ok, total } (ok = attested as server-korp judges a
// multi-word expression), or null when Korp didn't answer — then nothing is decided by it.
async function corpusEvidence(korp, phrase, ms = 20000) {
  let timer;
  try {
    const a = await Promise.race([korp(phrase), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), ms); })]);
    return { ok: judgeAttestation(a, null).exists.ok, total: a.total };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The version of the word-card check (2026-11-09, G6): recorded with each check's result
 * (resource_field_status "sense", detail.check_version), so an entry checked by this version is
 * never checked — or paid for — again, and one checked by an older version can be told apart.
 * Raise it when the check's rules change in a way that should re-check reused entries.
 */
export const CHECK_VERSION = "2026-11-09c";

export async function checkNewWordCard(supabaseAdmin, { lemma, pos, wantedPos = null, sense = "", result, forms = [], isPhrase = false, userId = null, textResourceId = null, korp = korpAttestation }) {
  if (!isPhrase && wantedPos && pos !== wantedPos) return { ok: false, reason: `asked_${wantedPos}_got_${pos}` };
  let posCheck = { status: "present", source: "unconfirmed" };
  let page = { status: "skipped" };
  let refs = null;
  let saldoPos = [];
  if (!isPhrase) {
    const references = await referencePartsOfSpeech(supabaseAdmin, lemma, { askWiktionary: true });
    page = await lookupWiktionary(supabaseAdmin, lemma);
    refs = references.refs;
    // The spelling's other parts of speech, so the check looks for their senses in this entry
    // ("man": the noun entry must not hold the pronoun's sense).
    saldoPos = references.saldo || [];
    if (references.all.length && !references.all.includes(pos)) return { ok: false, reason: `references_say_${references.all.join("/")}` };
    if (references.saldo.includes(pos)) posCheck = { status: "verified", source: "saldo-morphology-2017" };
    else if (references.lexin.includes(pos)) posCheck = { status: "verified", source: LEXIN_SV_SOURCE_ID };
    else if (references.wiktionary.includes(pos)) posCheck = { status: "verified", source: "sv-wiktionary" };
    // Unconfirmed says why: no reference has the word, or Wiktionary couldn't be asked.
    else posCheck = { status: "present", source: "unconfirmed", detail: { saldo: references.saldo, wiktionary: page.status } };
  } else {
    page = await lookupWiktionary(supabaseAdmin, lemma);
  }

  const card = structuredClone(result);
  // Look-alike Cyrillic or Greek letters inside Swedish words put back first ("gällа").
  for (const e of card.examples || []) e.swedish = latinLookalikes(e.swedish);
  for (const c of card.collocations || []) { c.phrase = latinLookalikes(c.phrase); c.example = latinLookalikes(c.example); }
  for (const r of card.related || []) r.word = latinLookalikes(r.word);
  card.swedish_explanation = latinLookalikes(card.swedish_explanation);
  const wordForms = [lemma, ...forms.map((f) => f.value), ...(isPhrase ? await phraseForms(supabaseAdmin, lemma) : [])].filter(Boolean);
  // Every SALDO form of the word counts, the card's own and those it doesn't show: the s-passive
  // ("Skorna har slitits …" was dropped as not using slita, 2026-11-08), every homograph's.
  const allForms = [...wordForms, ...(isPhrase ? [] : (await saldoEntries(supabaseAdmin, lemma, pos)).flatMap((r) => Object.values(r.forms || {}).flat()))];
  // Two kinds of form SALDO's tables here leave out (2026-11-08: "till fots", "vara förlovad
  // med någon" were dropped as not having the headword): a noun's genitive, and a verb's
  // participle, which SALDO keeps as an adjective of its own (förlovad, gripen, känd).
  if (pos === "noun") allForms.push(...allForms.filter((f) => /\p{L}$/u.test(f) && !/[sxz]$/.test(f)).map((f) => `${f}s`));
  if (pos === "verb") {
    const supines = forms.filter((f) => f.type === "supinum").flatMap((f) => String(f.value).split(/\s*\/\s*/)).map((f) => f.split(/\s+/)[0]);
    for (const sup of new Set(supines)) {
      for (const p of new Set([sup.replace(/at$/, "ad"), sup.replace(/t$/, "d"), sup.replace(/tt$/, "dd"), sup.replace(/it$/, "en"), sup.replace(/tt$/, "t")])) {
        if (p === sup) continue;
        for (const r of await saldoEntries(supabaseAdmin, p)) if (r.pos === "av" && r.baseform === p) allForms.push(...Object.values(r.forms || {}).flat());
      }
    }
  }
  const dropped = [];
  card.examples = (card.examples || []).filter((e) => {
    const keep = exampleUsesWord(e.swedish, allForms);
    if (!keep) dropped.push(e.swedish);
    return keep;
  });

  // Program evidence for the check (never a verdict on its own): a collocation or its example
  // without any form of the headword (every SALDO homograph's forms count); what the
  // dictionaries say about each related word and collocation (relatedEvidence,
  // collocationEvidence: a word no dictionary has, a related word's dictionary meaning).
  const collocationFlags = (c) => [
    !isPhrase && !exampleUsesWord(c.phrase, allForms) && "headword_not_found",
    !exampleUsesWord(c.example, allForms) && "example_without_headword",
  ].filter(Boolean);
  const withFlags = (o, flags) => (flags.length ? { ...o, flags } : o);
  // A wrong inflection of the headword is dropped by the program, never left to the AI check
  // (it kept "Han svikade inte sitt löfte." although flagged): the example or collocation goes.
  const droppedCollocations = [];
  const wrongForm = [];
  for (const e of card.examples) if ((await misinflections(supabaseAdmin, e.swedish, allForms)).length) wrongForm.push(e.swedish);
  card.examples = card.examples.filter((e) => !wrongForm.includes(e.swedish));
  dropped.push(...wrongForm);
  const keptCollocations = [];
  // A wrong form in the phrase drops the collocation; one only in its example drops the example
  // ("svika någons förtroende" went for "Han svikade …", "hälla upp kaffe" for "hälde", 2026-11-09).
  const wrongFormExamples = [];
  for (const c of card.collocations || []) {
    const bad = await misinflections(supabaseAdmin, c.phrase, allForms);
    if (bad.length) { droppedCollocations.push({ phrase: c.phrase, reason: `wrong_form:${bad.join(",")}` }); continue; }
    const badExample = c.example ? await misinflections(supabaseAdmin, c.example, allForms) : [];
    if (badExample.length) { wrongFormExamples.push({ phrase: c.phrase, example: c.example, reason: `wrong_form:${badExample.join(",")}` }); c.example = ""; }
    keptCollocations.push(c);
  }
  card.collocations = keptCollocations;
  // A predicative headword adjective that doesn't agree with its subject (agreementSlip): the
  // example goes, a collocation keeps its phrase without the sentence, the explanation stays open.
  const agreement = [];
  if (!isPhrase && pos === "adjective") {
    for (const e of card.examples) { const a = await agreementSlip(supabaseAdmin, e.swedish, { lemma, forms }); if (a) agreement.push({ text: e.swedish, ...a }); }
    card.examples = card.examples.filter((e) => !agreement.some((a) => a.text === e.swedish));
    dropped.push(...agreement.map((a) => a.text));
    for (const c of card.collocations) {
      const a = c.example && (await agreementSlip(supabaseAdmin, c.example, { lemma, forms }));
      if (a) { agreement.push({ text: c.example, phrase: c.phrase, ...a }); c.example = ""; }
    }
  }
  const explanationAgreement = !isPhrase && pos === "adjective" ? await agreementSlip(supabaseAdmin, card.swedish_explanation, { lemma, forms }) : null;
  card.related = card.related || [];
  const relatedEv = await Promise.all(card.related.map((r) => relatedEvidence(supabaseAdmin, r.word, r.pos)));
  const collocationEv = await Promise.all(card.collocations.map((c) => collocationEvidence(supabaseAdmin, refs, c.phrase, wordForms)));
  // The corpus for each collocation no dictionary lists, counted while the AI checks run.
  const corpusAsked = Promise.all(card.collocations.map((c, i) => (collocationEv[i].kind === "dictionary" ? null : corpusEvidence(korp, c.phrase))));
  // A related word only parsed as a compound (no dictionary has it): the corpus too, asked now so
  // that it costs no time — it settles the AI checks' "not a word" (ingripen, sårbarhetsskydd).
  const relatedCorpusAsked = Promise.all(card.related.map((r, i) => (relatedEv[i].kind === "compound" && !/\s/.test(String(r.word).trim()) ? corpusEvidence(korp, String(r.word).trim()) : null)));
  const relatedNote = (ev) => (ev.kind === "dictionary" ? (ev.gloss ? { dictionary_meaning: ev.gloss } : {}) : { flags: [ev.kind === "none" ? "no_dictionary" : `only_${ev.kind}`] });
  const headwordForms = [...new Set(allForms.flatMap((f) => String(f || "").split(/\s*\/\s*/)).map((f) => f.trim()).filter(Boolean))].slice(0, 40);
  const lexin = !isPhrase && refs ? lexinSenses(refs, pos) : [];
  const item = {
    id: "card", lemma, pos: isPhrase ? "phrase" : pos,
    entry: { meaning_zh: card.meaning_zh || "", meaning_en: card.meaning_en || "", swedish_explanation: card.swedish_explanation || "",
      headword_forms: headwordForms,
      examples: card.examples.map((e) => ({ sv: e.swedish, zh: e.zh, en: e.en })),
      collocations: card.collocations.map((c, i) => withFlags({ phrase: c.phrase, zh: c.zh, en: c.en, example: c.example, ...(collocationEv[i].kind === "dictionary" ? { in_dictionary: collocationEv[i].text } : {}) }, collocationFlags(c))),
      related: card.related.map((r, i) => ({ word: r.word, pos: r.pos, zh: r.zh, en: r.en, ...relatedNote(relatedEv[i]) })) },
    ...(sense ? { context: { sentence: "", meaning_here: sense } } : {}),
    references: { ...(saldoPos.length ? { saldo_pos: saldoPos } : {}), wiktionary: wiktionaryEvidence(page), ...(lexin.length ? { lexin } : {}) },
  };
  // The second, focused check (cardDetailCheck), asked at the same time.
  const senses = zhSenses(card.meaning_zh);
  const doubtful = card.related.map((r, i) => [r, i]).filter(([, i]) => relatedEv[i].kind !== "dictionary");
  const detailPrompt = {
    lemma, pos: isPhrase ? "phrase" : pos, ...(sense ? { requested_sense: sense } : {}),
    references: { ...(lexin.length ? { lexin } : {}), wiktionary: wiktionaryEvidence(page) },
    meaning_en: card.meaning_en || "", swedish_explanation: card.swedish_explanation || "",
    senses: senses.map((s, j) => ({ key: `s${j}`, zh: s })),
    examples: card.examples.map((e, j) => ({ key: `e${j}`, sv: e.swedish })),
    collocations: card.collocations.map((c, j) => ({ key: `c${j}`, phrase: c.phrase, zh: c.zh, en: c.en, example: c.example, evidence: collocationEv[j].kind })),
    related: doubtful.map(([r, i]) => ({ key: `r${i}`, word: r.word, pos: r.pos, zh: r.zh, en: r.en, evidence: relatedEv[i].kind === "none" ? "no dictionary has it" : relatedEv[i].kind === "compound" ? `only as a compound of ${relatedEv[i].parts}` : "only Wiktionary has it" })),
  };
  let check;
  let usage = null;
  let second = { check: null, usage: null, failed: ["not_asked"] };
  // When the second check is asked (DETAIL_CHECK, for measuring it; "always" by default):
  // "strict" only for a card with no Lexin senses, a sense asked for, a related word no
  // dictionary has, or an expression; "strict_corpus" also when a collocation no dictionary
  // lists isn't attested in the corpus (asked once Korp has answered); "never".
  const detailMode = process.env.DETAIL_CHECK || "always";
  const plainCard = lexin.length && !sense && !doubtful.length && !isPhrase;
  const askDetail = async () => detailMode === "always" || (detailMode !== "never" && !plainCard)
    || (detailMode === "strict_corpus" && (await corpusAsked).some((k, i) => collocationEv[i].kind !== "dictionary" && !k?.ok));
  const notAsked = { check: null, usage: { input_tokens: 0, output_tokens: 0, calls: 0, cost: 0 }, failed: null, skipped: true };
  try {
    const [out, detailOut] = await Promise.all([
      aiSenseCheck(supabaseAdmin, [item], { userId, textResourceId, feature: "word_card_check", card: true }),
      askDetail().then((ask) => (ask ? cardDetailCheck(supabaseAdmin, detailPrompt, { userId, textResourceId }) : notAsked)),
    ]);
    check = out.checks.get("card");
    second = detailOut;
    usage = { ...out.usage, cost: out.usage.cost + detailOut.usage.cost, calls: out.usage.calls + detailOut.usage.calls,
      input_tokens: out.usage.input_tokens + detailOut.usage.input_tokens, output_tokens: out.usage.output_tokens + detailOut.usage.output_tokens };
    // The check failed (no usable answer even when asked again): the card is saved as
    // generated, marked unchecked with the reason — never as checked.
    if (!check) {
      const { foreign, badMeaning } = dropForeignScript(card);
      if (badMeaning.length) return { ok: false, reason: `foreign_script:${badMeaning.join(",")}`, usage };
      return { ok: true, result: card, pos: posCheck, usage,
        sense: { status: "missing", source: "ai_check_failed", detail: { problems: out.failures.get("card") || ["missing"], dropped, wiktionary: page.status, ...(foreign.length ? { foreign_script: foreign } : {}) } } };
    }
  } catch (error) {
    const { foreign, badMeaning } = dropForeignScript(card);
    if (badMeaning.length) return { ok: false, reason: `foreign_script:${badMeaning.join(",")}`, usage };
    return { ok: true, result: card, pos: posCheck, sense: { status: "missing", source: "ai_check_failed", detail: { error: error.message, dropped, wiktionary: page.status, ...(foreign.length ? { foreign_script: foreign } : {}) } }, usage };
  }
  if (!isPhrase && !check.pos_supported && posCheck.status !== "verified") return { ok: false, reason: `pos_not_supported: ${check.note}`, usage };
  const corpus = await corpusAsked;
  const relatedCorpus = await relatedCorpusAsked;
  const detailCheck = second.check;
  const by = (list, k) => (list || []).find((x) => x.key === k);
  // What is kept although a check doubts it: shown, but the card is not verified (detail.open_items).
  const open = [];
  if (!detailCheck && !second.skipped) open.push({ kind: "detail_check_failed", problems: second.failed });
  if (explanationAgreement) open.push({ kind: "explanation_agreement", text: card.swedish_explanation, ...explanationAgreement });

  // Meanings. The whole-card check's corrections first; then a Chinese sense the focused check
  // calls wrong, or another word's, goes only when Lexin has senses for this word to compare it
  // with and another sense is left — the English and Swedish only when its rewrite merely
  // deletes. Otherwise it stays, open.
  if (check.meaning_zh_fixed) card.meaning_zh = check.meaning_zh_fixed;
  if (check.meaning_en_fixed) card.meaning_en = check.meaning_en_fixed;
  if (check.swedish_explanation_fixed) card.swedish_explanation = check.swedish_explanation_fixed;
  // The dictionaries' English for this word: a sense whose literal English (the check's back
  // translation of the Chinese) shares no word with them is unsupported, whatever the check says.
  const equivalents = !isPhrase && refs ? [...englishEquivalents(refs, pos), ...((wiktionaryEvidence(page).entries || []).filter((e) => e.pos === pos).flatMap((e) => e.english.map((t) => ({ source: "svwikt", text: t }))))] : [];
  const supported = (x) => !equivalents.length || meaningSupport(x?.english, equivalents).length > 0;
  // A sense Lexin gives only to a same-spelled noun of the other gender is that word's, whatever
  // the checks say (ett lag "team" holding en lag "law"): it goes like a wrong one.
  const homographs = !isPhrase && pos === "noun" && refs ? homographEquivalents(refs, forms) : null;
  const otherWord = (x) => homographs && x?.english && !meaningSupport(x.english, homographs.own).length && meaningSupport(x.english, homographs.other).length > 0;
  const wrongSenses = [];
  senses.forEach((s, j) => {
    const x = by(detailCheck?.senses, `s${j}`);
    if (!x) return;
    if (otherWord(x)) { wrongSenses.push(s); return; }
    if (["wrong_sense", "other_word"].includes(x.verdict)) {
      if (!supported(x)) wrongSenses.push(s);
      else open.push({ kind: "sense", text: s, verdict: x.verdict });       // the dictionaries' English has it: not dropped
    } else if (x.verdict !== "matches_reference" && !supported(x)) open.push({ kind: "sense_unsupported", text: s, english: x.english });
  });
  const removedSenses = [];
  if (wrongSenses.length) {
    const now = zhSenses(card.meaning_zh);
    const left = now.filter((s) => !wrongSenses.includes(s));
    if (lexin.length && left.length && left.length < now.length) {
      removedSenses.push(...now.filter((s) => wrongSenses.includes(s)));
      card.meaning_zh = left.join("；");
      if (detailCheck.meaning_en_without_wrong && onlyDeletes(card.meaning_en, detailCheck.meaning_en_without_wrong)) card.meaning_en = detailCheck.meaning_en_without_wrong;
      else if (detailCheck.meaning_en_without_wrong) open.push({ kind: "meaning_en_sense", text: detailCheck.meaning_en_without_wrong });
      if (detailCheck.swedish_explanation_without_wrong && onlyDeletes(card.swedish_explanation, detailCheck.swedish_explanation_without_wrong)) card.swedish_explanation = detailCheck.swedish_explanation_without_wrong;
      else if (detailCheck.swedish_explanation_without_wrong) open.push({ kind: "swedish_explanation_sense", text: detailCheck.swedish_explanation_without_wrong });
    } else for (const s of wrongSenses) if (now.includes(s)) open.push({ kind: "sense", text: s });
  }
  // A sense the whole-card check calls unsupported, or another part of speech's, that is still on
  // the card: open — the check's doubt is never dropped silently (av adverb kept "时不时", the
  // idiom av och till's meaning, as verified; 2026-11-09).
  const meaningText = `${card.meaning_zh || ""} ${card.meaning_en || ""} ${card.swedish_explanation || ""}`;
  for (const quote of [...(check.other_pos_senses || []), ...(check.unsupported_senses || [])]) {
    const parts = String(quote).split(/[；;\/／|]/).map((x) => x.trim()).filter(Boolean);
    if (parts.some((p) => meaningText.includes(p)) && !open.some((o) => o.text === quote)) open.push({ kind: "sense_doubted_by_card_check", text: quote });
  }

  // The explanation or an example naming the headword with the other homograph's article
  // ("En lag är …" on the card of ett lag): shown, open.
  if (homographs) {
    const other = homographs.gender === "n" ? "en" : "ett";
    const re = new RegExp(`(^|[^\\p{L}])${other}\\s+${String(lemma).toLowerCase()}([^\\p{L}]|$)`, "iu");
    if (re.test(card.swedish_explanation || "")) open.push({ kind: "explanation_other_homograph", text: card.swedish_explanation });
    for (const e of card.examples) if (re.test(e.swedish)) open.push({ kind: "example_other_homograph", text: e.swedish });
  }

  // Examples: a misfit by the whole-card check goes; an ungrammatical one by the focused check
  // too (it names the correction), unless that leaves the card without examples — then it stays, open.
  const misfits = [];
  const ungrammatical = [];
  for (const x of check.examples || []) {
    const e = card.examples[x.index];
    if (!e) continue;
    if (!x.fits_entry) misfits.push(e.swedish);
    if (!x.translation_zh_ok && x.translation_zh_fixed) e.zh = x.translation_zh_fixed;
    if (!x.translation_en_ok && x.translation_en_fixed) e.en = x.translation_en_fixed;
  }
  // The focused check alone was wrong on 5 of 17 sentences it called ungrammatical in a test of
  // 840 cards ("hon förhåller sig neutral", "kallt drag"): one goes only when the program sees the
  // error too (grammarSlip), else it stays, open, with the correction for a reviewer.
  card.examples.forEach((e, j) => {
    const x = by(detailCheck?.examples, `e${j}`);
    if (x?.verdict === "ungrammatical" && x.corrected && norm(x.corrected).join(" ") !== norm(e.swedish).join(" ")) {
      if (grammarSlip(e.swedish, x.corrected)) ungrammatical.push(e.swedish);
      else open.push({ kind: "example_ungrammatical", text: e.swedish, corrected: x.corrected });
    } else if (x?.verdict === "unidiomatic") open.push({ kind: "example_unidiomatic", text: e.swedish, corrected: x.corrected });
  });
  const leftExamples = card.examples.filter((e) => !misfits.includes(e.swedish) && !ungrammatical.includes(e.swedish));
  if (!leftExamples.length && ungrammatical.length) {
    for (const s of ungrammatical) open.push({ kind: "example_ungrammatical", text: s });
    ungrammatical.length = 0;
  }
  card.examples = card.examples.filter((e) => !misfits.includes(e.swedish) && !ungrammatical.includes(e.swedish));

  // Collocations, by both checks and the dictionaries. One a dictionary lists is never dropped
  // as made up or free. Made up: dropped when both checks say so; one check alone leaves it open.
  // A free combination by the whole-card check stays when the focused one finds it a common,
  // learnable combination (dricka kaffe), at most two of those a card (P6).
  const commonKept = [];
  const droppedCollocationExamples = [...wrongFormExamples];
  const relatedMeaningNotes = [];
  card.collocations = card.collocations.filter((c, i) => {
    const x = (check.collocations || []).find((z) => Number(String(z.key).split(".c")[1]) === i);
    const y = by(detailCheck?.collocations, `c${i}`);
    const listed = collocationEv[i].kind === "dictionary";
    // The corpus (2026-11-09): both AI checks called "förhålla sig lugn" made up and kept
    // "stjäla med ögonen" and "gå i en fil" — Korp has the first in 3 corpora, the others nowhere.
    // Attested, a combination the checks doubt stays (open); one the corpus never has stays only
    // open. No answer from Korp decides nothing.
    const k = corpus[i];
    // A pattern with a placeholder (ge någon något, gripa någon) or a long phrase is never
    // found word for word: its zero hits say nothing.
    const literal = !/\b(någon|något|någons|ngn|ngt|nåt)\b/i.test(c.phrase) && c.phrase.trim().split(/\s+/).length <= 4;
    const attested = k?.ok === true, unattested = literal && k?.ok === false && k.total === 0;
    const drop = (reason) => { droppedCollocations.push({ phrase: c.phrase, reason }); return false; };
    // Two conjunctions where Swedish has one ("eftersom att", "ändå att"): wrong whatever the
    // corpus has (it is a common slip there too) — by program, like grammarSlip.
    const doubled = (t) => DOUBLE_CONJ.test(t) && !/(så|lika|för)\s+fast\s+att/i.test(t);   // "satt så fast att" is right
    if (doubled(c.phrase)) return drop("double_conjunction");
    if (c.example && doubled(c.example)) { droppedCollocationExamples.push({ phrase: c.phrase, example: c.example, reason: "double_conjunction" }); c.example = ""; }
    // A bad example costs the example — when both checks say so, or the whole-card check does
    // and the focused one wasn't asked; one alone leaves it open ("Han äter mjölk och flingor
    // till frukost" went for one check's word) — and the combination only when nothing vouches
    // for it (2026-11-08: "försvinna ur sikte", "avtjäna ett fängelsestraff" went for their sentences).
    if (x?.verdict === "bad_example" || y?.verdict === "bad_example" && x?.verdict !== "keep") {
      const both = x?.verdict === "bad_example" && (y?.verdict === "bad_example" || !detailCheck) || y?.verdict === "bad_example" && x?.verdict !== "bad_example";
      if (both) { droppedCollocationExamples.push({ phrase: c.phrase, example: c.example }); c.example = ""; }
      else open.push({ kind: "collocation_example", text: c.example });
      // Kept only when a dictionary lists the phrase, the corpus has it or the focused check finds
      // it fixed or common ("en rad filer" with its bad sentence was no better than the sentence).
      if (x?.verdict === "bad_example") {
        if (!(listed || attested || ["fixed_expression", "common_combination"].includes(y?.verdict))) return drop("bad_example");
        if (unattested && !listed) open.push({ kind: "collocation_unattested", text: c.phrase });
        return true;
      }
    }
    if (y?.verdict === "bad_example" && c.example) open.push({ kind: "collocation_example", text: c.example });
    if (y?.verdict === "wrong_form") {
      if (x && x.verdict !== "keep") return drop(`wrong_form:${y.correct_form}`);
      open.push({ kind: "collocation_form", text: c.phrase, correct: y.correct_form });
    }
    if (x?.verdict === "wrong_meaning") { if (x.zh_fixed) c.zh = x.zh_fixed; if (x.en_fixed) c.en = x.en_fixed; }
    else if (y?.verdict === "wrong_meaning") open.push({ kind: "collocation_meaning", text: c.phrase });
    if (!x || x.verdict === "keep" || x.verdict === "wrong_meaning") {
      if (y?.verdict === "made_up" && !listed) open.push({ kind: attested ? "collocation_disputed" : "collocation_made_up", text: c.phrase, ...(k ? { corpus_hits: k.total } : {}) });
      else if (unattested && !listed) open.push({ kind: "collocation_unattested", text: c.phrase });
      return true;
    }
    // "Not with the headword" for a phrase that has one of its forms ("ett par byxor" for byxa)
    // is the check not knowing the form: the program's evidence wins. A compound of the headword
    // the corpus has (glasspinne for glass) is the headword's too.
    if (x.verdict === "not_with_headword") {
      if (exampleUsesWord(c.phrase, allForms)) return true;
      const head = String(lemma).toLowerCase(), p = String(c.phrase).toLowerCase().trim();
      if (attested && !/\s/.test(p) && p.length > head.length + 2 && (p.startsWith(head) || p.endsWith(head))) return true;
      if (attested && p.split(/\s+/).some((w) => w.startsWith(head.slice(0, Math.max(3, head.length - 1))))) { open.push({ kind: "collocation_headword_form", text: c.phrase }); return true; }
      return drop(x.verdict);
    }
    if (listed) return true;
    if (x.verdict === "not_swedish") {
      if (attested) { open.push({ kind: "collocation_disputed", text: c.phrase, corpus_hits: k.total }); return true; }
      if (!y || ["made_up", "wrong_form", "free_combination"].includes(y.verdict)) return drop(x.verdict);
      open.push({ kind: "collocation_made_up", text: c.phrase });
      return true;
    }
    if (x.verdict === "free_combination") {
      if (["fixed_expression"].includes(y?.verdict)) { if (unattested) open.push({ kind: "collocation_unattested", text: c.phrase }); return true; }
      if (y?.verdict === "common_combination" && commonKept.length < 2) { commonKept.push(c.phrase); return true; }
      // "Made up" against the corpus (förhålla sig lugn, 8 hits in 3 corpora; 2026-11-09 one
      // stability run of three dropped it so): the corpus refutes that, so the phrase stays, open.
      if (y?.verdict === "made_up" && attested) { open.push({ kind: "collocation_disputed", text: c.phrase, corpus_hits: k.total }); return true; }
      return drop(x.verdict);
    }
    return drop(x.verdict);
  });
  if (agreement.length) droppedCollocationExamples.push(...agreement.filter((a) => a.phrase).map((a) => ({ phrase: a.phrase, example: a.text, reason: `agreement:${a.subject} ${a.want}` })));

  // Related words. One a dictionary has is never "not a word" (the check's meaning and part of
  // speech corrections still apply). One no dictionary has goes when a check says it is no word;
  // one only a compound analysis or Wiktionary has stays, open. "Not related" spares a word of the
  // headword's own family (it shares its stem).
  const droppedRelated = [];
  const keptRelated = [];
  const stem = (w) => String(w || "").toLowerCase().replace(/\s.*$/, "").replace(/(a|e|er|ar|or|ig|lig|het|ning)$/, "");
  for (const [i, r] of card.related.entries()) {
    const x = (check.related || []).find((z) => Number(String(z.key).split(".r")[1]) === i);
    const y = by(detailCheck?.related, `r${i}`);
    const ev = relatedEv[i];
    if (x?.verdict === "wrong_meaning") { if (x.zh_fixed) r.zh = x.zh_fixed; if (x.en_fixed) r.en = x.en_fixed; }
    if (x?.verdict === "wrong_pos" && x.pos_fixed) r.pos = x.pos_fixed;
    // A word the dictionaries have, with a meaning that shares no word with their English
    // (glasöga "lens", gående "ongoing", glassig "cool"; 2026-11-09: both checks kept these):
    // shown, open — the dictionaries' English is not the only way to say it.
    // Only noted, not open: on the 840 test cards it flagged 176 cards, nearly all synonyms
    // (uthärda "endure" / "bear") — word overlap cannot tell those from a wrong meaning.
    if (ev.kind === "dictionary" && ev.english?.length && r.en && !meaningSupport(r.en, ev.english).length) relatedMeaningNotes.push({ text: r.word, en: r.en, dictionary: ev.english.slice(0, 4).map((e) => e.text) });
    const noWord = x?.verdict === "not_a_word" || y?.verdict === "not_a_word";
    if (noWord && ev.kind === "none") { droppedRelated.push({ word: r.word, reason: "not_a_word" }); continue; }
    // Only a compound by its parts, a check says no word, and the corpus never has it: three
    // signs, no dictionary against them (2026-11-09: 11 of 14 such words were wrong; fartgräns,
    // the real one, is in the corpus). No answer from Korp decides nothing.
    if (noWord && ev.kind === "compound" && relatedCorpus[i]?.ok === false && relatedCorpus[i].total === 0) { droppedRelated.push({ word: r.word, reason: "not_a_word_unattested" }); continue; }
    // No dictionary has it: shown, but open until other evidence (the corpus) settles it.
    if ((noWord && ev.kind !== "dictionary") || ev.kind === "none") open.push({ kind: "related_unverified", text: r.word, evidence: ev.kind, check: y?.verdict || null });
    if (x?.verdict === "not_related") {
      const own = stem(lemma).length >= 4 && (String(r.word).toLowerCase().includes(stem(lemma)) || stem(r.word).length >= 4 && String(lemma).toLowerCase().includes(stem(r.word)));
      if (!own) { droppedRelated.push({ word: r.word, reason: x.verdict }); continue; }
    }
    keptRelated.push(r);
  }
  card.related = keptRelated;

  const { foreign, badMeaning } = dropForeignScript(card);
  if (badMeaning.length) return { ok: false, reason: `foreign_script:${badMeaning.join(",")}`, usage };
  const unsure = check.verdict === "unsure";
  // The English meaning against the dictionaries' English equivalents, independently of the AI
  // check: no word in common, or no dictionary English at all, leaves the sense unconfirmed
  // rather than checked — the AI's judgement alone never makes it verified. detail.open marks it
  // for scripts/korp-verify.mjs, where corpus use can still verify it (2026-11-04).
  const english = !isPhrase && refs ? englishEquivalents(refs, pos) : [];
  const enReference = !english.length ? "none" : meaningSupport(card.meaning_en, english).length ? "lexin" : "unmatched";
  const detail = { check_version: CHECK_VERSION, verdict: check.verdict, other_pos_senses: check.other_pos_senses, unsupported_senses: check.unsupported_senses, dropped: [...dropped, ...misfits, ...ungrammatical], note: check.note, wiktionary: page.status, en_reference: enReference,
    ...(removedSenses.length ? { removed_senses: removedSenses } : {}), ...(ungrammatical.length ? { ungrammatical } : {}), ...(droppedCollocationExamples.length ? { dropped_collocation_examples: droppedCollocationExamples } : {}), ...(relatedMeaningNotes.length ? { related_meaning_notes: relatedMeaningNotes } : {}), ...(commonKept.length ? { common_combinations: commonKept } : {}),
    ...(droppedCollocations.length ? { dropped_collocations: droppedCollocations } : {}), ...(droppedRelated.length ? { dropped_related: droppedRelated } : {}), ...(foreign.length ? { foreign_script: foreign } : {}),
    ...(open.length ? { open_items: open } : {}) };
  const sources = ["ai_check", page.status === "found" && "sv-wiktionary", item.references.lexin && LEXIN_SV_SOURCE_ID].filter(Boolean).join("+");
  return {
    ok: true, result: card, pos: posCheck, usage,
    sense: unsure ? { status: "mismatch", source: "ai_check", detail }
      : enReference === "unmatched" ? { status: "present", source: `${sources};en_unmatched_lexin`, detail: { ...detail, open: "dictionary_english_differs" } }
      : enReference === "none" ? { status: "present", source: `${sources};no_dictionary_english`, detail: { ...detail, open: "no_dictionary_english" } }
      // Something kept although a check doubts it: not verified until it is looked at.
      : open.length ? { status: "present", source: `${sources};open_items`, detail: { ...detail, open: "content_unverified" } }
      : { status: "verified", source: sources, detail },
  };
}

// ---------------------------------------------------------------------------
// Example translations: written, then independently reviewed (2026-11-02)
// ---------------------------------------------------------------------------

const translationItem = {
  type: "object", additionalProperties: false,
  properties: { key: { type: "string" }, sv_start: { type: "string" }, zh: { type: "string" }, en: { type: "string" } },
  required: ["key", "sv_start", "zh", "en"],
};
const reviewItem = {
  type: "object", additionalProperties: false,
  properties: {
    key: { type: "string" }, sv_start: { type: "string" },
    zh_faithful: { type: "boolean" }, en_faithful: { type: "boolean" },
    problems: { type: "array", items: { type: "string" } },
  },
  required: ["key", "sv_start", "zh_faithful", "en_faithful", "problems"],
};
const TRANSLATE_SYSTEM = `You translate example sentences of a Swedish learner's dictionary. Each item has a key, the headword with its part of speech (it tells you which sense the sentence uses) and the Swedish text (one or more sentences). For each item give zh = the whole text in natural Simplified Chinese and en = the whole text in natural English. Translate every sentence and every content word; add nothing that isn't in the Swedish (no invented time, place, reason or detail); keep each pronoun's person and gender (hon = 她 / she, han = 他 / he, hen = 他/她 / they, de = 他们 / they, vi = 我们 / we, man = 人们 or a natural impersonal phrasing / one, you). Echo each key and sv_start = the first three words of its Swedish text exactly. If problems from an earlier attempt are listed, avoid them.`;
const REVIEW_SYSTEM = `You review translations of Swedish dictionary example sentences, strictly. For each item compare the Swedish with the Chinese (zh) and the English (en) word by word. zh_faithful / en_faithful = true only if the translation renders the whole Swedish text with the same meaning: no sentence or content word left out, nothing added that isn't in the Swedish, pronouns with the same person and gender (hon = 她, han = 他), tense and negation kept, the headword in the right sense; zh in Simplified Chinese. Natural rephrasing is fine. problems = short descriptions of what is wrong (empty when both are faithful). Echo each key and sv_start = the first three words of its Swedish text exactly. Don't rewrite anything.`;

/**
 * Example translations made and checked: one call writes zh/en for each item, a second,
 * independent call reviews them against the Swedish, and program checks (pronouns,
 * traditional characters, fragment length) run on both. An item passing everything is
 * `accepted`; one that doesn't is written again once with the problems named, reviewed
 * again, and otherwise reported in `rejected` with the reasons — never written.
 *   items: [{ id, headword, pos, sv }]   → { accepted: Map(id → {zh, en}), rejected: Map(id → problems), usage }
 */
export async function checkedTranslations(supabaseAdmin, items, { feature = "example_translation", chunk = 15 } = {}) {
  const usage = { input_tokens: 0, output_tokens: 0, calls: 0, cost: 0, failed_calls: 0 };
  const call = async (schemaName, system, schema, payload, perItem) => {
    const { result, usage: u } = await callOpenAIJson({
      schemaName, system, user: JSON.stringify(payload), maxOutputTokens: 800 + perItem * payload.length,
      schema: { type: "object", additionalProperties: false, properties: { items: { type: "array", items: schema } }, required: ["items"] },
    });
    const cost = ((u.input_tokens || 0) * 0.75 + (u.output_tokens || 0) * 4.5) / 1e6;
    usage.input_tokens += u.input_tokens || 0; usage.output_tokens += u.output_tokens || 0; usage.calls += 1; usage.cost += cost;
    if (supabaseAdmin) await logUsage(supabaseAdmin, { feature, model: MODEL, inputTokens: u.input_tokens, outputTokens: u.output_tokens, cost });
    return result.items || [];
  };
  const accepted = new Map();
  const rejected = new Map();
  const keyed = items.map((item, n) => ({ ...item, key: `t${n + 1}` }));
  const programProblems = (sv, zh, en) => {
    const p = [];
    if (!zh) p.push("zh_empty");
    if (!en) p.push("en_empty");
    for (const f of translationFlags({ sv, zh, en })) p.push(f);
    return p;
  };
  for (let i = 0; i < keyed.length; i += chunk) {
    let group = keyed.slice(i, i + chunk);
    const notes = new Map();
    for (let attempt = 1; attempt <= 2 && group.length; attempt += 1) {
      let drafts = [];
      let reviews = [];
      try {
        drafts = await call("example_translation", TRANSLATE_SYSTEM, translationItem,
          group.map((g) => ({ key: g.key, headword: g.headword, pos: g.pos, sv: g.sv, ...(notes.get(g.key) ? { problems_before: notes.get(g.key) } : {}) })), 220);
        const usable = group.map((g) => ({ g, d: drafts.filter((d) => d.key === g.key) })).filter(({ g, d }) => d.length === 1 && startsAlike(d[0].sv_start, g.sv));
        reviews = usable.length ? await call("translation_review", REVIEW_SYSTEM, reviewItem,
          usable.map(({ g, d }) => ({ key: g.key, headword: g.headword, sv: g.sv, zh: d[0].zh, en: d[0].en })), 120) : [];
      } catch (error) {
        usage.failed_calls += 1;
        group.forEach((g) => notes.set(g.key, [`call_failed:${error.message}`]));
      }
      const again = [];
      for (const g of group) {
        const d = drafts.filter((x) => x.key === g.key);
        const r = reviews.filter((x) => x.key === g.key);
        const problems = [];
        if (d.length !== 1) problems.push(d.length ? "duplicate_draft" : "draft_missing");
        else if (!startsAlike(d[0].sv_start, g.sv)) problems.push("draft_echo");
        else problems.push(...programProblems(g.sv, d[0].zh.trim(), d[0].en.trim()));
        if (!problems.length) {
          if (r.length !== 1 || !startsAlike(r[0].sv_start, g.sv)) problems.push("review_missing");
          else if (!r[0].zh_faithful || !r[0].en_faithful) problems.push(...(r[0].problems.length ? r[0].problems : ["review_not_faithful"]));
        }
        if (!problems.length) accepted.set(g.id, { zh: d[0].zh.trim(), en: d[0].en.trim() });
        else if (attempt === 2) rejected.set(g.id, [...(notes.get(g.key) || []), ...problems]);
        else { notes.set(g.key, problems); again.push(g); }
      }
      group = again;
    }
  }
  return { accepted, rejected, usage };
}

// ---------------------------------------------------------------------------
// The other explanation language of an expression entry (2026-11-02)
// ---------------------------------------------------------------------------

const otherMeaningItem = {
  type: "object", additionalProperties: false,
  properties: { key: { type: "string" }, expression: { type: "string" }, meaning: { type: "string" } },
  required: ["key", "expression", "meaning"],
};

/**
 * Fills the missing explanation-language row of expression entries found while reading
 * (they were saved in the reader's language only, so readers of the other language saw
 * no meaning): the meaning in one batched call (echo-checked), the example sentence with
 * checkedTranslations (written, reviewed, program-checked). A row is written only when
 * both pass. Returns { filled: [ids], failed: Map(id → problems), usage }.
 *   items: [{ id, expression, meaning, meaningLanguage, sentence }]
 */
export async function fillExpressionLanguage(supabaseAdmin, items, { write = true } = {}) {
  const filled = [];
  const failed = new Map();
  const usage = { input_tokens: 0, output_tokens: 0, calls: 0, cost: 0 };
  const byTarget = { zh: items.filter((i) => i.meaningLanguage === "en"), en: items.filter((i) => i.meaningLanguage === "zh") };
  for (const [lang, group] of Object.entries(byTarget)) {
    if (!group.length) continue;
    const keyed = group.map((g, n) => ({ ...g, key: `m${n + 1}` }));
    const { result, usage: u } = await callOpenAIJson({
      schemaName: "expression_meaning",
      schema: { type: "object", additionalProperties: false, properties: { items: { type: "array", items: otherMeaningItem } }, required: ["items"] },
      system: `You write the ${lang === "zh" ? "Simplified Chinese" : "English"} meaning of Swedish expressions for a learner's dictionary: short, in the style of the given meaning in the other language, for the sense the example sentence uses. Echo each key and the expression exactly.`,
      user: JSON.stringify(keyed.map((k) => ({ key: k.key, expression: k.expression, meaning_given: k.meaning, sentence: k.sentence }))),
      maxOutputTokens: 400 + 80 * keyed.length,
    });
    const cost = ((u.input_tokens || 0) * 0.75 + (u.output_tokens || 0) * 4.5) / 1e6;
    usage.input_tokens += u.input_tokens || 0; usage.output_tokens += u.output_tokens || 0; usage.calls += 1; usage.cost += cost;
    if (supabaseAdmin && write) await logUsage(supabaseAdmin, { feature: "expression_language", model: MODEL, inputTokens: u.input_tokens, outputTokens: u.output_tokens, cost });
    const examples = await checkedTranslations(write ? supabaseAdmin : null, keyed.filter((k) => k.sentence).map((k) => ({ id: k.id, headword: k.expression, pos: "phrase", sv: k.sentence })), { feature: "expression_language" });
    usage.input_tokens += examples.usage.input_tokens; usage.output_tokens += examples.usage.output_tokens; usage.calls += examples.usage.calls; usage.cost += examples.usage.cost;
    for (const k of keyed) {
      const answers = (result.items || []).filter((x) => x.key === k.key);
      const meaning = answers.length === 1 && norm(answers[0].expression).join(" ") === norm(k.expression).join(" ") ? answers[0].meaning.trim() : "";
      const example = k.sentence ? examples.accepted.get(k.id)?.[lang] : "";
      const problems = [];
      if (!meaning) problems.push("meaning_missing_or_misplaced");
      if (lang === "zh" && TRADITIONAL.test(meaning)) problems.push("meaning_traditional");
      if (k.sentence && !example) problems.push(...(examples.rejected.get(k.id) || ["example_missing"]));
      if (problems.length) { failed.set(k.id, problems); continue; }
      if (write && supabaseAdmin) {
        const { error } = await supabaseAdmin.from("learning_object_translations").upsert(
          { learning_object_id: k.id, native_language: lang, meaning, example_translation: example || null, updated_at: new Date().toISOString() },
          { onConflict: "learning_object_id,native_language" });
        if (error) { failed.set(k.id, [`write_failed:${error.message}`]); continue; }
      }
      filled.push(k.id);
    }
  }
  return { filled, failed, usage };
}

// ---------------------------------------------------------------------------
// A new card's collocations and noun grammar (2026-11-02)
// ---------------------------------------------------------------------------

// An open slot. A reflexive (sig, sin …) is not one: "vänja sig vid" and "vänja någon vid" differ.
const PLACEHOLDER = /^(någon|något|någons)$/;
// Words, with an ellipsis kept as a word of its own ("så … att" is not "så att").
const phraseWords = (s) => String(s || "").toLowerCase().replace(/\.{2,}|…/g, " … ").replace(/[^\p{L}\p{N}\s…]/gu, " ").split(/\s+/).filter(Boolean);

/**
 * Two phrases that are the same learning point: equal word for word, or differing only in
 * inflection ("minska koldioxidutsläppen" / "minska koldioxidutsläpp": the shorter word is
 * the longer one less at most three letters at the end) or in an open slot (någon / något;
 * a reflexive "sig" is not a slot).
 * Different words that share a beginning ("kaninbur" / "kaninunge") are not.
 */
export function sameLearningPoint(a, b) {
  const x = phraseWords(a), y = phraseWords(b);
  if (!x.length || x.length !== y.length) return false;
  return x.every((w, i) => {
    const v = y[i];
    if (w === v || (PLACEHOLDER.test(w) && PLACEHOLDER.test(v))) return true;
    const [s, l] = w.length <= v.length ? [w, v] : [v, w];
    const base = s.length > 4 && /[aeo]$/.test(s) ? s.slice(0, -1) : s;
    return base.length >= 4 && l.startsWith(base) && l.length - base.length <= 3;
  });
}

/**
 * Whether two meanings say about the same thing: Chinese by shared character pairs, other
 * text by shared words (Jaccard ≥ 0.6). "减少二氧化碳排放" twice is; "今年秋天" (i höst) /
 * "去年秋天" (i höstas) and "只要" / "再见" (så länge / så länge!) are not. Unknown (an empty
 * meaning) counts as similar.
 */
export function similarMeaning(a, b) {
  const units = (s) => {
    const t = String(s || "").toLowerCase();
    if (!/\p{Script=Han}/u.test(t)) return new Set(t.match(/\p{L}+/gu) || []);
    const out = new Set();
    for (const run of t.match(/\p{Script=Han}+/gu) || []) {
      if (run.length === 1) out.add(run);
      for (let i = 0; i + 1 < run.length; i++) out.add(run.slice(i, i + 2));
    }
    return out;
  };
  const x = units(a), y = units(b);
  if (!x.size || !y.size) return true;
  const shared = [...x].filter((u) => y.has(u)).length;
  return shared / (x.size + y.size - shared) >= 0.6;
}

/** Two phrases that differ only in an open slot (hata någon / hata något). */
export function slotVariant(a, b) {
  const x = phraseWords(a), y = phraseWords(b);
  return x.length > 0 && x.length === y.length && x.some((w, i) => w !== y[i])
    && x.every((w, i) => w === y[i] || (PLACEHOLDER.test(w) && PLACEHOLDER.test(y[i])));
}

/** The same learning point said twice: same words up to form or slot, and (unless only the slot differs) the same meaning. */
export function duplicateCollocation(a, b, langs = ["zh", "en"]) {
  if (!sameLearningPoint(a.phrase, b.phrase)) return false;
  return slotVariant(a.phrase, b.phrase) || langs.every((l) => similarMeaning(a[l], b[l]));
}

/**
 * The collocations a card keeps: complete (a meaning in every explanation language and a
 * Swedish example), and each learning point once — a second one that is only another form
 * or slot of a kept one is dropped. Returns { kept, dropped: [{ phrase, reason }] }.
 */
export function cleanCollocations(list, langs = ["zh", "en"]) {
  const kept = [];
  const dropped = [];
  for (const c of list || []) {
    const phrase = String(c?.phrase || "").trim();
    if (!phrase) continue;
    if (langs.some((l) => !String(c[l] || "").trim()) || !String(c.example || "").trim()) { dropped.push({ phrase, reason: "incomplete" }); continue; }
    const twin = kept.find((k) => duplicateCollocation(k, { ...c, phrase }, langs));
    if (twin) { dropped.push({ phrase, reason: `duplicate_of:${twin.phrase}` }); continue; }
    kept.push({ ...c, phrase });
  }
  return { kept, dropped };
}

const COUNTABILITY = ["countable", "uncountable", "both"];

/**
 * A new noun's gender label and countability. SALDO's zero-plural paradigm is a firm
 * "uncountable"; otherwise the model's judgment (it can say "both" — a mass sense and a
 * countable one — which SALDO can't), recorded as unconfirmed by the caller. The gender
 * label is "en-ord" / "ett-ord" from the genus form, never the model's free text.
 */
export function nounGrammar({ saldoCountability = null, lexinCountability = null, aiCountability = "", forms = [], aiPosDetail = "" }) {
  const genus = (forms.find((f) => f.type === "genus")?.value || "").toLowerCase();
  const fromAi = String(aiPosDetail || "").toLowerCase().trim();
  const posDetail = genus === "en" || genus === "ett" ? `${genus}-ord` : (["en-ord", "ett-ord"].includes(fromAi) ? fromAi : "");
  if (saldoCountability === "uncountable") return { countability: "uncountable", countabilitySource: "saldo", posDetail };
  // Lexin giving no plural ("kärlek: –") is a lexicographer's statement too — unless the model
  // saw a countable sense next to the mass one ("both"), which Lexin's single entry can hide.
  if (lexinCountability === "uncountable" && aiCountability !== "both") return { countability: "uncountable", countabilitySource: "lexin", posDetail };
  if (lexinCountability === "uncountable") return { countability: "both", countabilitySource: "ai+lexin", posDetail };
  return { countability: COUNTABILITY.includes(aiCountability) ? aiCountability : null, countabilitySource: COUNTABILITY.includes(aiCountability) ? "ai" : null, posDetail };
}
