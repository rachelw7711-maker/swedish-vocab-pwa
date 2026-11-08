// A canned answer of the second, focused card check (card_detail_check): everything fine
// unless `over` says otherwise, by part (sense text, example sentence, phrase, related word).
export const okDetail = (prompt, { sense = {}, example = {}, collocation = {}, related = {}, ...over } = {}) => ({
  senses: prompt.senses.map((s) => ({ key: s.key, english: "", verdict: "matches_reference", reason: "", ...(sense[s.zh] || {}) })),
  meaning_en_without_wrong: "", swedish_explanation_without_wrong: "",
  examples: prompt.examples.map((e) => ({ key: e.key, verdict: "ok", corrected: "", ...(example[e.sv] || {}) })),
  collocations: prompt.collocations.map((c) => ({ key: c.key, verdict: "fixed_expression", correct_form: "", ...(collocation[c.phrase] || {}) })),
  related: prompt.related.map((r) => ({ key: r.key, verdict: "exists", ...(related[r.word] || {}) })),
  ...over,
});
