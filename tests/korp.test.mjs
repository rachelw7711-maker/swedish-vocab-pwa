// Korp as evidence for words no dictionary has (2026-11-04): the verdicts, without the network.
//   node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { korpCqp, ownForms, judgeAttestation, senseVerdict, meaningParts, judgeForm, comparisonByRule, groupFromForms } from "../server-korp.mjs";

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

test("meaning parts: split at semicolons, each judged on its own", () => {
  assert.deepEqual(meaningParts("steam; steam along; steam."), ["steam", "steam along"]);
  assert.deepEqual(meaningParts("a cozy, relaxing evening, usually at home"), ["a cozy, relaxing evening, usually at home"]);
});

test("sense: every part of the meaning needs two sentences both readers agree on, from two corpora", () => {
  const parts = ["loose weight", "sold by weight rather than in packages"];
  const sentences = [1, 2, 3, 4, 5].map((n) => ({ n, corpus: n <= 2 ? "GP2012" : "ROMI", text: "" }));
  const yes = (pairs) => Object.fromEntries(pairs.map((k) => [k, true]));
  // only the second part shown: a wrong gloss beside a right one does not pass
  let v = senseVerdict(parts, sentences, [{ n: 1, glosses: [2] }, { n: 3, glosses: [2] }, { n: 4, glosses: [] }], yes(["1:2", "3:2"]));
  assert.equal(v.ok, false); assert.deepEqual(v.unattested, ["loose weight"]);
  // synonyms: one sentence may show several parts
  const syn = ["forest industry", "forestry industry"];
  v = senseVerdict(syn, sentences, [{ n: 1, glosses: [1, 2] }, { n: 3, glosses: [1, 2] }], yes(["1:1", "1:2", "3:1", "3:2"]));
  assert.equal(v.ok, true);
  // the second reader did not confirm one mark
  assert.equal(senseVerdict(syn, sentences, [{ n: 1, glosses: [1, 2] }, { n: 3, glosses: [1, 2] }], yes(["1:1", "1:2", "3:1"])).ok, false);
  // the same sentence twice counts once
  const twice = [{ n: 1, corpus: "GP2012", text: "Uppskjutning från [rymdbasen] Bajkonur." }, { n: 2, corpus: "GP2012", text: "Uppskjutning från [rymdbasen] Bajkonur." }, { n: 3, corpus: "ROMI", text: "Annat." }];
  assert.equal(senseVerdict(["space base"], twice, [{ n: 1, glosses: [1] }, { n: 2, glosses: [1] }], yes(["1:1", "2:1"])).ok, false);
  // enough sentences, but all from one corpus
  assert.equal(senseVerdict(["fermentation"], sentences, [{ n: 1, glosses: [1] }, { n: 2, glosses: [1] }], yes(["1:1", "2:1"])).ok, false);
});

test("forms: the corpus form for this lemma, tagged as that inflection, in two corpora", () => {
  const r = [
    { word: "vackrare", msd: "JJ.KOM.UTR+NEU.SIN+PLU.IND+DEF.NOM", corpus: "GP2012", n: 40 }, { word: "vackrare", msd: "JJ.KOM.UTR+NEU.SIN+PLU.IND+DEF.NOM", corpus: "ROMI", n: 30 },
    { word: "vackert", msd: "AB.POS", corpus: "GP2012", n: 50 }, { word: "vackert", msd: "JJ.POS.NEU.SIN.IND.NOM", corpus: "SUC3", n: 2 },
  ];
  assert.equal(judgeForm("comparative", "vackrare", r).ok, true);
  assert.equal(judgeForm("neuter_form", "vackert", r).ok, false);         // the adverb tags don't count
  const wrong = judgeForm("comparative", "vackerare", [...r, { word: "vackrare", msd: "JJ.KOM.UTR+NEU.SIN+PLU.IND+DEF.NOM", corpus: "SUC3", n: 5 }]);
  assert.equal(wrong.ok, false); assert.equal(wrong.corpus_form, "vackrare");
  const indecl = [{ word: "dåvarande", msd: "PC.PRS.UTR+NEU.SIN+PLU.IND+DEF.NOM", corpus: "GP2012", n: 9 }, { word: "dåvarande", msd: "PC.PRS.UTR+NEU.SIN+PLU.IND+DEF.NOM", corpus: "ROMI", n: 4 }];
  assert.equal(judgeForm("neuter_form", "dåvarande", indecl).ok, true);
  const mass = [{ word: "feminism", msd: "NN.UTR.SIN.IND.NOM", corpus: "GP2012", n: 300 }, { word: "feminismer", msd: "NN.UTR.PLU.IND.NOM", corpus: "GP2012", n: 2 }];
  assert.equal(judgeForm("plural_indefinite", "—", mass).ok, true);
  assert.equal(judgeForm("plural_indefinite", "—", [...mass, { word: "feminismer", msd: "NN.UTR.PLU.IND.NOM", corpus: "ROMI", n: 40 }]).ok, false);
});

test("comparison as one paradigm; declension group by rule", () => {
  const per = { comparative: "mer professionell", superlative_indefinite: "mest professionell", superlative_definite: "mest professionella" };
  assert.equal(comparisonByRule("professionell", "professionella", per, { comparative: true }), "mer/mest");
  assert.equal(comparisonByRule("professionell", "professionella", per, {}), null);
  assert.equal(comparisonByRule("professionell", "professionella", { ...per, superlative_definite: "mest professionell" }, { comparative: true }), null);
  assert.equal(comparisonByRule("vacker", "vackra", { comparative: "vackrare", superlative_indefinite: "vackrast", superlative_definite: "vackraste" }, { superlative_definite: true }), "-are/-ast/-aste");
  assert.equal(groupFromForms("flicka", "flickor", "en"), "1");
  assert.equal(groupFromForms("bil", "bilar", "en"), "2");
  assert.equal(groupFromForms("pojke", "pojkar", "en"), "2");
  assert.equal(groupFromForms("park", "parker", "en"), "3");
  assert.equal(groupFromForms("sko", "skor", "en"), "3");
  assert.equal(groupFromForms("äpple", "äpplen", "ett"), "4");
  assert.equal(groupFromForms("hus", "hus", "ett"), "5");
  assert.equal(groupFromForms("bok", "böcker", "en"), null);   // umlaut: not by rule
});
