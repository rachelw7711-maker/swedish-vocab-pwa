// One entry, one grammar (2026-11-08). The Grammatik table (forms, gender, countability: SALDO
// and Lexin) and the grammar note under Fördjupning (free text, written by a separate bulk AI
// run in 2026-07 from the forms alone) are made apart, and nothing compared them: sjöfart's
// table said en-ord, uncountable, singular only, its note "declension group 3, plural
// sjöfarter, sjöfarterna" — a plural SALDO (nn_0u: none) and Lexin (plural "–") don't have.
// mjölk's note even gave group 2 with the -er plural of group 3.
//
// grammarNoteConflicts compares a note with SALDO, program only: a plural for a noun SALDO
// gives none (unless the note says the plural is limited — kaffe "表示不可数意义时不用复数"), a
// declension or conjugation group no SALDO reading of the word has, a gender none has, and a
// form of the word SALDO doesn't know. Homographs count together (bok: böcker and bokar).
// Words SALDO lacks are not judged. plainGrammarNote writes the note again from SALDO alone.
import { saldoEntries } from "./server-lexicon.mjs";
import { lexinCountability } from "./server-references.mjs";

// SALDO's noun classes against the five declensions taught: 1 -or, 2 -ar, 3 -er/-r, 4 -n, 5 none.
const DECLENSION = { 1: 1, 2: 2, 3: 3, 4: 3, 5: 4, 6: 5 };
const NUM = { "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5 };

/** What SALDO says about the word in this part of speech: groups, genders, plural, all forms. */
export async function saldoGrammar(supabaseAdmin, lemma, pos) {
  const tag = pos === "noun" ? "nn" : pos === "verb" ? "vb" : null;
  if (!tag) return null;
  const rows = (await saldoEntries(supabaseAdmin, lemma)).filter((r) => r.pos === tag && r.baseform === lemma);
  if (!rows.length) return null;
  const groups = new Set(), genders = new Set();
  let plural = false;
  const forms = new Set([lemma]);
  for (const r of await saldoEntries(supabaseAdmin, lemma)) for (const v of Object.values(r.forms || {}).flat()) forms.add(String(v).toLowerCase());
  for (const r of rows) {
    const m = /^(nn|vb)_(\w)(\w)?_/.exec(r.paradigm || "");
    if (!m) continue;
    if (tag === "nn") {
      if (DECLENSION[m[2]]) groups.add(DECLENSION[m[2]]);
      if (m[3] === "u" || m[3] === "n") genders.add(m[3]);
      if (m[3] === "v") { genders.add("u"); genders.add("n"); }
      if (Object.keys(r.forms || {}).some((k) => k.startsWith("pl "))) plural = true;
    } else if (/^[1-4]$/.test(m[2])) groups.add(Number(m[2]));
  }
  return { groups, genders, plural, forms, paradigms: rows.map((r) => r.paradigm) };
}

const LIMITED_PLURAL = /不用复数|没有复数|无复数|不可数|只有单数|只用单数|一般不用复数|通常不用复数|种类|品种|no plural|not used in the plural|uncountable|usually singular|only singular|kinds? of|types? of|plurale tantum|只有复数/i;
const MENTIONS_PLURAL = /复数|plural/i;

/** The words of a note, "bok-en" and "böcker-na" joined as written forms. */
function noteWords(note) {
  return String(note || "").toLowerCase().replace(/([a-zåäöé])-(?=[a-zåäöé])/g, "$1").match(/[a-zåäöé]+/g) || [];
}

/**
 * Where a grammar note contradicts SALDO: [{ kind, detail }], empty when it agrees or SALDO
 * doesn't know the word. kind: plural_for_no_plural, group, gender, unknown_form; and
 * plural_unconfirmed when SALDO has no plural but Lexin (refs) gives one or isn't given — SALDO
 * alone misses some (intrång, design), so that one is for a reviewer, not for a fix.
 */
export async function grammarNoteConflicts(supabaseAdmin, { lemma, pos, note, refs = null }) {
  if (!note || !lemma || /\s/.test(lemma)) return [];
  const saldo = await saldoGrammar(supabaseAdmin, lemma, pos);
  if (!saldo) return [];
  const out = [];
  const text = String(note);
  if (pos === "noun" && !saldo.plural && MENTIONS_PLURAL.test(text) && !LIMITED_PLURAL.test(text)) {
    const lexin = refs ? lexinCountability(refs) : null;
    out.push(lexin === "uncountable"
      ? { kind: "plural_for_no_plural", detail: `SALDO ${saldo.paradigms.join(", ")} and Lexin: no plural` }
      : { kind: "plural_unconfirmed", detail: `SALDO ${saldo.paradigms.join(", ")}: no plural; Lexin ${lexin || "not known"}` });
  }
  const group = /第\s*([1-5一二三四五])\s*(?:变格|變格|组|組|类|類|种变位|变位)|(?:declension|conjugation|verb)\s*(?:group|class)?\s*([1-5])\b|group\s*([1-5])\b/i.exec(text);
  const said = group && NUM[group[1] || group[2] || group[3]];
  if (said && saldo.groups.size && !saldo.groups.has(said)) {
    out.push({ kind: "group", detail: `note ${said}, SALDO ${[...saldo.groups].join("/")}` });
  }
  if (pos === "noun" && saldo.genders.size) {
    const neuter = /\bett[- ]?(?:词|詞|名词|word|noun|ord)|neutrum|neuter|中性/i.test(text);
    const common = /\ben[- ]?(?:词|詞|名词|word|noun|ord)|utrum|common gender|通性/i.test(text);
    if (neuter && !common && !saldo.genders.has("n")) out.push({ kind: "gender", detail: "note ett, SALDO en" });
    if (common && !neuter && !saldo.genders.has("u")) out.push({ kind: "gender", detail: "note en, SALDO ett" });
  }
  // A written form of the word itself (same start, about its length: not "form" in an
  // English note on formation) neither SALDO nor Lexin has.
  const stem = lemma.toLowerCase().slice(0, Math.min(4, lemma.length));
  const lexinForms = new Set((refs?.lexin_sv || []).flatMap((e) => Object.values(e.forms || {})).flatMap((v) => String(v).toLowerCase().split(/[\s,/]+/)));
  const unknown = [...new Set(noteWords(text))].filter((w) => w.startsWith(stem) && w !== lemma.toLowerCase() && w.length >= lemma.length - 2 && w.length <= lemma.length + 5 && !saldo.forms.has(w) && !lexinForms.has(w));
  // A plural SALDO lacks, in a note that says it is the special, limited use (mjölker for
  // kinds of milk), is that explanation, not a conflict.
  const explained = pos === "noun" && !saldo.plural && LIMITED_PLURAL.test(text);
  const unconfirmed = out.some((c) => c.kind === "plural_unconfirmed");
  if (unknown.length && !explained) out.push({ kind: unconfirmed ? "form_unconfirmed" : "unknown_form", detail: unknown.join(", ") });
  return out;
}

/** A grammar note from SALDO's forms (no plural only when Lexin agrees), for a noun: { zh, en }, or null. */
export async function plainGrammarNote(supabaseAdmin, { lemma, pos, refs = null }) {
  if (pos !== "noun") return null;
  const rows = (await saldoEntries(supabaseAdmin, lemma)).filter((r) => r.pos === "nn" && r.baseform === lemma);
  if (rows.length !== 1) return null;   // homographs: which reading the entry means is not ours to guess
  const r = rows[0], f = r.forms || {};
  const m = /^nn_(\w)(\w)_/.exec(r.paradigm || "");
  if (!m || !["u", "n"].includes(m[2])) return null;
  const g = m[2] === "u" ? "en" : "ett";
  const one = (k) => (f[k] || [])[0];
  const sgDef = one("sg def nom"), plIndef = one("pl indef nom"), plDef = one("pl def nom");
  if (!sgDef) return null;
  if (!plIndef) {
    if (!refs || lexinCountability(refs) !== "uncountable") return null;
    return { zh: `${g}-词，通常不可数，只用单数：单数定式 ${sgDef}，没有复数形式。`, en: `An ${g}-word, usually uncountable and used only in the singular: definite singular ${sgDef}; it has no plural.` };
  }
  const d = DECLENSION[m[1]];
  if (!d || !plDef) return null;
  return { zh: `${g}-词，第${d}变格组：单数定式 ${sgDef}，复数 ${plIndef}，复数定式 ${plDef}。`, en: `An ${g}-word in declension group ${d}: definite singular ${sgDef}, plural ${plIndef}, definite plural ${plDef}.` };
}
