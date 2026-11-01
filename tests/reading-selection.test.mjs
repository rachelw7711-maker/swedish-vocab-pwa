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
