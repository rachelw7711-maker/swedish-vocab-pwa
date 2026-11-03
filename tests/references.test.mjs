// Lexin and the other dictionaries as evidence; SALDO compound analysis (2026-11-03).
//   node --test tests/
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { useSaldoFiles, compoundRows, compareWithSaldo, multiWordVerbRows, participleRows } from "../server-lexicon.mjs";
import {
  useReferenceFiles, referenceEntries, posFamilies, lexinForms, compareWithLexin, lexinCountability,
  englishEquivalents, meaningSupport, lexinSenses, lexinPromptLine, expressionInReferences, collocationInLexin,
} from "../server-references.mjs";

before(async () => { await useSaldoFiles(); await useReferenceFiles("data/reference", { extra: true }); });

test("Lexin: forms, no plural, countability", async () => {
  const bil = await referenceEntries(null, "bil");
  assert.deepEqual(lexinForms(bil.lexin_sv[0], "noun").forms, { singular_definite: "bilen", plural_indefinite: "bilar", plural_definite: "bilarna" });
  assert.equal(lexinCountability(bil), "countable");
  const love = await referenceEntries(null, "kärlek");
  assert.equal(lexinForms(love.lexin_sv[0], "noun").noPlural, true);
  assert.equal(lexinCountability(love), "uncountable");
  const cmp = compareWithLexin({ pos: "noun", forms: { singular_definite: "bilen", plural_indefinite: "bilor" } }, bil).fields;
  assert.equal(cmp["form:singular_definite"].status, "verified");
  assert.equal(cmp["form:plural_indefinite"].status, "mismatch");
  // A plural Lexin leaves out is not called wrong.
  assert.equal(compareWithLexin({ pos: "noun", forms: { plural_indefinite: "kärlekar" } }, love).fields["form:plural_indefinite"].status, "present");
});

test("parts of speech by family: a spelling's classes kept apart", async () => {
  const torka = await referenceEntries(null, "torka");
  assert.ok(posFamilies(torka, "noun").includes("lexin"));
  assert.ok(posFamilies(torka, "verb").includes("lexin"));
  assert.ok(posFamilies(torka, "noun").includes("wiktionary"));
  assert.deepEqual(posFamilies(torka, "preposition"), []);
});

test("English meanings against the dictionaries' equivalents", async () => {
  const torka = await referenceEntries(null, "torka");
  const eq = englishEquivalents(torka, "noun");
  assert.ok(meaningSupport("drought", eq).length);
  assert.ok(!meaningSupport("to wipe", eq).length, "a verb meaning doesn't match the noun");
  assert.ok(meaningSupport("to dry; to wipe", englishEquivalents(torka, "verb")).length);
  assert.ok(meaningSupport("car; automobile", englishEquivalents(await referenceEntries(null, "bil"), "noun")).length);
});

test("Lexin senses and the generation prompt line", async () => {
  const torka = await referenceEntries(null, "torka");
  const senses = lexinSenses(torka, "noun");
  assert.equal(senses[0].definition, "torr väderlek");
  assert.deepEqual(senses[0].english, ["drought"], "Lexin swe–eng aligned by sense id");
  assert.match(lexinPromptLine(await referenceEntries(null, "kärlek"), "noun"), /no plural/);
  assert.equal(lexinPromptLine(torka, "preposition"), "");
});

test("expressions: headwords and idioms, inflection unified", async () => {
  assert.ok((await expressionInReferences(null, "gå miste om något")).length, "Lexin's 'går miste om något'");
  assert.ok((await expressionInReferences(null, "i sträck")).length, "optional part dropped");
  assert.equal((await expressionInReferences(null, "en stor röd bil")).length, 0);
});

test("collocations: a construction of the headword names the fixed word", async () => {
  const r = await referenceEntries(null, "drömma");
  assert.ok(collocationInLexin(r, "drömma om något", ["drömma", "drömmer"]).some((h) => h.kind === "construction"));
  assert.equal(collocationInLexin(r, "drömma snabbt", ["drömma"]).length, 0);
});

test("SALDO compounds: inflect as their last part", async () => {
  const rows = await compoundRows(null, "chokladask", "noun");
  assert.ok(rows.length);
  assert.equal(rows[0].compound.first, "choklad");
  const f = compareWithSaldo({ pos: "noun", forms: { singular_definite: "chokladasken", plural_indefinite: "chokladaskar", genus: "en" } }, rows).fields;
  assert.equal(f["form:singular_definite"].status, "verified");
  assert.equal(f["form:plural_indefinite"].status, "verified");
  assert.equal((await compoundRows(null, "villaträdgård", "noun"))[0].compound.first, "villa");
  assert.equal((await compoundRows(null, "lösvikt", "noun"))[0].compound.first, "lös", "a first part of three letters first");
  assert.equal((await compoundRows(null, "blodsbot", "noun"))[0].compound.ambiguous, true, "bot: botar / böter");
  assert.equal((await compoundRows(null, "myskväll", "noun"))[0].compound.ambiguous, false);
  assert.equal((await compoundRows(null, "xqzwvbil", "noun")).length, 0, "the first part must be a word too");
  assert.equal((await compoundRows(null, "bil", "noun")).length, 0);
});

test("SALDO: particle and reflexive verbs take their base verb's forms", async () => {
  const up = await multiWordVerbRows(null, "växa upp");
  const f = compareWithSaldo({ pos: "verb", forms: { present: "växer upp", preteritum: "växte upp", supinum: "vuxit upp", imperative: "väx upp", perfect_participle: "uppvuxen" } }, up).fields;
  for (const t of ["present", "preteritum", "supinum", "perfect_participle"]) assert.equal(f[`form:${t}`].status, "verified", t);
  const bry = compareWithSaldo({ pos: "verb", forms: { present: "bryr sig", preteritum: "brydde sig", imperative: "bry dig", verb_group: "4" } }, await multiWordVerbRows(null, "bry sig")).fields;
  assert.equal(bry["form:present"].status, "verified");
  assert.equal(bry["form:imperative"].status, "verified");
  assert.equal(bry["form:verb_group"].status, "mismatch", "bry: brydde, brytt — group 3");
  const tycka = compareWithSaldo({ pos: "verb", forms: { verb_group: "2b" } }, await multiWordVerbRows(null, "tycka om")).fields;
  assert.equal(tycka["form:verb_group"].status, "verified", "tyckte om: 2b");
  assert.deepEqual(await multiWordVerbRows(null, "springa fort"), [], "not a multi-word verb SALDO lists");
});

test("SALDO: participles through the verb they come from", async () => {
  const rows = await participleRows(null, "skriven", "perfekt_particip");
  const f = compareWithSaldo({ pos: "perfekt_particip", forms: { base_form: "skriven", neuter_form: "skrivet", plural_form: "skrivna" } }, rows).fields;
  assert.equal(f["form:base_form"].status, "verified");
  assert.equal(f["form:neuter_form"].status, "verified");
  assert.equal(f["form:plural_form"].status, "verified");
  assert.ok((await participleRows(null, "bestående", "presens_particip")).length);
  assert.deepEqual(await participleRows(null, "bil", "perfekt_particip"), []);
});

test("English meanings: core words, compounds and spellings meet the dictionary's", () => {
  const eq = (...t) => t.map((text) => ({ source: "lexin_en", text }));
  assert.equal(meaningSupport("not; no", eq("not")).length, 1, "inte");
  assert.equal(meaningSupport("often", eq("often")).length, 1, "ofta");
  assert.equal(meaningSupport("give; provide", eq("give")).length, 1, "ge");
  assert.equal(meaningSupport("motorboat, powerboat", eq("a motor boat")).length, 1);
  assert.equal(meaningSupport("horse meat", eq("horsemeat")).length, 1);
  assert.equal(meaningSupport("honourable; respectable", eq("honorable")).length, 1);
  assert.equal(meaningSupport("establishment; setting up", eq("establish")).length, 1);
  assert.equal(meaningSupport("to wipe", eq("a drought, a dry season")).length, 0);
  assert.equal(meaningSupport("doctoral degree, PhD", eq("doctorate")).length, 0, "different words stay apart");
});
