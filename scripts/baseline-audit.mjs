// Knowledge baseline audit (2026-11-10), zero AI: every live entry of the shared library checked
// field by field against the reference data on disk (SALDO, Lexin svenska + swe–eng, Folkets,
// Wiktionary), the stored program checks (resource_field_status), the content archive and the
// multi-word classification of 2026-11-09 (Korp). Read-only: nothing in the database changes;
// no AI, no paid call, no Korp call (Korp only through results already stored).
// Resumable: one line per entry in the ndjson, entries already written are skipped.
//   node --env-file=.env scripts/baseline-audit.mjs [--fresh]
//
// Categories (a finding is per field or item, never "the whole card is wrong"):
//   1 supported      — evidence supports it and nothing is missing
//   2 gap            — a reliable dictionary has something the card lacks (or had and lost)
//   3 conflict       — reliable evidence contradicts it (suspected error)
//   4 insufficient   — no evidence found either way (NOT an error)
//   5 lookup_failed  — a lookup failed: technical retry
//   6 identity       — duplicate, wrong part of speech, wrong match, wrong placement
//   7 history        — the stored status claims more than the evidence holds
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { useSaldoFiles, saldoEntries } from "../server-lexicon.mjs";
import { useReferenceFiles, referenceEntries, referencePos, englishEquivalents, meaningSupport } from "../server-references.mjs";
import { senseCoverage, posDecision } from "../server-evidence.mjs";
import { exampleUsesWord, collocationEvidence } from "../server-language-checks.mjs";
import { expressionMatchKey } from "../server-resources.mjs";
import { ordered } from "./page-order.mjs";

const DIR = "data/reports/round-g";
const OUT = `${DIR}/baseline-audit.ndjson`;
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
await useSaldoFiles();
await useReferenceFiles("data/reference", { extra: true });
const { mkdirSync } = await import("node:fs");
mkdirSync(DIR, { recursive: true });
if (process.argv.includes("--fresh") || !existsSync(OUT)) writeFileSync(OUT, "");
const done = new Set(readFileSync(OUT, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).id));

async function all(table, cols, f = (q) => q) {
  const out = [];
  for (let i = 0; ; i += 1000) {
    const { data, error } = await ordered(f(db.from(table).select(cols)), table).range(i, i + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) return out;
  }
}
const group = (rows, k) => { const m = new Map(); for (const r of rows) (m.get(r[k]) || m.set(r[k], []).get(r[k])).push(r); return m; };

console.log("loading …");
const objects = await all("learning_objects", "id, swedish, part_of_speech, object_type, status, verification_status, match_key, example_sv, source");
const live = objects.filter((o) => o.status !== "retired");
const tr = group(await all("learning_object_translations", "learning_object_id, native_language, meaning, collocations"), "learning_object_id");
const ex = group(await all("learning_object_examples", "learning_object_id, example_swedish"), "learning_object_id");
const colRows = group(await all("learning_object_collocations", "learning_object_id, phrase_text"), "learning_object_id");
const forms = group(await all("word_forms", "learning_object_id, form_value"), "learning_object_id");
const rfs = group(await all("resource_field_status", "learning_object_id, field, status, source, grade", (q) => q.or("field.in.(sense,pos),status.eq.mismatch,status.eq.missing")), "learning_object_id");
const archive = group(await all("content_audit_archive", "learning_object_id, field, reason, old_value, new_value",
  (q) => q.in("reason", ["audit:unsupported_sense:dictionary_backed_removal", "free_combination_review_2026-11-03", "rebuilt_archive_of_audit_resolve"]).like("field", "en:%")), "learning_object_id");
const classified = new Map(JSON.parse(readFileSync("data/reports/round-f/classify-library-multiword-2026-11-09.json", "utf8")).rows.map((r) => [r.id, r]));
console.log({ objects: objects.length, live: live.length, done: done.size });

const SALDO_POS = { nn: "noun", vb: "verb", av: "adjective", ab: "adverb", pn: "pronoun", pp: "preposition", kn: "conjunction", sn: "conjunction", in: "interjection", nl: "numeral" };
const CHECKED_POS = new Set(Object.values(SALDO_POS));
// Expression match keys shared by more than one live entry.
const byKey = new Map();
for (const o of live) if (o.object_type !== "word" && o.match_key) (byKey.get(o.match_key) || byKey.set(o.match_key, []).get(o.match_key)).push(o);
const collocationLines = (text) => String(text || "").split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p) => p[0]).map(([phrase, meaning, example]) => ({ phrase, meaning, example }));
const parts = (m) => String(m || "").split(/[;；]/).map((x) => x.trim()).filter(Boolean);

const LIMIT = process.argv.includes("--limit") ? Number(process.argv[process.argv.indexOf("--limit") + 1]) : Infinity;
let n = 0;
for (const o of live) {
  if (done.has(o.id)) continue;
  if (n >= LIMIT) break;
  const F = [];
  const add = (cat, field, code, extra = {}) => F.push({ cat, field, code, ...extra });
  const en = (tr.get(o.id) || []).find((t) => t.native_language === "en");
  const meaningEn = en?.meaning || "";
  const status = new Map((rfs.get(o.id) || []).map((r) => [r.field, r]));
  const ownForms = [o.swedish, ...(forms.get(o.id) || []).map((f) => f.form_value)].filter(Boolean);
  const examples = [...new Set([...(ex.get(o.id) || []).map((e) => e.example_swedish), ...String(o.example_sv || "").split("\n")].map((s) => String(s || "").trim()).filter(Boolean))];
  const colls = [...collocationLines(en?.collocations), ...(colRows.get(o.id) || []).map((c) => ({ phrase: c.phrase_text }))].filter((c, i, a) => a.findIndex((x) => x.phrase.toLowerCase() === c.phrase.toLowerCase()) === i);

  // Program checks already stored (SALDO forms and the like): a mismatch is a reliable conflict.
  for (const [field, r] of status) if (r.status === "mismatch") add(3, field, "saldo_or_reference_mismatch", { source: r.source, strength: 5 });

  if (o.object_type === "word") {
    const refs = await referenceEntries(null, o.swedish);
    const rp = referencePos(refs);
    const saldo = await saldoEntries(null, o.swedish);
    const saldoPos = new Set(saldo.map((s) => SALDO_POS[s.pos]).filter(Boolean));
    const lexinPos = new Set([...(rp.lexin_sv || []), ...(rp.lexin_en || [])]);
    const otherPos = new Set([...(rp.folkets || []), ...(rp.enwikt || [])]);
    // SALDO forms: { msd: form | [forms] } or a list.
    const flat = (v) => (v == null ? [] : typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(flat) : typeof v === "object" ? Object.values(v).flatMap(flat) : []);
    const saldoForms = saldo.flatMap((s) => flat(s.forms));
    const anyRef = saldoPos.size || lexinPos.size || otherPos.size;
    // Identity: part of speech.
    if (!anyRef) add(4, "entry", "no_reference_entry", { strength: 0 });
    else if (CHECKED_POS.has(o.part_of_speech)) {
      const inSaldo = saldoPos.has(o.part_of_speech), inLexin = lexinPos.has(o.part_of_speech), inOther = otherPos.has(o.part_of_speech);
      // The generation's own rule (posDecision): a regular conversion — an adjective's -t form as an
      // adverb, an adjective or participle as a noun (en anställd) — is not a conflict.
      const decided = posDecision({ pos: o.part_of_speech, references: { all: [...saldoPos, ...lexinPos, ...otherPos] } });
      if (!inSaldo && !inLexin && !inOther && (saldoPos.size || lexinPos.size)) {
        if (/^derived_from/.test(decided.reason)) add(4, "pos", "pos_regular_conversion", { reference: { saldo: [...saldoPos], lexin: [...lexinPos] }, strength: 3 });
        else add(6, "pos", "pos_not_in_any_reference", { reference: { saldo: [...saldoPos], lexin: [...lexinPos], other: [...otherPos] }, strength: saldoPos.size && lexinPos.size ? 5 : 4 });
      }
      else if (!inSaldo && !inLexin && inOther) add(4, "pos", "pos_only_in_wiktionary_or_folkets", { strength: 3 });
    }
    // Sense: the English meaning against Lexin's English (a candidate overlap, never a sense link).
    const eqs = englishEquivalents(refs, o.part_of_speech);
    const sense = status.get("sense");
    if (!meaningEn) add(2, "meaning_en", "no_english_meaning");
    else if (!eqs.length) { if (sense?.grade !== "verified") add(4, "sense", "no_dictionary_english", { strength: 0 }); }
    else {
      const support = meaningSupport(meaningEn, eqs);
      if (!support.length) {
        // The meaning matches another part of speech's English only: the senses of two words mixed.
        const other = [...lexinPos].filter((p) => p !== o.part_of_speech).find((p) => meaningSupport(meaningEn, englishEquivalents(refs, p)).length);
        if (other) add(3, "sense", "meaning_of_other_pos", { otherPos: other, meaningEn, strength: 3 });
        else add(4, "sense", "meaning_unmatched_by_dictionary", { meaningEn, strength: 0 });
      } else {
        const unmatched = parts(meaningEn).filter((p) => !meaningSupport(p, eqs).length);
        if (unmatched.length) add(4, "sense", "meaning_part_unmatched", { parts: unmatched, strength: 0 });
      }
      const coverage = senseCoverage(refs, o.part_of_speech, meaningEn, ownForms);
      for (const s of coverage.filter((s) => !s.covered && !s.particleVerb && !s.otherWord)) add(2, "sense", "lexin_sense_not_covered", { variant: s.variant, definition: s.definition, english: s.english, strength: 5 });
      // Another Lexin word of this spelling (same part of speech, other forms): a card of its own, not a gap.
      for (const s of coverage.filter((s) => s.otherWord && !s.covered)) add(6, "entry", "homograph_without_own_card", { variant: s.variant, definition: s.definition, english: s.english, strength: 5 });
    }
    // History: verified needs non-AI evidence for the sense (grade verified, Korp, Lexin sense link).
    if (o.verification_status === "verified" && sense && sense.grade !== "verified" && !/korp/.test(sense.source || "")) add(7, "verification_status", "verified_without_independent_sense_evidence", { senseSource: sense.source, grade: sense.grade });
    // Examples: at least one, each with the word in it.
    if (!examples.length) add(2, "example", "no_example");
    // A genitive ("kungamaktens") is the word; inside a compound ("Valresultatet") it is only weakly there.
    const allForms = [...new Set([...ownForms, ...saldoForms].map((f) => String(f).toLowerCase()))];
    const withGenitive = [...allForms, ...allForms.filter((f) => !/\s/.test(f)).map((f) => (/[sxz]$/.test(f) ? f : f + "s"))];
    // Inside a compound, first or last part ("pusselbiten", "fredspris", "biljettautomaten").
    const inCompound = (text) => (String(text).toLowerCase().match(/\p{L}+/gu) || []).some((t) => allForms.some((f) => f.length >= 3 && t.length > f.length && (t.endsWith(f) || t.startsWith(f))));
    // A hyphenated headword ("p-piller") is split by the tokenizer: look for it as written.
    const hyphenated = (text) => /-/.test(o.swedish) && allForms.some((f) => /-/.test(f) && String(text).toLowerCase().includes(f));
    for (const e of examples) if (!exampleUsesWord(e, withGenitive) && !hyphenated(e)) {
      if (inCompound(e)) add(4, "example", "headword_only_in_compound", { example: e, strength: 3 });
      else add(saldoForms.length ? 3 : 4, "example", "example_lacks_headword", { example: e, strength: saldoForms.length ? 5 : 0 });
    }
    const collExamples = new Set(colls.map((c) => c.example?.toLowerCase()).filter(Boolean));
    for (const e of examples) if (collExamples.has(e.toLowerCase())) add(6, "example", "example_repeats_collocation_example", { example: e });
    // Collocations: a dictionary listing supports one; a Lexin example only shows it exists; none: insufficient.
    for (const c of colls) {
      const ev = await collocationEvidence(null, refs, c.phrase, ownForms, { pos: o.part_of_speech });
      if (ev.kind === "elsewhere") add(6, "collocation", "dictionary_expression_of_other_word", { phrase: c.phrase, strength: 4 });
      else if (ev.kind === "dictionary" && ev.listing !== false) add(1, "collocation", "dictionary_listed", { phrase: c.phrase, strength: 5 });
      else if (ev.kind === "dictionary") add(4, "collocation", "only_in_dictionary_example", { phrase: c.phrase, strength: 3 });
      else add(4, "collocation", "no_dictionary_evidence", { phrase: c.phrase, strength: 0 });
      if (!/\s/.test(c.phrase)) add(6, "collocation", "single_word_as_collocation", { phrase: c.phrase });
      else if (!exampleUsesWord(c.phrase, withGenitive) && !hyphenated(c.phrase)) add(4, "collocation", inCompound(c.phrase) ? "headword_only_in_compound" : "headword_form_not_found", { phrase: c.phrase });
    }
    // Removed earlier although a dictionary backs it.
    for (const a of archive.get(o.id) || []) {
      if (a.field === "en:meaning") {
        const now = new Set(parts(a.new_value).map((x) => x.toLowerCase()));
        for (const p of parts(a.old_value).filter((x) => !now.has(x.toLowerCase()) && !parts(meaningEn).some((m) => m.toLowerCase() === x.toLowerCase())))
          if (eqs.length && meaningSupport(p, eqs).length) add(2, "sense", "removed_sense_dictionary_backed", { removed: p, reason: a.reason, strength: 3 });
      } else if (a.field === "en:collocations") {
        const now = new Set(colls.map((c) => c.phrase.toLowerCase()));
        for (const c of collocationLines(a.old_value).filter((c) => !now.has(c.phrase.toLowerCase()) && !collocationLines(a.new_value).some((x) => x.phrase.toLowerCase() === c.phrase.toLowerCase()))) {
          const ev = await collocationEvidence(null, refs, c.phrase, ownForms, { pos: o.part_of_speech });
          if (ev.kind === "dictionary" && ev.listing !== false) add(2, "collocation", "removed_collocation_dictionary_listed", { phrase: c.phrase, reason: a.reason, strength: 5 });
        }
      }
    }
  } else {
    // Expressions and phrases: the classification of 2026-11-09 (dictionaries + Korp).
    const c = classified.get(o.id);
    if (!c) add(5, "classification", "not_classified_yet");
    else {
      if (c.reasons.some((r) => /failed/.test(r)) || c.attested === "failed") add(5, "classification", "korp_lookup_failed", { reasons: c.reasons });
      if (c.listing) add(1, "entry", "dictionary_listed", { listing: c.listing, strength: 5 });
      else if (c.cls === "F3") add(4, "entry", "idiom_by_ai_and_corpus_only", { hits: c.hits, strength: 2 });
      else if (c.placement === "headword_usage") add(6, "placement", "typical_combination_as_own_entry", { cls: c.cls, reasons: c.reasons });
      else if (c.placement === "reading_only") add(o.status === "draft" ? 4 : 6, "placement", o.status === "draft" ? "undecided_draft" : "public_without_entry_evidence", { cls: c.cls, reasons: c.reasons, attested: c.attested });
      if (c.attested === false) add(4, "attestation", "no_corpus_hits", { strength: 0 });
    }
    const same = (byKey.get(o.match_key) || []).filter((x) => x.id !== o.id);
    if (same.length) add(6, "identity", "match_key_shared", { with: same.map((x) => `${x.swedish} [${x.status}]`) });
    if (!examples.length) add(4, "example", "no_example");
    if (o.verification_status === "verified" && !c?.listing) add(7, "verification_status", "verified_without_dictionary_listing");
  }
  if (o.status === "human_reviewed" && o.source !== "kursordlista A1–A2" && o.source !== "kursordlista B1–B2" && !F.some((f) => f.cat === 1) && o.object_type === "word" && (rfs.get(o.id) || []).find((r) => r.field === "sense")?.grade === "ai_consistent")
    add(7, "status", "human_reviewed_label_on_ai_only_evidence");
  const cats = [...new Set(F.map((f) => f.cat))].sort();
  const row = { id: o.id, swedish: o.swedish, pos: o.part_of_speech, type: o.object_type, status: o.status, verification: o.verification_status, cats: cats.filter((c) => c !== 1).length ? cats.filter((c) => c !== 1) : [1], findings: F };
  appendFileSync(OUT, JSON.stringify(row) + "\n");
  if (++n % 500 === 0) console.log(n, "entries");
}
console.log("done", n, "new entries →", OUT);
