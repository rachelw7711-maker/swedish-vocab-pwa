// Local grammar corrections (2026-11-01), deterministic, no AI:
//   1. the quality audit's form fixes (misspelled forms SALDO corrects, forms stored in
//      the wrong field — scripts/audit-quality.mjs category B with one reference),
//   2. verb group from the verb's own forms: -ade 1, -de 2a, -te 2b, -dde 3, anything
//      else 4 (starka och oregelbundna verb — göra, sätta, ha …, which SALDO files as 2a),
//   3. noun declension group from the noun's own plural: -or 1, -ar 2, -er/-r 3, -n 4,
//      zero plural 5 (0 = no plural, kept),
//   4. gender as "en"/"ett" in word_forms.genus and "en-ord"/"ett-ord" in
//      learning_objects.pos_detail (what the card's headline shows), from SALDO and the
//      noun's own definite form.
// A stored value is only replaced when the evidence agrees: the forms a group is derived
// from must be SALDO forms of that word, and SALDO and the definite form must not
// disagree on gender. Everything else is listed as held. Plural-only and irregular
// plurals (män, möss, ögon) get no group.
// Old values go to public.content_audit_archive; the rollback restores them.
//
//   node --env-file=.env scripts/normalize-grammar.mjs [--issues data/reports/prod/quality/issues.ndjson] [--out data/reports/prod/fixes/grammar]
// Writes grammar.sql, grammar-rollback.sql, grammar-preview.tsv and held.tsv; never writes to the database.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { useSaldoFiles, saldoEntries, normalizeGroup, GENUS, variants } from "../server-lexicon.mjs";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const outDir = opt("--out", "data/reports/prod/fixes/grammar");
mkdirSync(outDir, { recursive: true });
const batch = randomUUID();
await useSaldoFiles();

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
async function all(table, cols, filter = (q) => q) {
  let out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await filter(db.from(table).select(cols)).order("id").range(from, from + 999);
    if (error) throw error;
    out = out.concat(data);
    if (data.length < 1000) return out;
  }
}
const objects = await all("learning_objects", "id, swedish, part_of_speech, pos_detail, object_type, status", (q) => q.in("part_of_speech", ["noun", "verb"]).eq("object_type", "word"));
const formRows = await all("word_forms", "id, learning_object_id, form_type, form_value");
const formsOf = new Map();
for (const f of formRows) (formsOf.get(f.learning_object_id) ?? formsOf.set(f.learning_object_id, new Map()).get(f.learning_object_id)).set(f.form_type, f.form_value);

const changes = [];   // { table, id, field, old, value, reason, swedish }
const held = [];      // { swedish, field, stored, derived, reason }

// 1. Audit form fixes (gender and verb group are re-derived below instead).
const issues = readFileSync(opt("--issues", "data/reports/prod/quality/issues.ndjson"), "utf8").trim().split("\n").map((l) => JSON.parse(l))
  .filter((i) => i.category === "B" && i.overwrite && i.field.startsWith("form:") && i.reference && !/ \/ | \| /.test(String(i.reference))
    && !["form:verb_group", "form:genus", "form:declension_group"].includes(i.field));
for (const i of issues) {
  const forms = formsOf.get(i.id);
  const type = i.field.slice(5);
  if (!forms || forms.get(type) !== i.stored) continue;   // changed since the audit
  forms.set(type, i.reference);
  changes.push({ table: "word_forms", id: i.id, field: type, old: i.stored, value: i.reference, reason: `audit:${i.kind}`, swedish: i.swedish });
}

const first = (v) => variants(v)[0] || "";
const lastWord = (v) => first(v).replace(/^att /, "").split(" ")[0];
const saldoForms = (rows, msd) => new Set(rows.flatMap((r) => r.forms[msd] || []).map((s) => s.toLowerCase()));

// Verb group from infinitive, present, preterite, supine (first word: particle verbs).
function verbGroup(forms) {
  const inf = lastWord(forms.get("infinitive")), pres = lastWord(forms.get("present")), pret = lastWord(forms.get("preteritum")), sup = lastWord(forms.get("supinum"));
  if (!inf || !pret || !sup) return null;
  if (!inf.endsWith("a")) return pret === `${inf}dde` && sup === `${inf}tt` && (!pres || pres === `${inf}r`) ? "3" : "4";
  const stem = inf.slice(0, -1);
  if (pret === `${stem}ade`) return sup === `${stem}at` && (!pres || pres === `${inf}r`) ? "1" : "4";
  const short = stem.replace(/(.)\1$/, "$1");            // glömma → glöm-de
  const presOk = !pres || pres === `${stem}er` || (/r$/.test(stem) && pres === stem);
  // köpt, glömt, sänt; lett / betytt (vowel + d); lyft / befäst (stem ending in -t).
  const supOk = [stem, short].some((s) => sup === `${s.replace(/d$/, "")}t` || sup === `${s}t`)
    || (/[aeiouyåäö]d$/.test(stem) && sup === `${stem.slice(0, -1)}tt`) || (stem.endsWith("t") && sup === stem);
  if (!presOk || !supOk) return "4";
  if ([`${stem}de`, `${short}de`].includes(pret) || (stem.endsWith("d") && pret === `${stem}e`)) return /[kpstx]$/.test(stem) ? "4" : "2a";
  if ([`${stem}te`, `${short}te`].includes(pret) || (stem.endsWith("t") && pret === `${stem}e`)) return /[kpstx]$/.test(stem) || stem.endsWith("t") ? "2b" : "4";
  return "4";
}

// Noun declension group from the singular and plural indefinite.
function declensionGroup(sg, pl) {
  if (!sg || !pl) return null;
  if (pl === sg) return "5";
  if (/[aeiouyåäöé]$/.test(sg) && pl === `${sg}n`) return "4";
  if (/[eiouyåäöé]$/.test(sg) && pl === `${sg}r`) return "3";
  if (pl.endsWith("or") && (sg.endsWith("a") ? pl === `${sg.slice(0, -1)}or` : pl === `${sg}or`)) return "1";
  if (pl.endsWith("ar") && pl[0] === sg[0]) return "2";
  if (pl.endsWith("er") && pl[0] === sg[0] && !sg.endsWith("er") || pl.endsWith("er") && pl === `${sg.replace(/er$/, "r")}er`) return "3";
  return null;
}

// Gender from the singular definite: -n en-ord, -t ett-ord (no evidence when it equals the singular).
function genderFromDefinite(sg, def) {
  if (!def || def === sg) return null;
  if (def.endsWith("n")) return "en";
  if (def.endsWith("t")) return "ett";
  return null;
}

const posDetailFor = { en: "en-ord", ett: "ett-ord" };
const genusLabel = (v) => GENUS[String(v || "").trim().toLowerCase()] || (/^(neuter|n-ord)$/i.test(v || "") ? null : /^common gender$/i.test(v || "") ? "en" : null);
let derived = 0;
for (const o of objects) {
  if (o.status === "retired") continue;
  const forms = formsOf.get(o.id) || new Map();
  const rows = await saldoEntries(null, o.swedish, o.part_of_speech);

  if (o.part_of_speech === "verb") {
    const stored = forms.get("verb_group") ?? null;
    const canon = normalizeGroup(stored, "verb_group");
    const group = verbGroup(forms);
    const pret = lastWord(forms.get("preteritum")), sup = lastWord(forms.get("supinum"));
    const attested = rows.length > 0 && saldoForms(rows, "pret ind aktiv").has(pret) && saldoForms(rows, "sup aktiv").has(sup);
    if (group) derived++;
    // "Irregular" is where school grammars differ most (tåla, skilja, kröna): a stored
    // 2/2a/2b is not overwritten with 4, only listed.
    // Compounds of göra, sätta, lägga … (vowel change in the past) are group 4 in every school grammar.
    const borderline = group === "4" && /^2[ab]?$/.test(canon) && !/(göra|sätta|lägga|säga|välja|sälja|dölja)$/.test(o.swedish);
    if (group && attested && borderline) {
      held.push({ swedish: o.swedish, field: "verb_group", stored, derived: group, reason: "school_grammar_borderline" });
    } else if (group && attested) {
      if (stored !== group) changes.push({ table: "word_forms", id: o.id, field: "verb_group", old: stored, value: group, reason: stored == null ? "missing:own_forms" : canon === group ? "label_format" : canon && canon !== "2" ? "contradicts_own_forms" : "subtype_from_own_forms", swedish: o.swedish });
    } else if (stored != null && canon && stored !== canon && /^[1-4]$/.test(canon)) {
      changes.push({ table: "word_forms", id: o.id, field: "verb_group", old: stored, value: canon, reason: "label_format", swedish: o.swedish });
    } else if (stored == null || !/^([134]|2[ab])$/.test(stored)) {
      held.push({ swedish: o.swedish, field: "verb_group", stored, derived: group, reason: !group ? "forms_incomplete" : "forms_not_in_saldo" });
    }
    continue;
  }

  // Nouns
  const sg = lastWord(forms.get("singular_indefinite") || o.swedish), pl = lastWord(forms.get("plural_indefinite")), def = lastWord(forms.get("singular_definite"));
  const storedGroup = forms.get("declension_group") ?? null;
  const canonGroup = normalizeGroup(storedGroup, "declension_group");
  const uncountable = rows.length > 0 && rows.every((r) => /^nn_0/.test(r.paradigm));
  const group = declensionGroup(sg, pl);
  const plAttested = rows.length > 0 && saldoForms(rows, "pl indef nom").has(pl);
  if (group) derived++;
  if (group && plAttested) {
    if (storedGroup !== group) changes.push({ table: "word_forms", id: o.id, field: "declension_group", old: storedGroup, value: group, reason: storedGroup == null ? "missing:own_plural" : canonGroup === group ? "label_format" : "contradicts_own_plural", swedish: o.swedish });
  } else if (!pl && uncountable) {
    if (storedGroup !== "0") (storedGroup == null || canonGroup === "0") ? changes.push({ table: "word_forms", id: o.id, field: "declension_group", old: storedGroup, value: "0", reason: "no_plural_saldo", swedish: o.swedish }) : held.push({ swedish: o.swedish, field: "declension_group", stored: storedGroup, derived: "0", reason: "group_without_plural" });
  } else if (storedGroup != null && /^[0-5]$/.test(canonGroup) && storedGroup !== canonGroup && (!group || group === canonGroup)) {
    changes.push({ table: "word_forms", id: o.id, field: "declension_group", old: storedGroup, value: canonGroup, reason: "label_format", swedish: o.swedish });
  } else if (storedGroup == null || !/^[0-5]$/.test(storedGroup)) {
    held.push({ swedish: o.swedish, field: "declension_group", stored: storedGroup, derived: group, reason: !pl ? "no_plural_stored" : !group ? "irregular_plural" : "plural_not_in_saldo" });
  }

  // Gender (not applicable to plural-only nouns: kläder, shorts)
  if (!def && pl && pl === sg) continue;
  const saldoGenders = new Set(rows.map((r) => r.paradigm.match(/^nn_\d+([un])/)?.[1]).filter(Boolean).map((g) => (g === "u" ? "en" : "ett")));
  const evidence = new Set([...(saldoGenders.size === 1 ? saldoGenders : []), genderFromDefinite(sg, def)].filter(Boolean));
  const storedGenus = forms.get("genus") ?? null, storedDetail = o.pos_detail ?? null;   // "" stays "" so the guarded update matches
  const fromStored = new Set([genusLabel(storedGenus), genusLabel(storedDetail)].filter(Boolean));
  let target = null, why = "";
  if (evidence.size === 1) { target = [...evidence][0]; why = "saldo_and_definite_form"; }
  else if (evidence.size === 0 && saldoGenders.size !== 2 && fromStored.size === 1) { target = [...fromStored][0]; why = "label_format"; }
  if (!target) {
    if (!/plural/i.test(`${storedGenus} ${storedDetail}`)) held.push({ swedish: o.swedish, field: "genus", stored: `${storedGenus ?? "∅"} / ${storedDetail ?? "∅"}`, derived: [...evidence].join("|"), reason: evidence.size > 1 ? "saldo_and_definite_form_disagree" : saldoGenders.size === 2 ? "saldo_both_genders" : "no_evidence" });
    continue;
  }
  const reason = (stored) => (!stored ? `missing:${why}` : genusLabel(stored) === target ? "label_format" : `contradicts:${why}`);
  if (storedGenus !== target && !/plural/i.test(storedGenus || "")) changes.push({ table: "word_forms", id: o.id, field: "genus", old: storedGenus, value: target, reason: reason(storedGenus), swedish: o.swedish });
  if (storedDetail !== posDetailFor[target] && !/plural/i.test(storedDetail || "")) changes.push({ table: "learning_objects", id: o.id, field: "pos_detail", old: storedDetail, value: posDetailFor[target], reason: reason(storedDetail), swedish: o.swedish });
}

// SQL: archive first, then apply only where the stored value is still the archived one.
const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const sql = [`-- Grammar corrections ${batch}: ${changes.length} changes.`, "begin;"];
for (let i = 0; i < changes.length; i += 500) {
  sql.push(`insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason) values\n  ${changes.slice(i, i + 500).map((c) => `(${q(batch)}, ${q(c.id)}, ${q(c.table)}, ${q(c.field)}, ${q(c.old)}, ${q(c.value)}, ${q(c.reason)})`).join(",\n  ")};`);
}
const A = `public.content_audit_archive a where a.batch_id = ${q(batch)}`;
sql.push(`update public.word_forms wf set form_value = a.new_value, updated_at = now() from ${A} and a.table_name = 'word_forms' and a.old_value is not null and wf.learning_object_id = a.learning_object_id and wf.form_type = a.field and wf.form_value = a.old_value;`);
sql.push(`insert into public.word_forms (learning_object_id, form_type, form_value, sort_order) select a.learning_object_id, a.field, a.new_value, 0 from ${A} and a.table_name = 'word_forms' and a.old_value is null on conflict (learning_object_id, form_type) do nothing;`);
sql.push(`update public.learning_objects lo set pos_detail = a.new_value from ${A} and a.table_name = 'learning_objects' and a.field = 'pos_detail' and lo.id = a.learning_object_id and lo.pos_detail is not distinct from a.old_value;`);
sql.push("commit;");
writeFileSync(`${outDir}/grammar.sql`, sql.join("\n") + "\n");
writeFileSync(`${outDir}/grammar-rollback.sql`, ["begin;",
  `update public.word_forms wf set form_value = a.old_value, updated_at = now() from ${A} and a.table_name = 'word_forms' and a.old_value is not null and wf.learning_object_id = a.learning_object_id and wf.form_type = a.field and wf.form_value = a.new_value;`,
  `delete from public.word_forms wf using ${A} and a.table_name = 'word_forms' and a.old_value is null and wf.learning_object_id = a.learning_object_id and wf.form_type = a.field and wf.form_value = a.new_value;`,
  `update public.learning_objects lo set pos_detail = a.old_value from ${A} and a.table_name = 'learning_objects' and a.field = 'pos_detail' and lo.id = a.learning_object_id and lo.pos_detail is not distinct from a.new_value;`,
  `delete from public.content_audit_archive where batch_id = ${q(batch)};`, "commit;"].join("\n") + "\n");
writeFileSync(`${outDir}/grammar-preview.tsv`, "headword\tfield\treason\told\tnew\n" + changes.map((c) => [c.swedish, c.field, c.reason, c.old ?? "∅", c.value].join("\t")).join("\n") + "\n");
writeFileSync(`${outDir}/held.tsv`, "headword\tfield\treason\tstored\tderived\n" + held.map((h) => [h.swedish, h.field, h.reason, h.stored ?? "∅", h.derived ?? ""].join("\t")).join("\n") + "\n");
const tally = (list, k) => list.reduce((m, c) => { m[k(c)] = (m[k(c)] || 0) + 1; return m; }, {});
console.log(JSON.stringify({ batch, entries: objects.length, derived, changes: changes.length, byField: tally(changes, (c) => `${c.field} ${c.reason.split(":")[0]}`), held: tally(held, (h) => `${h.field} ${h.reason}`) }, null, 1));
