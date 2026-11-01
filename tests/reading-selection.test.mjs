import test from "node:test";
import assert from "node:assert/strict";
import { glossaryForms, distinctExpressions } from "../server-reading.mjs";

const glossary = [
  { word: "turnera, turnerar", definition: "uppträder på olika platser" },
  { word: "en succé, -er", definition: "en framgång" },
  { word: "uppmuntra, uppmuntrar", definition: "säga att någon är bra" },
  { word: "uthållig", definition: "som inte ger upp" },
];

test("textbook word list entries give their base forms", () => {
  assert.deepEqual([...glossaryForms(glossary)], ["turnera", "turnerar", "succé", "uppmuntra", "uppmuntrar", "uthållig"]);
});

test("an expression in both lists is shown once, as a fixed phrase", () => {
  const e = (t) => ({ expression_text: t });
  const { collocations, idioms } = distinctExpressions(
    [e("ägna sig åt något"), e("med andra ord")],
    [e("Med andra ord"), e("spela roll"), e("spela  roll")],
  );
  assert.deepEqual(collocations.map((x) => x.expression_text), ["ägna sig åt något", "med andra ord"]);
  assert.deepEqual(idioms.map((x) => x.expression_text), ["spela roll"]);
});

test("an expression the book's word list already explains is not offered", () => {
  const { collocations } = distinctExpressions([{ expression_text: "uppmuntra" }, { expression_text: "göra succé" }], [], glossary);
  assert.deepEqual(collocations.map((x) => x.expression_text), ["göra succé"]);
});

import { expressionInText, splitSentences } from "../server-reading.mjs";

const text = "Hon har gjort succé inom många områden. Min personlighet spelar säkert också roll.";

test("an expression is kept only when its sentence and a word of it are in the text", () => {
  const e = (expression_text, source_sentence) => ({ expression_text, source_sentence });
  assert.equal(expressionInText(e("göra succé", "Hon har gjort succé inom många områden."), text), true);
  assert.equal(expressionInText(e("spela roll", "Min personlighet spelar  säkert också roll."), text), true);
  assert.equal(expressionInText(e("ta hand om något", "Hon tar hand om allt."), text), false, "sentence not in the text");
  assert.equal(expressionInText(e("fatta ett beslut", "Hon har gjort succé inom många områden."), text), false, "words not in the sentence");
  assert.equal(expressionInText(e("görа succé", "Hon har gjort succé inom många områden."), text), false, "Cyrillic letter");
  assert.equal(expressionInText(e("succé", "Hon har gjort succé inom många områden."), text), false, "a single word");
});

test("sentences are numbered one by one", () => {
  assert.deepEqual(splitSentences(text), ["Hon har gjort succé inom många områden.", "Min personlighet spelar säkert också roll."]);
});

import { expressionCategory, sortExpressions } from "../server-reading.mjs";

test("the scan's verdict decides the list", () => {
  assert.equal(expressionCategory({ verdict: "idiom" }), "idiom");
  assert.equal(expressionCategory({ verdict: "fast_fras" }), "collocation");
  assert.equal(expressionCategory({ verdict: "neither" }), null);
  assert.equal(expressionCategory(undefined), null, "not judged in the scan");
});

test("chosen expressions are placed by the scan's verdict, never both", () => {
  const sentence = "Min personlighet spelar säkert också roll när det gäller skolan.";
  const scan = [{ sentence: 1, candidates: [
    { expression: "spela roll", verdict: "idiom" },
    { expression: "när det gäller", verdict: "fast_fras" },
    { expression: "gå i skolan", verdict: "neither" },
  ] }];
  const pick = (expression_text) => ({ expression_text, source_sentence: sentence });
  const { collocations, idioms } = sortExpressions({ scan, collocations: [pick("spela roll"), pick("när det gäller"), pick("gå i skolan")], idioms: [pick("spela roll")] }, sentence);
  assert.deepEqual(idioms.map((e) => e.expression_text), ["spela roll"]);
  assert.deepEqual(collocations.map((e) => e.expression_text), ["när det gäller"]);
});
