// Read-only for the database: the grammar-note corrections that were not written (refused by the
// minimal edit or by the SALDO cross-check) asked once more, each with what was wrong in the last
// attempt and SALDO's facts spelled out (2026-11-09). Same rule as the minimal edit — keep what is
// right and useful, change only the wrong statement — and the same tests: no conflict with SALDO,
// at least half the original's words kept. A correction that passes is marked batch again (run
// scripts/crosscheck-grammar-note-fixes.mjs after, then apply-grammar-note-fixes.mjs); one that
// doesn't gets review_reason "retry_failed:…" for manual review. Rows whose note is a translation
// into Chinese stay out (never batch, by rule). Rows already written are never touched.
//   node --env-file=.env scripts/retry-grammar-note-fixes.mjs [--applied <ids file>]
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { useSaldoFiles } from "../server-lexicon.mjs";
import { useReferenceFiles, referenceEntries } from "../server-references.mjs";
import { grammarNoteConflicts, plainGrammarNote, saldoGrammar } from "../server-grammar-consistency.mjs";
import { callOpenAIJson } from "../server-native.mjs";

await useSaldoFiles();
await useReferenceFiles("data/reference", { extra: true });
const path = "data/reports/round-e/grammar-note-fixes.json";
const file = JSON.parse(readFileSync(path, "utf8"));
const verified = new Map(JSON.parse(readFileSync("data/reports/grammar-note-verified.json", "utf8")).rows.map((r) => [`${r.id}|${r.language}`, r]));
const written = new Set(readdirSync("data/reports/round-e").filter((f) => /^backup-grammar-notes-.*Z\.json$/.test(f))
  .flatMap((f) => JSON.parse(readFileSync(`data/reports/round-e/${f}`, "utf8")).map((r) => `${r.learning_object_id}|${r.native_language}`)));

const SYSTEM = `You correct grammar notes of a Swedish learner's dictionary (the note is in Chinese or English; keep its language). You get the original note, what is wrong in it, SALDO's facts, and why the previous correction was refused. Change only the statements that contradict the facts; keep every other sentence and its wording exactly — explanations of usage, meaning or nuance stay. A noun SALDO gives no plural has no declension group and no plural forms: remove those statements (keep the singular forms). Never add forms that are not in the facts. Echo each key.`;
const schema = { type: "object", additionalProperties: false, required: ["items"], properties: { items: { type: "array", items: { type: "object", additionalProperties: false, required: ["key", "note"], properties: { key: { type: "string" }, note: { type: "string" } } } } } };
const tokens = (s) => String(s).toLowerCase().match(/[\p{L}]+/gu) || [];
const kept = (orig, fixed, lemma) => {
  const stem = lemma.toLowerCase().slice(0, 3);
  const o = tokens(orig).filter((w) => !w.startsWith(stem)), f = new Set(tokens(fixed));
  const zh = (s) => [...String(s).replace(/[^一-鿿]/g, "")];
  const oz = zh(orig), fz = new Set(zh(fixed));
  const total = o.length + oz.length;
  return total ? (o.filter((w) => f.has(w)).length + oz.filter((c) => fz.has(c)).length) / total : 1;
};
const why = (f) => [...(f.crosscheck || []), f.review_reason].filter(Boolean).join(", ");

const rows = file.fixes.filter((f) => !f.batch && !written.has(`${f.id}|${f.language}`) && !(f.crosscheck || []).includes("into_chinese_from_english") && verified.get(`${f.id}|${f.language}`));
const skipped = file.fixes.filter((f) => !f.batch && !written.has(`${f.id}|${f.language}`) && !rows.includes(f));
for (const f of skipped) f.review_reason ??= (f.crosscheck || []).includes("into_chinese_from_english") ? "translation_into_chinese" : "no_verified_problems";
const usage = { calls: 0, input: 0, output: 0, cost: 0 };
let passed = 0;
for (let i = 0; i < rows.length; i += 15) {
  const part = rows.slice(i, i + 15);
  const asks = [];
  for (const [j, f] of part.entries()) {
    const v = verified.get(`${f.id}|${f.language}`);
    const refs = await referenceEntries(null, f.swedish);
    const plain = await plainGrammarNote(null, { lemma: f.swedish, pos: "noun", refs });
    const s = await saldoGrammar(null, f.swedish, "noun");
    const saldo = s ? { gender: [...s.genders].map((g) => (g === "u" ? "en" : "ett")).join("/"), plural: s.plural, declension_group: s.plural ? [...s.groups].join("/") : "none (no plural)", forms: [...s.forms].join(", ") } : null;
    asks.push({ key: `k${j}`, headword: f.swedish, original: f.original, wrong: v.verdicts.map((x) => `${x.kind}: ${x.detail}`), saldo, facts: plain?.[f.language] || f.from || "", previous: f.proposed_minimal || f.proposed, refused_because: why(f) });
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
    f.retry = { note, conflicts: conflicts.map((c) => c.kind), kept: Math.round(share * 100) / 100, before: why(f) };
    if (note && !conflicts.length && share >= 0.5 && note !== f.original) {
      f.proposed = note; f.batch = true; f.crosscheck = []; delete f.review_reason; passed++;
    } else f.review_reason = `retry_failed:${!note ? "no_answer" : conflicts.length ? conflicts.map((c) => c.kind).join("/") : note === f.original ? "unchanged" : `kept_${Math.round(share * 100)}%`}`;
  }
  console.log(Math.min(i + 15, rows.length), "/", rows.length);
}
file.summary.retry = { asked: rows.length, passed, to_review: rows.length - passed + skipped.length, usage };
writeFileSync(path, JSON.stringify(file, null, 1));
console.log(JSON.stringify(file.summary.retry, null, 1));
