import "./env-test.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { glossaryPartOfSpeech, glossaryPartsOfSpeech, checkKeywordPos, exampleUsesWord } from "../server-language-checks.mjs";

test("the textbook's word list names a part of speech when its entry shows one", () => {
  assert.deepEqual(glossaryPartOfSpeech("en torka"), { lemma: "torka", pos: "noun" });
  assert.deepEqual(glossaryPartOfSpeech("ett tillfälle, -n"), { lemma: "tillfälle", pos: "noun" });
  assert.deepEqual(glossaryPartOfSpeech("drabba, drabbas"), { lemma: "drabba", pos: "verb" });
  assert.deepEqual(glossaryPartOfSpeech("påverka, påverkar"), { lemma: "påverka", pos: "verb" });
  assert.deepEqual(glossaryPartOfSpeech("införa, inför"), { lemma: "införa", pos: "verb" });
  assert.deepEqual(glossaryPartOfSpeech("smälta, smälter, smälte, smält"), { lemma: "smälta", pos: "verb" });
  assert.deepEqual(glossaryPartOfSpeech("ofantlig, -t"), { lemma: "ofantlig", pos: "adjective" });
  assert.equal(glossaryPartOfSpeech("blöt"), null);
  assert.equal(glossaryPartOfSpeech("hållbar"), null);
  assert.equal(glossaryPartsOfSpeech([{ word: "en torka" }, { word: "blöt" }]).get("torka"), "noun");
});

test("a keyword's part of speech: the book decides, else it must be one the references give", () => {
  // "svår torka": the book says "en torka" — a verb answer is corrected to the noun.
  assert.deepEqual(checkKeywordPos({ pos: "verb", glossaryPos: "noun", referencePos: ["verb", "noun"] }), { pos: "noun", status: "corrected", reason: "glossary_says_noun" });
  assert.equal(checkKeywordPos({ pos: "noun", glossaryPos: "noun", referencePos: ["verb", "noun"] }).status, "confirmed");
  assert.equal(checkKeywordPos({ pos: "noun", referencePos: ["verb", "noun"] }).status, "confirmed");
  assert.equal(checkKeywordPos({ pos: "adjective", referencePos: ["verb", "noun"] }).status, "rejected");
  // Unknown to SALDO and Wiktionary: kept, not judged wrong.
  assert.equal(checkKeywordPos({ pos: "noun", referencePos: [] }).status, "unconfirmed");
  // The book's part of speech the references don't have (an OCR slip?): the AI's stands if the references allow it.
  assert.equal(checkKeywordPos({ pos: "verb", glossaryPos: "noun", referencePos: ["verb"] }).status, "confirmed");
});

test("an example must use the word in one of its forms", () => {
  assert.equal(exampleUsesWord("Tvätten torkar snabbt i solen.", ["torka", "torkar", "torkade"]), true);
  assert.equal(exampleUsesWord("Torkan förstörde skörden.", ["torka", "torkar", "torkade"]), false);
  assert.equal(exampleUsesWord("Kan du torka av bordet?", ["torka av"]), true);
});

test("an example translation that is a fragment or traditional Chinese is flagged for the check", async () => {
  const { translationFlags } = await import("../server-language-checks.mjs");
  assert.deepEqual(translationFlags({ sv: "Torka svampen innan du lagar den.", zh: "擦乾淨", en: "Dry the mushroom before you cook it." }), ["zh_too_short", "zh_traditional"]);
  assert.deepEqual(translationFlags({ sv: "Tvätten torkar snabbt i solen.", zh: "衣服在阳光下很快就晾干了。", en: "The laundry dries quickly in the sun." }), []);
});

// ---------------------------------------------------------------------------
// AI check answers are matched and verified, never trusted by position (2026-11-02)
// ---------------------------------------------------------------------------
const entry = (id, lemma, pos, examples) => ({ id, lemma, pos, entry: { meaning_zh: "x", meaning_en: "x", swedish_explanation: "x", examples } });
const answer = (item, over = {}) => ({ key: item.key, lemma: item.lemma, pos: item.pos, pos_supported: true, other_pos_senses: [], unsupported_senses: [],
  meaning_zh_fixed: "", meaning_en_fixed: "", swedish_explanation_fixed: "", context_matches_entry: "n/a", verdict: "ok", note: "",
  examples: item.entry.examples.map((e) => ({ key: e.key, sv_start: e.sv.split(" ").slice(0, 3).join(" "), fits_entry: true, translation_zh_ok: true,
    translation_en_ok: true, translation_zh_fixed: "", translation_en_fixed: "" })), ...over });
async function withModel(respond, run) {
  const real = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init) => {
    const items = JSON.parse(JSON.parse(init.body).input.at(-1).content);
    requests.push(items.map((i) => i.lemma));
    const out = respond(items, requests.length);
    return { ok: true, json: async () => ({ output_text: JSON.stringify({ items: out }), usage: { input_tokens: 100, output_tokens: 50 } }) };
  };
  try { return await run(requests); } finally { globalThis.fetch = real; }
}
const vuxen = entry("id-vuxen", "vuxen", "noun", [{ sv: "Barn och vuxna kan delta.", zh: "儿童和成年人都可以参加。" }]);
const bete = entry("id-bete", "bete", "verb", [{ sv: "Han kan bete sig konstigt.", zh: "他有时表现得很奇怪。" }, { sv: "Man måste bete sig artigt.", zh: "人们必须举止有礼。" }]);

test("answers swapped between items are not used; each item is asked again on its own", async () => {
  const { aiSenseCheck } = await import("../server-language-checks.mjs");
  await withModel((items, n) => n === 1
    ? [answer(items[0], { key: items[1].key }), answer(items[1], { key: items[0].key })]   // vuxen's answer under bete's key and back
    : items.map((i) => answer(i)), async (requests) => {
    const { checks, failures, usage } = await aiSenseCheck(null, [vuxen, bete]);
    assert.deepEqual(requests, [["vuxen", "bete"], ["vuxen"], ["bete"]]);
    assert.equal(checks.get("id-vuxen").lemma, "vuxen");
    assert.equal(checks.get("id-bete").lemma, "bete");
    assert.equal(failures.size, 0);
    assert.equal(usage.retries, 2);
  });
});

test("an answer that leaves out an example, or is empty, is not a pass", async () => {
  const { aiSenseCheck } = await import("../server-language-checks.mjs");
  await withModel((items) => items.map((i) => answer(i, { examples: i.lemma === "bete" ? [] : answer(i).examples })), async () => {
    const { checks, failures } = await aiSenseCheck(null, [vuxen, bete]);
    assert.ok(checks.has("id-vuxen"));
    assert.ok(!checks.has("id-bete"));
    assert.deepEqual(failures.get("id-bete"), ["example_missing:i2.e0", "example_missing:i2.e1"]);   // asked again alone, still i2
  });
  await withModel(() => [], async () => {
    const { checks, failures } = await aiSenseCheck(null, [vuxen]);
    assert.equal(checks.size, 0);
    assert.deepEqual(failures.get("id-vuxen"), ["missing"]);
  });
});

test("an example answered twice, or with another sentence's words, is not used", async () => {
  const { checkProblems } = await import("../server-language-checks.mjs");
  const item = { key: "i1", lemma: "bete", pos: "verb", entry: { examples: [{ key: "i1.e0", sv: "Han kan bete sig konstigt.", zh: "x" }, { key: "i1.e1", sv: "Man måste bete sig artigt.", zh: "y" }] } };
  const a = answer(item);
  assert.deepEqual(checkProblems(item, a), []);
  assert.deepEqual(checkProblems(item, { ...a, examples: [a.examples[0], a.examples[0]] }), ["duplicate_example:i1.e0", "example_missing:i1.e1"]);
  assert.deepEqual(checkProblems(item, { ...a, examples: [{ ...a.examples[0], sv_start: "Man måste bete" }, a.examples[1]] }), ["example_echo:i1.e0"]);
  assert.deepEqual(checkProblems(item, { ...a, pos: "noun" }), ["pos_echo:noun"]);
});

test("a translation judged wrong needs a correction that keeps the pronouns", async () => {
  const { checkProblems, pronounMismatch } = await import("../server-language-checks.mjs");
  const item = { key: "i1", lemma: "fly", pos: "verb", entry: { examples: [{ key: "i1.e0", sv: "Han flydde snabbt från platsen.", zh: "逃跑" }] } };
  const wrong = (fixed) => answer(item, { examples: [{ ...answer(item).examples[0], translation_zh_ok: false, translation_zh_fixed: fixed }] });
  assert.deepEqual(checkProblems(item, wrong("")), ["no_zh_fix:i1.e0"]);
  assert.deepEqual(checkProblems(item, wrong("她迅速从那里逃走了。")), ["bad_zh_fix:i1.e0"]);
  assert.deepEqual(checkProblems(item, wrong("他迅速從那裡逃走了。")), ["bad_zh_fix:i1.e0"]);
  assert.deepEqual(checkProblems(item, wrong("他迅速从那里逃走了。")), []);
  assert.equal(pronounMismatch("De strödde blommor på bordet.", "她们把花撒在桌子上。"), false);   // not judged: no han/hon
  assert.equal(pronounMismatch("Hon strör socker på gröten.", "他在粥上撒糖。"), true);
});

test("a call that fails twice leaves the items unchecked with the reason", async () => {
  const { aiSenseCheck } = await import("../server-language-checks.mjs");
  const real = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, json: async () => ({ error: { message: "overloaded" } }) });
  try {
    const { checks, failures, usage } = await aiSenseCheck(null, [vuxen]);
    assert.equal(checks.size, 0);
    assert.match(failures.get("id-vuxen").join(" "), /call_failed/);
    assert.equal(usage.failed_calls, 2);
  } finally { globalThis.fetch = real; }
});

test("keyword part of speech: SALDO alone doesn't reject a regular conversion or when Wiktionary wasn't reached", async () => {
  const { checkKeywordPos } = await import("../server-language-checks.mjs");
  assert.equal(checkKeywordPos({ pos: "adverb", referencePos: ["adjective"] }).status, "unconfirmed");   // explicit, konsekvent
  assert.equal(checkKeywordPos({ pos: "noun", referencePos: ["adjective"] }).status, "unconfirmed");     // anställd
  assert.equal(checkKeywordPos({ pos: "verb", referencePos: ["noun"], wiktionaryStatus: "timeout" }).status, "unconfirmed");
  assert.equal(checkKeywordPos({ pos: "verb", referencePos: ["noun"] }).status, "rejected");
  assert.equal(checkKeywordPos({ pos: "noun", referencePos: [], wiktionaryStatus: "timeout" }).reason, "wiktionary_timeout");
});

test("example translations: accepted only when the review and the program checks agree; otherwise retried once, then rejected", async () => {
  const { checkedTranslations } = await import("../server-language-checks.mjs");
  const real = globalThis.fetch;
  let round = 0;
  globalThis.fetch = async (_u, init) => {
    const body = JSON.parse(init.body);
    const items = JSON.parse(body.input.at(-1).content);
    const start = (sv) => sv.split(" ").slice(0, 3).join(" ");
    let out;
    if (body.text.format.name === "example_translation") {
      round++;
      out = items.map((i) => ({ key: i.key, sv_start: start(i.sv),
        zh: i.sv.startsWith("Han flydde") ? (round === 1 ? "她迅速逃走了。" : "他迅速从那里逃走了。") : i.sv.startsWith("Vi åt") ? "我们吃了。" : "我们晚上在家吃晚饭。",
        en: i.sv.startsWith("Han flydde") ? "He fled quickly from the place." : i.sv.startsWith("Vi åt") ? "We ate." : "We eat dinner at home tonight." }));
    } else {
      out = items.map((i) => ({ key: i.key, sv_start: start(i.sv), zh_faithful: !i.sv.startsWith("Vi åt"), en_faithful: !i.sv.startsWith("Vi åt"), problems: i.sv.startsWith("Vi åt") ? ["leaves out 'upp resten av kakan'"] : [] }));
    }
    return { ok: true, json: async () => ({ output_text: JSON.stringify({ items: out }), usage: { input_tokens: 10, output_tokens: 10 } }) };
  };
  try {
    const { accepted, rejected } = await checkedTranslations(null, [
      { id: "a", headword: "middag", pos: "noun", sv: "Vi äter middag hemma i kväll." },
      { id: "b", headword: "fly", pos: "verb", sv: "Han flydde snabbt från platsen." },          // first draft has 她: rejected by the program check, fixed on retry
      { id: "c", headword: "rest", pos: "noun", sv: "Vi åt upp resten av kakan." },             // review says a part is missing, twice
    ]);
    assert.deepEqual(accepted.get("a"), { zh: "我们晚上在家吃晚饭。", en: "We eat dinner at home tonight." });
    assert.equal(accepted.get("b").zh, "他迅速从那里逃走了。");
    assert.ok(!accepted.has("c"));
    // "我们吃了。" is caught by the program check before the review is even asked.
    assert.deepEqual(rejected.get("c"), ["zh_too_short", "en_too_short", "zh_too_short", "en_too_short"]);
  } finally { globalThis.fetch = real; }
});

test("a sense said not to belong must be quoted from the entry itself; batches don't mix two items of one lemma", async () => {
  const { checkProblems, aiSenseCheck } = await import("../server-language-checks.mjs");
  const item = { key: "i1", lemma: "vecka", pos: "noun", entry: { meaning_zh: "星期；周。", meaning_en: "week", swedish_explanation: "En tid på sju dagar.", examples: [] } };
  assert.deepEqual(checkProblems(item, answer(item, { other_pos_senses: ["开花"] })), ["foreign_sense:开花"]);       // blomma's, from another item
  assert.deepEqual(checkProblems(item, answer(item, { other_pos_senses: ["周"] })), []);
  const verbs = [entry("a", "torka", "verb", []), entry("b", "torka", "verb", []), entry("c", "vecka", "noun", [])];
  await withModel((items) => items.map((i) => answer(i)), async (requests) => {
    await aiSenseCheck(null, verbs);
    assert.deepEqual(requests, [["torka", "vecka"], ["torka"]]);
  });
});

test("translation flags: no alarm for a left-out pronoun, another person's 他, or characters both scripts share", async () => {
  const { translationFlags, pronounMismatch } = await import("../server-language-checks.mjs");
  assert.equal(pronounMismatch("Hon ringde sin fästman för att berätta att hon fick jobbet.", "她打电话给未婚夫，告诉他自己得到了那份工作。"), false);
  assert.equal(pronounMismatch("Barnet stannade hemma eftersom han var magsjuk.", "孩子因为肠胃不舒服留在家里了。"), false);
  assert.equal(pronounMismatch("Han flydde snabbt.", "她迅速逃走了。"), true);
  assert.deepEqual(translationFlags({ sv: "Barnet somnade i bilen på väg hem.", zh: "孩子在回家的路上在车里睡着了。" }), []);
  assert.deepEqual(translationFlags({ sv: "Det var bussigt av dig att stanna kvar och hjälpa till efter mötet.", zh: "你会后留下来帮忙，真够意思。" }), []);
  assert.deepEqual(translationFlags({ sv: "Du kunde kanske stänga fönstret? Det drar här inne. Jag fryser lite.", zh: "也许可以；委婉表达" }), ["zh_too_short"]);
});

test("collocations: one learning point once, complete ones only", async () => {
  const { sameLearningPoint, cleanCollocations } = await import("../server-language-checks.mjs");
  assert.equal(sameLearningPoint("minska koldioxidutsläppen", "minska koldioxidutsläpp"), true);
  assert.equal(sameLearningPoint("hata någon", "hata något"), true);
  assert.equal(sameLearningPoint("påträffa död", "påträffas död"), true);
  assert.equal(sameLearningPoint("kaninbur", "kaninunge"), false);
  assert.equal(sameLearningPoint("överstiga gränsen", "överstiga gränsvärdet"), false);
  assert.equal(sameLearningPoint("släppa ut koldioxid", "koldioxid i atmosfären"), false);
  assert.equal(sameLearningPoint("vänja sig vid något", "vänja någon vid något"), false);
  assert.equal(sameLearningPoint("så ... att", "så att"), false);
  const { similarMeaning } = await import("../server-language-checks.mjs");
  assert.equal(similarMeaning("减少二氧化碳排放", "减少二氧化碳排放"), true);
  assert.equal(similarMeaning("今年秋天", "去年秋天"), false);
  assert.equal(similarMeaning("只要", "再见"), false);
  assert.equal(similarMeaning("", "再见"), true);
  const { duplicateCollocation } = await import("../server-language-checks.mjs");
  assert.equal(duplicateCollocation({ phrase: "hata någon", zh: "讨厌某人" }, { phrase: "hata något", zh: "讨厌某事" }, ["zh"]), true);
  assert.equal(duplicateCollocation({ phrase: "i höst", zh: "今年秋天；在秋天" }, { phrase: "i höstas", zh: "去年秋天" }, ["zh"]), false);
  assert.equal(duplicateCollocation({ phrase: "så länge", zh: "只要" }, { phrase: "så länge!", zh: "再见" }, ["zh"]), false);
  assert.equal(duplicateCollocation({ phrase: "typ 1-diabetes", zh: "1型糖尿病" }, { phrase: "typ 2-diabetes", zh: "2型糖尿病" }, ["zh"]), false);
  const full = (phrase) => ({ phrase, zh: "x", en: "x", example: "Ett exempel." });
  const { kept, dropped } = cleanCollocations([full("minska koldioxidutsläppen"), full("minska koldioxidutsläpp"), { ...full("släppa ut koldioxid"), zh: "" }, full("koldioxid i atmosfären")]);
  assert.deepEqual(kept.map((k) => k.phrase), ["minska koldioxidutsläppen", "koldioxid i atmosfären"]);
  assert.deepEqual(dropped.map((d) => d.reason), ["duplicate_of:minska koldioxidutsläppen", "incomplete"]);
});

test("noun grammar: gender label from the genus form, SALDO's zero plural decides uncountable", async () => {
  const { nounGrammar } = await import("../server-language-checks.mjs");
  const forms = [{ type: "genus", value: "en" }];
  assert.deepEqual(nounGrammar({ saldoCountability: null, aiCountability: "uncountable", forms, aiPosDetail: "en-ord, obestämd form singular en nederbörd; används oftast som massord" }),
    { countability: "uncountable", countabilitySource: "ai", posDetail: "en-ord" });
  assert.equal(nounGrammar({ saldoCountability: "uncountable", aiCountability: "countable", forms }).countability, "uncountable");
  assert.equal(nounGrammar({ aiCountability: "both", forms: [{ type: "genus", value: "ett" }] }).posDetail, "ett-ord");
  assert.equal(nounGrammar({ aiCountability: "", forms: [], aiPosDetail: "massord" }).countability, null);
  assert.equal(nounGrammar({ aiCountability: "", forms: [], aiPosDetail: "massord" }).posDetail, "");
});
