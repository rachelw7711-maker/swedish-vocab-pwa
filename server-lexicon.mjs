// Local dictionary reference layer (2026-10-31): SALDO's morphology (Språkbanken
// Text, CC BY 4.0, version 2017-09-19) — headwords, part of speech and the forms a
// word card shows. Used to (a) find a lemma before deciding a word is new,
// (b) give the word-card generation reliable forms instead of letting the model
// guess, and (c) check stored forms field by field. A word SALDO doesn't have is
// never treated as wrong — it just stays unverified.
//
// Data lives in public.saldo_lemmas / public.saldo_wordforms (loaded from
// scripts/build-saldo-index.mjs output). Scripts can instead use the local index
// files through useSaldoFiles().
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

export const SALDO_SOURCE_ID = "saldo-morphology-2017";

// Fields SALDO can check but must not fill on its own: it inflects every
// adjective with -are/-ast, also those compared with mer/mest.
export const SALDO_CHECK_ONLY = new Set(["form:comparative", "form:superlative", "form:superlative_indefinite", "form:superlative_definite"]);

// SALDO part of speech → SpråkLab part_of_speech. Adjectival participles are "av"
// in SALDO, so SpråkLab's participle classes look them up as adjectives.
const POS_FROM_SALDO = { nn: "noun", vb: "verb", av: "adjective", ab: "adverb", pn: "pronoun", pp: "preposition", kn: "conjunction", sn: "conjunction", in: "interjection", nl: "numeral" };
const SALDO_FOR_POS = {
  noun: ["nn"], verb: ["vb"], adjective: ["av"], adverb: ["ab"], pronoun: ["pn"], preposition: ["pp"],
  conjunction: ["kn", "sn"], interjection: ["in"], numeral: ["nl"], presens_particip: ["av"], perfekt_particip: ["av"],
};
// Multi-word SALDO entries (ta hand om, i princip …) for expression lookups.
const MULTIWORD_POS = new Set(["vbm", "nnm", "avm", "abm", "ppm", "knm", "snm", "inm", "pnm"]);

const FORM_FROM_MSD = {
  noun: { singular_indefinite: "sg indef nom", singular_definite: "sg def nom", plural_indefinite: "pl indef nom", plural_definite: "pl def nom" },
  verb: { infinitive: "inf aktiv", present: "pres ind aktiv", preteritum: "pret ind aktiv", supinum: "sup aktiv", imperative: "imper", present_participle: "pres_part nom", perfect_participle: "pret_part indef sg u nom" },
  adjective: { base_form: "pos indef sg u nom", neuter_form: "pos indef sg n nom", plural_form: "pos indef pl nom", definite_form: "pos def sg no_masc nom", comparative: "komp nom", superlative_indefinite: "super indef nom", superlative_definite: "super def no_masc nom" },
  adverb: { base_form: "pos", comparative: "komp", superlative: "super" },
};

const key = (s) => String(s || "").trim().toLowerCase();

// ---------------------------------------------------------------------------
// Data access: the database in the server, or the local index in scripts/tests.
// ---------------------------------------------------------------------------
let fileIndex = null;

/** Loads the local index files (scripts and tests) instead of the database tables. */
export async function useSaldoFiles(dir = "data/reference/saldo") {
  const byLemma = new Map(), byLemgram = new Map(), byForm = new Map();
  for await (const line of createInterface({ input: createReadStream(`${dir}/saldo-lemmas.ndjson`, "utf8") })) {
    const e = JSON.parse(line);
    if (e.p.startsWith("pm")) continue;
    const row = { lemgram: e.n, baseform: e.l, pos: e.p, paradigm: e.g, forms: e.f };
    byLemgram.set(e.n, row);
    (byLemma.get(key(e.l)) ?? byLemma.set(key(e.l), []).get(key(e.l))).push(row);
  }
  const byId = new Map();
  for await (const line of createInterface({ input: createReadStream(`${dir}/saldo-lemmas.tsv`, "utf8") })) {
    const [id, lemgram] = line.split("\t", 2);
    byId.set(id, lemgram);
  }
  for await (const line of createInterface({ input: createReadStream(`${dir}/saldo-wordforms.tsv`, "utf8") })) {
    const [form, id] = line.split("\t");
    const lemgram = byId.get(id);
    if (!lemgram || !byLemgram.has(lemgram)) continue;
    (byForm.get(form) ?? byForm.set(form, []).get(form)).push(lemgram);
  }
  fileIndex = { byLemma, byLemgram, byForm };
  return { lemgrams: byLemgram.size, forms: byForm.size };
}

async function rowsForLemmas(supabaseAdmin, lemmas) {
  const keys = [...new Set(lemmas.map(key).filter(Boolean))];
  if (!keys.length) return [];
  if (fileIndex) return keys.flatMap((k) => fileIndex.byLemma.get(k) || []);
  const { data, error } = await supabaseAdmin.from("saldo_lemmas").select("lemgram, baseform, pos, paradigm, forms").in("baseform_key", keys);
  if (error) return [];   // reference layer unavailable: callers fall back to unverified
  return data || [];
}

async function lemgramsForForms(supabaseAdmin, forms) {
  const keys = [...new Set(forms.map(key).filter(Boolean))];
  if (!keys.length) return [];
  if (fileIndex) return keys.flatMap((k) => (fileIndex.byForm.get(k) || []).map((lemgram) => fileIndex.byLemgram.get(lemgram)));
  const { data, error } = await supabaseAdmin.from("saldo_wordforms").select("saldo_lemmas(lemgram, baseform, pos, paradigm, forms)").in("form", keys);
  if (error) return [];
  return (data || []).map((r) => r.saldo_lemmas).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

/** SALDO entries for this headword, as this SpråkLab part of speech (any when pos is null). */
export async function saldoEntries(supabaseAdmin, lemma, pos = null) {
  const rows = await rowsForLemmas(supabaseAdmin, [lemma]);
  const wanted = pos ? SALDO_FOR_POS[pos] || [] : null;
  return rows.filter((r) => key(r.baseform) === key(lemma) && (!wanted || wanted.includes(r.pos)));
}

const PARTICLES = new Set(["upp", "ut", "av", "om", "in", "på", "till", "fram", "bort", "ner", "över", "igenom", "undan", "åt", "efter", "ihop", "isär", "tillbaka", "loss", "med", "emot", "förbi", "runt", "iväg", "under"]);

/**
 * Ett form and plural of a verb's perfect participle ("skriven" → skrivet, skrivna), from
 * SALDO's own forms for that verb; a particle verb takes its base verb's forms with the
 * particle in front (växa upp: uppvuxen → uppvuxet, uppvuxna). Null unless SALDO gives
 * exactly this participle and one ett form and one plural — nothing is derived.
 */
export async function perfectParticipleDeclension(supabaseAdmin, verb, participle) {
  const words = String(verb || "").trim().toLowerCase().split(/\s+/);
  const prefix = words.length === 1 ? "" : words.length === 2 && PARTICLES.has(words[1]) ? words[1] : null;
  if (prefix === null || !participle) return null;
  for (const row of await saldoEntries(supabaseAdmin, words[0], "verb")) {
    const [u, n, p] = ["pret_part indef sg u nom", "pret_part indef sg n nom", "pret_part indef pl nom"].map((m) => row.forms?.[m] || []);
    if (u.length === 1 && prefix + u[0] === key(participle) && n.length === 1 && p.length === 1) {
      return { ett: prefix + n[0], plural: prefix + p[0] };
    }
  }
  return null;
}

/** Possible { lemma, pos } for a word as it appears in text ("utvecklade" → utveckla/verb). */
export async function lemmatize(supabaseAdmin, token) {
  const rows = await lemgramsForForms(supabaseAdmin, [token]);
  const seen = new Set();
  return rows.filter((r) => POS_FROM_SALDO[r.pos]).map((r) => ({ lemma: r.baseform, pos: POS_FROM_SALDO[r.pos] }))
    .filter((c) => !seen.has(`${c.lemma}|${c.pos}`) && seen.add(`${c.lemma}|${c.pos}`));
}

/**
 * Every reading SALDO gives each word of a text, in one query: "torka" → torka/noun and
 * torka/verb, "torkar" → tork/noun and torka/verb. Map of form → [{ lemma, pos }].
 */
export async function formReadings(supabaseAdmin, forms) {
  const keys = [...new Set(forms.map(key).filter(Boolean))];
  const readings = new Map(keys.map((k) => [k, []]));
  const add = (form, row) => {
    const pos = POS_FROM_SALDO[row?.pos];
    const list = readings.get(form);
    if (pos && list && !list.some((r) => r.lemma === row.baseform && r.pos === pos)) list.push({ lemma: row.baseform, pos });
  };
  if (fileIndex) {
    for (const k of keys) for (const lemgram of fileIndex.byForm.get(k) || []) add(k, fileIndex.byLemgram.get(lemgram));
    return readings;
  }
  for (let i = 0; i < keys.length; i += 200) {
    const { data, error } = await supabaseAdmin.from("saldo_wordforms").select("form, saldo_lemmas(baseform, pos)").in("form", keys.slice(i, i + 200));
    if (error) return readings;   // reference layer unavailable: no readings known
    for (const r of data || []) add(r.form, r.saldo_lemmas);
  }
  return readings;
}

/** The parts of speech SALDO has for a headword. */
export async function saldoPartsOfSpeech(supabaseAdmin, lemma) {
  const rows = await rowsForLemmas(supabaseAdmin, [lemma]);
  return [...new Set(rows.filter((r) => key(r.baseform) === key(lemma)).map((r) => POS_FROM_SALDO[r.pos]).filter(Boolean))];
}

/** Whether SALDO lists this multi-word expression (in any of the given spellings). */
export async function saldoHasExpression(supabaseAdmin, texts) {
  const rows = await rowsForLemmas(supabaseAdmin, texts);
  return rows.some((r) => MULTIWORD_POS.has(r.pos));
}

const joinVariants = (list) => (list && list.length ? list.join(" / ") : "");

// SALDO noun paradigm class → Swedish school declension (nn_4 "-else/-elser" is
// the 3rd declension, nn_5 "-n" the 4th, nn_6 zero plural the 5th; nn_7 is the
// English -s plural). Variable / plural-only / indeclinable classes give no group.
const DECLENSION_FROM_SALDO = { 0: "0", 1: "1", 2: "2", 3: "3", 4: "3", 5: "4", 6: "5", 7: "irregular" };

/**
 * The card fields SALDO can state for one entry: forms (SpråkLab form types),
 * s-passive (infinitive and present), verb group / declension group, gender,
 * countability (only "uncountable" is a firm statement: SALDO inflects mass
 * nouns with plurals too).
 */
export function cardFieldsFromSaldo(row, pos) {
  const group = pos === "presens_particip" || pos === "perfekt_particip" ? "adjective" : pos;
  const forms = {};
  for (const [formType, msd] of Object.entries(FORM_FROM_MSD[group] || {})) {
    const value = joinVariants(row.forms[msd]);
    if (value) forms[formType] = value;
  }
  const fields = { forms };
  if (group === "verb") {
    fields.passive = joinVariants(row.forms["inf s-form"]);
    fields.passivePresent = joinVariants(row.forms["pres ind s-form"]);
    const m = row.paradigm.match(/^vb_(\d)[am]/);
    const pret = (row.forms["pret ind aktiv"] || [])[0] || "";
    if (m?.[1] === "2") forms.verb_group = pret.endsWith("te") ? "2b" : "2a";
    else if (m) forms.verb_group = m[1];
  }
  if (group === "noun") {
    const m = row.paradigm.match(/^nn_(\d)([unv])/);
    if (m && DECLENSION_FROM_SALDO[m[1]]) forms.declension_group = DECLENSION_FROM_SALDO[m[1]];
    if (m && m[2] !== "v") forms.genus = m[2] === "u" ? "en" : "ett";
    if (m?.[1] === "0") fields.countability = "uncountable";
  }
  return fields;
}

// Stored group labels came in many spellings ("grupp 1", "första gruppen", "2a" …).
// For verbs "irregular" is group 4 (starka och oregelbundna verb).
export function normalizeGroup(value, kind) {
  const v = key(value);
  if (!v) return "";
  if (/oregel|irregular|不规则/.test(v)) return kind === "verb_group" ? "4" : "irregular";
  if (/nollplural|zero/.test(v)) return "5";
  const digit = v.match(/[0-6]/)?.[0] || ({ första: "1", andra: "2", tredje: "3", fjärde: "4", femte: "5" })[v.match(/första|andra|tredje|fjärde|femte/)?.[0]] || "";
  const sub = v.match(/2\s*([ab])\b|typ\s*([ab])/i);
  return digit === "2" && sub ? `2${sub[1] || sub[2]}` : digit;
}

export const GENUS = { en: "en", "en-ord": "en", utrum: "en", ett: "ett", "ett-ord": "ett", neutrum: "ett" };
const NO_FORM = /^(—|-|–|saknas|ingen|none|n\/a)?$/i;
// First variant, without an article or a trailing note ("en fjärdedel", "skällas；多见于 …").
const bare = (value) => key(String(value || "").split(/[；;(（]/)[0]).replace(/^(en|ett) /, "").trim();
export const variants = (value) => String(value || "").split(/\s*\/\s*|\s*,\s*/).map(bare).filter(Boolean);

/**
 * Field-by-field check of a stored entry against SALDO.
 * Returns { found, fields: { name: { status, stored, reference } } } where status is
 *   verified — agrees with SALDO
 *   mismatch — contradicts SALDO
 *   missing  — empty, and SALDO can supply a value
 *   present  — filled, but SALDO can't decide (periphrastic comparison, a plural
 *              left out on purpose, a count/mass judgement)
 * Form fields are named "form:<type>". Fields SALDO says nothing about are left out.
 */
export function compareWithSaldo(entry, rows) {
  if (!rows.length) return { found: false, fields: {} };
  const candidates = rows.map((row) => cardFieldsFromSaldo(row, entry.pos));
  const fields = {};
  const check = (name, stored, refs, { same = (a, b) => a === b, undecidable = () => false } = {}) => {
    same ??= (a, b) => a === b;
    const options = refs.filter(Boolean);
    if (!options.length) return;
    if (!String(stored || "").trim()) {
      // Homographs whose SALDO entries disagree ("vara" varit / varat) give no fill value.
      const distinct = new Set(options.map((o) => variants(o)[0]));
      fields[name] = distinct.size > 1 ? { status: "missing", stored: "", reference: options.join(" | "), ambiguous: true } : { status: "missing", stored: "", reference: options[0] };
      return;
    }
    if (undecidable(stored)) { fields[name] = { status: "present", stored, reference: options[0] }; return; }
    const ok = options.some((ref) => variants(stored).some((s) => variants(ref).some((r) => same(s, r))));
    fields[name] = { status: ok ? "verified" : "mismatch", stored, reference: options[0] };
  };
  const formTypes = new Set(candidates.flatMap((c) => Object.keys(c.forms)));
  for (const formType of formTypes) {
    const stored = entry.forms?.[formType] || "";
    const refs = candidates.map((c) => c.forms[formType]);
    const name = `form:${formType}`;
    if (formType === "verb_group" || formType === "declension_group") {
      // SALDO's "0" (no plural) can't overrule a stored group: mass nouns are often taught with one.
      check(name, stored, refs.filter((r) => r !== "0").length ? refs.filter((r) => r !== "0") : refs, {
        same: (a, b) => normalizeGroup(a, formType) === normalizeGroup(b, formType),
        undecidable: (v) => refs.every((r) => r === "0") && normalizeGroup(v, formType) !== "0",
      });
    } else if (formType === "genus") {
      check(name, stored, refs, { same: (a, b) => (GENUS[a] || a) === (GENUS[b] || b) });
    } else {
      // Some SALDO adjective paradigms only list the older -e ending ("skrämde"); -a is the standard form.
      const eA = formType === "definite_form" || formType === "plural_form";
      check(name, stored, refs, {
        same: eA ? (a, b) => a.replace(/e$/, "a") === b.replace(/e$/, "a") : undefined,
        undecidable: (v) => NO_FORM.test(String(v).trim()) || /^(mer|mest) /.test(key(v)),
      });
    }
  }
  if (entry.pos === "verb") {
    const passives = candidates.flatMap((c) => [c.passive, c.passivePresent]).filter(Boolean);
    // A sentence instead of a form ("fastnas förekommer sällan …") is a usage note SALDO can't judge.
    check("passiv_s", entry.passiv_s, passives.length ? [passives.join(" / ")] : [], { undecidable: (v) => bare(v).includes(" ") });
  }
  if (entry.pos === "noun") {
    const saysUncountable = candidates.some((c) => c.countability === "uncountable");
    if (!entry.countability) {
      if (saysUncountable) fields.countability = { status: "missing", stored: "", reference: "uncountable", ambiguous: !candidates.every((c) => c.countability === "uncountable") };
    } else {
      // SALDO without a plural ("ansökan") is not proof a noun is uncountable, so
      // a stored "countable" stays undecided rather than wrong.
      fields.countability = { status: saysUncountable && entry.countability !== "countable" ? "verified" : "present", stored: entry.countability, reference: saysUncountable ? "uncountable" : "" };
    }
  }
  return { found: true, fields };
}
