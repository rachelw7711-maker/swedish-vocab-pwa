// Korp as evidence for words no dictionary has (2026-11-04): the verdicts, without the network.
//   node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { korpCqp, ownForms, judgeAttestation, senseVerdict } from "../server-korp.mjs";

const att = (match, perCorpus, corpusPos) => {
  const byPos = {};
  for (const r of Object.values(corpusPos)) for (const [t, n] of Object.entries(r)) byPos[t] = (byPos[t] || 0) + n;
  return { match, perCorpus, corpusPos, byPos, total: Object.values(perCorpus).reduce((s, n) => s + n, 0) };
};

test("queries: lemma with part of speech, spelling with forms, expressions with placeholders and reflexives", () => {
  assert.equal(korpCqp("jäsning", "noun", { forms: ["jäsningen", "jäsningar", "jäsningarna", "en"] }), '[lemma contains "jäsning" & word="jäsning|jäsningen|jäsningar|jäsningarna"%c & (pos="NN")]');
  assert.equal(korpCqp("glad", "adjective"), '[lemma contains "glad" & word="glad"%c & (pos="JJ" | pos="PC")]');
  assert.equal(korpCqp("mejla", null, { spelling: true, forms: ["mejlar", "mejlade", "ha mejlat"] }), '[word="mejla|mejlar|mejlade"%c]');
  assert.equal(korpCqp("ta hand om något"), '[lemma contains "ta" | word="ta"%c] [lemma contains "hand" | word="hand"%c] [lemma contains "om" | word="om"%c]');
  assert.equal(korpCqp("bry sig om"), '[lemma contains "bry" | word="bry"%c] [word="sig|mig|dig|oss|er|sej|mej|dej"%c] [lemma contains "om" | word="om"%c]');
  assert.equal(korpCqp("hålla något kort"), '[lemma contains "hålla" | word="hålla"%c] []{1,3} [lemma contains "kort" | word="kort"%c]');
});

test("own forms: not compounds, not the stored gender", () => {
  assert.deepEqual(ownForms("vuxen", ["vuxna", "vuxne", "vuxnas", "en"]), ["vuxen", "vuxna", "vuxne", "vuxnas"]);
  assert.deepEqual(ownForms("gå", ["går", "gick", "gått", "har gått"]), ["gå", "går", "gick", "gått"]);
});

test("existence needs hits in several corpora; spelling-only matches need more", () => {
  assert.equal(judgeAttestation(att("lemma", { A: 40, B: 3 }, { A: { NN: 40 }, B: { NN: 3 } }), "noun").exists.ok, true);
  // many hits, one corpus: a one-off (one blog, one author) is not enough
  assert.equal(judgeAttestation(att("lemma", { A: 400, B: 1 }, { A: { NN: 400 }, B: { NN: 1 } }), "noun").exists.ok, false);
  // a typo-like spelling: lemmatiser doesn't know it; 15 hits in 3 corpora is under the spelling bar
  assert.equal(judgeAttestation(att("spelling", { A: 5, B: 5, C: 5 }, { A: { NN: 5 }, B: { NN: 5 }, C: { NN: 5 } }), "noun").exists.ok, false);
  assert.equal(judgeAttestation(att("spelling", { A: 10, B: 10, C: 10 }, { A: { NN: 10 }, B: { NN: 10 }, C: { NN: 10 } }), "noun").exists.ok, true);
});

test("part of speech: enough hits with the tag, a real share, in more than one corpus", () => {
  const verb = judgeAttestation(att("lemma", { A: 5000, B: 4000 }, { A: { VB: 5000 }, B: { VB: 3997, NN: 3 } }), "noun");
  assert.equal(verb.exists.ok, true);
  assert.equal(verb.pos.ok, false);       // regna is a verb: three noun tags are tagger noise
  assert.equal(verb.pos.differs, true);
  // a real noun/verb homograph lemma: the noun use is 30% and in both corpora
  assert.equal(judgeAttestation(att("lemma", { A: 100, B: 100 }, { A: { VB: 70, NN: 30 }, B: { VB: 70, NN: 30 } }), "noun").pos.ok, true);
  // tagged hits in one corpus only
  assert.equal(judgeAttestation(att("lemma", { A: 100, B: 100 }, { A: { NN: 100 }, B: { VB: 100 } }), "noun").pos.ok, false);
  assert.equal(judgeAttestation(att("multiword", { A: 9, B: 9 }, { A: {}, B: {} }), null).pos.ok, null);
});

test("sense: every sense needs two confirmed sentences, from two corpora", () => {
  const senses = [{ zh: "发酵", en: "fermentation" }, { zh: "酝酿", en: "ferment (unrest)" }];
  const sentences = [1, 2, 3, 4, 5].map((n) => ({ n, corpus: n <= 2 ? "GP2012" : "ROMI", text: "" }));
  const yes = { 1: true, 2: true, 3: true, 4: true, 5: true };
  // only the first sense attested
  let v = senseVerdict(senses, sentences, [{ n: 1, sense: 1 }, { n: 3, sense: 1 }, { n: 4, sense: 0 }], yes);
  assert.equal(v.ok, false); assert.deepEqual(v.unattested, ["ferment (unrest)"]);
  v = senseVerdict(senses, sentences, [{ n: 1, sense: 1 }, { n: 3, sense: 1 }, { n: 4, sense: 2 }, { n: 5, sense: 2 }], yes);
  assert.equal(v.ok, true);
  // the second reader did not confirm one of the readings
  assert.equal(senseVerdict(senses, sentences, [{ n: 1, sense: 1 }, { n: 3, sense: 1 }, { n: 4, sense: 2 }, { n: 5, sense: 2 }], { ...yes, 5: false }).ok, false);
  // enough sentences, but all from one corpus
  assert.equal(senseVerdict([senses[0]], sentences, [{ n: 1, sense: 1 }, { n: 2, sense: 1 }], yes).ok, false);
});
