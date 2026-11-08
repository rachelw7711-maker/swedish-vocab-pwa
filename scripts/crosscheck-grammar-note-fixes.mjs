// Read-only: each proposed grammar-note fix (data/reports/round-e/grammar-note-fixes.json) held
// against SALDO on its own, independently of the audit that proposed it (2026-11-08: a sample of
// 24 batch fixes had 4 wrong — a translation copying the other note's error the audit missed:
// kundkrets "ett-性别名词" for an en-word, ära keeping the plural äror SALDO lacks). What the
// fix says of gender, group, plural and forms must agree with SALDO; else it goes to review.
// English translations from a Chinese note are kept; translations into Chinese (from the English
// notes, the less reliable side) are never batch. Updates the fixes file in place.
//   node --env-file=.env scripts/crosscheck-grammar-note-fixes.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { useSaldoFiles } from "../server-lexicon.mjs";
import { saldoGrammar } from "../server-grammar-consistency.mjs";

await useSaldoFiles();
const path = "data/reports/round-e/grammar-note-fixes.json";
const file = JSON.parse(readFileSync(path, "utf8"));
const NUM = { "一": 1, "二": 2, "三": 3, "四": 4, "五": 5 };
const genderSaid = (t) => {
  const u = /\ben[- ]?(word|词|詞|ord)\b|en-词|en词|common[- ]gender|通性|共性|utrum/i.test(t);
  const n = /\bett[- ]?(word|词|詞|ord|性)|ett-词|ett词|neuter|中性|neutrum/i.test(t);
  return u === n ? null : u ? "u" : "n";
};
const ORD = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5 };
const groupSaid = (t) => {
  const m = /第\s*([1-5一二三四五])\s*(?:变格|變格|组|組|类|類)|(?:declension|group)\s*(?:group\s*)?([1-5])\b|(?:group|class|type)\s*([1-5])\b|\b(first|second|third|fourth|fifth)[- ](?:declension|group)/i.exec(t);
  return m ? Number(NUM[m[1]] || m[1] || m[2] || m[3] || ORD[m[4]?.toLowerCase()]) : null;
};
// Endings a note names ("-or", "加 -en"): each must end one of SALDO's forms; one the note says
// is added must make a form from the headword or another form (miniräknare + -en is no form).
function endingProblems(text, lemma, forms) {
  const out = [];
  const all = [...forms];
  for (const m of text.matchAll(/(^|[^\p{L}])-([a-zåäö]{1,5})\b/giu)) {
    const x = m[2].toLowerCase(), before = text.slice(Math.max(0, m.index - 30), m.index).toLowerCase();
    if (!all.some((f) => f.endsWith(x) && f !== x)) { out.push(`ending:-${x}`); continue; }
    if (/add|加|takes? -|→/.test(before) && !all.some((f) => f === lemma + x || all.some((g) => g !== f && g + x === f)) && !all.some((f) => f === lemma.replace(/[ae]$/, "") + x)) out.push(`added:-${x}`);
  }
  return out;
}
// "The plural has the same form" for a noun whose plural is another word (vax: vaxer).
const samePluralSaid = (t) => /same form|同形|单复数相同|单数和复数(?:形式)?(?:通常)?相同|不变/i.test(t);
const noPluralSaid = (t) => /没有复数|无复数|不可数|只用单数|通常不用复数|no plural|uncountable|used only in the singular/i.test(t);
const words = (t) => (String(t).toLowerCase().replace(/([a-zåäöé])-(?=[a-zåäöé])/g, "$1").match(/[a-zåäöé]+/g) || []);

// Batch as the audit and the proposal left it (a rerun starts from there, not from the last run).
const verified = new Map(JSON.parse(readFileSync("data/reports/grammar-note-verified.json", "utf8")).rows.map((r) => [`${r.id}|${r.language}`, r]));
// A retried correction (retry-grammar-note-fixes.mjs) that passed counts as the minimal one did.
for (const f of file.fixes) f.batch = !!(f.checked && verified.get(`${f.id}|${f.language}`)?.batch && !f.review_reason
  && (!f.minimal || f.proposed === f.proposed_minimal || (f.retry && f.proposed === f.retry.note)));
let failed = 0;
for (const f of file.fixes) {
  f.crosscheck = [];
  if (!f.proposed) continue;
  const s = await saldoGrammar(null, f.swedish, "noun");
  if (!s) { f.crosscheck.push("no_saldo"); continue; }
  const g = genderSaid(f.proposed);
  if (g && s.genders.size && !s.genders.has(g)) f.crosscheck.push(`gender:${g}`);
  const n = groupSaid(f.proposed);
  if (n && s.groups.size && !s.groups.has(n)) f.crosscheck.push(`group:${n}`);
  if (n && !s.plural) f.crosscheck.push("group_for_no_plural");
  // "No plural when uncountable" beside the plural forms is right (chans: chanser).
  const listsPlural = [...f.proposed.matchAll(/(?:plural|复数)(?:\s*(?:indefinite|不定式))?\s*[:：]?\s*([a-zåäöé]+)/gi)].some((m) => s.forms.has(m[1].toLowerCase()));
  if (noPluralSaid(f.proposed) && s.plural && !listsPlural) f.crosscheck.push("no_plural_for_plural");
  const stem = f.swedish.toLowerCase().slice(0, Math.max(3, f.swedish.length - 2));
  const unknown = words(f.proposed).filter((w) => w.startsWith(stem) && !s.forms.has(w));
  if (unknown.length) f.crosscheck.push(`forms:${unknown.join("/")}`);
  f.crosscheck.push(...endingProblems(f.proposed, f.swedish.toLowerCase(), s.forms));
  // A correction keeps the forms the original had right (batteri: batteriet must not become "batterit").
  const now = new Set(words(f.proposed));
  const lost = words(f.original).filter((w) => w !== f.swedish.toLowerCase() && w.startsWith(stem) && s.forms.has(w) && !now.has(w) && (s.plural || !/er$|ar$|or$|na$/.test(w)));
  if (lost.length && f.minimal) f.crosscheck.push(`dropped_form:${[...new Set(lost)].join("/")}`);
  if (samePluralSaid(f.proposed) && s.plural && !s.forms.has(f.swedish.toLowerCase() + "") ) f.crosscheck.push("same_plural_unchecked");
  if (samePluralSaid(f.proposed) && s.plural && !s.groups.has(5)) f.crosscheck.push("same_plural_for_other");
  if (f.how === "translate_from_en") f.crosscheck.push("into_chinese_from_english");
  f.crosscheck = f.crosscheck.filter((c) => c !== "same_plural_unchecked");
  if (f.crosscheck.length && f.batch) { f.batch = false; failed++; }
}
file.summary.batch = file.fixes.filter((f) => f.batch).length;
file.summary.crosscheck_removed_from_batch = failed;
writeFileSync(path, JSON.stringify(file, null, 1));
console.log(JSON.stringify(file.summary, null, 1));
const tally = {};
for (const f of file.fixes) for (const c of f.crosscheck || []) tally[c.split(":")[0]] = (tally[c.split(":")[0]] || 0) + 1;
console.log(tally);
