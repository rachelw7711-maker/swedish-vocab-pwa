import test from "node:test";
import assert from "node:assert/strict";
import { assemblePageLayout, sanitizeGlossary, sanitizeOcrLines } from "../server-reading.mjs";

const lines = sanitizeOcrLines([
  { text: "Kapitel 3" },
  { text: "Rösten i natten" },
  { text: "Det var mörkt när Anna" },
  { text: "ofantlig, -t – mycket stor" },
  { text: "gick hem från stationen." },
  { text: "att trasas sönder" },
  { text: "att gå sönder" },
  { text: "42" },
]);

test("body in the model's order, other left out, glossary verbatim", () => {
  const r = assemblePageLayout(lines, {
    body: [1, 2, 4],
    other: [0, 7],
    glossary: [{ lines: [3], word: "ofantlig, -t", definition: "mycket stor" }, { lines: [5, 6], word: "att trasas sönder", definition: "att gå sönder" }],
  });
  assert.deepEqual(r.body, [1, 2, 4]);
  assert.deepEqual(r.glossary, [{ word: "ofantlig, -t", definition: "mycket stor" }, { word: "att trasas sönder", definition: "att gå sönder" }]);
});

test("a rewritten glossary item keeps the printed text instead", () => {
  const r = assemblePageLayout(lines, { body: [1, 2, 4], other: [0, 7], glossary: [{ lines: [3], word: "ofantlig", definition: "enorm, väldigt stor" }, { lines: [5, 6], word: "att trasas sönder", definition: "att gå sönder" }] });
  assert.deepEqual(r.glossary[0], { word: "ofantlig, -t – mycket stor", definition: "" });
});

test("lines the answer leaves out stay in the body; bad numbers are ignored", () => {
  const r = assemblePageLayout(lines, { body: [2, 99, -1, 2], other: [0, 7], glossary: [] });
  assert.deepEqual(r.body, [2, 1, 3, 4, 5, 6]);
  assert.deepEqual(r.glossary, []);
});

test("client word lists are reduced to verbatim strings", () => {
  assert.deepEqual(sanitizeGlossary([{ word: " ofantlig ", definition: "mycket  stor", extra: 1 }, "x", { word: "" }, null]), [{ word: "ofantlig", definition: "mycket stor" }]);
});

test("a list heading cited with the first entry is dropped", () => {
  const l = sanitizeOcrLines([{ text: "Ordlista" }, { text: "en stuga = ett litet hus på landet" }]);
  const r = assemblePageLayout(l, { body: [], other: [], glossary: [{ lines: [0, 1], word: "en stuga", definition: "ett litet hus på landet" }] });
  assert.deepEqual(r.glossary, [{ word: "en stuga", definition: "ett litet hus på landet" }]);
});
