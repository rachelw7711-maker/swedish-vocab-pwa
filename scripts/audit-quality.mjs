// Full quality audit of words, fixed phrases and expressions (2026-10-31).
// Read-only: checks stored content (not only missing fields) against SALDO, the
// entry's own forms, and simple language/format rules, and sorts every finding into
//   A correct — no action            D missing, needs generated text (AI)
//   B fixable from local data        E stored content looks wrong — AI-assisted or human check
//   C differs from reference data,   F field does not apply
//     can't be called an error
// B findings that would overwrite a stored value carry overwrite: true (applied
// only with the owner's go-ahead). Copyright/source risk is reported apart.
//
//   node --env-file=.env scripts/audit-quality.mjs [--status data/reports/prod/field-status.ndjson]
//        [--out data/reports/prod/quality] [--kelly <Swedish-Kelly_M3_CEFR.xls>]
//
// Needs a fresh scan (scripts/scan-resources.mjs) for the SALDO field status.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import XLSX from "xlsx";
import { useSaldoFiles, saldoEntries, lemmatize, cardFieldsFromSaldo, normalizeGroup, variants, GENUS } from "../server-lexicon.mjs";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const statusFile = opt("--status", "data/reports/prod/field-status.ndjson");
const outDir = opt("--out", "data/reports/prod/quality");
const kellyFile = opt("--kelly", "/Users/huijingwang/Desktop/临时文件/SpråkLab Language Resources/Swedish-Kelly_M3_CEFR.xls");
mkdirSync(outDir, { recursive: true });

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
async function all(table, cols) {
  let out = [];
  for (let from = 0; ; from += 1000) {
    let res;
    for (let attempt = 1; attempt <= 4; attempt++) {
      res = await Promise.resolve().then(() => db.from(table).select(cols).order("id").range(from, from + 999)).catch((error) => ({ error }));
      if (!res.error) break;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
    if (res.error) throw res.error;
    out = out.concat(res.data);
    if (res.data.length < 1000) return out;
  }
}

await useSaldoFiles();
const [objects, forms, translations, examples] = await Promise.all([
  all("learning_objects", "id, swedish, part_of_speech, object_type, status, source, content_origin, access_tier, cefr_level, chinese, swedish_explanation, example_sv, passiv_s, countability, category, match_key"),
  all("word_forms", "id, learning_object_id, form_type, form_value"),
  all("learning_object_translations", "id, learning_object_id, native_language, meaning"),
  all("learning_object_examples", "id, learning_object_id, example_swedish"),
]);
const status = new Map();
readFileSync(statusFile, "utf8").trim().split("\n").forEach((l) => { const s = JSON.parse(l); status.set(`${s.learning_object_id}|${s.field}`, s); });

const formsOf = new Map();
forms.forEach((f) => { if (f.form_value) (formsOf.get(f.learning_object_id) ?? formsOf.set(f.learning_object_id, {}).get(f.learning_object_id))[f.form_type] = f.form_value; });
const meaningOf = new Map();
translations.forEach((t) => { if (t.meaning) meaningOf.set(`${t.learning_object_id}|${t.native_language}`, t.meaning); });
const examplesOf = new Map();
examples.forEach((e) => { if (e.example_swedish) (examplesOf.get(e.learning_object_id) ?? examplesOf.set(e.learning_object_id, []).get(e.learning_object_id)).push(e.example_swedish); });

const kelly = new Map();
if (existsSync(kellyFile)) {
  const wb = XLSX.readFile(kellyFile);
  for (const r of XLSX.utils.sheet_to_json(wb.Sheets.Swedish_M3_CEFR)) {
    const w = String(r["Swedish items for translation\n"] || "").trim().toLowerCase();
    if (w && !kelly.has(w)) kelly.set(w, String(r["CEFR levels"] || "").trim());
  }
}

// ---------------------------------------------------------------------------
const issues = [];
const counts = {};
const bump = (group, key, n = 1) => { (counts[group] ??= {})[key] = ((counts[group] ??= {})[key] || 0) + n; };
function issue(o, field, category, kind, extra = {}) {
  issues.push({ id: o.id, swedish: o.swedish, pos: o.part_of_speech, type: o.object_type, tier: o.access_tier, origin: o.content_origin, field, category, kind, ...extra });
  bump("byCategory", category);
  bump("byKind", `${category} ${field} ${kind}`);
}
const low = (v) => String(v || "").trim().toLowerCase();
const CJK = /[㐀-鿿]/;
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const SALDO_POS = { noun: "nn", verb: "vb", adjective: "av", adverb: "ab", preposition: "pp", conjunction: "kn", pronoun: "pn", numeral: "nl", interjection: "in", perfekt_particip: "av", presens_particip: "av" };
const POS_ZH = [["名词", "noun"], ["动词", "verb"], ["形容词", "adjective"], ["副词", "adverb"], ["介词", "preposition"], ["连词", "conjunction"], ["代词", "pronoun"], ["数词", "numeral"], ["感叹词", "interjection"]];
const FORM_POS = { verb: ["present", "preteritum", "supinum", "imperative", "infinitive"], noun: ["singular_definite", "plural_indefinite", "plural_definite", "genus", "declension_group"], adjective: ["neuter_form", "comparative", "superlative_indefinite"] };

// Plural ending → declension group (the five-group school system SpråkLab uses).
function groupFromPlural(singular, plural) {
  const s = low(singular).replace(/^(en|ett) /, ""), p = variants(plural)[0];
  if (!p || /^(—|-|–|saknas|ingen)$/.test(p)) return "";
  if (p === s) return "5";
  if (p.endsWith("or")) return "1";
  if (p.endsWith("ar")) return "2";
  if (p.endsWith("er") || p.endsWith("r")) return "3";
  if (p.endsWith("n")) return "4";
  return "";
}
// Preteritum → verb group (1 -ade, 2a -de, 2b -te, 3 short stem + dde, 4 vowel change/strong).
function groupFromPreteritum(inf, pret) {
  const i = low(inf), p = variants(pret)[0];
  if (!p) return "";
  if (p.endsWith("ade") && i.endsWith("a")) return "1";
  if (p.endsWith("dde") || (p.endsWith("tt") && !i.endsWith("a"))) return "3";
  if (p.endsWith("de")) return "2a";
  if (p.endsWith("te")) return "2b";
  return "4";
}

async function saldoForms(o) {
  const rows = await saldoEntries(null, o.swedish, o.part_of_speech);
  return { rows, cands: rows.map((r) => cardFieldsFromSaldo(r, o.part_of_speech).forms) };
}
// What a stored form that SALDO doesn't confirm actually is.
async function explainMismatch(o, field, stored, cands) {
  const type = field.slice(5);
  const vs = variants(stored);
  for (const c of cands) {
    for (const [other, value] of Object.entries(c)) {
      if (other === type || /group|genus/.test(other)) continue;
      if (vs.some((v) => variants(value).includes(v))) {
        const pair = [type, other].sort().join("/");
        return { kind: pair === "perfect_participle/supinum" ? "supinum_perfect_participle_confused" : "form_in_wrong_field", detail: `stored value is SALDO's ${other}` };
      }
    }
  }
  const lemmas = (await Promise.all(vs.map((v) => lemmatize(null, v)))).flat();
  if (!lemmas.length) return { kind: "form_not_in_saldo", detail: "no Swedish word form with this spelling" };
  if (lemmas.some((l) => low(l.lemma) === low(o.swedish))) return { kind: "other_form_of_same_word", detail: "a form of this word, not the one this field asks for" };
  return { kind: "form_of_another_word", detail: `form of ${[...new Set(lemmas.map((l) => l.lemma))].slice(0, 3).join(", ")}` };
}

// ---------------------------------------------------------------------------
const explanationsByText = new Map();
const examplesByText = new Map();
let audited = 0;
for (const o of objects) {
  if (o.status === "retired") continue;
  audited++;
  const type = o.object_type === "word" ? "word" : o.object_type === "phrase" ? "phrase" : "expression";
  bump("entries", `${type} ${o.access_tier}`);
  const f = formsOf.get(o.id) || {};
  const st = (field) => status.get(`${o.id}|${field}`);

  if (type === "word") {
    bump("wordsByPos", o.part_of_speech || "none");
    const { rows, cands } = await saldoForms(o);
    // --- every SALDO-checked field: classify mismatches, count verified
    for (const field of Object.keys(f).map((t) => `form:${t}`).concat(["passiv_s", "countability"])) {
      const s = st(field);
      if (!s) continue;
      if (s.status === "verified") { bump("verified", `${o.part_of_speech} ${field}`); continue; }
      if (s.status !== "mismatch") continue;
      const stored = s.detail?.stored ?? f[field.slice(5)];
      const ref = s.detail?.reference;
      if (field === "form:declension_group") {
        const own = groupFromPlural(o.swedish, f.plural_indefinite);
        const g = normalizeGroup(stored, "declension_group");
        const pluralOk = st("form:plural_indefinite")?.status === "verified";
        const sg = normalizeGroup(ref, "declension_group");
        if (!/\d/.test(String(stored))) issue(o, field, "C", "group_label_not_a_number", { stored, reference: ref });
        else if (pluralOk && own && own === sg && g !== own) {
          const swap = (g === "4" && own === "5") || (g === "5" && own === "4");
          issue(o, field, swap ? "C" : "B", swap ? "group_4_5_possible_other_numbering" : "group_contradicts_own_plural", { stored, reference: own, overwrite: !swap, plural: f.plural_indefinite });
        } else if (pluralOk && own === g) issue(o, field, "C", "group_matches_own_plural_saldo_classifies_otherwise", { stored, reference: ref, plural: f.plural_indefinite });
        else if (!pluralOk) issue(o, field, "E", "group_and_plural_both_disputed", { stored, reference: ref, plural: f.plural_indefinite });
        else issue(o, field, "C", "group_other", { stored, reference: ref, plural: f.plural_indefinite });
        continue;
      }
      if (field === "form:verb_group") {
        const own = groupFromPreteritum(o.swedish, f.preteritum);
        const pretOk = st("form:preteritum")?.status === "verified";
        const g = normalizeGroup(stored, "verb_group"), sg = normalizeGroup(ref, "verb_group");
        const label = String(stored).trim();
        // "2" for a 2a verb is less precise, not wrong; "andra gruppen" / Chinese labels are a format issue;
        // school grammars call göra/säga/veta "oregelbundna", which SALDO files under a regular group.
        if (g === "2" && /^2[ab]$/.test(own || sg)) issue(o, field, "C", "group_2_without_subtype", { stored, reference: own || sg });
        else if (/oregel|irregular|不规则/i.test(label)) issue(o, field, "C", "irregular_label_vs_saldo_group", { stored, reference: own || sg, preteritum: f.preteritum });
        else if (!/^(grupp\s*)?[1-4][ab]?$/i.test(label) && pretOk && own && own === sg) issue(o, field, "B", "group_label_format", { stored, reference: own, overwrite: true });
        else if (pretOk && own && own === sg) issue(o, field, "B", "group_contradicts_own_preteritum", { stored, reference: own, overwrite: true, preteritum: f.preteritum });
        else if (pretOk && own === g) issue(o, field, "C", "group_matches_own_preteritum_saldo_classifies_otherwise", { stored, reference: ref, preteritum: f.preteritum });
        else issue(o, field, pretOk ? "C" : "E", pretOk ? "group_other" : "group_and_preteritum_both_disputed", { stored, reference: ref, preteritum: f.preteritum });
        continue;
      }
      if (field === "form:genus") {
        const def = variants(f.singular_definite)[0] || "";
        const defGenus = def.endsWith("et") || (def.endsWith("t") && !def.endsWith("en")) ? "ett" : def.endsWith("en") || def.endsWith("n") ? "en" : "";
        const refG = GENUS[low(ref)] || low(ref);
        if (defGenus && defGenus === refG) issue(o, field, "B", "genus_contradicts_own_definite_form", { stored, reference: refG, overwrite: true, definite: f.singular_definite });
        else issue(o, field, "C", defGenus === (GENUS[low(stored)] || low(stored)) ? "whole_entry_other_gender_than_saldo" : "genus_other", { stored, reference: ref, definite: f.singular_definite });
        continue;
      }
      if (field === "passiv_s" || field === "countability") { issue(o, field, "C", "differs_from_saldo", { stored, reference: ref }); continue; }
      // A plural stored like the singular: a zero plural or no plural is being claimed, not a misplaced form.
      if (/^form:plural_/.test(field) && variants(stored)[0] === low(o.swedish) && (["5", "0"].includes(normalizeGroup(f.declension_group, "declension_group")) || o.countability === "uncountable")) {
        issue(o, field, "C", "zero_plural_claimed", { stored, reference: ref });
        continue;
      }
      const why = await explainMismatch(o, field, stored, cands);
      const single = new Set(cands.map((c) => c[field.slice(5)]).filter(Boolean)).size === 1;
      const category = why.kind === "form_not_in_saldo" && single ? "B" : why.kind === "form_in_wrong_field" || why.kind === "supinum_perfect_participle_confused" ? (single ? "B" : "E") : "E";
      issue(o, field, category, why.kind, { stored, reference: ref, detail: why.detail, overwrite: category === "B" });
    }

    // --- fields that don't apply
    for (const [k, s] of [["form:plural_indefinite", st("form:plural_indefinite")], ["form:plural_definite", st("form:plural_definite")]]) if (s?.status === "not_applicable") bump("notApplicable", `${o.part_of_speech} ${k}`);
    if (o.part_of_speech === "verb" && rows.length && cands.every((c) => !c.perfect_participle)) bump("notApplicable", "verb form:perfect_participle (SALDO: no participle)");
    if (o.part_of_speech === "verb" && rows.length && cands.every((c) => !c.present_participle)) bump("notApplicable", "verb form:present_participle (SALDO: deponent)");

    // --- adjectives: comparison
    if (o.part_of_speech === "adjective") {
      const comp = f.comparative || "";
      const s = st("form:comparative");
      if (comp && /^mer /i.test(comp.trim())) {
        const synthetic = cands.some((c) => c.comparative && !/^mer /.test(c.comparative));
        const shortCommon = low(o.swedish).length <= 5 && !/(isk|ad|en|ande|ende|t)$/.test(low(o.swedish));
        if (synthetic && shortCommon) issue(o, "form:comparative", "E", "periphrastic_for_short_adjective", { stored: comp, reference: cands[0]?.comparative });
        else bump("adjectiveComparison", "periphrastic (mer/mest) kept");
      } else if (comp) bump("adjectiveComparison", s?.status === "verified" ? "synthetic, matches SALDO" : "synthetic, not checked");
      else if (/isk$/.test(low(o.swedish))) issue(o, "form:comparative", "D", "isk_adjective_mer_mest_or_not_comparable", { reference: `mer ${o.swedish}` });
      else if (/(sk|ad|ade|en|ande|ende)$/.test(low(o.swedish)) || ["död", "gravid", "gratis", "levande", "unik", "total", "kvadratisk", "rund"].includes(low(o.swedish))) issue(o, "form:comparative", "D", "may_be_mer_mest_or_not_comparable", { reference: cands[0]?.comparative });
      else issue(o, "form:comparative", "D", "missing_comparison", { reference: cands[0]?.comparative, note: "SALDO -are/-ast is only a suggestion" });
    }
    if (["perfekt_particip", "presens_particip"].includes(o.part_of_speech) && !f.comparative) bump("notApplicableOrJudgement", `${o.part_of_speech} comparison (usually mer/mest or none)`);

    // --- part of speech: SALDO has the headword only as another word class
    const sp = SALDO_POS[o.part_of_speech];
    if (sp && !rows.length && !o.swedish.includes(" ")) {
      const other = (await lemmatize(null, o.swedish)).filter((l) => low(l.lemma) === low(o.swedish));
      const zh = POS_ZH.find(([w]) => String(meaningOf.get(`${o.id}|zh`) || o.chinese || "").includes(w))?.[1];
      if (other.length) issue(o, "part_of_speech", zh && other.some((l) => l.pos === zh) ? "E" : "C", zh && other.some((l) => l.pos === zh) ? "pos_contradicted_by_saldo_and_chinese" : "saldo_has_headword_only_as_other_pos", { stored: o.part_of_speech, reference: [...new Set(other.map((l) => l.pos))].join("/") });
    }
    for (const [pos, types] of Object.entries(FORM_POS)) {
      if (pos === o.part_of_speech || (o.part_of_speech || "").includes("particip")) continue;
      const strays = types.filter((t) => f[t] && !(FORM_POS[o.part_of_speech] || []).includes(t));
      if (strays.length >= 2) issue(o, "forms", "E", `forms_of_${pos}_on_${o.part_of_speech}`, { stored: strays.join(",") });
    }
  }

  // --- learning text, all types
  const expl = String(o.swedish_explanation || "").trim();
  if (!expl) {
    const held = st("swedish_explanation")?.detail;
    if (held?.fill === "review") issue(o, "swedish_explanation", "E", `note_text_held_${held.reason}`, { stored: held.reference });
    else issue(o, "swedish_explanation", "D", "missing");
  }
  if (expl) {
    if (CJK.test(expl)) issue(o, "swedish_explanation", "E", "contains_chinese", { stored: expl });
    else if (/^(swedish explanation|forms|tags):/im.test(expl)) issue(o, "swedish_explanation", "B", "import_labels_in_text", { stored: expl, overwrite: true });
    else if (low(expl).replace(/[.!]$/, "") === low(o.swedish)) issue(o, "swedish_explanation", "E", "only_repeats_headword", { stored: expl });
    else if (expl.length < 4) issue(o, "swedish_explanation", "E", "too_short", { stored: expl });
    else {
      const words = low(expl).replace(/\([^)]*\)/g, " ").match(/[a-zåäöéü]+/g) || [];
      const known = (await Promise.all(words.map(async (w) => /[åäö]/.test(w) || (await lemmatize(null, w)).length))).filter(Boolean).length;
      if (words.length && known / words.length < 0.6) issue(o, "swedish_explanation", "E", "not_swedish", { stored: expl });
      else bump("explanationOk", type);
      if (type === "word" && new RegExp(`(^|[^a-zåäö])${low(o.swedish).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-zåäö]|$)`).test(low(expl))) bump("explanationRepeatsHeadword", type);
    }
    const key = low(expl);
    (explanationsByText.get(key) ?? explanationsByText.set(key, []).get(key)).push(o);
  }

  const zh = meaningOf.get(`${o.id}|zh`) || o.chinese || "";
  if (!zh) issue(o, "meaning_zh", "D", "missing");
  else if (!CJK.test(zh)) issue(o, "meaning_zh", "E", "no_chinese_characters", { stored: zh });
  else if (o.chinese && meaningOf.get(`${o.id}|zh`) && low(o.chinese) !== low(meaningOf.get(`${o.id}|zh`))) bump("chineseTwoSourcesDiffer", type);
  if (type === "word" && zh) {
    const hint = POS_ZH.find(([w]) => zh.startsWith(w) || zh.includes(`（${w}）`) || zh.includes(`(${w})`))?.[1];
    if (hint && o.part_of_speech && hint !== o.part_of_speech && !(o.part_of_speech.includes("particip") && hint === "adjective")) issue(o, "part_of_speech", "E", "chinese_gloss_names_other_pos", { stored: o.part_of_speech, reference: hint });
  }
  if (!meaningOf.get(`${o.id}|en`)) issue(o, "meaning_en", "D", "missing");

  const exs = [...(examplesOf.get(o.id) || []), ...(o.example_sv ? [o.example_sv] : [])].filter(Boolean);
  if (!exs.length) issue(o, "example", "D", "missing");
  else {
    const ex = exs[0];
    if (CJK.test(ex)) issue(o, "example", "E", "contains_chinese", { stored: ex });
    else if (type === "word") {
      const forms = new Set([low(o.swedish), ...Object.values(f).flatMap((v) => variants(v)), ...(await saldoEntries(null, o.swedish, o.part_of_speech)).flatMap((r) => Object.values(cardFieldsFromSaldo(r, o.part_of_speech).forms).flatMap((v) => variants(v)))].filter((v) => v && v.length > 1));
      const tokens = low(ex).match(/[a-zåäöéü-]+/g) || [];
      const stem = low(o.swedish).slice(0, Math.max(3, low(o.swedish).length - 2));
      const hit = tokens.some((t) => forms.has(t) || t.includes(stem) || [...forms].some((fv) => fv.length > 3 && t.includes(fv)));
      if (!hit && !o.swedish.includes(" ")) issue(o, "example", "E", "example_without_the_word", { stored: ex });
      else bump("exampleOk", type);
    } else bump("exampleOk", type);
    for (const e of new Set(exs)) { const k = low(e); (examplesByText.get(k) ?? examplesByText.set(k, new Set()).get(k)).add(o.id); }
  }

  if (type === "word") {
    if (!o.cefr_level) issue(o, "cefr_level", "D", "missing");
    else if (!LEVELS.includes(o.cefr_level)) issue(o, "cefr_level", "E", "invalid_value", { stored: o.cefr_level });
    else {
      const k = kelly.get(low(o.swedish));
      if (k && Math.abs(LEVELS.indexOf(k) - LEVELS.indexOf(o.cefr_level)) >= 3) issue(o, "cefr_level", "C", "far_from_kelly_frequency_band", { stored: o.cefr_level, reference: `Kelly ${k}` });
      else bump("cefr", k ? "within 2 levels of Kelly" : "not in Kelly");
    }
  }
}

// Same explanation on different headwords; same example sentence on 3+ entries.
const sharedExplanations = [...explanationsByText.entries()].filter(([, os]) => new Set(os.map((x) => low(x.swedish))).size > 2);
for (const [text, os] of sharedExplanations) for (const o of os) issue(o, "swedish_explanation", "C", "same_explanation_on_3plus_headwords", { stored: text });
const sharedExamples = [...examplesByText.entries()].filter(([, ids]) => ids.size > 2);
bump("examplesShared", "sentences used on 3+ entries", sharedExamples.length);

// Phrases and expressions: near-duplicates the key keeps apart on purpose.
const keys = new Map();
objects.filter((o) => o.object_type !== "word" && o.status !== "retired" && o.match_key).forEach((o) => keys.set(o.match_key, o));
const nearDuplicates = [];
for (const [k, o] of keys) {
  const base = k.replace(/ (ngt|ngn|sig|ngns)$/, "");
  if (base !== k && keys.has(base)) nearDuplicates.push({ a: keys.get(base).swedish, b: o.swedish, aType: keys.get(base).object_type, bType: o.object_type });
}
const categoryMix = {};
objects.filter((o) => o.object_type !== "word").forEach((o) => { const k = `${o.object_type} / ${o.category || "-"}`; categoryMix[k] = (categoryMix[k] || 0) + 1; });

const summary = {
  auditedAt: new Date().toISOString(), entries: audited, counts,
  explanationsSharedBy3plus: sharedExplanations.length, phraseNearDuplicates: nearDuplicates, phraseCategories: categoryMix,
};
writeFileSync(`${outDir}/summary.json`, JSON.stringify(summary, null, 1));
writeFileSync(`${outDir}/issues.ndjson`, issues.map((i) => JSON.stringify(i)).join("\n") + "\n");
console.log(JSON.stringify({ entries: audited, byCategory: counts.byCategory, nearDuplicates: nearDuplicates.length, sharedExplanations: sharedExplanations.length }, null, 1));
