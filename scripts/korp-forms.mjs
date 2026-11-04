// Forms only the AI gave (status "present"), checked against Korp (2026-11-04; server-korp.mjs).
//   node --env-file=.env scripts/korp-forms.mjs [--limit n] [--write]
// No AI. For each entry with unconfirmed forms:
//  - a form type the part of speech does not have (an adverb's "neuter form", a noun's
//    "preteritum") is no form of the word: removed (archived), the grammar notes re-checked;
//  - a single-word form is verified when the corpus has it for this lemma, tagged as that
//    inflection, in several corpora (judgeForm); a particle / reflexive verb's form by its verb
//    ("tar hand om": tar as the present of ta, the rest as in the headword); any other
//    multi-word form ("mer abstrakt", "de kursiva stilarna") by the exact sequence;
//  - a form the corpus never shows, while it shows another spelling for that inflection of the
//    word often and widely (vackerare → vackrare), is corrected to the corpus form (archived);
//  - a noun's declension group is verified when it follows by rule from its verified forms.
// Results cached in data/reports/korp-forms/ (resumable).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { korpFormReadings, korpSequence, judgeForm, comparisonByRule, groupFromForms, FORM_MSD, FORM_THRESHOLD } from "../server-korp.mjs";
import { variants } from "../server-lexicon.mjs";
import { markDependentsForRecheck } from "../server-resources.mjs";

const opt = (name, d = null) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : d; };
const WRITE = process.argv.includes("--write");
const LIMIT = Number(opt("--limit", "0")) || Infinity;
const OUT = "data/reports/korp-forms/";
mkdirSync(OUT, { recursive: true });
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };

// Forms no word of that part of speech has: an adverb inflects for neither gender nor number
// (lite → "mest litea" was made up). Other odd types (a noun's "preteritum") may mean the part of
// speech itself is wrong: left for the part-of-speech check, not removed.
const NO_FORM = { adverb: ["neuter_form", "plural_form", "plural_indefinite", "plural_definite", "singular_definite"] };
const applies = (pos, type) => !(NO_FORM[pos] || []).includes(type);

const REFLEXIVE = new Set(["sig", "mig", "dig", "oss", "er", "sej", "mej", "dej"]);
const rest = (words) => words.map((w) => (REFLEXIVE.has(w) ? "sig" : w)).join(" ");

async function pageAll(build) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const part = must(await build().range(from, from + 999));
    rows.push(...part);
    if (part.length < 1000) return rows;
  }
}
const statuses = await pageAll(() => db.from("resource_field_status").select("learning_object_id, field, status, source, detail").like("field", "form:%").in("status", ["present", "missing"]));
const byEntry = new Map();
for (const s of statuses) (byEntry.get(s.learning_object_id) || byEntry.set(s.learning_object_id, []).get(s.learning_object_id)).push(s);
const ids = [...byEntry.keys()].slice(0, LIMIT);
console.log({ statuses: statuses.length, entries: ids.length, write: WRITE });

const CACHE = OUT + "results.json";
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
const save = () => writeFileSync(CACHE, JSON.stringify(cache, null, 1));

async function check(id) {
  const o = must(await db.from("learning_objects").select("id, swedish, part_of_speech, status, word_forms(id, form_type, form_value)").eq("id", id).single());
  if (o.status === "retired") return { skipped: "retired" };
  const forms = Object.fromEntries(o.word_forms.map((f) => [f.form_type, f]));
  const head = o.swedish.trim().toLowerCase().split(/\s+/);
  const lemma = head.length > 1 && o.part_of_speech === "verb" ? head[0] : head.length === 1 ? head[0] : null;
  const { cqp, readings } = lemma ? await korpFormReadings(lemma, o.part_of_speech) : { cqp: null, readings: [] };
  const out = { lemma: o.swedish, pos: o.part_of_speech, cqp, at: new Date().toISOString(), forms: {} };
  for (const s of byEntry.get(id)) {
    const type = s.field.slice(5), f = forms[type];
    if (!f) { out.forms[type] = { ok: null, reason: "no stored form" }; continue; }
    if (!applies(o.part_of_speech, type)) { out.forms[type] = { remove: true, value: f.form_value, reason: `a ${o.part_of_speech} has no ${type}` }; continue; }
    if (type === "declension_group" || type === "genus") continue;   // decided below / by the other forms
    if (!FORM_MSD[type]) { out.forms[type] = { ok: null, value: f.form_value, reason: `no corpus tag for ${type}` }; continue; }
    const results = [];
    for (const v of variants(f.form_value)) {
      const words = v.toLowerCase().split(/\s+/);
      if (words.length === 1) results.push({ v, ...judgeForm(type, v, readings) });
      else if (lemma && head.length > 1 && rest(words.slice(1)) === rest(head.slice(1))) results.push({ v, ...judgeForm(type, words[0], readings), via: "verb" });
      else {
        const seq = await korpSequence(v);
        results.push({ v, ok: seq.hits >= FORM_THRESHOLD.hits && seq.corpora >= FORM_THRESHOLD.corpora, hits: seq.hits, corpora: seq.corpora, reason: `${seq.hits} hits of the sequence in ${seq.corpora} corpora`, cqp: seq.cqp });
      }
    }
    const fix = results.length === 1 && results[0].corpus_form && results[0].via !== "verb" ? results[0].corpus_form : null;
    out.forms[type] = { value: f.form_value, ok: results.length > 0 && results.every((r) => r.ok), variants: results, ...(fix ? { fix } : {}) };
  }
  // The comparison as one paradigm (comparisonByRule), when the -a form it builds on is checked.
  const cmp = ["comparative", "superlative_indefinite", "superlative_definite"];
  if (cmp.some((t) => out.forms[t]?.ok === false)) {
    const { data: st } = await db.from("resource_field_status").select("field, status").eq("learning_object_id", id).in("field", [...cmp.map((t) => `form:${t}`), "form:plural_form"]);
    const okNow = (t) => out.forms[t]?.ok === true || (!out.forms[t] && st.find((x) => x.field === `form:${t}`)?.status === "verified");
    const values = Object.fromEntries(cmp.map((t) => [t, forms[t]?.form_value]));
    const pluralChecked = okNow("plural_form") || st.find((x) => x.field === "form:plural_form")?.status === "not_applicable";
    const rule = pluralChecked && comparisonByRule(o.swedish, forms.plural_form?.form_value, values, Object.fromEntries(cmp.map((t) => [t, okNow(t)])));
    if (rule) for (const t of cmp) if (out.forms[t] && !out.forms[t].ok) Object.assign(out.forms[t], { ok: true, rule: `${rule} paradigm, ${cmp.filter(okNow).join(" + ")} attested` });
  }
  return out;
}

const todo = ids.filter((id) => !cache[id]);
let done = 0;
async function worker() {
  while (todo.length) {
    const id = todo.shift();
    try { cache[id] = await check(id); } catch (e) { console.error(id, e.message); continue; }
    if (++done % 25 === 0) { save(); console.log("checked", done, "left", todo.length); }
  }
}
await Promise.all([1, 2, 3].map(worker));
save();

// Declension groups: after the forms (stored values, or the corrections about to be made).
const groupStatus = new Map(statuses.filter((s) => s.field === "form:declension_group").map((s) => [s.learning_object_id, s]));
const tally = {};
const inc = (k) => (tally[k] = (tally[k] || 0) + 1);
for (const id of ids) for (const [t, r] of Object.entries(cache[id]?.forms || {})) inc(r.remove ? "remove" : r.fix ? "fix" : r.ok ? "verified" : r.ok === null ? "not_judged" : "unconfirmed");
console.log(tally);

if (WRITE) {
  const batch = randomUUID(), at = new Date().toISOString();
  const written = { verified: 0, fixed: 0, removed: 0, group_verified: 0, open: 0 };
  for (const id of ids) {
    const c = cache[id];
    if (!c?.forms) continue;
    const o = must(await db.from("learning_objects").select("id, word_forms(id, form_type, form_value)").eq("id", id).single());
    const forms = Object.fromEntries(o.word_forms.map((f) => [f.form_type, f]));
    const changed = [];
    for (const [type, r] of Object.entries(c.forms)) {
      const s = byEntry.get(id).find((x) => x.field === `form:${type}`), f = forms[type];
      if (!s || !f || f.form_value !== (r.value ?? f.form_value)) continue;   // changed since
      const korp = { checked_at: c.at, cqp: c.cqp, ...r };
      if (r.remove) {
        must(await db.from("content_audit_archive").insert([
          { batch_id: batch, learning_object_id: id, table_name: "word_forms", field: type, old_value: f.form_value, new_value: null, reason: `korp_forms:${r.reason}` },
          { batch_id: batch, learning_object_id: id, table_name: "resource_field_status", field: s.field, old_value: JSON.stringify(s), new_value: null, reason: `korp_forms:${r.reason}` }]));
        must(await db.from("word_forms").delete().eq("id", f.id));
        must(await db.from("resource_field_status").delete().eq("learning_object_id", id).eq("field", s.field));
        changed.push(type); written.removed++;
      } else if (r.fix) {
        must(await db.from("content_audit_archive").insert([
          { batch_id: batch, learning_object_id: id, table_name: "word_forms", field: type, old_value: f.form_value, new_value: r.fix, reason: "korp_forms:corpus_form" },
          { batch_id: batch, learning_object_id: id, table_name: "resource_field_status", field: s.field, old_value: JSON.stringify(s), new_value: "verified", reason: "korp_forms:corpus_form" }]));
        must(await db.from("word_forms").update({ form_value: r.fix }).eq("id", f.id));
        must(await db.from("resource_field_status").update({ status: "verified", source: "korp-form", detail: { ...(s.detail || {}), korp, corrected_from: f.form_value }, updated_at: at }).eq("learning_object_id", id).eq("field", s.field));
        forms[type] = { ...f, form_value: r.fix };
        changed.push(type); written.fixed++;
      } else if (r.ok) {
        must(await db.from("content_audit_archive").insert({ batch_id: batch, learning_object_id: id, table_name: "resource_field_status", field: s.field, old_value: JSON.stringify(s), new_value: "verified", reason: "korp_forms:attested" }));
        must(await db.from("resource_field_status").update({ status: "verified", source: "korp-form", detail: { ...(s.detail || {}), korp }, updated_at: at }).eq("learning_object_id", id).eq("field", s.field));
        written.verified++;
      } else if (r.ok === false) {
        must(await db.from("resource_field_status").update({ detail: { ...(s.detail || {}), korp, open: "korp_form_unattested" }, updated_at: at }).eq("learning_object_id", id).eq("field", s.field));
        written.open++;
      }
    }
    // The group by rule, from forms that are now all verified.
    const g = groupStatus.get(id);
    if (g && forms.declension_group) {
      const { data: st } = await db.from("resource_field_status").select("field, status").eq("learning_object_id", id).in("field", ["form:singular_definite", "form:plural_indefinite", "form:genus"]);
      const verified = (t) => !forms[t] || st.find((x) => x.field === `form:${t}`)?.status === "verified";
      const rule = groupFromForms(o.word_forms.find((f) => f.form_type === "singular_indefinite")?.form_value || c.lemma, forms.plural_indefinite?.form_value, forms.genus?.form_value);
      if (rule && rule === String(forms.declension_group.form_value) && verified("plural_indefinite") && verified("genus")) {
        must(await db.from("content_audit_archive").insert({ batch_id: batch, learning_object_id: id, table_name: "resource_field_status", field: "form:declension_group", old_value: JSON.stringify(g), new_value: "verified", reason: "korp_forms:group_by_rule" }));
        must(await db.from("resource_field_status").update({ status: "verified", source: "rule:verified-forms", detail: { ...(g.detail || {}), rule: `plural ${forms.plural_indefinite.form_value} → group ${rule}` }, updated_at: at }).eq("learning_object_id", id).eq("field", "form:declension_group"));
        written.group_verified++;
      } else if (rule && rule !== String(forms.declension_group.form_value)) {
        must(await db.from("resource_field_status").update({ detail: { ...(g.detail || {}), open: "group_rule_differs", rule }, updated_at: at }).eq("learning_object_id", id).eq("field", "form:declension_group"));
      }
    }
    if (changed.length) await markDependentsForRecheck(db, id, ["forms"], { reason: `forms ${changed.join(",")} ${batch.slice(0, 8)}` });
  }
  for (let i = 0; i < ids.length; i += 200) must(await db.rpc("refresh_resource_summary", { p_ids: ids.slice(i, i + 200) }));
  console.log({ batch, ...written });
}
