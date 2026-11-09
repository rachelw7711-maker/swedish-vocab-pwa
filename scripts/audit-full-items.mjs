// Full-audit items (2026-11-02 audit, brought into the repo 2026-11-09, knowledge v2 S7) for entry ids from the production data: meanings, examples (main + rows), grammar, collocations,
// and evidence (SALDO parts of speech + paradigm, Wiktionary, Korp singular/plural counts for nouns).
import { readFileSync, existsSync } from "node:fs";
import { saldoPartsOfSpeech, saldoEntries } from "../server-lexicon.mjs";
import { lookupWiktionary } from "../server-wiktionary.mjs";
import { wiktionaryEvidence } from "../server-language-checks.mjs";
// Optional: Korp singular/plural counts of nouns by entry id.
const KF = "data/reports/audit-full/korp-nouns.json";
let korp = null;
const parse = (text) => String(text || "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const p = l.split("|").map((s) => s.trim()); return { phrase: p[0].replace(/^[·•\-–\s]+/, ""), meaning: p[1] || "", example: p[2] || "" }; });
export async function auditItems(sb, ids) {
  if (!korp && existsSync(KF)) korp = JSON.parse(readFileSync(KF, "utf8"));
  const [{ data: rows }, { data: tr }, { data: ex }] = await Promise.all([
    sb.from("learning_objects").select("id, swedish, part_of_speech, object_type, chinese, swedish_explanation, example_sv, example_zh, collocations, countability, grammar_note, pos_detail, word_forms(form_type, form_value, sort_order)").in("id", ids),
    sb.from("learning_object_translations").select("learning_object_id, native_language, meaning, example_translation, collocations, grammar_note").in("learning_object_id", ids),
    sb.from("learning_object_examples").select("id, learning_object_id, example_swedish, sort_order, learning_object_example_translations(id, native_language, translation)").in("learning_object_id", ids).order("sort_order"),
  ]);
  const items = [];
  for (const id of ids) {
    const r = rows.find((x) => x.id === id);
    if (!r) continue;
    const t = (l) => tr.find((x) => x.learning_object_id === id && x.native_language === l) || {};
    const examples = [];
    if (r.example_sv) examples.push({ sv: r.example_sv.split("\n")[0].trim(), zh: t("zh").example_translation || r.example_zh || "", en: t("en").example_translation || "", source: "main" });
    for (const e of ex.filter((x) => x.learning_object_id === id)) {
      const tt = (l) => (e.learning_object_example_translations || []).find((x) => x.native_language === l);
      examples.push({ sv: e.example_swedish, zh: tt("zh")?.translation || "", en: tt("en")?.translation || "", source: e.id, tr: { zh: tt("zh")?.id || null, en: tt("en")?.id || null } });
    }
    const zhC = parse(t("zh").collocations || r.collocations), enC = parse(t("en").collocations);
    const collocations = (zhC.length ? zhC : enC).map((c) => ({ phrase: c.phrase, zh: zhC.find((x) => x.phrase === c.phrase)?.meaning || "", en: enC.find((x) => x.phrase === c.phrase)?.meaning || "", example: c.example }));
    const forms = [...r.word_forms].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).filter((f) => f.form_value).map((f) => `${f.form_type}=${f.form_value}`);
    const isWord = !/\s/.test(r.swedish);
    const page = await lookupWiktionary(sb, r.swedish);
    const saldoRows = isWord ? await saldoEntries(sb, r.swedish, r.part_of_speech) : [];
    const k = korp?.[id];
    items.push({
      id, lemma: r.swedish, pos: r.part_of_speech,
      entry: {
        meaning_zh: t("zh").meaning || r.chinese || "", meaning_en: t("en").meaning || "", swedish_explanation: r.swedish_explanation || "",
        examples: examples.map(({ sv, zh, en }) => ({ sv, zh, en })),
        collocations,
        grammar: { forms, ...(r.part_of_speech === "noun" ? { countability: r.countability || "", gender: r.pos_detail || "" } : {}), grammar_note: t("zh").grammar_note || r.grammar_note || "" },
      },
      references: {
        saldo_pos: await saldoPartsOfSpeech(sb, r.swedish), wiktionary: wiktionaryEvidence(page),
        ...(saldoRows.length ? { saldo_paradigm: saldoRows.map((s) => s.paradigm).join(", ") } : {}),
        ...(k && k.sg + k.pl > 0 ? { korp: { singular: k.sg, plural: k.pl, plural_share: k.share } } : {}),
      },
      _examples: examples, _collocations: collocations, _wiktionaryStatus: page.status, _korp: k || null, _saldoParadigms: saldoRows.map((s) => s.paradigm),
      _stored: { countability: r.countability, forms: r.word_forms, grammar_note: r.grammar_note, zhGrammarNote: t("zh").grammar_note, object_type: r.object_type },
    });
  }
  return items;
}