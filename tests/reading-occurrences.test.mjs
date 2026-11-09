// Reading analysis selection rules of 2026-11-07: occurrences by SALDO, names, the pool,
// homographs, the A1 rule, keywords inside expressions, analysis versions.
import test from "node:test";
import assert from "node:assert/strict";
import { useSaldoFiles, formReadings } from "../server-lexicon.mjs";
import {
  textTokens, occurrences, itemSpots, expressionSpots, properNouns, keepsA1Word, expressionPlaces, inExpressions, taughtByExpressions,
  rankFoundWords, matchAgainstCorpus, sortExpressions, resolveVocabularyCandidates, reserveFor, toBaseForms, upgradeAnalysisRow, ANALYSIS_VERSION,
  analyzeReadingResourceFast, analyzeReadingResourceDeep, cleanText, textHash,
  expressionBaseForm, distinctExpressions, tidyReasons, poolValue, claimDeepAnalysis, deepOnce, DEEP_UNCLAIMED, DEEP_CLAIM_STALE_MS,
} from "../server-reading.mjs";
import { fakeSupabase } from "./fake-supabase.mjs";

await useSaldoFiles();
const read = async (text) => {
  const tokens = textTokens(text);
  return { tokens, readings: await formReadings(null, tokens.map((t) => t.form)) };
};

test("strong verbs are found by SALDO's reading of their forms", async () => {
  const { tokens, readings } = await read("Hon skrev ett brev. Isen bröt upp i morse. Vi gick hem tidigt.");
  for (const [lemma, form] of [["skriva", "skrev"], ["bryta", "bröt"], ["gå", "gick"]]) {
    const found = occurrences(lemma, "verb", tokens, readings);
    assert.deepEqual(found.at.map((t) => t.form), [form], lemma);
    assert.equal(found.posFits, true);
  }
});

test("a similar spelling is not the same word", async () => {
  const { tokens, readings } = await read("Hon skrev ett brev. Planeten är stor.");
  assert.equal(occurrences("skrivare", "noun", tokens, readings).at.length, 0, "skriva's forms are not skrivare");
  assert.equal(occurrences("skrift", "noun", tokens, readings).at.length, 0);
  assert.equal(occurrences("plan", "noun", tokens, readings).at.length, 0, "planeten is planet, not plan");
  // A word made up by the model is not found by a shared beginning.
  assert.equal(occurrences("brevlåda", "noun", tokens, readings).at.length, 0);
});

test("the part of speech the text has: torkan is the noun, torkar the verb", async () => {
  const { tokens, readings } = await read("Torkan förstörde skörden. Hon torkar disken.");
  assert.equal(occurrences("torka", "noun", tokens, readings).at.length, 1);
  assert.equal(occurrences("torka", "verb", tokens, readings).at.length, 1);
  const { tokens: t2, readings: r2 } = await read("Hon torkar disken.");
  assert.equal(occurrences("torka", "noun", t2, r2).posFits, false, "only the verb is in this text");
});

test("a compound SALDO doesn't have is found with its ending", async () => {
  const { tokens, readings } = await read("Klimatkrisen påverkar alla.");
  assert.equal(occurrences("klimatkris", "noun", tokens, readings).at.length, 1);
});

test("names are words only ever capitalised inside a sentence; a sentence start isn't one", () => {
  const names = properNouns("Arbetslösheten ökar i Malmö. Malmö har en hamn. Trots det ökar arbetslösheten.");
  assert.deepEqual([...names], ["malmö"]);
});

test("the pool keeps a rare word that occurs once ahead of common repeated ones", () => {
  const w = (id, swedish, rank, cefr) => ({ id, swedish, pos: "noun", frequency_rank: rank, cefr_level: cefr });
  const found = new Map([["problem", [w("1", "problem", 400, "A2")]], ["nederbörd", [w("2", "nederbörd", null, "B2")]], ["dag", [w("3", "dag", 100, "A1")]]]);
  const freq = new Map([["problem", 5], ["nederbörd", 1], ["dag", 3]]);
  const pool = rankFoundWords(found, freq, new Set(), 1);
  assert.deepEqual(pool.map((c) => c.word.swedish), ["nederbörd"]);
});

test("a form the entry's word_forms don't list still finds the entry through SALDO", async () => {
  const db = fakeSupabase({ learning_objects: [{ id: "e", swedish: "exponera", part_of_speech: "verb", object_type: "word", status: "published" }], word_forms: [] });
  const readings = await formReadings(null, ["exponerades"]);
  const found = await matchAgainstCorpus(db, ["exponerades"], "zh", readings);
  assert.deepEqual(found.get("exponerades").map((w) => w.id), ["e"]);
});

test("every entry a form can be is offered; one SALDO rules out is not", async () => {
  const db = fakeSupabase({
    learning_objects: [
      { id: "a", swedish: "var", part_of_speech: "adverb", object_type: "word", status: "published" },
      { id: "p", swedish: "var", part_of_speech: "noun", object_type: "word", status: "published" },
      { id: "v", swedish: "vara", part_of_speech: "verb", object_type: "word", status: "published" },
      { id: "x", swedish: "vår", part_of_speech: "noun", object_type: "word", status: "published" },
    ],
    word_forms: [
      { learning_object_id: "v", form_value: "var" },
      { learning_object_id: "x", form_value: "var" },   // a stray row: SALDO doesn't read "var" as vår
    ],
  });
  const readings = await formReadings(null, ["var"]);
  const found = await matchAgainstCorpus(db, ["var"], "zh", readings);
  assert.deepEqual(found.get("var").map((w) => w.id).sort(), ["a", "p", "v"]);
});

test("an A1 word stays only for a use that isn't the everyday one", () => {
  const a1 = { swedish: "gå", cefr_level: "A1" };
  assert.equal(keepsA1Word({ swedish: "gå", pos: "verb", reason: "specific_use", everyday_sense: false }, a1), true);
  assert.equal(keepsA1Word({ swedish: "gå", pos: "verb", reason: "specific_use", everyday_sense: true }, a1), false);
  // The key term of a beginners' text stays; the same word in a harder text, or as a plain new word, does not.
  const sheep = { swedish: "får", pos: "noun", reason: "topic", everyday_sense: true };
  assert.equal(keepsA1Word(sheep, a1, "A2"), true);
  assert.equal(keepsA1Word(sheep, a1, "B1"), false);
  assert.equal(keepsA1Word({ ...sheep, reason: "new_word" }, a1, "A2"), false);
  assert.equal(keepsA1Word({ swedish: "gå", pos: "verb", reason: "topic", everyday_sense: true }, a1), false);
  assert.equal(keepsA1Word({ swedish: "men", pos: "conjunction", reason: "connective" }, { swedish: "men" }), true);
  assert.equal(keepsA1Word({ swedish: "ändå", pos: "adverb", reason: "new_word" }, { swedish: "ändå" }), true);
  // Not the everyday use, whatever the reason given; a connective pronoun.
  assert.equal(keepsA1Word({ swedish: "gå", pos: "verb", reason: "topic", everyday_sense: false }, a1), true);
  assert.equal(keepsA1Word({ swedish: "vilket", pos: "pronoun", reason: "connective", everyday_sense: true }, { swedish: "vilket", cefr_level: "A1" }), true);
  assert.equal(keepsA1Word({ swedish: "hus", pos: "noun", reason: "connective", everyday_sense: true }, { swedish: "hus", cefr_level: "A1" }), false);
});

test("a function word's class is taken from the references; a content word's is not", async () => {
  const { checkKeywordPos } = await import("../server-language-checks.mjs");
  assert.deepEqual(checkKeywordPos({ pos: "adverb", referencePos: ["preposition"] }).pos, "preposition");
  assert.equal(checkKeywordPos({ pos: "noun", referencePos: ["verb"] }).status, "rejected");
  assert.equal(checkKeywordPos({ pos: "adverb", referencePos: ["preposition", "conjunction"] }).status, "rejected");
});

test("keywords: occurrences by SALDO, the A1 rule, why the rest was left out", async () => {
  const text = "Hon skrev en lång rapport om torkan. Det gick bra till slut. Hon gick hem.";
  const { tokens, readings } = await read(text);
  const pool = [
    { word: { id: "s", swedish: "skriva", pos: "verb", cefr_level: "A1" } },
    { word: { id: "g", swedish: "gå", pos: "verb", cefr_level: "A1" } },
    { word: { id: "r", swedish: "rapport", pos: "noun", cefr_level: "B1" } },
  ];
  const dropped = [];
  const kept = await resolveVocabularyCandidates(fakeSupabase({}), [
    { swedish: "skriva", pos: "verb", reason: "topic", everyday_sense: true },
    { swedish: "gå", pos: "verb", reason: "specific_use", everyday_sense: false, sentence: "Det gick bra till slut." },
    { swedish: "rapport", pos: "noun", reason: "topic" },
    { swedish: "torka", pos: "verb", reason: "topic" },
    { swedish: "åtgärd", pos: "noun", reason: "topic" },
  ], pool, { tokens, readings }, dropped);
  assert.deepEqual(kept.map((k) => k.swedish), ["gå", "rapport"]);
  assert.equal(kept[0].occurrences, 2);
  assert.deepEqual(dropped.map((d) => `${d.swedish}:${d.why}`), ["skriva:a1_everyday", "torka:other_pos_in_text", "åtgärd:not_in_text"]);
});

test("a keyword is taught by an expression only where each of its places is inside one", async () => {
  const text = "Regeringen måste fatta beslut snart. Det beslutet blir svårt för alla.";
  const { tokens, readings } = await read(text);
  const fatta = { expression_text: "fatta beslut", source_sentence: "Regeringen måste fatta beslut snart." };
  const places = expressionPlaces([fatta], tokens, readings, text);
  const beslut = occurrences("beslut", "noun", tokens, readings).at.map((t) => [t.s, t.i]);
  const k = { swedish: "beslut", in_expressions: inExpressions(beslut, places) };
  assert.equal(k.in_expressions.length, 2);
  assert.equal(taughtByExpressions(k, new Set(["fatta beslut"])), false, "also used on its own in the second sentence");
  // Only inside the expression: left out while the expression is shown, back when it isn't.
  const only = "Regeringen måste fatta beslut snart.";
  const r2 = await read(only);
  const p2 = expressionPlaces([fatta], r2.tokens, r2.readings, only);
  const k2 = { in_expressions: inExpressions(occurrences("beslut", "noun", r2.tokens, r2.readings).at.map((t) => [t.s, t.i]), p2) };
  assert.equal(taughtByExpressions(k2, new Set(["fatta beslut"])), true);
  assert.equal(taughtByExpressions(k2, new Set()), false);
});

test("a strong verb's form belongs to its expression: tog in ta beslut", async () => {
  const text = "De tog beslut i går.";
  const { tokens, readings } = await read(text);
  const places = expressionPlaces([{ expression_text: "ta beslut", source_sentence: text }], tokens, readings, text);
  assert.deepEqual([...places.keys()].sort(), ["0:1", "0:2"]);
});

test("reserves: half as many again plus two, at least four", () => {
  assert.equal(reserveFor(3), 4);
  assert.equal(reserveFor(8), 6);
  assert.equal(reserveFor(15), 10);
});

test("a keyword given as it stands in the text is put in its base form", async () => {
  const text = "Bostadsbristen växer. Hon skrev ett brev.";
  const { readings } = await read(text);
  const out = await toBaseForms(null, [
    { swedish: "bostadsbristen", pos: "noun" }, { swedish: "skrev", pos: "verb" }, { swedish: "andrahandskontrakt", pos: "noun" }, { swedish: "brev", pos: "noun" },
  ], readings);
  assert.deepEqual(out.map((v) => v.swedish), ["bostadsbrist", "skriva", "andrahandskontrakt", "brev"]);
  assert.equal(out[0].given_as, "bostadsbristen");
});

test("an analysis made with older rules gets a current row with the same summary", async () => {
  const old = { id: "old", text_resource_id: "t", analysis_version: 1, native_language: "zh", status: "ready", headline_zh: "标题",
    summary_sv: "Sv", summary_zh: "中文", key_points: ["a"], text_cefr: "B1", selected_vocabulary: [{ swedish: "x" }] };
  const db = fakeSupabase({ text_analysis: [old] });
  const row = await upgradeAnalysisRow(db, old);
  assert.equal(row.analysis_version, ANALYSIS_VERSION);
  assert.equal(row.status, "summary_ready");
  assert.equal(row.summary_zh, "中文");
  assert.equal(row.text_cefr, "B1");
  assert.equal(row.selected_vocabulary, undefined, "selected again, not copied");
  assert.equal(db.tables.text_analysis.length, 2, "the old row stays");
});

test("an expression quoted with the prompt's sentence number is still found in the text", () => {
  const text = "Han gav inte upp. Sedan tog han tag i saken.";
  const pick = (n) => ({ expression_text: "ge upp", meaning_zh: "放弃", source_sentence: `${n}Han gav inte upp.`, source_sentence_zh: "" });
  const scan = [{ sentence: 1, candidates: [{ expression: "ge upp", word_for_word: "", meaning_here: "", verdict: "idiom" }] }];
  for (const n of ["[1] ", "1] ", "1. ", "(1) ", "1 ", "[1]", ""]) {
    const r = sortExpressions({ scan, collocations: [], idioms: [pick(n)] }, text);
    assert.equal(r.idioms[0]?.source_sentence, "Han gav inte upp.", JSON.stringify(n));
  }
  // A sentence that isn't in the text: the scan's own sentence is shown instead.
  assert.equal(sortExpressions({ scan, collocations: [], idioms: [{ ...pick(""), source_sentence: "Hon gav upp." }] }, text).idioms[0]?.source_sentence, "Han gav inte upp.");
});

test("an expression is saved with its first verb in the infinitive and a small letter", async () => {
  const { readings } = await read("Beslutet ifrågasatts av många. Hon återgår till arbetet. Han har kommit till ro. Jämfört med i fjol. Oavsett utgång. Vi gick hem. EU kräver mer.");
  assert.equal(expressionBaseForm("ifrågasatts av", readings), "ifrågasättas av");
  assert.equal(expressionBaseForm("återgår till", readings), "återgå till");
  assert.equal(expressionBaseForm("jämfört med", readings), "jämfört med", "a participle used as a preposition stays");
  assert.equal(expressionBaseForm("Oavsett utgång", readings), "oavsett utgång");
  assert.equal(expressionBaseForm("gick hem", readings), "gå hem");
  assert.equal(expressionBaseForm("ta hand om", readings), "ta hand om", "already the infinitive");
  assert.equal(expressionBaseForm("EU kräver", readings), "EU kräver", "an abbreviation keeps its capitals");
  assert.equal(expressionBaseForm("i stället för", readings), "i stället för");
  assert.equal(expressionBaseForm("tar hand om", null), "tar hand om", "no readings: unchanged");
});

test("an expression inside another one is shown once", () => {
  const e = (t) => ({ expression_text: t });
  const { collocations, idioms } = distinctExpressions([e("ha svårt att"), e("ta del av"), e("ha svårt att andas")], [e("vara med om något"), e("vara med om"), e("ta del")]);
  assert.deepEqual(collocations.map((x) => x.expression_text), ["ha svårt att", "ta del av"]);
  assert.deepEqual(idioms.map((x) => x.expression_text), ["vara med om något"]);
  // Sharing words is not containing: both stay.
  assert.equal(distinctExpressions([e("ta hand om"), e("ta tag i")], []).collocations.length, 2);
});

test("only three topic words per text, and no noun, verb or adjective is a connective", () => {
  const v = (swedish, pos, reason) => ({ swedish, pos, reason });
  const out = tidyReasons([v("a", "noun", "topic"), v("b", "verb", "topic"), v("c", "noun", "topic"), v("d", "noun", "topic"),
    v("kombinera", "verb", "connective"), v("däremot", "adverb", "connective"), v("e", "verb", "specific_use")]);
  assert.deepEqual(out.map((x) => x.reason), ["topic", "topic", "topic", "new_word", "new_word", "connective", "specific_use"]);
});

test("an expression whose verb the text has in an irregular form is found by SALDO's reading", async () => {
  const text = "När han fick sparken kändes det som att marken försvann.";
  const { readings } = await read(text);
  const scan = [{ sentence: 1, candidates: [{ expression: "kännas som att", word_for_word: "", meaning_here: "", verdict: "fast_fras" }] }];
  const pick = { expression_text: "kännas som att", meaning_zh: "", source_sentence: text, source_sentence_zh: "" };
  assert.equal(sortExpressions({ scan, collocations: [pick], idioms: [] }, text).collocations.length, 0, "by spelling alone it is missed");
  assert.equal(sortExpressions({ scan, collocations: [pick], idioms: [] }, text, readings).collocations.length, 1);
});

test("an entry without a frequency rank is not taken for the rarest word in the pool", () => {
  const c = (frequency_rank, cefr_level) => ({ word: { frequency_rank, cefr_level }, occurrences: 1 });
  assert.ok(poolValue(c(null, "A1")) < poolValue(c(400, "A2")), "a basic word without a rank (\"ta\") comes last");
  assert.ok(poolValue(c(null, "C1")) > poolValue(c(1000, "B1")), "an unrated advanced word stays high");
});

test("a chosen expression quoted in another shape is placed by the sentence the scan found it in", () => {
  const text = "Han förlorade jobbet. Sedan gav han inte upp.";
  const scan = [{ sentence: 1, candidates: [] }, { sentence: 2, candidates: [{ expression: "ge upp", word_for_word: "", meaning_here: "", verdict: "idiom" }] }];
  const pick = (source_sentence) => ({ expression_text: "ge upp", meaning_zh: "放弃", source_sentence, source_sentence_zh: "" });
  for (const q of ["Mening 2: Sedan gav han inte upp.", "Sedan gav han aldrig upp.", ""]) {
    const r = sortExpressions({ scan, collocations: [], idioms: [pick(q)] }, text);
    assert.equal(r.idioms[0]?.source_sentence, "Sedan gav han inte upp.", q);
    assert.equal(r.recovered, 1);
  }
  // Not in the scan's sentence either: left out, and counted.
  const wrong = { scan: [{ sentence: 1, candidates: [{ expression: "ge upp", word_for_word: "", meaning_here: "", verdict: "idiom" }] }], collocations: [], idioms: [pick("x")] };
  const r = sortExpressions(wrong, text);
  assert.equal(r.idioms.length, 0);
  assert.equal(r.dropped.not_in_text, 1);
  // Judged "neither" or never judged: counted apart.
  const n = sortExpressions({ scan: [{ sentence: 2, candidates: [{ expression: "ge upp", word_for_word: "", meaning_here: "", verdict: "neither" }] }], collocations: [], idioms: [pick("Sedan gav han inte upp.")] }, text);
  assert.equal(n.dropped.neither, 1);
});

const analysisRow = (over = {}) => ({ id: "a1", status: "summary_ready", deep_started_at: DEEP_UNCLAIMED, ...over });
const noWait = { pollMs: 1, waitMs: 50, sleep: () => new Promise((r) => setTimeout(r, 1)) };

test("two deep requests for one row run the AI once; the second gets the first one's result", async () => {
  const db = fakeSupabase({ text_analysis: [analysisRow()] });
  let runs = 0;
  const work = async () => {
    runs++;
    await new Promise((r) => setTimeout(r, 10));
    Object.assign(db.tables.text_analysis[0], { status: "ready", selected_vocabulary: ["x"] });
    return { ...db.tables.text_analysis[0] };
  };
  const [a, b] = await Promise.all([deepOnce(db, "a1", work, noWait), deepOnce(db, "a1", work, noWait)]);
  assert.equal(runs, 1);
  assert.deepEqual([a.waited, b.waited].sort(), [false, true]);
  assert.equal(b.row.status, "ready");
});

test("a failed deep run releases its claim: the next request runs instead of waiting", async () => {
  const db = fakeSupabase({ text_analysis: [analysisRow()] });
  await assert.rejects(deepOnce(db, "a1", async () => { throw new Error("AI down"); }, noWait), /AI down/);
  assert.equal(db.tables.text_analysis[0].deep_started_at, DEEP_UNCLAIMED);
  let runs = 0;
  await deepOnce(db, "a1", async () => { runs++; return { status: "ready" }; }, noWait);
  assert.equal(runs, 1);
});

test("a claim older than the platform's time limit no longer keeps anyone out; a fresh one does", async () => {
  const now = Date.now();
  const stale = fakeSupabase({ text_analysis: [analysisRow({ deep_started_at: new Date(now - DEEP_CLAIM_STALE_MS - 1000).toISOString() })] });
  assert.equal(await claimDeepAnalysis(stale, "a1", now), "claimed");
  const fresh = fakeSupabase({ text_analysis: [analysisRow({ deep_started_at: new Date(now - 1000).toISOString() })] });
  assert.equal(await claimDeepAnalysis(fresh, "a1", now), "busy");
  // A row already finished is never claimed again.
  assert.equal(await claimDeepAnalysis(fakeSupabase({ text_analysis: [analysisRow({ status: "ready" })] }), "a1", now), "busy");
  // Still running after the wait: the request ends with "try again", nothing runs twice.
  await assert.rejects(deepOnce(fresh, "a1", async () => assert.fail("ran twice"), noWait), (e) => e.status === 409);
});

test("before the migration (no claim column) a deep run goes ahead unclaimed, as it always did", async () => {
  const db = fakeSupabase({ text_analysis: [analysisRow()] });
  const from = db.from;
  db.from = (table) => {
    const q = from(table);
    const update = q.update;
    q.update = (p) => (p.deep_started_at ? { eq: () => ({ neq: () => ({ lt: () => ({ select: async () => ({ data: null, error: { code: "42703", message: "column deep_started_at does not exist" } }) }) }) }) } : update(p));
    return q;
  };
  assert.equal(await claimDeepAnalysis(db, "a1"), "unclaimed");
  let runs = 0;
  await deepOnce(db, "a1", async () => { runs++; return { status: "ready" }; }, noWait);
  assert.equal(runs, 1);
});

test("an adverb keeps its -t headword; the adjective read from the same form gets its base form", async () => {
  const readings = new Map([["samtidigt", [{ lemma: "samtidig", pos: "adjective" }]]]);
  const out = await toBaseForms(null, [{ swedish: "samtidigt", pos: "adverb" }, { swedish: "samtidigt", pos: "adjective" }], readings);
  assert.deepEqual(out.map((v) => v.swedish), ["samtidigt", "samtidig"]);
});

test("a shared library text is analysed once for every reader: no private copy, no second AI run", async () => {
  const text = "Det här är en kort text ur läsbiblioteket.";
  const hash = textHash(cleanText(text));
  const db = fakeSupabase({
    text_resources: [{ id: "lib", user_id: "admin", text_hash: hash, is_starter_library: true, word_count: 8, cleaned_text: cleanText(text) }],
    text_analysis: [{ id: "a-lib", text_resource_id: "lib", native_language: "zh", analysis_version: ANALYSIS_VERSION, status: "ready", visibility: "public",
      selected_vocabulary: [], selected_expressions: [] }],
  });
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => assert.fail("no AI call for a text already analysed");
  try {
    const fast = await analyzeReadingResourceFast({ supabaseAdmin: db, userId: "reader", text });
    assert.equal(fast.textResource.id, "lib");
    assert.equal(fast.analysis.id, "a-lib");
    assert.equal(fast.deepReady, true);
    assert.equal(db.tables.text_resources.length, 1, "no private copy");
    const deep = await analyzeReadingResourceDeep({ supabaseAdmin: db, userId: "reader", textResourceId: "lib" });
    assert.equal(deep.analysis.id, "a-lib");
    // Someone else's private text stays out of reach.
    db.tables.text_resources.push({ id: "own", user_id: "someone", text_hash: "x", is_starter_library: false, word_count: 3 });
    await assert.rejects(analyzeReadingResourceDeep({ supabaseAdmin: db, userId: "reader", textResourceId: "own" }), (e) => e.status === 404);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("a shared library text's older analysis is upgraded to a public row (readers can open it)", async () => {
  const old = { id: "old", text_resource_id: "lib", analysis_version: 1, native_language: "zh", status: "ready", visibility: "private", summary_zh: "中文" };
  const db = fakeSupabase({ text_analysis: [old] });
  const row = await upgradeAnalysisRow(db, old, { shared: true });
  assert.equal(row.visibility, "public");
  assert.equal((await upgradeAnalysisRow(fakeSupabase({ text_analysis: [{ ...old }] }), old)).visibility, "private");
});

test("marks: a keyword's places and its text's own sentence; an expression's words, never the ones between", async () => {
  const text = "Hon skrev en lång rapport. Rapporten  blev klar. De tog till slut upp frågan igen.";
  const { tokens, readings } = await read(text);
  assert.deepEqual(tokens.map((t) => t.k), tokens.map((_, i) => i));
  const kept = await resolveVocabularyCandidates(fakeSupabase({}), [
    { swedish: "rapport", pos: "noun", reason: "topic", sentence: "en rapport" },
    { swedish: "ta upp", pos: "verb", reason: "specific_use" },
  ], [{ word: { id: "r", swedish: "rapport", pos: "noun", cefr_level: "B1" } }], { tokens, readings, sentences: ["Hon skrev en lång rapport.", "Rapporten blev klar.", "De tog till slut upp frågan igen."] });
  const rapport = kept.find((k) => k.swedish === "rapport");
  assert.equal(rapport.sentence, "Hon skrev en lång rapport.", "the text's sentence, not the model's quote");
  assert.deepEqual(rapport.spots, [[4], [5]]);
  const taUpp = kept.find((k) => k.swedish === "ta upp");
  assert.deepEqual(taUpp.spots.map((s) => s.map((k) => tokens[k].raw)), [["tog", "upp"]], "the particle too, not 'till slut' between");
  const spots = expressionSpots({ expression_text: "ta upp något", source_sentence: "De tog till slut upp frågan igen." }, tokens, readings, text);
  assert.deepEqual(spots.map((s) => s.map((k) => tokens[k].raw)), [["tog", "upp"]]);
  // Not in the text: no marks rather than a wrong place.
  assert.deepEqual(expressionSpots({ expression_text: "ta hand om", source_sentence: "De tog hand om det." }, tokens, readings, text), []);
});
