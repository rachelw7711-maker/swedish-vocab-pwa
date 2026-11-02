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
