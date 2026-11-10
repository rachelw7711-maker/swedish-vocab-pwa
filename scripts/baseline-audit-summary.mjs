// Summary of scripts/baseline-audit.mjs: entries and findings per category and code, examples per
// code, and the follow-up each code needs (dictionary rule / AI fill / AI judgement / human / none).
//   node scripts/baseline-audit-summary.mjs
import { readFileSync, writeFileSync } from "node:fs";

const rows = readFileSync("data/reports/round-g/baseline-audit.ndjson", "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const CAT = { 1: "supported", 2: "gap", 3: "conflict", 4: "insufficient", 5: "lookup_failed", 6: "identity", 7: "history" };
// The follow-up of each finding.
const FIX = {
  dictionary_listed: "none",
  lexin_sense_not_covered: "ai_fill", no_english_meaning: "ai_fill", no_example: "ai_fill",
  removed_sense_dictionary_backed: "rule", removed_collocation_dictionary_listed: "rule",
  saldo_or_reference_mismatch: "rule", example_lacks_headword: "ai_judgement", meaning_of_other_pos: "ai_judgement",
  no_reference_entry: "human", pos_not_in_any_reference: "human", pos_only_in_wiktionary_or_folkets: "none",
  no_dictionary_english: "none", meaning_unmatched_by_dictionary: "ai_judgement", meaning_part_unmatched: "none",
  only_in_dictionary_example: "none", no_dictionary_evidence: "korp", headword_form_not_found: "ai_judgement", headword_only_in_compound: "none",
  single_word_as_collocation: "rule", dictionary_expression_of_other_word: "rule", homograph_without_own_card: "human", example_repeats_collocation_example: "rule",
  verified_without_independent_sense_evidence: "rule", verified_without_dictionary_listing: "rule", human_reviewed_label_on_ai_only_evidence: "rule",
  not_classified_yet: "korp", korp_lookup_failed: "korp", idiom_by_ai_and_corpus_only: "human", typical_combination_as_own_entry: "human",
  public_without_entry_evidence: "human", undecided_draft: "human", no_corpus_hits: "none", match_key_shared: "human",
};
const out = { entries: rows.length, byType: {}, entriesPerCategory: {}, onlySupported: 0, findings: {}, followUp: {}, examples: {} };
const inc = (o, k, n = 1) => (o[k] = (o[k] || 0) + n);
for (const r of rows) {
  inc(out.byType, `${r.type}|${r.status}`);
  for (const c of r.cats) inc(out.entriesPerCategory, `${c} ${CAT[c]}`);
  if (r.cats.length === 1 && r.cats[0] === 1) out.onlySupported++;
  const seen = new Set();
  for (const f of r.findings) {
    const k = `${f.cat} ${f.code}`;
    out.findings[k] ||= { findings: 0, entries: 0 };
    out.findings[k].findings++;
    if (!seen.has(k)) { out.findings[k].entries++; seen.add(k); }
    const fx = FIX[f.code] || "unmapped";
    out.followUp[fx] ||= { findings: 0, entries: new Set() };
    out.followUp[fx].findings++; out.followUp[fx].entries.add(r.id);
    (out.examples[k] ||= []);
    if (out.examples[k].length < 8 && !out.examples[k].some((e) => e.startsWith(r.swedish + " "))) {
      const { cat, code, field, ...rest } = f;
      out.examples[k].push(`${r.swedish} (${r.pos}, ${r.status}): ${JSON.stringify(rest).slice(0, 220)}`);
    }
  }
}
for (const v of Object.values(out.followUp)) v.entries = v.entries.size;
out.findings = Object.fromEntries(Object.entries(out.findings).sort((a, b) => a[0].localeCompare(b[0], "en", { numeric: true })));
writeFileSync("data/reports/round-g/baseline-audit-summary.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify({ entries: out.entries, onlySupported: out.onlySupported, entriesPerCategory: out.entriesPerCategory, findings: out.findings, followUp: out.followUp }, null, 1));
