// Word-card generation and reading expressions against the shared resources
// (2026-10-31): reuse before generating, SALDO lemma and forms, cross-module dedup.
// OpenAI is replaced by a canned response; no network.
import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
process.env.OPENAI_API_KEY ||= "test";
const { useSaldoFiles } = await import("../server-lexicon.mjs");
const { generateWordEntry } = await import("../server-native.mjs");
const { resolveExpressionEntries } = await import("../server-reading.mjs");
const { fakeSupabase } = await import("./fake-supabase.mjs");

let aiCalls = 0, checkCalls = 0, card = null, check = null;
// The check's answer echoes each item (key, lemma, pos) and each example (key, first words).
const okCheck = (over = {}) => (item) => ({ key: item.key, lemma: item.lemma, pos: item.pos, pos_supported: true, other_pos_senses: [], unsupported_senses: [],
  meaning_zh_fixed: "", meaning_en_fixed: "", swedish_explanation_fixed: "", context_matches_entry: "n/a", verdict: "ok", note: "",
  examples: item.entry.examples.map((e) => ({ key: e.key, sv_start: e.sv.split(" ").slice(0, 3).join(" "), fits_entry: true, translation_zh_ok: true, translation_en_ok: true,
    translation_zh_fixed: "", translation_en_fixed: "", ...(over.example?.[e.key] || {}) })), ...over, example: undefined });
before(async () => {
  await useSaldoFiles();
  // Word-card generation, the AI check before saving (sense_check) and Wiktionary (no page) — no network.
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("wiktionary.org")) return { ok: true, json: async () => ({ error: { code: "missingtitle" } }) };
    const body = JSON.parse(init.body);
    const answer = body.text.format.name === "sense_check"
      ? (checkCalls++, { items: JSON.parse(body.input.at(-1).content).map((item) => (check || okCheck())(item)) })
      : (aiCalls++, card);
    return { ok: true, json: async () => ({ output_text: JSON.stringify(answer), usage: { input_tokens: 500, output_tokens: 400 } }) };
  };
});
beforeEach(() => { aiCalls = 0; checkCalls = 0; check = null; });

const baseCard = (over) => ({
  is_real_word: true, lemma: "", pos: "noun", pos_detail: "", cefr_level: "B1", meaning_zh: "发酵", meaning_en: "fermentation", swedish_explanation: "när något jäser",
  forms: [{ type: "plural_indefinite", value: "jäsningar-FEL" }], transitivity: "", passive: "",
  examples: [{ swedish: "Jäsningen tar tid.", zh: "发酵需要时间。", en: "Fermentation takes time." }, { swedish: "Jäsning ger smak.", zh: "发酵带来风味。", en: "Fermentation gives flavour." }],
  collocations: [], related: [], memory_tip_zh: "", memory_tip_en: "", ...over,
});
const db = () => fakeSupabase({
  learning_objects: [{ id: "w-utveckla", swedish: "utveckla", part_of_speech: "verb", object_type: "word", status: "published" }],
  learning_object_translations: [{ id: 1, learning_object_id: "w-utveckla", native_language: "zh", meaning: "发展" }],
});

test("an inflected form of an existing word reuses it without any AI call", async () => {
  const r = await generateWordEntry({ supabaseAdmin: db(), userId: "u", word: "utvecklade", nativeLanguage: "zh", chargeQuota: false });
  assert.deepEqual(r, { entryId: "w-utveckla", created: false });
  assert.equal(aiCalls, 0);
});

test("a new word is stored under SALDO's lemma with SALDO's forms, then reused", async () => {
  const d = db();
  card = baseCard({ lemma: "jäsningen" });          // model echoes the inflected form
  const first = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "jäsningen", nativeLanguage: "zh", pos: "noun", sense: "发酵", chargeQuota: false, source: "ai reading" });
  assert.equal(first.created, true);
  const row = d.tables.learning_objects.find((o) => o.id === first.entryId);
  assert.equal(row.swedish, "jäsning");
  const forms = Object.fromEntries(d.tables.word_forms.map((f) => [f.form_type, f.form_value]));
  assert.equal(forms.plural_indefinite, "jäsningar");  // the model's wrong form was not used
  assert.equal(forms.declension_group, "2");
  assert.ok(d.tables.resource_field_status.some((s) => s.field === "form:plural_indefinite" && s.status === "verified"));
  const again = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "jäsningar", nativeLanguage: "zh", pos: "noun", chargeQuota: false });
  assert.deepEqual(again, { entryId: first.entryId, created: false });
  assert.equal(aiCalls, 1);
});

test("a card made in one language also gets the other language's examples, tip, collocations and related words", async () => {
  const d = db();
  card = baseCard({ lemma: "jäsning", memory_tip_zh: "jäsa=发酵", memory_tip_en: "jäsa = ferment",
    collocations: [{ phrase: "naturlig jäsning", zh: "自然发酵", en: "natural fermentation", example: "Brödet får naturlig jäsning." }],
    related: [{ word: "jäsa", zh: "发酵", en: "ferment", pos: "verb" }] });
  const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "jäsning", nativeLanguage: "en", pos: "noun", chargeQuota: false });
  const row = (l) => d.tables.learning_object_translations.find((t) => t.learning_object_id === entryId && t.native_language === l);
  assert.equal(row("zh").meaning, "发酵");
  assert.equal(row("en").meaning, "fermentation");
  assert.equal(row("zh").learning_tip, "jäsa=发酵");
  assert.equal(row("en").learning_tip, "jäsa = ferment");
  assert.equal(row("zh").collocations, "naturlig jäsning | 自然发酵 | Brödet får naturlig jäsning.");
  assert.equal(row("en").collocations, "naturlig jäsning | natural fermentation | Brödet får naturlig jäsning.");
  assert.equal(row("zh").related_words, "jäsa | 发酵（动词）");
  assert.equal(row("en").related_words, "jäsa | ferment (verb)");
  const exIds = d.tables.learning_object_examples.filter((e) => e.learning_object_id === entryId).map((e) => e.id);
  const tr = d.tables.learning_object_example_translations.filter((t) => exIds.includes(t.example_id));
  assert.equal(exIds.length, 2);
  assert.deepEqual(tr.map((t) => t.native_language).sort(), ["en", "en", "zh", "zh"]);
  assert.ok(exIds.every((id) => id && tr.filter((t) => t.example_id === id).length === 2));
  assert.equal(d.tables.learning_objects.find((o) => o.id === entryId).chinese, "发酵");
});

test("an existing entry missing one language keeps every field it already has", async () => {
  const d = db();
  d.tables.learning_object_translations.push({ id: 9, learning_object_id: "w-utveckla", native_language: "en", meaning: "", learning_tip: "keep me" });
  card = baseCard({ lemma: "utveckla", pos: "verb", meaning_zh: "开发（新）", meaning_en: "develop", memory_tip_zh: "新提示", memory_tip_en: "new tip", forms: [] });
  await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "utveckla", nativeLanguage: "en", pos: "verb", chargeQuota: false });
  const zh = d.tables.learning_object_translations.find((t) => t.learning_object_id === "w-utveckla" && t.native_language === "zh");
  const en = d.tables.learning_object_translations.find((t) => t.learning_object_id === "w-utveckla" && t.native_language === "en");
  assert.equal(zh.meaning, "发展");          // existing Chinese meaning untouched
  assert.equal(zh.learning_tip, "新提示");    // empty field filled
  assert.equal(en.meaning, "develop");
  assert.equal(en.learning_tip, "keep me");   // existing English tip untouched
});

test("a same-spelling word of another part of speech gets its own entry", async () => {
  const d = db();
  d.tables.learning_objects.push({ id: "w-fast-adj", swedish: "fast", part_of_speech: "adjective", object_type: "word", status: "published" });
  d.tables.learning_object_translations.push({ id: 2, learning_object_id: "w-fast-adj", native_language: "zh", meaning: "牢固的" });
  card = baseCard({ lemma: "fast", pos: "conjunction", meaning_zh: "虽然", meaning_en: "although", forms: [] });
  const conj = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "fast", nativeLanguage: "zh", pos: "conjunction", chargeQuota: false });
  assert.equal(conj.created, true);
  assert.notEqual(conj.entryId, "w-fast-adj");
  const adj = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "fast", nativeLanguage: "zh", pos: "adjective", chargeQuota: false });
  assert.equal(adj.entryId, "w-fast-adj");
});

test("reading expressions: variants reuse one row, other module gets a membership", async () => {
  const d = fakeSupabase({
    learning_objects: [{ id: "x-tahand", swedish: "ta hand om någon", part_of_speech: "other", object_type: "expression", status: "human_reviewed", match_key: "ta hand om ngn" }],
  });
  const out = await resolveExpressionEntries(d, [
    { expression_text: "tar hand om ngn", meaning_zh: "照顾某人", source_sentence: "Hon tar hand om ngn." },
    { expression_text: "lägga märke till", meaning_zh: "注意到", source_sentence: "Jag lade märke till det." },
    { expression_text: "lägger märke till", meaning_zh: "注意到", source_sentence: "Han lägger märke till allt." },
  ], { objectType: "phrase", category: "common_collocation", nativeLanguage: "zh" });
  assert.equal(out[0].expression_id, "x-tahand");
  assert.ok(d.tables.learning_object_modules.some((m) => m.learning_object_id === "x-tahand" && m.module === "phrase"));
  assert.ok(out[1].expression_id);
  assert.equal(out[1].expression_id, out[2].expression_id);   // inflected first verb: same row
  assert.equal(d.tables.learning_objects.length, 2);          // only one new row
  const created = d.tables.learning_objects.find((o) => o.id === out[1].expression_id);
  assert.equal(created.match_key, "lägga märke till");
  assert.ok(d.tables.resource_field_status.some((s) => s.learning_object_id === created.id && s.field === "swedish_explanation" && s.status === "missing"));
});

test("before saving: a card of another part of speech than asked for is not saved", async () => {
  const d = db();
  card = baseCard({ lemma: "jäsning", pos: "verb" });
  await assert.rejects(generateWordEntry({ supabaseAdmin: d, userId: "u", word: "jäsning", nativeLanguage: "zh", pos: "noun", chargeQuota: false }), { status: 422 });
  assert.equal(d.tables.learning_objects.filter((o) => o.swedish === "jäsning").length, 0);
});

test("before saving: a part of speech the references don't give the word is not saved", async () => {
  const d = db();
  card = baseCard({ lemma: "jäsning", pos: "adjective" });   // SALDO: jäsning is only a noun
  await assert.rejects(generateWordEntry({ supabaseAdmin: d, userId: "u", word: "jäsning", nativeLanguage: "zh", chargeQuota: false }), { status: 422 });
  assert.equal(d.tables.learning_objects.filter((o) => o.swedish === "jäsning").length, 0);
});

test("before saving: another part of speech's sense is taken out, a wrong translation fixed, an example without the word dropped", async () => {
  const d = db();
  card = baseCard({ lemma: "jäsning", meaning_zh: "发酵；使发酵", examples: [
    { swedish: "Jäsningen tar tid.", zh: "擦乾淨", en: "Fermentation takes time." },
    { swedish: "Degen får jäsa över natten.", zh: "面团发酵一夜。", en: "The dough rises overnight." },
  ] });
  check = okCheck({ other_pos_senses: ["使发酵"], meaning_zh_fixed: "发酵", verdict: "fixed",
    example: { "i1.e0": { translation_zh_ok: false, translation_zh_fixed: "发酵需要时间。" } } });
  const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "jäsning", nativeLanguage: "zh", pos: "noun", sense: "发酵", chargeQuota: false });
  assert.equal(checkCalls, 1);
  assert.equal(d.tables.learning_object_translations.find((t) => t.learning_object_id === entryId && t.native_language === "zh").meaning, "发酵");
  const examples = d.tables.learning_object_examples.filter((e) => e.learning_object_id === entryId);
  assert.deepEqual(examples.map((e) => e.example_swedish), ["Jäsningen tar tid."]);   // "jäsa" is another word
  const zh = d.tables.learning_object_example_translations.find((t) => t.example_id === examples[0].id && t.native_language === "zh");
  assert.equal(zh.translation, "发酵需要时间。");
  const status = (field) => d.tables.resource_field_status.find((s) => s.learning_object_id === entryId && s.field === field);
  assert.equal(status("pos").status, "verified");
  // The AI check passed, but no dictionary's English confirms the meaning: not verified on the AI's word alone.
  assert.equal(status("sense").status, "present");
  assert.match(status("sense").source, /no_dictionary_english/);
});

test("before saving: a check that can't decide leaves the card marked for review, not verified", async () => {
  const d = db();
  card = baseCard({ lemma: "jäsning" });
  check = okCheck({ verdict: "unsure", note: "references too short" });
  const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "jäsning", nativeLanguage: "zh", pos: "noun", chargeQuota: false });
  assert.equal(d.tables.resource_field_status.find((s) => s.learning_object_id === entryId && s.field === "sense").status, "mismatch");
});

test("related words: never the headword's own forms; the part of speech is always the last bracket", async () => {
  const { relatedLines, relatedMeaning } = await import("../server-native.mjs");
  const lines = relatedLines([
    { word: "lampor", zh: "灯（复数）", pos: "noun" },
    { word: "Lampa", zh: "灯", pos: "noun" },
    { word: "lampskärm", zh: "灯罩", pos: "noun" },
    { word: "lysande", zh: "闪亮的", pos: "present_participle" },
  ], { lemma: "lampa", forms: [{ type: "plural_indefinite", value: "lampor" }, { type: "present_participle", value: "lysande" }] }, "zh");
  assert.equal(lines, "lampskärm | 灯罩（名词）\nlysande | 闪亮的（现在分词）");
  assert.equal(relatedMeaning({ zh: "规定（复数）", pos: "noun" }, "zh"), "规定（复数）（名词）");
  assert.equal(relatedMeaning({ en: "creamy (adjective)", pos: "adjective" }, "en"), "creamy (adjective)");
  assert.equal(relatedMeaning({ en: "written", pos: "perfect_participle" }, "en"), "written (past participle)");
});
