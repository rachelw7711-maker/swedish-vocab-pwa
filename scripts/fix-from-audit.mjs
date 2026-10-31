// SQL for the audit's B findings that overwrite a stored form (2026-10-31): a misspelled
// form SALDO corrects, a form in the wrong field, a gender or verb group that contradicts
// the entry's own forms, and noun groups that contradict the entry's own plural.
// Writes the SQL, its rollback and a preview; it never touches the database itself.
// Each update only applies while the stored value is still the one the audit saw.
//
//   node scripts/fix-from-audit.mjs [--issues data/reports/prod/quality/issues.ndjson] [--out data/reports/prod/fixes]
//
// Output: forms.sql (+ -rollback.sql, -preview.tsv) for spelling, field, gender and verb
// group fixes, and declension-groups.sql (+ …) kept apart: it assumes the five-group
// numbering (-or 1, -ar 2, -er/-r 3, -n 4, zero plural 5), which the owner decides on.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const outDir = opt("--out", "data/reports/prod/fixes");
mkdirSync(outDir, { recursive: true });
const issues = readFileSync(opt("--issues", "data/reports/prod/quality/issues.ndjson"), "utf8").trim().split("\n").map((l) => JSON.parse(l))
  .filter((i) => i.category === "B" && i.overwrite && i.field.startsWith("form:") && i.reference && !String(i.reference).includes(" / ") && !String(i.reference).includes(" | "));

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
function write(name, list) {
  const set = (i) => `update public.word_forms set form_value = ${q(i.reference)} where learning_object_id = ${q(i.id)} and form_type = ${q(i.field.slice(5))} and form_value = ${q(i.stored)};`;
  const undo = (i) => `update public.word_forms set form_value = ${q(i.stored)} where learning_object_id = ${q(i.id)} and form_type = ${q(i.field.slice(5))} and form_value = ${q(i.reference)};`;
  writeFileSync(`${outDir}/${name}.sql`, ["begin;", ...list.map(set), "commit;"].join("\n") + "\n");
  writeFileSync(`${outDir}/${name}-rollback.sql`, ["begin;", ...list.map(undo), "commit;"].join("\n") + "\n");
  writeFileSync(`${outDir}/${name}-preview.tsv`, "headword\tpos\tfield\tkind\tstored\tnew\n" + list.map((i) => [i.swedish, i.pos, i.field, i.kind, i.stored, i.reference].join("\t")).join("\n") + "\n");
  const byKind = list.reduce((m, i) => { m[`${i.field} ${i.kind}`] = (m[`${i.field} ${i.kind}`] || 0) + 1; return m; }, {});
  return { file: `${outDir}/${name}.sql`, updates: list.length, byKind };
}
console.log(JSON.stringify({
  forms: write("forms", issues.filter((i) => i.field !== "form:declension_group")),
  declensionGroups: write("declension-groups", issues.filter((i) => i.field === "form:declension_group")),
}, null, 1));
