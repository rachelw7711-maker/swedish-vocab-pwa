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

let aiCalls = 0, card = null;
before(async () => {
  await useSaldoFiles();
  globalThis.fetch = async () => {
    aiCalls++;
    return { ok: true, json: async () => ({ output_text: JSON.stringify(card), usage: { input_tokens: 500, output_tokens: 400 } }) };
  };
});
beforeEach(() => { aiCalls = 0; });

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
