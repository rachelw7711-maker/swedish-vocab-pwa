// A card's senses one by one (round G, 2026-11-12, owner's item A). The English and Chinese meanings
// are split into pieces; a pairing (AI, ledgered: scripts/sense-pairing.mjs) puts every piece into a
// sense or into the notes; each sense then gets its own evidence and grade (server-evidence.mjs
// gradeItem). The card's sense counts as verified only when every sense shown is:
//   - complete: pieces in both languages (a public sense needs its Chinese and its English);
//   - verified: a support that can verify (Korp sentences read for this sense, a Lexin sense link,
//     a person) — the AI's own check and word overlap with a dictionary's English stay candidates;
// and the pairing itself is sound: every piece placed once, nothing both a note and a sense, and a
// piece kept out of the senses as a note looks like a remark on use, register or grammar — so a real
// sense cannot escape its evidence, nor one language keep a sense the other lacks, by being called a note.
// Nothing here removes or hides a sense: a sense without evidence keeps the card partial.
import { evidence, gradeItem } from "./server-evidence.mjs";

/** The pieces a meaning is split into for pairing: English at ";" and between sentences, Chinese at "；" and after "。". */
export const enPieces = (s) => String(s || "").split(/;\s*|(?<=\.)\s+(?=[A-Z])/).map((x) => x.trim()).filter(Boolean);
export const zhPieces = (s) => String(s || "").split(/[；;]|(?<=。)/).map((x) => x.trim()).filter((x) => x && x !== "。");
const key = (s) => String(s).toLowerCase().replace(/[.!?。]+$/, "").trim();

// A remark about use, register or grammar — never a meaning of its own. Length is no sign: a long
// English piece can be a sense ("a person who leads a group").
const NOTE_EN = /\b(used|usage|relating|refers?|referring|especially|often|usually|typically|somewhat|informal|formal|old-fashioned|literary|colloquial|figurative(ly)?|e\.g\.|such as|i\.e\.|plurals?|singular|neuter|common gender|ett words|en words|definite|indefinite|abbreviation|short for|spelling|spelled)\b/i;
const NOTE_ZH = /常用形式|形式是|常用于|多用于|常见于|用于|语气|口语|书面|正式|旧式|色彩|意味|语境|文化|简说|常与|搭配|复数|单数|中性|缩写|拼写/;
const SENSE_ZH = /可指|也指|也可|表示|意思是|意为|形容|指/;
export const isRemarkEn = (t) => NOTE_EN.test(String(t || ""));
export const isRemarkZh = (t) => NOTE_ZH.test(String(t || "")) && !SENSE_ZH.test(String(t || ""));

/**
 * Pure. pairing: the ledgered result { senses: [{ en: [i], zh: [i], label, doubtful }], notes: { en, zh } };
 * korp: the latest Korp sense check's result ({ parts, unattested }) or null; dictionary(enTexts) → boolean
 * (word overlap with a dictionary's English: a candidate); lexinVariant: a Lexin sense the whole card is
 * tied to (it verifies the first sense); legacy: the card had an AI check that agreed.
 * → { senses: [{ order, en, zh, label, complete, shared, korp, evidence, grade }], notes, problems, verified, reasons }
 */
export function gradeCardSenses({ E, Z, pairing, korp = null, dictionary = () => false, lexinVariant = null, legacy = true }) {
  const problems = [];
  const raw = (pairing?.senses || []).map((s) => ({ ...s, en: [...new Set(s.en || [])].filter((n) => n >= 0 && n < E.length), zh: [...new Set(s.zh || [])].filter((n) => n >= 0 && n < Z.length) }));
  const notes = { en: (pairing?.notes?.en || []).filter((n) => n >= 0 && n < E.length), zh: (pairing?.notes?.zh || []).filter((n) => n >= 0 && n < Z.length) };
  for (const [lang, P] of [["en", E], ["zh", Z]]) P.forEach((_, n) => {
    const inS = raw.filter((s) => s[lang].includes(n)), inN = notes[lang].includes(n);
    if (!inS.length && !inN) problems.push(`${lang}${n}_unplaced`);
    if (inS.length && inN) problems.push(`${lang}${n}_note_and_sense`);
    if (inS.length > 1) inS.forEach((s) => (s.shared = true));
  });
  // A note must look like one, or the piece may be a sense that escaped its evidence (or one language's
  // sense the other lacks: skjuts "口语里也可指送一程", kö "排队。").
  for (const n of notes.en) if (!isRemarkEn(E[n])) problems.push(`en${n}_note_not_a_remark`);
  for (const n of notes.zh) if (!isRemarkZh(Z[n])) problems.push(`zh${n}_note_not_a_remark`);
  const asked = new Set((korp?.parts || []).map(key)), unattested = new Set((korp?.unattested || []).map(key));
  const senses = raw.map((s, i) => {
    const en = s.en.map((n) => E[n]), zh = s.zh.map((n) => Z[n]);
    const k = en.map(key).filter((x) => asked.has(x));
    const korpSays = !k.length ? "not_checked" : k.some((x) => !unattested.has(x)) ? "attested" : "not_attested";
    const ev = [];
    if (legacy) ev.push(evidence("legacy_ai", "supports"));
    if (en.length && dictionary(en)) ev.push(evidence("candidate_dictionary_overlap", "supports"));
    if (korpSays === "attested") ev.push(evidence("korp_sense", "supports"));
    // Not among the sentences Korp returned: no evidence either way, never a refutation.
    if (korpSays === "not_attested") ev.push(evidence("korp_sense", "not_found"));
    if (i === 0 && lexinVariant) ev.push(evidence("dictionary_sense_link", "supports", { ref: lexinVariant }));
    return { order: i, en, zh, label: s.label || "", doubtful: !!s.doubtful, shared: !!s.shared, complete: en.length > 0 && zh.length > 0, korp: korpSays, evidence: ev, grade: gradeItem(ev).grade };
  });
  const reasons = [...problems];
  if (!senses.length) reasons.push("no_sense");
  senses.forEach((s) => { if (!s.complete) reasons.push(`sense${s.order}_incomplete`); if (s.grade !== "verified") reasons.push(`sense${s.order}_${s.grade}`); });
  return { senses, notes: { en: notes.en.map((n) => E[n]), zh: notes.zh.map((n) => Z[n]) }, problems, verified: reasons.length === 0, reasons };
}
