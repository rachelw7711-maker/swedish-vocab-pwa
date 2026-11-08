// Dictionaries next to SALDO (2026-11-03): what Lexin (Isof, CC BY 4.0) — the Swedish
// monolingual dictionary (4th version, 2020) and the Swedish–English one — say about a
// headword: its parts of speech, senses (definitions, English equivalents), forms, whether a
// noun has a plural, constructions ("ngn drömmer om ngt") and idioms. Scripts may also load
// Folkets lexikon (KTH, built on Lexin) and the English Wiktionary's Swedish entries
// (kaikki.org); both are CC BY-SA and only ever used as evidence, never copied.
//
// Evidence counts per family, not per file: Lexin svenska, Lexin swe–eng and Folkets share
// one editorial base ("lexin"); sv.wiktionary and en.wiktionary are "wiktionary"; SALDO is
// its own. Two families agreeing is stronger than one, and one family repeated is still one.
//
// Data lives in public.reference_entries (scripts/load-references.mjs); scripts and tests can
// use the local indexes (scripts/build-reference-index.mjs) through useReferenceFiles().
import { readFileSync, existsSync } from "node:fs";
import { expressionMatchKey } from "./server-resources.mjs";

export const LEXIN_SV_SOURCE_ID = "lexin-sv-2020";
export const LEXIN_EN_SOURCE_ID = "lexin-sv-en";
export const FAMILY = { saldo: "saldo", lexin_sv: "lexin", lexin_en: "lexin", folkets: "lexin", enwikt: "wiktionary", svwikt: "wiktionary" };

const key = (s) => String(s || "").trim().toLowerCase();
const EMPTY = { lexin_sv: [], lexin_en: [], folkets: [], enwikt: [] };

// ---------------------------------------------------------------------------
// Data access
// ---------------------------------------------------------------------------
let files = null;

/** Loads the local indexes instead of the database (scripts, tests). extra adds Folkets and en.wiktionary. */
export async function useReferenceFiles(dir = "data/reference", { extra = false } = {}) {
  const read = (name) => (existsSync(`${dir}/${name}/index.json`) ? JSON.parse(readFileSync(`${dir}/${name}/index.json`, "utf8")) : {});
  files = { lexin_sv: read("lexin-sv"), lexin_en: read("lexin"), folkets: extra ? read("folkets") : {}, enwikt: extra ? read("enwiktionary") : {}, idioms: null };
  return Object.fromEntries(Object.entries(files).filter(([, v]) => v).map(([k, v]) => [k, Object.keys(v).length]));
}

export function referenceFilesLoaded() {
  return Boolean(files);
}

/** What the dictionaries have under this headword: { lexin_sv, lexin_en, folkets, enwikt } (lists of entries). */
export async function referenceEntries(supabaseAdmin, lemma) {
  const k = key(lemma);
  if (!k) return { ...EMPTY };
  if (files) return { lexin_sv: files.lexin_sv[k] || [], lexin_en: files.lexin_en[k] || [], folkets: files.folkets[k] || [], enwikt: files.enwikt[k] || [] };
  try {
    const { data, error } = await supabaseAdmin.from("reference_entries").select("source, data").eq("headword", k).in("source", [LEXIN_SV_SOURCE_ID, LEXIN_EN_SOURCE_ID]);
    if (error) return { ...EMPTY };   // reference table not there: nothing known
    return {
      ...EMPTY,
      lexin_sv: data.filter((r) => r.source === LEXIN_SV_SOURCE_ID).map((r) => r.data),
      lexin_en: data.filter((r) => r.source === LEXIN_EN_SOURCE_ID).map((r) => r.data),
    };
  } catch {
    return { ...EMPTY };
  }
}

// Optional parts of an idiom ("(tre dagar) i sträck") dropped, alternatives ("hamnar/kommer") → the first.
export function idiomSpellings(idiom) {
  const t = String(idiom || "").trim();
  return [...new Set([t.replace(/\([^)]*\)/g, " "), t.replace(/[()]/g, "")].map((s) => s.replace(/(\S+)\/\S+/g, "$1").replace(/\s+/g, " ").trim()).filter(Boolean))];
}

/** Every idiom of the dictionaries under its expression match key (built once, files only). */
async function idiomIndex() {
  if (files.idioms) return files.idioms;
  const index = new Map();
  const put = async (text, hit) => {
    for (const s of idiomSpellings(text)) {
      const k = await expressionMatchKey(null, s);
      (index.get(k) || index.set(k, []).get(k)).push(hit);
    }
  };
  for (const [headword, list] of Object.entries(files.lexin_sv)) for (const e of list) for (const x of e.lexemes) for (const [idiom, definition] of x.idioms) await put(idiom, { source: "lexin_sv", headword, idiom, definition });
  for (const [headword, list] of Object.entries(files.lexin_en)) for (const e of list) for (const [idiom, english] of e.idioms) await put(idiom, { source: "lexin_en", headword, idiom, english });
  for (const [headword, list] of Object.entries(files.folkets)) for (const e of list) for (const [idiom, english] of e.idioms) await put(idiom, { source: "folkets", headword, idiom, english });
  files.idioms = index;
  return index;
}

/**
 * Where the dictionaries list a multi-word expression: as a headword of its own (any source)
 * or as an idiom under another headword. [{ source, headword, idiom?, definition?, english? }]
 */
export async function expressionInReferences(supabaseAdmin, text) {
  const k = await expressionMatchKey(supabaseAdmin, text);
  const hits = [];
  const own = await referenceEntries(supabaseAdmin, text);
  for (const [source, list] of Object.entries(own)) if (list.length) hits.push({ source, headword: key(text) });
  if (files) {
    hits.push(...((await idiomIndex()).get(k) || []));
    return hits;
  }
  try {
    const { data } = await supabaseAdmin.from("reference_entries").select("source, data").eq("headword", k).like("source", "%:idiom");
    for (const r of data || []) hits.push({ source: r.source.startsWith(LEXIN_EN_SOURCE_ID) ? "lexin_en" : "lexin_sv", ...r.data });
  } catch { /* no table: no hits */ }
  return hits;
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------
// SpråkLab participle classes are adjectives (or verb forms) in the dictionaries.
const LOOKUP_POS = { presens_particip: ["adjective", "verb"], perfekt_particip: ["adjective", "verb"] };
const posMatches = (entryPos, pos) => (LOOKUP_POS[pos] || [pos]).includes(entryPos);

/** The parts of speech each dictionary gives the headword: { lexin_sv: [...], lexin_en, folkets, enwikt }. */
export function referencePos(refs) {
  return Object.fromEntries(Object.entries(refs).map(([source, list]) => [source, [...new Set(list.filter((e) => !e.formOf?.length || e.glosses?.length).map((e) => e.pos))]]));
}

/** The families whose dictionaries have this headword as this part of speech. */
export function posFamilies(refs, pos) {
  const out = new Set();
  for (const [source, list] of Object.entries(refs)) if (list.some((e) => posMatches(e.pos, pos) && (!e.formOf?.length || e.glosses?.length))) out.add(FAMILY[source]);
  return [...out];
}

const NO_FORM = /^[–—-]?$/;

/** Card forms Lexin svenska gives one entry: { forms: { type: value }, noPlural }. */
export function lexinForms(entry, pos) {
  const forms = {};
  let noPlural = false;
  for (const [type, value] of Object.entries(entry?.forms || {})) {
    if (NO_FORM.test(value)) { if (type === "plural_indefinite") noPlural = true; continue; }
    forms[type] = value;
    if (type === "plural_form" && (pos === "adjective" || LOOKUP_POS[pos])) forms.definite_form = value;   // the a-form is both
  }
  if (entry?.pos === "noun" && /plural/.test(entry.type || "")) noPlural = false;
  if (forms.superlative) forms.superlative_indefinite = forms.superlative;
  return { forms, noPlural };
}

// Variants ("lade el. la"), without an article or Lexin's colon after an abbreviation ("sms:et").
const variants = (v) => String(v || "").split(/\s*(?:\/|,|\bel\.|\beller\b)\s*/).map((s) => key(s).replace(/^(en|ett) /, "").replace(/:/g, "")).filter(Boolean);

/**
 * Stored forms checked against Lexin svenska, for a word SALDO doesn't have:
 * { found, fields: { "form:<type>": { status, stored, reference } } } — verified / mismatch;
 * a plural Lexin leaves out ("–") is "present" (the noun may be used countably too).
 */
export function compareWithLexin(entry, refs) {
  const rows = (refs.lexin_sv || []).filter((e) => posMatches(e.pos, entry.pos));
  if (!rows.length) return { found: false, fields: {} };
  const fields = {};
  const candidates = rows.map((r) => lexinForms(r, entry.pos));
  for (const [type, stored] of Object.entries(entry.forms || {})) {
    if (!String(stored || "").trim()) continue;
    const refsFor = candidates.map((c) => c.forms[type]).filter(Boolean);
    if (!refsFor.length) {
      if (/^plural_/.test(type) && candidates.every((c) => c.noPlural)) fields[`form:${type}`] = { status: "present", stored, reference: "–" };
      continue;
    }
    const ok = refsFor.some((r) => variants(stored).some((s) => variants(r).includes(s)));
    fields[`form:${type}`] = { status: ok ? "verified" : "mismatch", stored, reference: refsFor[0] };
  }
  return { found: true, fields };
}

/** Whether Lexin svenska gives the noun no plural ("kärlek: –"): "uncountable", "countable" (a plural), or null. */
export function lexinCountability(refs) {
  const nouns = (refs.lexin_sv || []).filter((e) => e.pos === "noun");
  if (!nouns.length) return null;
  const none = nouns.map((e) => lexinForms(e, "noun").noPlural);
  return none.every(Boolean) ? "uncountable" : none.some(Boolean) ? null : "countable";
}

const GLOSS_STOP = new Set(["a", "an", "the", "to", "of", "and", "or", "in", "on", "at", "for", "with", "by", "be", "is", "sb", "sth", "someone", "something", "somebody", "one", "one's", "oneself", "etc", "us", "uk", "e", "g", "eg", "ie", "used", "especially", "often", "very", "kind", "type", "sort", "person", "thing", "make", "get", "have", "do", "go", "take", "put", "give", "become", "who", "which", "that", "as", "from", "not", "its"]);
const glossWords = (s) => key(s).replace(/\([^)]*\)|\[[^\]]*\]/g, " ").replace(/[^\p{L}\p{N}' -]/gu, " ").split(/[\s-]+/).map((w) => w.replace(/'s$/, "")).filter((w) => w.length > 1 && !GLOSS_STOP.has(w));
// A light English stem so "drought"/"droughts", "carry"/"carries"/"carried", "establish"/
// "establishment" and British / American spellings ("honourable"/"honorable") meet.
const stem = (w) => w.replace(/our/g, "or").replace(/is(e|ed|es|ing|ation)$/, "iz$1").replace(/ment$/, "").replace(/(ies|ied)$/, "y").replace(/(ing|ed|es|s)$/, "").replace(/(.)\1$/, "$1");
// A meaning made only of words the stop list drops ("not", "often", "give", "become") is
// compared by those words; "motor boat" and "motorboat" by their letters run together.
const ARTICLES = new Set(["a", "an", "the", "to"]);
const plainWords = (s) => key(s).replace(/\([^)]*\)|\[[^\]]*\]/g, " ").replace(/[^\p{L}\p{N}' -]/gu, " ").split(/[\s-]+/).filter((w) => w && !ARTICLES.has(w));
const compact = (s) => plainWords(s).join("");

/** English equivalents the dictionaries give for this part of speech: [{ source, text }]. */
export function englishEquivalents(refs, pos) {
  const out = [];
  for (const e of refs.lexin_en || []) if (posMatches(e.pos, pos)) for (const t of e.english) out.push({ source: "lexin_en", text: t });
  for (const e of refs.folkets || []) if (posMatches(e.pos, pos)) for (const t of e.english) out.push({ source: "folkets", text: t });
  for (const e of refs.enwikt || []) if (posMatches(e.pos, pos)) for (const t of e.glosses || []) out.push({ source: "enwikt", text: t });
  return out;
}

/**
 * The equivalents an English meaning agrees with: a content word in common (after a light
 * stem), so "car; automobile" meets Lexin's "car" and Wiktionary's "an automobile, car".
 */
export function meaningSupport(meaningEn, equivalents) {
  const content = glossWords(meaningEn);
  const ours = new Set(content.map(stem)), oursPlain = new Set(plainWords(meaningEn).map(stem));
  if (!oursPlain.size) return [];
  const segments = new Set(String(meaningEn || "").split(/[;,/]/).map(compact).filter((s) => s.length > 3));
  return equivalents.filter((e) => {
    const theirs = glossWords(e.text);
    // Either side only stop-list words: compare all their words.
    const [mine, words] = theirs.length && content.length ? [ours, theirs] : [oursPlain, plainWords(e.text)];
    return words.some((w) => mine.has(stem(w))) || String(e.text).split(/[;,/]/).some((t) => segments.has(compact(t)));
  });
}

/**
 * A transparent compound's meaning from its parts (2026-11-04): språkkurs = språk + kurs, and
 * "language course" says both — "course" is an English equivalent of kurs, "language" of språk.
 * Every part of the meaning (split at ";") must carry a word from the head's equivalents and
 * another word from the first part's (or the first part itself, a loan kept in English:
 * yogastudio → "yoga studio"). A compound whose meaning is not its parts' (jordgubbe,
 * "strawberry") does not pass: its sense needs other evidence.
 */
export function compoundMeaningSupport(meaningEn, { first, firstEquivalents, headEquivalents }) {
  const parts = String(meaningEn || "").split(";").map((x) => x.trim()).filter(Boolean);
  const words = (texts) => new Set(texts.flatMap((t) => glossWords(t).map(stem)));
  const head = words(headEquivalents.map((e) => e.text)), firstSet = words(firstEquivalents.map((e) => e.text));
  const loan = stem(key(first).replace(/s$/, ""));
  return parts.length > 0 && parts.every((part) => {
    const mine = glossWords(part).map(stem);
    const h = mine.filter((w) => head.has(w));
    const f = mine.filter((w) => firstSet.has(w) || w === loan || w === stem(key(first)));
    return h.some((x) => f.some((y) => y !== x));
  });
}

/**
 * A noun spelled like another noun of the other gender (lag: ett lag "team", en lag "law", en lag
 * "brine"), as Lexin keeps them apart: the English equivalents of the card's own word and of the
 * others, by the card's gender (2026-11-09: a card for ett lag held both other words' senses, and
 * both AI checks called every one "matches the reference" — Lexin has them, under other words).
 * null when the card's gender or Lexin's homographs don't tell.
 */
export function homographEquivalents(refs, cardForms = []) {
  const gender = (def) => (/t$/.test(def) ? "n" : /n$/.test(def) ? "u" : null);
  const value = (t) => String((cardForms || []).find((f) => f.type === t)?.value || "").trim().toLowerCase();
  const indef = value("singular_indefinite");
  const own = /^ett\s/.test(indef) ? "n" : /^en\s/.test(indef) ? "u" : gender(value("singular_definite"));
  if (!own) return null;
  const nouns = (refs?.lexin_sv || []).filter((e) => e.pos === "noun");
  const genders = nouns.map((e) => gender(String(e.forms?.singular_definite || "").trim().toLowerCase()));
  if (!genders.includes(own) || !genders.some((g) => g && g !== own)) return null;
  const english = (refs.lexin_en || []).filter((e) => e.pos === "noun");
  const eq = (keep) => nouns.filter((_, i) => keep(genders[i])).flatMap((e) => e.lexemes.flatMap((x) => english.filter((y) => (x.variant && y.variant === x.variant) || key(y.definition) === key(x.definition)).flatMap((y) => y.english))).map((text) => ({ source: "lexin_en", text }));
  return { gender: own, own: eq((g) => g === own), other: eq((g) => g && g !== own) };
}

/** Lexin's senses of the headword in this part of speech, short, for a prompt or an AI check. */
export function lexinSenses(refs, pos, { limit = 6 } = {}) {
  const english = (refs.lexin_en || []).filter((e) => posMatches(e.pos, pos));
  const senses = [];
  for (const e of (refs.lexin_sv || []).filter((x) => posMatches(x.pos, pos))) {
    for (const x of e.lexemes) {
      if (!x.definition) continue;
      // The two Lexin dictionaries share sense ids (VariantID).
      const en = english.find((y) => (x.variant && y.variant === x.variant) || key(y.definition) === key(x.definition))?.english || [];
      senses.push({ definition: x.definition, ...(en.length ? { english: en.slice(0, 4) } : {}), ...(x.constructions.length ? { constructions: x.constructions.slice(0, 2) } : {}) });
    }
  }
  if (!senses.length) for (const e of english) senses.push({ definition: e.definition, english: e.english.slice(0, 4) });
  return senses.slice(0, limit);
}

/** Reference text for the word-card generation prompt (Lexin's senses, plural, constructions). */
export function lexinPromptLine(refs, pos) {
  const senses = lexinSenses(refs, pos);
  if (!senses.length) return "";
  const list = senses.map((s, i) => `${i + 1}. ${s.definition}${s.english ? ` (en: ${s.english.join(", ")})` : ""}${s.constructions ? ` [${s.constructions.join("; ")}]` : ""}`).join(" ");
  const plural = pos === "noun" && lexinCountability(refs) === "uncountable" ? " Lexin gives this noun no plural." : "";
  return `Reference (Lexin, Isof): senses of this ${pos}: ${list}.${plural} Cover these senses (the common ones first); don't add senses of other parts of speech.`;
}

/**
 * A collocation's fixed word supported by Lexin: a construction of the headword naming the same
 * preposition or particle ("ngn drömmer om ngt" for "drömma om"), or an idiom/example containing it.
 */
export function collocationInLexin(refs, phrase, headwordForms = []) {
  const words = key(phrase).replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const forms = new Set(headwordForms.map(key));
  const others = words.filter((w) => !forms.has(w) && !/^(någon|något|ngn|ngt|sig|en|ett|att)$/.test(w));
  if (!others.length) return [];
  const hits = [];
  const has = (t) => { const ws = new Set(key(t).replace(/[^\p{L}\s]/gu, " ").split(/\s+/)); return others.every((w) => ws.has(w)); };
  for (const e of refs.lexin_sv || []) for (const x of e.lexemes) {
    for (const c of x.constructions) if (has(c)) hits.push({ source: "lexin_sv", kind: "construction", text: c });
    for (const [i] of x.idioms) if (has(i)) hits.push({ source: "lexin_sv", kind: "idiom", text: i });
    for (const ex of x.examples) if (has(ex)) hits.push({ source: "lexin_sv", kind: "example", text: ex });
  }
  for (const e of refs.lexin_en || []) {
    for (const c of e.constructions) if (has(c)) hits.push({ source: "lexin_en", kind: "construction", text: c });
    for (const [i] of e.idioms) if (has(i)) hits.push({ source: "lexin_en", kind: "idiom", text: i });
  }
  return hits;
}
