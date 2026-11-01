// Final review of the open rows of the 2026-11-01 review list (2026-11-01). For each entry
// the model sees the stored data, its meaning and every SALDO lexeme with that spelling,
// and gives a verdict per flagged row: fix / fill (a value), correct, not_applicable or
// unverifiable. The model never writes: a fix or fill is kept only when its value is
// exactly a form of the SALDO lexeme it cites (group numbers and gender: what that lexeme's
// paradigm gives), and anything else goes to a manual list. Read-only on the database.
//
//   node --env-file=.env scripts/review-final.mjs --status <review-512-status.tsv> --out <dir> [--limit n]
// Writes <out>/ai/<entry>.json (cached answers, so a rerun resumes), <out>/verdicts.tsv.
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { useSaldoFiles, saldoEntries } from "../server-lexicon.mjs";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const outDir = opt("--out", "data/reports/review-2026-11-01/final");
const limit = Number(opt("--limit", "0")) || Infinity;
mkdirSync(`${outDir}/ai`, { recursive: true });
const MODEL = "gpt-5.4";
const PRICE = { input: 2.5, cachedInput: 0.25, output: 15 };   // USD per 1M tokens (gpt-5.4, synchronous)

await useSaldoFiles();
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Open rows: not yet fixed, not resolved by an earlier batch or by a now-valid group label.
const DONE = new Set(["entry_deleted", "now_matches_candidate", "fixed_2026-11-01", "fixed_round2"]);
const [header, ...lines] = readFileSync(opt("--status"), "utf8").replace(/\r/g, "").trim().split("\n").map((l) => l.split("\t"));
const rows = lines.map((l) => Object.fromEntries(header.map((h, i) => [h, l[i] ?? ""])))
  .filter((r) => !DONE.has(r.status))
  .filter((r) => !(r.src === "held" && (r.archive_batches.includes("8450a963") || (r.issue === "irregular_plural" && r.current === "irregular")
    || ["uncountable", "plurale_tantum", "indeclinable"].includes(r.current))));

const groups = new Map();
for (const r of rows) {
  const k = `${r.headword}|${r.pos}`;
  (groups.get(k) ?? groups.set(k, []).get(k)).push(r);
}

// SALDO evidence: every lexeme with this spelling, its paradigm and the nominative forms.
const KEEP = /^(sg|pl) (indef|def) nom$|^pos indef sg [un] nom$|^pos indef pl nom$|^pos def sg no_masc nom$|^komp nom$|^super (indef|def no_masc) nom$|^(inf|pres ind|pret ind|sup) aktiv$|^imper$|^pret_part indef (sg [un]|pl) nom$|^pres_part nom$|^(inf|pres ind) s-form$|^pos$|^komp$|^super$/;
function saldoEvidence(rowsFor) {
  return rowsFor.map((r) => ({ lemgram: r.lemgram, pos: r.pos, paradigm: r.paradigm,
    forms: Object.fromEntries(Object.entries(r.forms).filter(([k]) => KEEP.test(k))) }));
}

const SYSTEM = `You review flagged fields of a Swedish learner's dictionary for errors. For each flagged row decide:
- "fix": the stored value is wrong; give the correct value.
- "fill": the value is missing and the word does have this form; give it.
- "correct": the stored value is right (an accepted variant, or a different but valid classification).
- "not_applicable": the word has no such form in this sense (e.g. an uncountable noun has no plural, an abbreviation does not inflect); the field should stay empty.
- "unverifiable": the evidence does not settle it.
Rules:
1. SALDO is the authority for forms. A "fix" or "fill" value for a form must be copied exactly from the forms of ONE SALDO lexeme listed for this word, and you must give that lexeme's lemgram. Never construct a form yourself. Several valid variants may be given joined by " / " only if all of them are in that lexeme.
2. Pick the SALDO lexeme whose sense matches the entry's meaning (homographs differ: damm "dust" vs "pond").
3. Gender: "en" for SALDO paradigms nn_*u_*, "ett" for nn_*n_*; nn_*v_* allows both (then "correct" for either).
4. Noun group (declension_group) follows the plural ending: -or 1, -ar 2, -er or -r 3, -n 4, no ending 5; "irregular" (man/män, umlaut), "uncountable", "plurale_tantum", "indeclinable" are valid labels. Verb group: 1 (-ar), 2a (-de), 2b (-te), 3 (short verbs -dde), 4 (strong/irregular); "s-verb" or "deponensverb" labels are acceptable for s-verbs.
5. A plural that exists only for a different sense, or only as "sorter av" usage, is not required: "correct" for an empty plural of a mass noun.
6. If the flag itself is wrong (a false positive of the automatic check), the verdict is "correct" and the reason says why.
7. You may use your knowledge of SAOL and Svenska ordboken (SO) as supporting evidence and say so, but it cannot override SALDO for a written value.
8. "not_applicable" is only for an EMPTY field. A stored value is "correct" or "fix", never "not_applicable".
9. A stored form that appears among the forms of the matching SALDO lexeme for that slot is "correct" (variants included).
10. If the matching SALDO lexeme lists plural forms, the word has a plural (for mass nouns it is the "kinds of" plural): an empty plural is "fill" with SALDO's form, unless the entry's countability is "uncountable". If that lexeme has no plural forms, an empty plural is "not_applicable".
11. Keep plural and group consistent: a group number 1–5 needs a plural; a noun without plural gets the label "uncountable" (or keeps a valid label).
12. A field that is not a form (part_of_speech, swedish_explanation, example, "forms"): "correct" if the flag is a false positive, otherwise "fix" with the value described in the reason (it will be checked by hand).
Answer every row by its key. Reasons: one short English sentence.`;

const SCHEMA = {
  type: "object", additionalProperties: false, required: ["rows"],
  properties: { rows: { type: "array", items: { type: "object", additionalProperties: false,
    required: ["key", "verdict", "value", "lemgram", "confidence", "reason"],
    properties: {
      key: { type: "string" },
      verdict: { type: "string", enum: ["fix", "fill", "correct", "not_applicable", "unverifiable"] },
      value: { type: "string", description: "fix/fill: the value; otherwise empty" },
      lemgram: { type: "string", description: "SALDO lexeme supporting the verdict, or empty" },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      reason: { type: "string" },
    } } } },
};

let usage = { input: 0, cached: 0, output: 0 }, calls = 0;
const verdicts = [];
let n = 0;
for (const [k, flagged] of groups) {
  if (n++ >= limit) break;
  const [headword, pos] = k.split("|");
  const cache = `${outDir}/ai/${encodeURIComponent(k)}.json`;
  let answer;
  const { data: objs } = await db.from("learning_objects").select("id, swedish, part_of_speech, swedish_explanation, countability, word_forms(form_type, form_value), learning_object_translations(native_language, meaning), learning_object_examples(example_swedish)")
    .eq("swedish", headword).neq("status", "retired");
  const o = (objs || []).find((x) => x.part_of_speech === pos) || (objs || [])[0];
  if (!o) { flagged.forEach((r) => verdicts.push({ ...r, id: "", verdict: "entry_missing", value: "", lemgram: "", confidence: "", reason: "entry not found", valid: "" })); continue; }
  const saldo = saldoEvidence(await saldoEntries(null, headword, null));
  if (existsSync(cache)) answer = JSON.parse(readFileSync(cache, "utf8"));
  else {
    const entry = {
      headword, part_of_speech: o.part_of_speech, countability: o.countability,
      meaning_en: o.learning_object_translations.find((t) => t.native_language === "en")?.meaning || "",
      meaning_zh: o.learning_object_translations.find((t) => t.native_language === "zh")?.meaning || "",
      swedish_explanation: o.swedish_explanation, examples: o.learning_object_examples.map((e) => e.example_swedish).slice(0, 3),
      stored_forms: Object.fromEntries(o.word_forms.map((f) => [f.form_type, f.form_value])),
    };
    const flags = flagged.map((r, i) => ({ key: String(i), field: r.field, flag: r.issue, stored: r.current || r.stored_then, check_candidate: r.candidate }));
    const res = await ai.chat.completions.create({
      model: MODEL, reasoning_effort: "low",
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: JSON.stringify({ entry, saldo, flagged_rows: flags }) }],
      response_format: { type: "json_schema", json_schema: { name: "review", strict: true, schema: SCHEMA } },
    });
    calls++;
    const u = res.usage || {};
    const cached = u.prompt_tokens_details?.cached_tokens || 0;
    usage.input += u.prompt_tokens || 0; usage.cached += cached; usage.output += u.completion_tokens || 0;
    answer = { model: MODEL, usage: u, saldo, entry, flags, ...JSON.parse(res.choices[0].message.content) };
    writeFileSync(cache, JSON.stringify(answer, null, 1));
  }
  flagged.forEach((r, i) => {
    const a = answer.rows.find((x) => x.key === String(i)) || { verdict: "unverifiable", value: "", lemgram: "", confidence: "low", reason: "no answer" };
    verdicts.push({ ...r, id: o.id, ...a, valid: validate(r, a, saldo, o) });
  });
}

// A written value must come from the cited SALDO lexeme.
function validate(r, a, saldo, o) {
  const slot = r.field.replace(/^form:/, "");
  const stored = (o.word_forms.find((f) => f.form_type === slot)?.form_value || "").trim();
  const isForm = r.field.startsWith("form:") || ["declension_group", "genus", "verb_group"].includes(r.field);
  if (!isForm) return a.verdict === "correct" ? "" : "manual_non_form";
  if (a.verdict === "not_applicable") return stored && !["-", "—", "∅"].includes(stored) ? "na_on_stored_value" : "";
  if (a.verdict === "correct" && slot === "declension_group" && /^[1-5]$/.test(stored)) {
    const lex = saldo.find((s) => s.lemgram === a.lemgram) || (saldo.length === 1 ? saldo[0] : null);
    const pl = lex?.forms["pl indef nom"] || [];
    const sg = (lex?.forms["sg indef nom"] || [])[0] || r.headword;
    const group = (p) => p === sg ? "5" : p.endsWith("or") ? "1" : p.endsWith("ar") ? "2" : p.endsWith("er") || p.endsWith("r") ? "3" : p.endsWith("n") ? "4" : "";
    if (pl.length && !pl.some((p) => group(p) === stored)) return "group_conflicts_with_saldo";
  }
  if (a.verdict === "correct" && /plural|singular|form|comparative|superlative|present|preteritum|supinum|imperative|infinitive/.test(slot) && stored) {
    const all = new Set(saldo.flatMap((s) => Object.values(s.forms).flat()));
    if (saldo.length && !stored.split(/\s*\/\s*/).every((v) => all.has(v))) return "correct_but_not_in_saldo";
  }
  if (a.verdict !== "fix" && a.verdict !== "fill") return "";
  const lex = saldo.find((s) => s.lemgram === a.lemgram);
  if (!lex) return "no_such_lemgram";
  // A noun's forms come from a lexeme of the entry's own gender (not a homograph of the other gender).
  const genus = o.word_forms.find((f) => f.form_type === "genus")?.form_value;
  const lexGender = lex.paradigm.match(/^nn_[0-9v]([unv])_/)?.[1];
  if (slot !== "genus" && lexGender && lexGender !== "v" && ((genus === "en" && lexGender === "n") || (genus === "ett" && lexGender === "u"))) return "lexeme_gender_differs";
  const vals = a.value.split(/\s*\/\s*/).filter(Boolean);
  const pl = lex.forms["pl indef nom"] || [];
  if (slot === "genus") {
    const m = lex.paradigm.match(/^nn_[0-9v]([unv])_/);
    const g = m?.[1];
    return (g === "u" && a.value === "en") || (g === "n" && a.value === "ett") || g === "v" ? "ok" : "genus_not_from_paradigm";
  }
  if (slot === "declension_group") {
    // "uncountable" only for a lexeme without plural; "irregular" only when the plural
    // does not follow the endings; "indeclinable" when the plural is the singular unchanged.
    if (a.value === "uncountable") return pl.length ? "label_but_saldo_has_plural" : "ok_label";
    if (a.value === "plurale_tantum") return "manual_label";
    const sg = (lex.forms["sg indef nom"] || [])[0] || r.headword;
    const group = (p) => p === sg ? "5" : p.endsWith("or") ? "1" : p.endsWith("ar") ? "2" : p.endsWith("er") || p.endsWith("r") ? "3" : p.endsWith("n") ? "4" : "";
    if (a.value === "irregular") return pl.length && !pl.some((p) => group(p)) ? "ok_label" : pl.length && pl.every((p) => !p.startsWith(sg.slice(0, -1))) ? "ok_label" : "manual_label";
    if (a.value === "indeclinable") return pl.length && pl.every((p) => p === sg) ? "ok_label" : "manual_label";
    return pl.some((p) => group(p) === a.value) ? "ok" : "group_not_from_plural";
  }
  if (slot === "verb_group") return ["1", "2a", "2b", "3", "4"].includes(a.value) && lex.pos === "vb" ? "ok" : "bad_verb_group";
  const all = new Set(Object.values(lex.forms).flat());
  return vals.length && vals.every((v) => all.has(v)) ? "ok" : "value_not_in_saldo";
}

const cols = ["src", "headword", "pos", "field", "issue", "stored_then", "candidate", "current", "id", "verdict", "value", "lemgram", "confidence", "valid", "reason"];
writeFileSync(`${outDir}/verdicts.tsv`, [cols.join("\t"), ...verdicts.map((v) => cols.map((c) => String(v[c] ?? "").replace(/[\t\n]/g, " ")).join("\t"))].join("\n") + "\n");
const usd = ((usage.input - usage.cached) * PRICE.input + usage.cached * PRICE.cachedInput + usage.output * PRICE.output) / 1e6;
const count = verdicts.reduce((m, v) => ((m[v.verdict] = (m[v.verdict] || 0) + 1), m), {});
console.log(JSON.stringify({ entries: Math.min(groups.size, limit), rows: verdicts.length, calls, usage, usd: Number(usd.toFixed(4)), verdicts: count }));
