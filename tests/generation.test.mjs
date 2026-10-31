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
  is_real_word: true, lemma: "", pos: "noun", pos_detail: "", cefr_level: "B1", meaning: "发酵", swedish_explanation: "när något jäser",
  forms: [{ type: "plural_indefinite", value: "jäsningar-FEL" }], transitivity: "", passive: "",
  examples: [{ swedish: "Jäsningen tar tid.", translation: "发酵需要时间。" }, { swedish: "Jäsning ger smak.", translation: "发酵带来风味。" }],
  collocations: [], related: [], memory_tip: "", ...over,
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

test("a same-spelling word of another part of speech gets its own entry", async () => {
  const d = db();
  d.tables.learning_objects.push({ id: "w-fast-adj", swedish: "fast", part_of_speech: "adjective", object_type: "word", status: "published" });
  d.tables.learning_object_translations.push({ id: 2, learning_object_id: "w-fast-adj", native_language: "zh", meaning: "牢固的" });
  card = baseCard({ lemma: "fast", pos: "conjunction", meaning: "虽然", forms: [] });
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
