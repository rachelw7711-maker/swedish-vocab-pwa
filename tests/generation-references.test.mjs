// Word-card generation with Lexin next to SALDO (2026-11-03): Lexin's senses in the prompt,
// its "no plural" for countability, compounds checked against their last part, and the English
// meaning against Lexin's equivalents. OpenAI is replaced by a canned response; no network.
import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
process.env.OPENAI_API_KEY ||= "test";
const { useSaldoFiles } = await import("../server-lexicon.mjs");
const { useReferenceFiles } = await import("../server-references.mjs");
const { generateWordEntry } = await import("../server-native.mjs");
const { fakeSupabase } = await import("./fake-supabase.mjs");
const { okDetail } = await import("./fake-detail.mjs");

let card = null, prompts = [];
const okCheck = (item) => ({ key: item.key, lemma: item.lemma, pos: item.pos, pos_supported: true, other_pos_senses: [], unsupported_senses: [],
  meaning_zh_fixed: "", meaning_en_fixed: "", swedish_explanation_fixed: "", context_matches_entry: "n/a", verdict: "ok", note: "",
  examples: item.entry.examples.map((e) => ({ key: e.key, sv_start: e.sv.split(" ").slice(0, 3).join(" "), fits_entry: true, translation_zh_ok: true, translation_en_ok: true, translation_zh_fixed: "", translation_en_fixed: "" })) });
before(async () => {
  await useSaldoFiles();
  await useReferenceFiles();
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("wiktionary.org")) return { ok: true, json: async () => ({ error: { code: "missingtitle" } }) };
    const body = JSON.parse(init.body);
    const user = body.input.at(-1).content;
    prompts.push({ name: body.text.format.name, user });
    const answer = body.text.format.name === "sense_check" ? { items: JSON.parse(user).map(okCheck) }
      : body.text.format.name === "card_detail_check" ? okDetail(JSON.parse(user)) : card;
    return { ok: true, json: async () => ({ output_text: JSON.stringify(answer), usage: { input_tokens: 500, output_tokens: 400 } }) };
  };
});
beforeEach(() => { prompts = []; });

const nounCard = (over) => ({
  is_real_word: true, lemma: "", pos: "noun", pos_detail: "en-ord", cefr_level: "B1", meaning_zh: "", meaning_en: "", swedish_explanation: "",
  forms: [], transitivity: "", passive: "", countability: "countable", examples: [], collocations: [], related: [], memory_tip_zh: "", memory_tip_en: "", ...over,
});
const status = (d, id, field) => d.tables.resource_field_status.find((s) => s.learning_object_id === id && s.field === field);

test("Lexin's senses go into the prompt and the check; its 'no plural' decides countability", async () => {
  const d = fakeSupabase({});
  card = nounCard({ lemma: "kärlek", meaning_zh: "爱；爱情", meaning_en: "love", swedish_explanation: "stark känsla",
    examples: [{ swedish: "Kärleken är stark.", zh: "爱很强大。", en: "Love is strong." }] });
  const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "kärlek", nativeLanguage: "zh", pos: "noun", chargeQuota: false });
  assert.match(prompts.find((p) => p.name === "swedish_word_card_v2").user, /Reference \(Lexin, Isof\): senses of this noun: 1\. stark positiv känsla/);
  assert.match(prompts.find((p) => p.name === "sense_check").user, /"lexin":\[\{"definition":"stark positiv känsla för någon"/);
  assert.equal(d.tables.learning_objects.find((o) => o.id === entryId).countability, "uncountable");
  assert.equal(status(d, entryId, "sense").status, "verified");
  assert.match(status(d, entryId, "sense").source, /lexin-sv-2020/);
  assert.equal(status(d, entryId, "sense").detail.en_reference, "lexin");
});

test("an English meaning Lexin's equivalents don't support leaves the sense unconfirmed", async () => {
  const d = fakeSupabase({});
  card = nounCard({ lemma: "torka", meaning_zh: "干旱", meaning_en: "towel rack", swedish_explanation: "torrt väder", countability: "uncountable",
    examples: [{ swedish: "Torkan förstörde skörden.", zh: "干旱毁了收成。", en: "The drought ruined the harvest." }] });
  const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "torka", nativeLanguage: "zh", pos: "noun", chargeQuota: false });
  assert.equal(status(d, entryId, "sense").status, "present");
  assert.equal(status(d, entryId, "sense").detail.en_reference, "unmatched");
});

test("a compound SALDO doesn't list: its forms are checked against its last part", async () => {
  const d = fakeSupabase({});
  card = nounCard({ lemma: "chokladask", meaning_zh: "巧克力盒", meaning_en: "box of chocolates",
    forms: [{ type: "genus", value: "en" }, { type: "singular_definite", value: "chokladasken" }, { type: "plural_indefinite", value: "chokladaskar" }, { type: "plural_definite", value: "chokladaskor" }],
    examples: [{ swedish: "Hon fick en chokladask.", zh: "她收到了一盒巧克力。", en: "She got a box of chocolates." }] });
  const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "chokladask", nativeLanguage: "zh", pos: "noun", chargeQuota: false });
  assert.equal(status(d, entryId, "form:singular_definite").status, "verified");
  assert.equal(status(d, entryId, "form:singular_definite").source, "saldo-compound");
  assert.equal(status(d, entryId, "form:plural_definite").status, "mismatch", "the model's wrong form is flagged, not trusted");
});
