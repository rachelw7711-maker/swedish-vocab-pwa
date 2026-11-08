// Read-only for the database: each batch grammar-note fix (data/reports/round-e/grammar-note-fixes.json)
// made again as the smallest correction of the original note (2026-11-09, the owner's rule: keep
// what is right and useful in a note, change only what is wrong). The model gets the original
// note, what is wrong in it and the facts (SALDO's gender, group and forms, or the entry's other,
// clean note), and returns the note with only those statements corrected. A correction is
// proposed only when the program finds it clean (no conflict with SALDO, Lexin or the corpus;
// gender, group and forms as SALDO has them) and most of the original's wording kept; otherwise
// the row goes to review — never back to a rewrite that drops the rest of the note.
// Writes proposed_minimal (and proposed, batch) into the fixes file; the previous proposal is
// kept as proposed_rewrite. Then run scripts/crosscheck-grammar-note-fixes.mjs.
//   node --env-file=.env scripts/minimal-grammar-note-fixes.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { useSaldoFiles } from "../server-lexicon.mjs";
import { useReferenceFiles, referenceEntries } from "../server-references.mjs";
import { grammarNoteConflicts, plainGrammarNote } from "../server-grammar-consistency.mjs";
import { callOpenAIJson } from "../server-native.mjs";

await useSaldoFiles();
await useReferenceFiles("data/reference", { extra: true });
const path = "data/reports/round-e/grammar-note-fixes.json";
const file = JSON.parse(readFileSync(path, "utf8"));
const verified = new Map(JSON.parse(readFileSync("data/reports/grammar-note-verified.json", "utf8")).rows.map((r) => [`${r.id}|${r.language}`, r]));

const SYSTEM = `You correct grammar notes of a Swedish learner's dictionary (the note is in Chinese or English; keep its language). You get the original note, what is wrong in it, and the facts. Change only the statements that contradict the facts: a wrong gender, a wrong declension-group number, wrong or invented forms, or a plural for a noun that has none. Keep every other sentence and its wording exactly as it is — explanations of usage, meaning or nuance stay. When a wrong statement can't be corrected in place, remove just that statement. Use "declension group N" / 第N变格组 numbering as in the facts. Echo each key.`;
const schema = { type: "object", additionalProperties: false, required: ["items"], properties: { items: { type: "array", items: { type: "object", additionalProperties: false, required: ["key", "note"], properties: { key: { type: "string" }, note: { type: "string" } } } } } };

// The original's words kept (Swedish forms aside, which a correction may change).
const tokens = (s) => String(s).toLowerCase().match(/[\p{L}]+/gu) || [];
const kept = (orig, fixed, lemma) => {
  const stem = lemma.toLowerCase().slice(0, 3);
  const o = tokens(orig).filter((w) => !w.startsWith(stem)), f = new Set(tokens(fixed));
  // Chinese runs come out as one token each; compare characters for them.
  const zh = (s) => [...String(s).replace(/[^一-鿿]/g, "")];
  const oz = zh(orig), fz = new Set(zh(fixed));
  const total = o.length + oz.length;
  return total ? (o.filter((w) => f.has(w)).length + oz.filter((c) => fz.has(c)).length) / total : 1;
};

const rows = file.fixes.filter((f) => f.batch);
const usage = { calls: 0, input: 0, output: 0, cost: 0 };
for (let i = 0; i < rows.length; i += 20) {
  const part = rows.slice(i, i + 20);
  const asks = [];
  for (const [j, f] of part.entries()) {
    const v = verified.get(`${f.id}|${f.language}`);
    const refs = await referenceEntries(null, f.swedish);
    const plain = await plainGrammarNote(null, { lemma: f.swedish, pos: "noun", refs });
    const facts = plain?.[f.language] || f.from || f.proposed;
    asks.push({ key: `k${j}`, headword: f.swedish, original: f.original, wrong: v.verdicts.map((x) => `${x.kind}: ${x.detail}`), facts });
  }
  let answer = null;
  for (let attempt = 0; attempt < 2 && !answer; attempt++) {
    try {
      const { result, usage: u } = await callOpenAIJson({ schemaName: "grammar_note_correction", schema, system: SYSTEM, user: JSON.stringify(asks), maxOutputTokens: 8000 });
      answer = result;
      usage.calls++; usage.input += u.input_tokens || 0; usage.output += u.output_tokens || 0; usage.cost += ((u.input_tokens || 0) * 0.75 + (u.output_tokens || 0) * 4.5) / 1e6;
    } catch (e) { console.warn("call failed", e.message); }
  }
  for (const [j, f] of part.entries()) {
    const note = answer?.items?.find((x) => x.key === `k${j}`)?.note?.trim() || "";
    const refs = await referenceEntries(null, f.swedish);
    const conflicts = note ? await grammarNoteConflicts(null, { lemma: f.swedish, pos: "noun", note, refs }) : [{ kind: "no_answer" }];
    const share = note ? kept(f.original, note, f.swedish) : 0;
    f.proposed_rewrite ??= f.proposed;
    f.proposed_minimal = note;
    f.minimal = { conflicts: conflicts.map((c) => c.kind), kept: Math.round(share * 100) / 100, changed: note !== f.original };
    const ok = note && !conflicts.length && share >= 0.5 && note !== f.original;
    if (ok) f.proposed = note;
    else { f.batch = false; f.review_reason = !note ? "no_answer" : conflicts.length ? `minimal_conflicts:${conflicts.map((c) => c.kind).join("/")}` : note === f.original ? "minimal_unchanged" : `minimal_kept_${Math.round(share * 100)}%`; }
  }
  console.log(Math.min(i + 20, rows.length), "/", rows.length);
}
file.summary.minimal = { asked: rows.length, batch: file.fixes.filter((f) => f.batch).length, usage };
writeFileSync(path, JSON.stringify(file, null, 1));
console.log(JSON.stringify(file.summary.minimal, null, 1));
