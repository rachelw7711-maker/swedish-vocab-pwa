// Lexin and the other dictionaries as evidence; SALDO compound analysis (2026-11-03).
//   node --test tests/
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { useSaldoFiles, compoundRows, compareWithSaldo, multiWordVerbRows, participleRows } from "../server-lexicon.mjs";
import {
  useReferenceFiles, referenceEntries, posFamilies, lexinForms, compareWithLexin, lexinCountability,
  englishEquivalents, meaningSupport, lexinSenses, lexinPromptLine, expressionReferenceLine, expressionInReferences, collocationInLexin, compoundMeaningSupport,
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

test("G1/G2: separate words of one spelling kept apart, Lexin's idioms and compounds offered", async () => {
  const lag = await referenceEntries(null, "lag");
  const line = lexinPromptLine(lag, "noun", { forms: { singular_definite: "laget" } });
  assert.match(line, /separate words/);
  assert.match(line, /\(B\) laget, lag: .*team/);
  assert.match(line, /Write the entry for word \(B\) only/);
  assert.match(line, /i senaste laget/, "Lexin's idiom of that word");
  assert.match(line, /fotbollslag/, "Lexin's compound of that word");
  assert.match(lexinPromptLine(lag, "noun"), /Write the entry for one of these words only/);
  const fil = lexinPromptLine(await referenceEntries(null, "fil"), "noun");
  // Round G: fil is three words in Lexin — the tool (filar), the lane (filer), sour milk (no plural);
  // the old rule (singular only) merged them into one card with mixed plurals.
  assert.match(fil, /these are 3 separate words/);
  assert.match(fil, /fil och flingor/);
  // Round G: one singular, two plurals — regel "rule" (regler) and "bolt" (reglar) are two words too.
  const regel = await referenceEntries(null, "regel");
  const rule = lexinPromptLine(regel, "noun", { forms: { singular_definite: "regeln", plural_indefinite: "regler" } });
  assert.match(rule, /separate words/);
  assert.match(rule, /Write the entry for word \(A\) only/);
  assert.match(lexinPromptLine(regel, "noun"), /Write the entry for one of these words only/);
});

test("G3: a multi-word expression's reference — its own entry, its particle verb, its head word's idiom", async () => {
  assert.match(await expressionReferenceLine(null, "lägga av"), /slutar med något/);
  assert.match(await expressionReferenceLine(null, "stå ut med"), /under "stå ut": .*uthärdar/);
  assert.match(await expressionReferenceLine(null, "ta hand om", ["tar", "tog", "tagit", "ta"]), /tar hand om någon\/något/);
  assert.equal(await expressionReferenceLine(null, "gå ut på"), "", "not in Lexin: nothing, and nothing decided");
  // Each sense with its phrase: "ger till" alone was written as "state (one's name)" (uppge).
  assert.match(await expressionReferenceLine(null, "ge upp"), /2\. ger till \[ngn ger upp ngt\] phrases: hon gav upp ett skrik/);
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

test("a transparent compound's meaning from its parts; not a compound whose meaning is something else", async () => {
  const eq = async (w, p) => englishEquivalents(await referenceEntries(null, w), p);
  assert.equal(compoundMeaningSupport("language course", { first: "språk", firstEquivalents: await eq("språk", "noun"), headEquivalents: await eq("kurs", "noun") }), true);
  assert.equal(compoundMeaningSupport("yoga studio", { first: "yoga", firstEquivalents: [], headEquivalents: await eq("studio", "noun") }), true);
  assert.equal(compoundMeaningSupport("strawberry", { first: "jord", firstEquivalents: await eq("jord", "noun"), headEquivalents: await eq("gubbe", "noun") }), false);
  // every part of the meaning: "language course; evening class" — the second part has neither
  assert.equal(compoundMeaningSupport("language course; evening class", { first: "språk", firstEquivalents: await eq("språk", "noun"), headEquivalents: await eq("kurs", "noun") }), false);
});

test("G2: a sense Lexin shows only with a particle or only through idioms is marked as not the word's own", async () => {
  const sv = { pos: "adverb", lexemes: [{ variant: "871", definition: "då och då", constructions: [], examples: [], idioms: [["av och till", "då och då"]], compounds: [] }, { variant: "868", definition: "", constructions: [], examples: ["hon stängde av kranen"], idioms: [], compounds: [] }] };
  const av = lexinPromptLine({ lexin_sv: [sv], lexin_en: [] }, "adverb");
  assert.match(av, /no meaning of its own — only in these idioms/);
  assert.doesNotMatch(av, /1\. då och då/);
  const en = [{ pos: "verb", variant: "1", definition: "meddela i ord", english: ["say"], examples: [] }, { pos: "verb", variant: "3", definition: "avskeda", english: ["dismiss"], examples: [["100 man har sagts upp", "100 men have been dismissed"]] }];
  const saga = lexinPromptLine({ lexin_sv: [], lexin_en: en }, "verb");
  assert.match(saga, /avskeda \(en: dismiss\) phrases: 100 man har sagts upp/);
  assert.match(saga, /belongs to that particle verb/);
});

test("an optional part in brackets need not be in the example", async () => {
  const { exampleUsesWord } = await import("../server-language-checks.mjs");
  assert.ok(exampleUsesWord("Han höll med föregående talare.", ["hålla med (någon)", "höll med (någon)"]));
  assert.ok(!exampleUsesWord("Han höll fast vid sin åsikt.", ["hålla med (någon)", "höll med (någon)"]));
});

