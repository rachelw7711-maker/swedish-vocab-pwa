// Knowledge v2 regression set (round G, 2026-11-10): real problems the baseline audit found in the
// library, each with the expected result, what the old rule did and what the rule does now. A case is
// added whenever a problem class is fixed; none is removed. Cases are real entries (ids in the audit).
import test, { before } from "node:test";
import assert from "node:assert/strict";
import { fakeSupabase } from "./fake-supabase.mjs";
import { evidenceOfSource } from "../server-evidence.mjs";
import { recordCheck, senseGrade, collocationEvidence } from "../server-language-checks.mjs";
import { useSaldoFiles } from "../server-lexicon.mjs";
import { useReferenceFiles, referenceEntries } from "../server-references.mjs";

before(async () => { await useSaldoFiles(); await useReferenceFiles(); });

// The summary rule before 2026-11-10 (migration 20261110130000): a row without a grade was graded by
// its source, and only the bare source "audit-2026-11-02" counted as AI. Kept here as the old rule.
const oldSummaryGrade = (row) => row.grade ?? (row.source === "audit-2026-11-02" ? "ai_consistent" : "verified");

// H — history: status vs evidence. Sources as stored in production (resource_field_status.source).
const H = [
  { id: "H1", case: "AI check + English overlap with Lexin (637 rows)", source: "audit-2026-11-02+dictionary-en", expected: "ai_consistent", old: "verified" },
  { id: "H2", case: "AI fix + English overlap", source: "audit-2026-11-02:fix+dictionary-en", expected: "ai_consistent", old: "verified" },
  { id: "H3", case: "'manual_review' written by the 2026-11-02 assistant session, no person (140 rows)", source: "audit-2026-11-02:ai_check+sv-wiktionary+manual_review", expected: "ai_consistent", old: "verified" },
  { id: "H4", case: "AI check; Lexin only shows the word exists", source: "ai_check+sv-wiktionary+lexin-sv-2020", expected: "ai_consistent", old: "verified" },
  { id: "H5", case: "Korp sense check (independent) must not be downgraded", source: "audit-2026-11-02;korp", expected: "verified", old: "verified" },
  { id: "H6", case: "Korp after an English overlap: the Korp check decides", source: "audit-2026-11-02+dictionary-en;korp", expected: "verified", old: "verified" },
  { id: "H7", case: "compound rule (SALDO split + parts' dictionary English + Korp), no AI", source: "audit-2026-11-02;compound-rule", expected: "verified", old: "verified" },
  { id: "H8", case: "bare AI audit (already handled by migration B)", source: "audit-2026-11-02", expected: "ai_consistent", old: "ai_consistent" },
];
for (const c of H) {
  test(`regression ${c.id}: ${c.case}`, () => {
    assert.equal(oldSummaryGrade({ source: c.source, grade: null }), c.old, "old rule as recorded");
    assert.equal(evidenceOfSource(c.source).grade, c.expected);
  });
}

test("regression H9: an unknown source is left alone, not downgraded by guess", () => {
  assert.equal(evidenceOfSource("something-new").grade, null);
});

test("regression H10: a newly written sense row always carries its grade (old: none, so the summary read it as verified)", async () => {
  const db = fakeSupabase({ resource_field_status: [] });
  // The generation check passed with an English overlap: what server-native records.
  await recordCheck(db, "e1", "sense", "verified", "ai_check+sv-wiktionary+lexin-sv-2020", {}, { grade: "ai_consistent" });
  // A caller that gives no grade: an AI-path verified is ai_consistent, never verified by default.
  await recordCheck(db, "e2", "sense", "verified", "ai_check", {});
  await recordCheck(db, "e3", "sense", "mismatch", "ai_check", {});
  await recordCheck(db, "e4", "pos", "verified", "saldo-morphology-2017", {});
  const row = (id, f) => db.tables.resource_field_status.find((r) => r.learning_object_id === id && r.field === f);
  assert.equal(row("e1", "sense").grade, "ai_consistent");
  assert.equal(row("e2", "sense").grade, "ai_consistent");
  assert.equal(row("e3", "sense").grade, "disputed");
  assert.equal(row("e4", "pos").grade, undefined, "only sense rows are graded");
  assert.ok(row("e1", "sense").rule_version);
});

test("regression H11: only independent evidence grades a sense verified", () => {
  assert.equal(senseGrade("verified"), "ai_consistent");
  assert.equal(senseGrade("verified", "verified"), "verified");
  assert.equal(senseGrade("present"), "unverified");
});

// C — collocation identity: dictionary evidence must belong to this headword (removed or kept
// collocations were judged by listings of other words). Real cards of the audit.
const C = [
  // old: dictionary (an expression of anda counted as andetag's collocation, flagged "wrongly removed")
  { id: "C1", headword: "andetag", pos: "noun", forms: ["andetag", "andetaget", "andetagen"], phrase: "hämta andan", expected: "elsewhere", old: "dictionary" },
  { id: "C2", headword: "skratt", pos: "noun", forms: ["skratt", "skrattet", "skratten"], phrase: "dra på munnen", expected: "elsewhere", old: "dictionary" },
  { id: "C3", headword: "legitimation", pos: "noun", forms: ["legitimation", "legitimationen"], phrase: "legitimera sig", expected: "elsewhere", old: "dictionary" },
  // old: dictionary ("utom mig" = except me matched "är utom sig", beside oneself): a free combination
  { id: "C4", headword: "utom", pos: "preposition", forms: ["utom"], phrase: "utom mig", expected: "none", old: "dictionary" },
  // must stay listed: the headword's own construction, a reflexive verb with its verb
  { id: "C5", headword: "drömma", pos: "verb", forms: ["drömma", "drömmer"], phrase: "drömma om något", expected: "dictionary", old: "dictionary" },
  // must stay the headword's: its genitive, the headword written apart (both were "elsewhere" in a first cut)
  { id: "C7", headword: "nöje", pos: "noun", forms: ["nöje", "nöjet", "nöjen", "nöjena"], phrase: "för nöjes skull", expected: "dictionary", old: "dictionary" },
  { id: "C8", headword: "istället", pos: "adverb", forms: ["istället"], phrase: "i stället för", expected: "dictionary", old: "dictionary" },
  { id: "C6", headword: "utom", pos: "preposition", forms: ["utom"], phrase: "vara utom sig", expected: "dictionary", old: "dictionary" },
];
for (const c of C) {
  test(`regression ${c.id}: ${c.headword} — "${c.phrase}" is ${c.expected} (old: ${c.old})`, async () => {
    const ev = await collocationEvidence(null, await referenceEntries(null, c.headword), c.phrase, c.forms, { pos: c.pos });
    assert.equal(ev.kind, c.expected);
  });
}

// L — a card's sense tied to a Lexin sense without AI (dictionary_sense_link): two signals on one sense.
test("regression L1: English and Swedish definition agree on one Lexin sense → linked (skum)", async () => {
  const { lexinSenseLink } = await import("../server-evidence.mjs");
  const r = await lexinSenseLink(null, await referenceEntries(null, "skum"), "noun", { meaningEn: "foam; froth; lather", swedishExplanation: "en vit massa av små bubblor på ytan av en vätska", forms: ["skum", "skummet"] });
  assert.equal(r.linked, true);
});
test("regression L2: one generic shared verb is no link (ljus: 'gör' only, the old count made it two)", async () => {
  const { lexinSenseLink } = await import("../server-evidence.mjs");
  const r = await lexinSenseLink(null, await referenceEntries(null, "ljus"), "noun", { meaningEn: "light", swedishExplanation: "Det som gör att vi kan se, eller den belysning som finns i ett rum eller utomhus.", forms: ["ljus", "ljuset"] });
  assert.equal(r.linked, false);
});
test("regression L3: a wrong sense with an English word of another sense is no link (fart 'a part of a journey')", async () => {
  const { lexinSenseLink } = await import("../server-evidence.mjs");
  const r = await lexinSenseLink(null, await referenceEntries(null, "fart"), "noun", { meaningEn: "a part of a journey", swedishExplanation: "en del av en resa", forms: ["fart", "farten"] });
  assert.equal(r.linked, false);
});
test("regression L4: a part of the card's English no sense has → no link (only some parts verified)", async () => {
  const { lexinSenseLink } = await import("../server-evidence.mjs");
  const r = await lexinSenseLink(null, await referenceEntries(null, "skum"), "noun", { meaningEn: "foam; a kind of cake", swedishExplanation: "en vit massa av små bubblor på ytan av en vätska", forms: ["skum"] });
  assert.equal(r.linked, false);
  assert.equal(r.reason, "english_part_unmatched");
});

// V — valency (round G, 2026-11-11): "lova någon något" was a collocation, removed as a free
// combination; it is Lexin's construction of the sense the card teaches, shown as usage.
test("regression V1: lova's constructions come from Lexin's 'promise' sense (old: a collocation, then removed)", async () => {
  const { constructionsOf } = await import("../server-evidence.mjs");
  const c = constructionsOf(await referenceEntries(null, "lova"), "verb", "promise", ["lova", "lovar", "lovade", "lovat"]);
  assert.deepEqual(c.map((x) => x.pattern), ["ngn lovar ngn ngt/att+VERB/SATS", "ngt lovar ngt"]);
  assert.equal(c[0].source, "lexin-sv-2020");
});
test("regression V2: a sense the card does not teach brings no construction (älska 'love' ≠ 'make love')", async () => {
  const { constructionsOf } = await import("../server-evidence.mjs");
  const c = constructionsOf(await referenceEntries(null, "älska"), "verb", "to love", ["älska", "älskar", "älskade", "älskat"]);
  assert.deepEqual(c.map((x) => x.pattern), ["ngn älskar ngn/ngt/att+VERB"]);
});
test("regression V3: a particle verb's sense (säga upp) is not the simplex verb's construction", async () => {
  const { constructionsOf } = await import("../server-evidence.mjs");
  const c = constructionsOf(await referenceEntries(null, "säga"), "verb", "say; tell", ["säga", "säger", "sa", "sagt"]);
  assert.ok(c.every((x) => !/ upp\b/.test(x.pattern)));
});

// Round G (withheld-card review): a card storing no plural (group 0) agrees with the homograph SALDO
// lists without one — salt, aga, pop were reported "mismatch" against the other homograph.
test("F1: a stored group 0 matches SALDO's uncountable homograph", async () => {
  const { useSaldoFiles, saldoEntries, compareWithSaldo } = await import("../server-lexicon.mjs");
  await useSaldoFiles();
  for (const [w, g] of [["salt", "0"], ["aga", "0"], ["pop", "uncountable"]]) {
    const r = compareWithSaldo({ pos: "noun", forms: { singular_indefinite: w, declension_group: g } }, await saldoEntries(null, w, "noun"));
    assert.equal(r.fields["form:declension_group"].status, "verified", w);
  }
  // Still caught: a group no homograph has.
  const wrong = compareWithSaldo({ pos: "noun", forms: { singular_indefinite: "salt", declension_group: "2" } }, await saldoEntries(null, "salt", "noun"));
  assert.equal(wrong.fields["form:declension_group"].status, "mismatch");
  // A stored group is still not overruled by SALDO's "0" alone (bil..: group 2 with no zero row).
  const bil = compareWithSaldo({ pos: "noun", forms: { singular_indefinite: "bil", declension_group: "2" } }, await saldoEntries(null, "bil", "noun"));
  assert.equal(bil.fields["form:declension_group"].status, "verified");
});

// Round G: an AI's part-of-speech objection does not outweigh a dictionary listing (it-ingenjör,
// a SALDO compound noun, and i åratal, a Lexin/SALDO adverbial, were held "needs_review" by it).
test("F2: an AI part-of-speech objection is answered by SALDO or Lexin, not by Wiktionary", async () => {
  const { aiObjectionAnswered } = await import("../server-evidence.mjs");
  assert.equal(aiObjectionAnswered({ field: "pos", source: "audit-2026-11-02" }, ["saldo-compound"]), true);
  assert.equal(aiObjectionAnswered({ field: "pos", source: "check-entries" }, ["lexin"]), true);
  assert.equal(aiObjectionAnswered({ field: "pos", source: "audit-2026-11-02" }, ["wiktionary"]), false);
  assert.equal(aiObjectionAnswered({ field: "pos", source: "audit-2026-11-02" }, []), false);
  // Korp's part-of-speech verdict (rosenblad: 56 hits, all NN, 8 corpora) also outweighs an AI's.
  assert.equal(aiObjectionAnswered({ field: "pos", source: "audit-2026-11-02" }, ["korp"]), true);
  // A dictionary's or a program's mismatch is not an AI verdict; a sense objection is not settled by a listing.
  assert.equal(aiObjectionAnswered({ field: "pos", source: "saldo-morphology-2017" }, ["saldo"]), false);
  assert.equal(aiObjectionAnswered({ field: "sense", source: "audit-2026-11-02" }, ["saldo"]), false);
});

// Round G: Lexin's sense-less cross-reference ("gjord, verb" → göra) is not a listing of the verb.
test("F3: a Lexin cross-reference stub lists no part of speech", async () => {
  const { useReferenceFiles, referenceEntries, posFamilies, referencePos } = await import("../server-references.mjs");
  await useReferenceFiles("data/reference");
  assert.ok(!posFamilies(await referenceEntries(null, "gjord"), "verb").includes("lexin"));
  assert.ok(!referencePos(await referenceEntries(null, "gjord")).lexin_sv.includes("verb"));
  // A sense-less svenska entry Lexin swe–eng gives a sense of that part of speech still counts.
  assert.ok(posFamilies(await referenceEntries(null, "mycket"), "adjective").includes("lexin"));
  assert.ok(posFamilies(await referenceEntries(null, "ifrån"), "adverb").includes("lexin"));
});

// Round G, withheld-card review: the historical cards with an inflected headword (made before the
// lemma rule) — a new card for any of them is made under its lemma.
test("G1: an inflected headword resolves to its lemma (real historical cases)", async () => {
  const { useSaldoFiles } = await import("../server-lexicon.mjs");
  const { resolveWord } = await import("../server-resources.mjs");
  const { fakeSupabase } = await import("./fake-supabase.mjs");
  await useSaldoFiles();
  const d = fakeSupabase({ learning_objects: [], word_forms: [] });
  const cases = [["äldst", "adjective", "gammal"], ["förändras", "verb", "förändra"], ["bör", "verb", "böra"], ["norske", "adjective", "norsk"],
    ["gjord", "verb", "göra"], ["trosor", "noun", "trosa"], ["stan", "noun", "stad"], ["honom", "pronoun", "han"], ["friteras", null, "fritera"], ["multimedia", "noun", "multimedium"]];
  for (const [text, pos, lemma] of cases) assert.equal((await resolveWord(d, text, pos)).lemma, lemma, text);
  // A word that is a headword of its own stays itself (boundary: noggrann, visa).
  assert.equal((await resolveWord(d, "noggrann", "adjective")).lemma, "noggrann");
  assert.equal((await resolveWord(d, "visa", "noun")).lemma, "visa");
});

// Round G: soft hyphens from Lexin's text are never stored (19 were, invisibly).
test("S1: a generated entry is stored without soft hyphens", async () => {
  const { withoutSoftHyphens } = await import("../server-native.mjs");
  const r = withoutSoftHyphens({ lemma: "auto­mat", collocations: [{ phrase: "biljett­automat", example: "Köp en biljett i auto­maten." }], n: 2, ok: true });
  assert.equal(r.lemma, "automat");
  assert.equal(r.collocations[0].phrase, "biljettautomat");
  assert.equal(r.collocations[0].example, "Köp en biljett i automaten.");
  assert.equal(r.n, 2);
  assert.equal(r.ok, true);
});

// R-8b (round G): Lexin's ONLY sense of the word. Original error class: a card's sense tied by English
// alone (ljus "light" — Lexin has light and candle); boundaries: a single sense the card's English
// doesn't cover, an unrelated Swedish explanation, a several-sense word.
test("R-8b: the card tied to Lexin's only sense — not with several senses or a differing definition", async () => {
  const { useSaldoFiles } = await import("../server-lexicon.mjs");
  const { useReferenceFiles, referenceEntries } = await import("../server-references.mjs");
  const { lexinUniqueSenseLink } = await import("../server-evidence.mjs");
  await useSaldoFiles(); await useReferenceFiles("data/reference");
  const link = async (w, pos, meaningEn, sv, forms = [w]) => lexinUniqueSenseLink(null, await referenceEntries(null, w), pos, { meaningEn, swedishExplanation: sv, forms });
  // Correct: tiger, the one sense, its English and a definition word ("kattdjur") on the card.
  assert.equal((await link("tiger", "noun", "tiger", "Ett stort kattdjur med randig päls.", ["tiger", "tigern", "tigrar"])).linked, true);
  // Original error: ljus has several senses — never by this rule.
  assert.equal((await link("ljus", "noun", "light", "Det som gör att vi kan se.", ["ljus", "ljuset"])).reason, "several_senses");
  // Boundary: the only sense, but the card's English is another meaning.
  assert.equal((await link("tiger", "noun", "tiger; coward", "Ett stort kattdjur.", ["tiger"])).linked, false);
  // Boundary: English matches, the Swedish explanation shares nothing with the definition.
  assert.equal((await link("tiger", "noun", "tiger", "Ett djur i Asien.", ["tiger"])).reason, "swedish_definition_differs");
  // Independent-sample finding: fot is two words in SALDO (fötter / fot, the unit); one Lexin sense
  // let "foot (unit of length)" through. A spelling of several words is never tied this way.
  // Independent-sample finding: samtid "the same time" shared only "tid", part of the headword.
  assert.equal((await link("samtid", "noun", "the same time; one's own time or era", "när två eller flera saker händer vid samma tid", ["samtid", "samtiden"])).linked, false);
  assert.equal((await link("fot", "noun", "foot; foot (unit of length)", "den del av kroppen man står och går på", ["fot", "foten", "fötter"])).reason, "saldo_homographs");
});

// Round G: a later AI check overwrote Korp-verified senses (11-09, check-entries → "present").
test("E1: independent sense evidence survives an AI re-check; an objection becomes a visible conflict", async () => {
  const { senseRowOver } = await import("../server-language-checks.mjs");
  const korp = { status: "verified", grade: "verified", source: "audit-2026-11-02;korp", detail: { korp: { sense: { ok: true } } } };
  assert.equal(senseRowOver(korp, { status: "present", source: "ai_check;no_dictionary_english", detail: {} }), null);
  assert.equal(senseRowOver(korp, { status: "verified", source: "ai_check", grade: "ai_consistent", detail: {} }), null);
  const m = senseRowOver(korp, { status: "mismatch", source: "reading_check", detail: { note: "x" } });
  assert.equal(m.status, "mismatch"); assert.equal(m.detail.previous.source, "audit-2026-11-02;korp");
  // Without independent evidence the check is written as before.
  const ai = { status: "verified", grade: "ai_consistent", source: "audit-2026-11-02" };
  assert.equal(senseRowOver(ai, { status: "present", source: "ai_check" }).status, "present");
  assert.equal(senseRowOver(null, { status: "present", source: "ai_check" }).status, "present");
});

// Round G: a compound's sense is written verified only when its meaning says nothing beyond its parts.
test("C1: strict compound meaning — sommarsäsong 'busiest' and rödgrön 'coalition' need other evidence", async () => {
  const { compoundMeaningSupport } = await import("../server-references.mjs");
  const eq = (...t) => t.map((text) => ({ source: "lexin_en", text }));
  const sommar = { first: "sommar", firstEquivalents: eq("summer"), headEquivalents: eq("season") };
  assert.equal(compoundMeaningSupport("summer season", { ...sommar, strict: true }), true);
  assert.equal(compoundMeaningSupport("summer high season; the busiest summer season", { ...sommar, strict: true }), false);
  assert.equal(compoundMeaningSupport("summer high season", sommar), true);   // the loose rule (generation evidence) unchanged
  assert.equal(compoundMeaningSupport("red-green coalition", { first: "röd", firstEquivalents: eq("red"), headEquivalents: eq("green"), strict: true }), false);
});
