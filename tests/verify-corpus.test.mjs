// The corpus step after saving (server-verify.mjs, 2026-11-08): only what no dictionary has is
// counted; only what the corpus rarely has is read; only what the reader then calls made up goes.
import { test, before } from "node:test";
import assert from "node:assert/strict";
const { useSaldoFiles } = await import("../server-lexicon.mjs");
const { useReferenceFiles, referenceEntries } = await import("../server-references.mjs");
const { verifyAgainstCorpus } = await import("../server-verify.mjs");
before(async () => { await useSaldoFiles(); await useReferenceFiles(); });

const counts = { "stjäla med ögonen": 0, "stjäla en bil": 40, "förankra båten": 0, "slagig": 0, "snatta": 300 };
const korp = async (text) => ({ total: counts[text] ?? 0, perCorpus: counts[text] ? { A: counts[text] / 2, B: counts[text] / 2 } : {}, match: /\s/.test(text) ? "multiword" : "lemma" });

test("made up only when dictionaries, corpus and reader agree; rare but right stays; unsure stays open", async () => {
  const card = { lemma: "stjäla", pos: "verb",
    collocations: [{ phrase: "stjäla med ögonen", zh: "偷看", en: "steal a look" }, { phrase: "stjäla en bil", zh: "偷车", en: "steal a car" }, { phrase: "förankra båten", zh: "", en: "anchor the boat" }],
    related: [{ word: "slagig", pos: "adjective", zh: "", en: "catchy" }, { word: "stöld", pos: "noun", zh: "盗窃", en: "theft" }] };
  let asked = null;
  const ask = async (args) => {
    asked = JSON.parse(args.user);
    const v = { "stjäla med ögonen": "made_up", "förankra båten": "correct_rare", "slagig": "unsure" };
    return { result: { items: asked.items.map((x) => ({ key: x.key, verdict: v[x.text], note: "" })) }, usage: {} };
  };
  const r = await verifyAgainstCorpus(null, { card, refs: await referenceEntries(null, "stjäla"), headwordForms: ["stjäla", "stjäl", "stal", "stulit"] }, { ask, korp });
  assert.deepEqual(asked.items.map((x) => x.text), ["stjäla med ögonen", "förankra båten", "slagig"]);   // attested and dictionary words not asked
  assert.deepEqual(r.dropped.map((x) => x.text), ["stjäla med ögonen"]);
  assert.deepEqual(r.kept.map((x) => x.text), ["förankra båten"]);
  assert.deepEqual(r.open.map((x) => x.text), ["slagig"]);
  assert.deepEqual(r.card.collocations.map((c) => c.phrase), ["stjäla en bil", "förankra båten"]);
  assert.deepEqual(r.card.related.map((c) => c.word), ["slagig", "stöld"]);
  assert.equal(card.collocations.length, 3);   // the card given is not changed
});

test("a reader that fails drops nothing", async () => {
  const card = { lemma: "stjäla", pos: "verb", collocations: [{ phrase: "stjäla med ögonen", zh: "", en: "" }], related: [] };
  const r = await verifyAgainstCorpus(null, { card }, { ask: async () => { throw new Error("down"); }, korp });
  assert.equal(r.card.collocations.length, 1);
  assert.equal(r.open.length, 1);
});
