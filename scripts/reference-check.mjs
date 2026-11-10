// Checks stored entries against the dictionaries — SALDO (and its compounds), Lexin svenska,
// Lexin swe–eng, Folkets lexikon, the English Wiktionary — without any AI call (2026-11-03).
// It only adds evidence: a field is raised to "verified" when a reference supports it, a
// form a reference contradicts becomes "mismatch", and nothing SALDO already decided or the
// audit found wrong is overruled except where named below. Entry content is never changed.
//
//   node --env-file=.env scripts/reference-check.mjs [--ids file] [--audit decisions.json]
//        [--korp korp-nouns.json] [--out dir] [--write]
//
// Per entry:
//   pos     a word: the dictionary families that list it as this part of speech (SALDO,
//           Lexin, Wiktionary), or SALDO by its last part (a compound), or SALDO by form (a
//           participle of a listed verb); an expression: listed as a headword or an idiom.
//   forms   for a word SALDO lacks: a particle or reflexive verb by its base verb (växer upp),
//           a participle by its verb (skriven ← skriva), Lexin svenska's forms of the word, else
//           SALDO's forms of its last part (chokladask ← ask); words without inflection need none.
//   sense   "present" (the audit had too little evidence) → "verified" when the English
//           meaning agrees with a dictionary's equivalents for this part of speech (a compound:
//           with its last part's). An audit "mismatch" whose only finding was "part of speech
//           not supported" is overruled when the references list the part of speech and the
//           English meaning agrees — reported as a conflict.
//   countability  a stored value agreeing with Lexin's plural (or its absence), SALDO's
//           zero-plural class, Wiktionary's (un)countable tags and Korp's plural share is
//           confirmed; disagreements are reported, never written.
// --write upserts the changed resource_field_status rows (old rows archived in
// content_audit_archive under one batch) and refreshes nothing else.
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { useSaldoFiles, saldoEntries, compoundRows, multiWordVerbRows, participleRows, compareWithSaldo, cardFieldsFromSaldo, lemmatize, saldoHasExpression } from "../server-lexicon.mjs";
import {
  useReferenceFiles, referenceEntries, posFamilies, compareWithLexin, lexinCountability, englishEquivalents, meaningSupport, expressionInReferences, LEXIN_SV_SOURCE_ID,
} from "../server-references.mjs";

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const WRITE = args.includes("--write");
const outDir = opt("--out") || "data/reports";
mkdirSync(outDir, { recursive: true });
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => { for (let n = 1; ; n++) { try { return await realFetch(url, init); } catch (e) { if (n >= 4) throw e; await new Promise((r) => setTimeout(r, 1500 * n)); } } };
async function all(table, select, filter = (q) => q, order = ["id"]) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = filter(db.from(table).select(select));
    for (const o of order) q = q.order(o);
    const { data, error } = await q.range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

await useSaldoFiles();
await useReferenceFiles("data/reference", { extra: true });
const audit = opt("--audit") ? JSON.parse(readFileSync(opt("--audit"), "utf8")) : null;
const auditBy = new Map((audit?.entries || []).map((e) => [e.id, e]));
const aiCount = new Map((audit?.countability || []).map((c) => [c.id, c]));
const korp = opt("--korp") && existsSync(opt("--korp")) ? JSON.parse(readFileSync(opt("--korp"), "utf8")) : {};
const only = opt("--ids") ? new Set(readFileSync(opt("--ids"), "utf8").match(/[0-9a-f-]{36}/g)) : null;

const objs = (await all("learning_objects", "id, swedish, part_of_speech, object_type, countability", (q) => q.neq("status", "retired"))).filter((o) => !only || only.has(o.id));
const ids = new Set(objs.map((o) => o.id));
const forms = new Map(), status = new Map(), english = new Map();
for (const f of await all("word_forms", "learning_object_id, form_type, form_value", (q) => q, ["learning_object_id", "form_type"])) {
  if (ids.has(f.learning_object_id)) (forms.get(f.learning_object_id) || forms.set(f.learning_object_id, {}).get(f.learning_object_id))[f.form_type] = f.form_value;
}
for (const s of await all("resource_field_status", "learning_object_id, field, status, source, detail", (q) => q, ["learning_object_id", "field"])) {
  if (ids.has(s.learning_object_id)) (status.get(s.learning_object_id) || status.set(s.learning_object_id, {}).get(s.learning_object_id))[s.field] = s;
}
for (const t of await all("learning_object_translations", "learning_object_id, native_language, meaning", (q) => q.eq("native_language", "en"))) {
  if (ids.has(t.learning_object_id)) english.set(t.learning_object_id, t.meaning || "");
}

const UNINFLECTED = new Set(["adverb", "preposition", "conjunction", "interjection", "numeral", "pronoun", "abbreviation", "other"]);
const FORM_FIELDS = new Set(["genus", "declension_group", "verb_group"]);   // judged by SALDO's class, not by a dictionary's forms
const now = new Date().toISOString();
const writes = [], report = [], tally = {}, conflicts = [];
const inc = (k) => (tally[k] = (tally[k] || 0) + 1);
const put = (o, field, next, prev) => {
  if (prev && prev.status === next.status && prev.source === next.source) return;
  writes.push({ row: { learning_object_id: o.id, field, status: next.status, source: next.source, detail: next.detail ?? null, ...(next.grade ? { grade: next.grade } : {}), updated_at: now }, prev: prev || null });
  inc(`${field.startsWith("form:") ? "form" : field}:${prev?.status || "none"}→${next.status}`);
};

for (const o of objs) {
  const st = status.get(o.id) || {};
  const pos = o.part_of_speech;
  const lemma = o.swedish.trim();
  const expression = o.object_type !== "word" || /\s/.test(lemma);
  const refs = await referenceEntries(null, lemma);
  const en = english.get(o.id) || "";
  const out = { id: o.id, lemma, pos };

  // Part of speech / expression attested.
  let posFam = [];
  let compound = [];
  if (expression) {
    const hits = await expressionInReferences(null, lemma);
    if (await saldoHasExpression(null, [lemma])) hits.push({ source: "saldo" });
    posFam = [...new Set(hits.map((h) => (h.source === "saldo" ? "saldo" : h.source === "enwikt" ? "wiktionary" : "lexin")))];
    out.expression = hits.slice(0, 3);
  } else {
    if ((await saldoEntries(null, lemma, pos)).length) posFam.push("saldo");
    posFam.push(...posFamilies(refs, pos));
    if (!posFam.includes("saldo") && /particip/.test(pos) && (await lemmatize(null, lemma)).some((r) => r.pos === "verb")) posFam.push("saldo-form");
    if (!posFam.includes("saldo")) {
      compound = await compoundRows(null, lemma, pos);
      if (compound.length) posFam.push("saldo-compound");
    }
    posFam = [...new Set(posFam)];
  }
  out.posFamilies = posFam;
  if (posFam.length && st.pos?.status !== "verified" && st.pos?.status !== "mismatch") {
    put(o, "pos", { status: "verified", source: `references:${posFam.join("+")}`, detail: { families: posFam } }, st.pos);
  }

  // Forms for a word SALDO doesn't have.
  const stored = forms.get(o.id) || {};
  const formStatus = Object.entries(st).filter(([f]) => f.startsWith("form:"));
  const multiVerb = o.object_type === "word" && pos === "verb" && /\s/.test(lemma);
  if ((!expression || multiVerb) && !formStatus.some(([, s]) => s.source === "saldo-morphology-2017" && s.status !== "missing")) {
    const entry = { pos, forms: Object.fromEntries(Object.entries(stored).filter(([t]) => !FORM_FIELDS.has(t))) };
    let fields = {}, source = "";
    const lexin = multiVerb ? { found: false } : compareWithLexin(entry, refs);
    const multi = multiVerb ? await multiWordVerbRows(null, lemma) : [];
    const participle = /particip/.test(pos) ? await participleRows(null, lemma, pos) : [];
    if (multi.length) { fields = compareWithSaldo({ pos, forms: stored }, multi).fields; source = "saldo-multiword"; }
    else if (participle.length) {
      // Participle entries store en/ett forms; SALDO's adjective shape calls them base/neuter.
      const shaped = { ...stored, base_form: stored.base_form || stored.en_form || stored.participle_form, neuter_form: stored.neuter_form || stored.ett_form };
      fields = compareWithSaldo({ pos: "adjective", forms: shaped }, participle).fields;
      for (const [from, to] of [["en_form", "base_form"], ["ett_form", "neuter_form"], ["participle_form", "base_form"]]) if (stored[from] && fields[`form:${to}`]) fields[`form:${from}`] = { ...fields[`form:${to}`], stored: stored[from] };
      for (const t of ["base_form", "neuter_form"]) if (!stored[t]) delete fields[`form:${t}`];
      // "dela upp" and "uppdela" both give uppdelad.
      const verbKey = (v) => { const w = String(v || "").trim().toLowerCase().split(/\s+/); return w.length === 2 ? w[1] + w[0] : w.join(" "); };
      if (stored.base_verb) fields["form:base_verb"] = { status: participle.some((r) => r.verb === verbKey(stored.base_verb) || r.verb === stored.base_verb.trim().toLowerCase()) ? "verified" : "mismatch", stored: stored.base_verb, reference: participle[0].verb };
      for (const k of Object.keys(fields)) if (/comparative|superlative/.test(k)) delete fields[k];
      source = "saldo-participle";
    }
    else if (lexin.found && Object.keys(lexin.fields).length) { fields = lexin.fields; source = LEXIN_SV_SOURCE_ID; }
    else if (compound.length) { fields = compareWithSaldo({ pos, forms: stored }, compound).fields; source = "saldo-compound"; }
    const ambiguous = source === "saldo-compound" && compound[0].compound.ambiguous;
    for (const [field, r] of Object.entries(fields)) {
      if (r.status === "missing" || (ambiguous && r.status === "mismatch")) continue;
      const prev = st[field];
      if (prev?.status === "verified" || prev?.status === "mismatch") continue;
      if (!prev && r.status === "present") continue;
      put(o, field, { status: r.status, source: r.status === "present" ? (prev?.source || "existing") : source, detail: r.status === "verified" ? null : { stored: r.stored, reference: r.reference } }, prev);
    }
    out.forms = { source, fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v.status])) };
    if (!Object.keys(stored).length && UNINFLECTED.has(pos)) out.forms = { none: "uninflected" };
  }

  // Sense: the English meaning against the dictionaries (a compound: against its last part).
  let support = meaningSupport(en, expression ? [] : englishEquivalents(refs, pos));
  if (expression) {
    const idiomEnglish = (out.expression || []).filter((h) => h.english).map((h) => ({ source: h.source, text: h.english }));
    const own = [...englishEquivalents(refs, "phrase"), ...englishEquivalents(refs, pos)];
    support = meaningSupport(en, [...idiomEnglish, ...own]);
  } else if (!support.length && compound.length) {
    const head = await referenceEntries(null, compound[0].compound.head.split("..")[0]);
    support = meaningSupport(en, englishEquivalents(head, pos)).map((s) => ({ ...s, source: `${s.source}:head` }));
  }
  out.enSupport = [...new Set(support.map((s) => s.source))];
  const a = auditBy.get(o.id);
  // The audit's finding when its sense status isn't stored yet (it is written with the verified migration).
  const sense = st.sense || (a ? { status: a.sense, source: "audit-2026-11-02", detail: a.issues?.length ? { issues: a.issues } : null } : null);
  if (support.length && sense?.status === "present") {
    put(o, "sense", { status: "verified", grade: "ai_consistent", source: `${sense.source}+dictionary-en`, detail: { ...(sense.detail || {}), en_support: out.enSupport } }, st.sense);
  } else if (support.length && sense?.status === "mismatch" && a?.issues?.length === 1 && a.issues[0] === "pos_not_supported" && posFam.length) {
    put(o, "sense", { status: "verified", grade: "ai_consistent", source: `${sense.source}+dictionary-en`, detail: { ...(sense.detail || {}), en_support: out.enSupport, overrules: "ai:pos_not_supported", families: posFam } }, st.sense);
    conflicts.push({ id: o.id, lemma, pos, ai: "pos_not_supported", references: posFam, en_support: out.enSupport });
  } else if (sense?.status === "mismatch" && a?.issues?.includes("pos_not_supported") && posFam.length) {
    conflicts.push({ id: o.id, lemma, pos, ai: a.issues.join(","), references: posFam, en_support: out.enSupport, kept: "mismatch" });
  }

  // Countability: confirm a stored value the evidence agrees with.
  if (pos === "noun" && !expression && o.countability) {
    const saldoZero = (await saldoEntries(null, lemma, "noun")).some((r) => cardFieldsFromSaldo(r, "noun").countability === "uncountable");
    const lexin = lexinCountability(refs);
    const tags = new Set((refs.enwikt || []).filter((e) => e.pos === "noun").flatMap((e) => e.tags || []));
    const k = korp[o.id];
    const share = k && !k.ambiguousPlural && k.sg + k.pl >= 20 ? k.share : null;
    const says = { saldo: saldoZero ? "uncountable" : null, lexin, wiktionary: tags.has("uncountable") && tags.has("countable") ? "both" : tags.has("uncountable") ? "uncountable" : tags.has("countable") ? "countable" : null, korp: share === null ? null : share < 0.01 ? "uncountable" : share >= 0.05 ? "countable" : "rare_plural" };
    const v = o.countability;
    const agrees = (x) => x === v || (v === "both" && (x === "both" || x === "rare_plural")) || (v === "uncountable" && x === "rare_plural");
    const against = (x) => x && !agrees(x) && !(v === "both" && x);   // "both" isn't contradicted by one sense's evidence
    const forList = Object.entries(says).filter(([, x]) => x && agrees(x)).map(([s]) => s);
    const againstList = Object.entries(says).filter(([, x]) => against(x)).map(([s]) => s);
    const dict = forList.filter((s) => s !== "korp");
    out.countability = { stored: v, says, for: forList, against: againstList, ai: aiCount.get(o.id)?.ai || null };
    const prev = st.countability;
    if (prev?.status !== "verified" && dict.length && !againstList.length) {
      put(o, "countability", { status: "verified", source: `references:${forList.join("+")}`, detail: { says } }, prev);
    } else if (againstList.length) inc(`countability:disputed_${prev?.status || "none"}`);
  }
  report.push(out);
}

const conflictsFile = `${outDir}/reference-check-conflicts.json`;
writeFileSync(`${outDir}/reference-check.json`, JSON.stringify({ at: now, entries: objs.length, tally, writes: writes.length }, null, 1));
writeFileSync(`${outDir}/reference-check-entries.json`, JSON.stringify(report));
writeFileSync(conflictsFile, JSON.stringify(conflicts, null, 1));
console.log(JSON.stringify({ entries: objs.length, writes: writes.length, conflicts: conflicts.length, tally }, null, 1));

if (WRITE && writes.length) {
  const batch = randomUUID();
  for (let i = 0; i < writes.length; i += 200) {
    const part = writes.slice(i, i + 200);
    const archive = part.map((w) => ({ batch_id: batch, learning_object_id: w.row.learning_object_id, table_name: "resource_field_status", field: w.row.field,
      old_value: w.prev ? JSON.stringify({ status: w.prev.status, source: w.prev.source, detail: w.prev.detail }) : null,
      new_value: JSON.stringify({ status: w.row.status, source: w.row.source, detail: w.row.detail }), reason: "reference_check_2026-11-03" }));
    const a = await db.from("content_audit_archive").insert(archive);
    if (a.error) throw a.error;
    const u = await db.from("resource_field_status").upsert(part.map((w) => w.row), { onConflict: "learning_object_id,field" });
    if (u.error) throw u.error;
  }
  console.log("batch", batch);
}
