// Read-only for the database: the replacement text of each confirmed-wrong grammar note
// (data/reports/grammar-note-verified.json), written to data/reports/round-e/grammar-note-fixes.json
// for review — nothing is saved to the dictionary (2026-11-09).
//   from_saldo         — the note written again from SALDO (plainGrammarNote), as is;
//   translate_from_zh  — the English note translated anew from the entry's Chinese note, which
//                        agrees with every source (most English notes renumbered declension groups
//                        in translation: viol "group 2" for its -er plural). The translation is
//                        then checked by program: the same Swedish words as the Chinese note, the
//                        same group number, and no conflict with SALDO — else it is not proposed.
//   node --env-file=.env scripts/propose-grammar-note-fixes.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { useSaldoFiles } from "../server-lexicon.mjs";
import { useReferenceFiles, referenceEntries } from "../server-references.mjs";
import { grammarNoteConflicts } from "../server-grammar-consistency.mjs";
import { callOpenAIJson } from "../server-native.mjs";

await useSaldoFiles();
await useReferenceFiles("data/reference", { extra: true });
const { rows } = JSON.parse(readFileSync("data/reports/grammar-note-verified.json", "utf8"));
// The Swedish words of a note (the headword's forms are the ones compared).
const swedishWords = (s) => new Set(String(s).toLowerCase().replace(/([a-zåäöé])-(?=[a-zåäöé])/g, "$1").match(/[a-zåäöé]+/g) || []);
const groupOf = (s) => (/第\s*([1-5一二三四五])\s*(?:变格|類|类|组)/.exec(s) || /(?:group|declension)\s*([1-5])/i.exec(s) || [])[1]?.replace(/[一二三四五]/, (c) => "一二三四五".indexOf(c) + 1) || null;

const SYSTEM = {
  en: `You translate grammar notes of a Swedish learner's dictionary from Chinese into English. Translate faithfully and plainly: keep every Swedish word and form exactly as written (do not add, drop or change any form), keep every number exactly (a Chinese 第3变格组 is "declension group 3" — never renumber), keep the gender as written (en-词 = an en-word, ett-词 = an ett-word), add nothing. Echo each key.`,
  zh: `You translate grammar notes of a Swedish learner's dictionary from English into Simplified Chinese. Translate faithfully and plainly: keep every Swedish word and form exactly as written (do not add, drop or change any form), keep every number exactly ("declension group 3" is 第3变格组 — never renumber), keep the gender as written (an en-word = en-词, an ett-word = ett-词), add nothing. Echo each key.`,
};
const schema = { type: "object", additionalProperties: false, required: ["items"], properties: { items: { type: "array", items: { type: "object", additionalProperties: false, required: ["key", "text"], properties: { key: { type: "string" }, text: { type: "string" } } } } } };

const out = [];
const usage = { calls: 0, input: 0, output: 0, cost: 0 };
for (const r of rows.filter((x) => x.fix?.how === "from_saldo")) out.push({ id: r.id, swedish: r.swedish, language: r.language, original: r.original, proposed: r.fix.text, how: "from_saldo", checked: true, batch: r.batch });
const todo = rows.filter((x) => /^translate_from_/.test(x.fix?.how || ""));
for (const to of ["en", "zh"]) {
  const list = todo.filter((r) => r.language === to);
  for (let i = 0; i < list.length; i += 20) {
    const part = list.slice(i, i + 20);
    let answer = null;
    for (let attempt = 0; attempt < 2 && !answer; attempt++) {
      try {
        const { result, usage: u } = await callOpenAIJson({ schemaName: "grammar_note_translation", schema, system: SYSTEM[to], user: JSON.stringify(part.map((r, j) => ({ key: `k${j}`, headword: r.swedish, note: r.fix.source }))), maxOutputTokens: 6000 });
        answer = result;
        usage.calls++; usage.input += u.input_tokens || 0; usage.output += u.output_tokens || 0; usage.cost += ((u.input_tokens || 0) * 0.75 + (u.output_tokens || 0) * 4.5) / 1e6;
      } catch (e) { console.warn("call failed", e.message); }
    }
    for (const [j, r] of part.entries()) {
      const text = answer?.items?.find((x) => x.key === `k${j}`)?.text?.trim() || "";
      const refs = await referenceEntries(null, r.swedish);
      const conflicts = text ? await grammarNoteConflicts(null, { lemma: r.swedish, pos: r.pos, note: text, refs }) : [{ kind: "no_translation" }];
      const stem = r.swedish.toLowerCase().slice(0, 3);
      const sourceSv = [...swedishWords(r.fix.source)].filter((w) => w.startsWith(stem));
      const missing = sourceSv.filter((w) => !swedishWords(text).has(w));
      const sameGroup = groupOf(r.fix.source) === groupOf(text);
      const ok = text && !conflicts.length && !missing.length && sameGroup;
      out.push({ id: r.id, swedish: r.swedish, language: to, original: r.original, proposed: ok ? text : null, translation: text, from: r.fix.source, how: r.fix.how, checked: ok, problems: [...conflicts.map((c) => c.kind), ...missing.map((w) => `missing:${w}`), ...(sameGroup ? [] : ["group_changed"])], batch: ok && r.batch });
    }
    console.log(to, Math.min(i + 20, list.length), "/", list.length);
  }
}
mkdirSync("data/reports/round-e", { recursive: true });
const summary = { proposals: out.length, checked: out.filter((x) => x.checked).length, failed_check: out.filter((x) => !x.checked).length, batch: out.filter((x) => x.batch).length, by_how: out.reduce((m, x) => ((m[x.how] = (m[x.how] || 0) + 1), m), {}), usage };
writeFileSync("data/reports/round-e/grammar-note-fixes.json", JSON.stringify({ summary, fixes: out }, null, 1));
console.log(JSON.stringify(summary, null, 1));
