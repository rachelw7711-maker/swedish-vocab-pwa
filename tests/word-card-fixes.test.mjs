// The five word-card problems a test of 840 generated cards found (2026-11-08), each with the
// real cases it found: homograph forms (fot → plural fot), correct examples dropped (säga /
// säja, skynda sig, hålla med), collocations and related words never checked, a headword of
// several parts of speech ("man"), and letters of another script ("保持 актуальность", "gällа").
// SALDO and Lexin from the local index; OpenAI replaced by canned answers; no network.
import "./env-test.mjs";
import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
const { useSaldoFiles, saldoEntries, pickSaldoRow } = await import("../server-lexicon.mjs");
const { useReferenceFiles } = await import("../server-references.mjs");
const { generateWordEntry } = await import("../server-native.mjs");
const { exampleUsesWord, phraseForms, misinflections, foreignLetters, latinLookalikes, dropForeignScript, checkProblems } = await import("../server-language-checks.mjs");
const { resolveWord } = await import("../server-resources.mjs");
const { expressionInText } = await import("../server-reading.mjs");
const { fakeSupabase } = await import("./fake-supabase.mjs");
const { okDetail } = await import("./fake-detail.mjs");

let card = null, check = null, detail2 = null, prompts = [], checkPrompts = [], detailPrompts = [];
// The check's answer: everything kept unless `over` says otherwise (per collocation phrase / related word).
const okCheck = ({ collocation = {}, related = {}, ...over } = {}) => (item) => ({ key: item.key, lemma: item.lemma, pos: item.pos, pos_supported: true, other_pos_senses: [], unsupported_senses: [],
  meaning_zh_fixed: "", meaning_en_fixed: "", swedish_explanation_fixed: "", context_matches_entry: "n/a", verdict: "ok", note: "",
  examples: item.entry.examples.map((e) => ({ key: e.key, sv_start: e.sv.split(" ").slice(0, 3).join(" "), fits_entry: true, translation_zh_ok: true, translation_en_ok: true, translation_zh_fixed: "", translation_en_fixed: "" })),
  collocations: (item.entry.collocations || []).map((c) => ({ key: c.key, phrase_start: c.phrase.split(" ")[0], verdict: "keep", zh_fixed: "", en_fixed: "", ...(collocation[c.phrase] || {}) })),
  related: (item.entry.related || []).map((r) => ({ key: r.key, word_start: r.word.split(" ")[0], verdict: "keep", zh_fixed: "", en_fixed: "", pos_fixed: "", ...(related[r.word] || {}) })),
  ...over });

before(async () => {
  await useSaldoFiles();
  await useReferenceFiles();
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("wiktionary.org")) return { ok: true, json: async () => ({ error: { code: "missingtitle" } }) };
    const body = JSON.parse(init.body);
    let answer;
    if (body.text.format.name === "sense_check") {
      checkPrompts.push(body);
      answer = { items: JSON.parse(body.input.at(-1).content).map((item) => (check || okCheck())(item)) };
    } else if (body.text.format.name === "card_detail_check") {
      const prompt = JSON.parse(body.input.at(-1).content);
      detailPrompts.push(prompt);
      answer = okDetail(prompt, detail2 || {});
    } else { prompts.push(body); answer = typeof card === "function" ? card(body) : card; }
    return { ok: true, json: async () => ({ output_text: JSON.stringify(answer), usage: { input_tokens: 500, output_tokens: 400 } }) };
  };
});
beforeEach(() => { check = null; detail2 = null; prompts = []; checkPrompts = []; detailPrompts = []; });

const baseCard = (over) => ({
  is_real_word: true, lemma: "", pos: "noun", pos_detail: "", cefr_level: "A1", meaning_zh: "脚", meaning_en: "foot", swedish_explanation: "kroppsdel",
  forms: [], transitivity: "", countability: "countable", passive: "",
  examples: [], collocations: [], related: [], memory_tip_zh: "", memory_tip_en: "", ...over,
});
const formsOf = (d, id) => Object.fromEntries(d.tables.word_forms.filter((f) => f.learning_object_id === id).map((f) => [f.form_type, f.form_value]));
const translation = (d, id, l) => d.tables.learning_object_translations.find((t) => t.learning_object_id === id && t.native_language === l);
const examplesOf = (d, id) => d.tables.learning_object_examples.filter((e) => e.learning_object_id === id).map((e) => e.example_swedish);
const sense = (d, id) => d.tables.resource_field_status.find((s) => s.learning_object_id === id && s.field === "sense");

// ---------------------------------------------------------------------------
// 1. Homographs inflecting differently by sense
// ---------------------------------------------------------------------------

test("1: SALDO's homographs come in homograph order, and the card's row is the sense written", async () => {
  const rows = await saldoEntries(null, "fot", "noun");
  assert.deepEqual(rows.map((r) => r.lemgram), ["fot..nn.1", "fot..nn.2"]);   // the index lists nn.2 first
  assert.equal(pickSaldoRow(rows, "noun", []).lemgram, "fot..nn.1");          // no forms given: the first homograph
  assert.equal(pickSaldoRow(rows, "noun", [{ type: "plural_indefinite", value: "fötter" }]).lemgram, "fot..nn.1");
  assert.equal(pickSaldoRow(rows, "noun", [{ type: "plural_indefinite", value: "fot" }, { type: "plural_definite", value: "foten" }]).lemgram, "fot..nn.2");   // the unit
  const bok = await saldoEntries(null, "bok", "noun");
  assert.equal(pickSaldoRow(bok, "noun", [{ type: "plural_indefinite", value: "bokar" }]).lemgram, "bok..nn.2");   // the tree
  // The real mus case: the model listed both sets — no decision, so the first homograph (möss).
  const mus = await saldoEntries(null, "mus", "noun");
  assert.equal(pickSaldoRow(mus, "noun", [{ type: "plural_indefinite", value: "möss" }, { type: "plural_definite", value: "mössen" }, { type: "plural_indefinite", value: "musar" }, { type: "plural_definite", value: "musarna" }]).lemgram, "mus..nn.1");
  const jasning = await saldoEntries(null, "jäsning", "noun");
  assert.equal(pickSaldoRow(jasning, "noun", [{ type: "plural_indefinite", value: "fel" }]), jasning[0]);       // one row: always it
});

test("1: a new card of 'fot' (the body part) gets fötter, not the unit's plural fot", async () => {
  const d = fakeSupabase();
  card = baseCard({ lemma: "fot", forms: [{ type: "plural_indefinite", value: "fötter" }, { type: "plural_definite", value: "fötterna" }],
    examples: [{ swedish: "Jag har ont i foten.", zh: "我脚疼。", en: "My foot hurts." }, { swedish: "Barnen har kalla fötter.", zh: "孩子们的脚很冷。", en: "The children have cold feet." }] });
  const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "fot", nativeLanguage: "zh", pos: "noun", sense: "脚", chargeQuota: false });
  const forms = formsOf(d, entryId);
  assert.equal(forms.plural_indefinite, "fötter");
  assert.equal(forms.plural_definite, "fötterna");
  assert.equal(forms.singular_definite, "foten");
  // The prompt showed both inflections and asked for the forms of the sense written.
  const user = prompts[0].input.at(-1).content;
  assert.match(user, /inflected differently by sense/);
  assert.match(user, /plural_indefinite: fötter/);
  assert.match(user, /plural_indefinite: fot\b/);
  // Both correct examples kept ("fötter" is a form of this row).
  assert.deepEqual(examplesOf(d, entryId), ["Jag har ont i foten.", "Barnen har kalla fötter."]);
});

test("1: the unit sense of 'fot' gets its own plural fot", async () => {
  const d = fakeSupabase();
  card = baseCard({ lemma: "fot", meaning_zh: "英尺", meaning_en: "foot (unit)", forms: [{ type: "plural_indefinite", value: "fot" }, { type: "plural_definite", value: "foten" }] });
  const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "fot", nativeLanguage: "zh", pos: "noun", sense: "英尺", chargeQuota: false });
  assert.equal(formsOf(d, entryId).plural_indefinite, "fot");
});

test("1: a word without homographs still takes SALDO's forms alone (model told to return none)", async () => {
  const d = fakeSupabase();
  card = baseCard({ lemma: "jäsning", meaning_zh: "发酵", meaning_en: "fermentation", forms: [{ type: "plural_indefinite", value: "jäsningar-FEL" }] });
  const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "jäsning", nativeLanguage: "zh", pos: "noun", chargeQuota: false });
  assert.equal(formsOf(d, entryId).plural_indefinite, "jäsningar");
  assert.match(prompts[0].input.at(-1).content, /forms are filled in from SALDO, so return forms: \[\]/);
});

// ---------------------------------------------------------------------------
// 2. Correct examples dropped by the example rule
// ---------------------------------------------------------------------------

test("2: a form stored with its variants matches either variant", () => {
  assert.equal(exampleUsesWord("Hon säger att det regnar.", ["säga", "säger / säjer"]), true);
  assert.equal(exampleUsesWord("Mina kollegor är trevliga.", ["kollega", "kolleger / kollegor"]), true);
  assert.equal(exampleUsesWord("Han äter ett äpple.", ["säga", "säger / säjer"]), false);   // still caught
});

test("2: reflexive and particle verbs are found inflected, with their particle apart and any reflexive pronoun", async () => {
  const skynda = ["skynda sig", ...(await phraseForms(null, "skynda sig"))];
  assert.ok(skynda.includes("skyndade sig"));
  assert.equal(exampleUsesWord("Vi måste skynda oss till bussen.", skynda), true);
  assert.equal(exampleUsesWord("Skynda dig, tåget går snart!", skynda), true);
  assert.equal(exampleUsesWord("De skyndade sig hem.", skynda), true);
  assert.equal(exampleUsesWord("Tiden skyndar på.", skynda), false);            // no reflexive: not this verb
  const halla = ["hålla med", ...(await phraseForms(null, "hålla med"))];
  assert.equal(exampleUsesWord("Jag håller med dig.", halla), true);
  assert.equal(exampleUsesWord("Jag håller inte med om det.", halla), true);    // particle apart
  assert.equal(exampleUsesWord("Hon höll med honom.", halla), true);
  assert.equal(exampleUsesWord("Jag håller boken.", halla), false);             // no particle: still caught
  const ta = ["ta hand om någon", ...(await phraseForms(null, "ta hand om någon"))];
  assert.equal(exampleUsesWord("Hon tog hand om barnen.", ta), true);
  assert.equal(exampleUsesWord("Hon tog barnen till skolan.", ta), false);
  assert.equal(exampleUsesWord("Jag gjorde mitt bästa.", ["göra sitt bästa", ...(await phraseForms(null, "göra sitt bästa"))]), true);
  assert.deepEqual(await phraseForms(null, "i stället"), []);                    // no verb: only the lemma itself
});

test("2: a new reflexive verb card keeps its correct examples, drops the one without the word", async () => {
  const d = fakeSupabase();
  card = baseCard({ lemma: "skynda sig", pos: "verb", meaning_zh: "赶快", meaning_en: "hurry", forms: [], countability: "",
    examples: [{ swedish: "Vi måste skynda oss.", zh: "我们得赶快。", en: "We have to hurry." },
      { swedish: "Hon skyndade sig till jobbet.", zh: "她赶去上班。", en: "She hurried to work." },
      { swedish: "Bussen kommer snart.", zh: "公交车很快就来。", en: "The bus is coming soon." }] });
  const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "skynda sig", nativeLanguage: "zh", chargeQuota: false });
  assert.deepEqual(examplesOf(d, entryId), ["Vi måste skynda oss.", "Hon skyndade sig till jobbet."]);
  assert.deepEqual(sense(d, entryId).detail.dropped, ["Bussen kommer snart."]);
});

// ---------------------------------------------------------------------------
// 3. Collocations and related words checked before saving
// ---------------------------------------------------------------------------

const doCard = () => baseCard({ lemma: "dö", pos: "verb", meaning_zh: "死", meaning_en: "die", countability: "",
  examples: [{ swedish: "Hunden dog i går.", zh: "狗昨天死了。", en: "The dog died yesterday." }],
  collocations: [
    { phrase: "dö av något", zh: "死于某事", en: "die of something", example: "Han dog av cancer." },
    { phrase: "dö på posten", zh: "死在岗位上", en: "die at one's post", example: "Han dog på posten." },
    { phrase: "dö ut", zh: "灭绝", en: "die", example: "Arten har dött ut." },
    { phrase: "dö i en olycka", zh: "死于事故", en: "die in an accident", example: "Hon dog i en olycka." },
  ],
  related: [
    { word: "död", zh: "死亡", en: "death", pos: "noun" },
    { word: "dödlig", zh: "致命的", en: "deadly", pos: "adjective" },
    { word: "lärsighet", zh: "学习能力", en: "learning ability", pos: "noun" },
    { word: "döda", zh: "死的", en: "dead", pos: "verb" },
    { word: "fönster", zh: "窗户", en: "window", pos: "noun" },
  ] });

test("3: the check sees the collocations and related words, and its verdicts are applied", async () => {
  const d = fakeSupabase();
  card = doCard();
  check = okCheck({
    collocation: { "dö på posten": { verdict: "not_swedish" }, "dö ut": { verdict: "wrong_meaning", en_fixed: "die out" }, "dö i en olycka": { verdict: "free_combination" } },
    related: { "lärsighet": { verdict: "not_a_word" }, "döda": { verdict: "wrong_meaning", zh_fixed: "杀死", en_fixed: "kill" }, "fönster": { verdict: "not_related" },
      "dödlig": { verdict: "not_a_word" } },   // wrong: SALDO has it, so it stays
  });
  // The focused check agrees: both checks call it made up / free, so it goes.
  detail2 = { collocation: { "dö på posten": { verdict: "made_up" }, "dö i en olycka": { verdict: "free_combination" } } };
  const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "dö", nativeLanguage: "zh", pos: "verb", chargeQuota: false });
  const sent = JSON.parse(checkPrompts[0].input.at(-1).content)[0].entry;
  assert.equal(sent.collocations.length, 4);
  assert.deepEqual(sent.related.map((r) => r.key), ["i1.r0", "i1.r1", "i1.r2", "i1.r3", "i1.r4"]);
  assert.ok(checkPrompts[0].text.format.schema.properties.items.items.required.includes("related"));
  assert.equal(translation(d, entryId, "en").collocations, "dö av något | die of something | Han dog av cancer.\ndö ut | die out | Arten har dött ut.");
  assert.equal(translation(d, entryId, "zh").related_words, "död | 死亡（名词）\ndödlig | 致命的（形容词）\ndöda | 杀死（动词）");
  const detail = sense(d, entryId).detail;
  assert.deepEqual(detail.dropped_collocations.map((c) => c.reason), ["not_swedish", "free_combination"]);
  assert.deepEqual(detail.dropped_related, [{ word: "lärsighet", reason: "not_a_word" }, { word: "fönster", reason: "not_related" }]);
});

test("3: program evidence goes to the check: a phrase or example without the headword, a word SALDO doesn't know", async () => {
  const d = fakeSupabase();
  card = baseCard({ lemma: "svika", pos: "verb", meaning_zh: "背叛；辜负", meaning_en: "betray, let down", countability: "",
    examples: [{ swedish: "Han svek sina vänner.", zh: "他背叛了朋友。", en: "He betrayed his friends." }],
    collocations: [{ phrase: "svika sina vänner", zh: "辜负朋友", en: "let one's friends down", example: "Han lämnade dem i sticket." },
      { phrase: "svika någons förtroende", zh: "辜负某人的信任", en: "betray someone's trust", example: "Hon svek hans förtroende." },
      { phrase: "svikfull", zh: "背信弃义的", en: "treacherous", example: "Det var ett svikfullt beteende." }],
    related: [{ word: "svek", zh: "背叛", en: "betrayal", pos: "noun" }, { word: "lärsighet", zh: "学习能力", en: "learning ability", pos: "noun" }, { word: "förrädare", zh: "叛徒", en: "traitor", pos: "noun" }] });
  await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "svika", nativeLanguage: "zh", pos: "verb", chargeQuota: false });
  const sent = JSON.parse(checkPrompts[0].input.at(-1).content)[0].entry;
  assert.deepEqual(sent.collocations.map((c) => c.flags || []), [["example_without_headword"], [], ["headword_not_found", "example_without_headword"]]);
  assert.deepEqual(sent.related.map((r) => r.flags || []), [[], ["no_dictionary"], []]);
  assert.ok(sent.headword_forms.includes("svek") && sent.headword_forms.includes("svikit"));   // the check knows the forms
  assert.match(checkPrompts[0].input[0].content, /A flag is a reason to look hard, not a verdict/);
});

test("3: a collocation Lexin has is not dropped on the AI's word alone", async () => {
  const d = fakeSupabase();
  card = baseCard({ lemma: "fot", forms: [{ type: "plural_indefinite", value: "fötter" }],
    collocations: [{ phrase: "på fri fot", zh: "逍遥法外", en: "at large", example: "Mördaren är fortfarande på fri fot." },
      { phrase: "tappa något ur sikte med ögonen", zh: "看不见", en: "lose sight of", example: "Jag tappade det ur sikte med fötterna." }] });
  check = okCheck({ collocation: { "på fri fot": { verdict: "not_swedish" }, "tappa något ur sikte med ögonen": { verdict: "not_swedish" } } });
  detail2 = { collocation: { "på fri fot": { verdict: "made_up" }, "tappa något ur sikte med ögonen": { verdict: "made_up" } } };
  const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "fot", nativeLanguage: "zh", pos: "noun", chargeQuota: false });
  assert.equal(translation(d, entryId, "zh").collocations, "på fri fot | 逍遥法外 | Mördaren är fortfarande på fri fot.");
  assert.equal(detailPrompts[0].collocations[0].evidence, "dictionary");
});

test("3: one check alone doesn't drop a collocation: kept, open, and the card not verified", async () => {
  const d = fakeSupabase();
  card = doCard();
  check = okCheck({ collocation: { "dö på posten": { verdict: "not_swedish" } } });   // the focused check finds it fixed
  detail2 = { collocation: { "dö ut": { verdict: "made_up" }, "dö i en olycka": { verdict: "made_up" } } };   // and the other way round
  const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "dö", nativeLanguage: "zh", pos: "verb", chargeQuota: false });
  assert.match(translation(d, entryId, "en").collocations, /dö på posten/);
  assert.match(translation(d, entryId, "en").collocations, /dö ut/);                 // Lexin lists it: not even open
  assert.match(translation(d, entryId, "en").collocations, /dö i en olycka/);
  assert.equal(sense(d, entryId).status, "present");
  const open = sense(d, entryId).detail.open_items;
  assert.deepEqual(open.filter((o) => o.kind.startsWith("collocation")).map((o) => [o.kind, o.text]), [["collocation_made_up", "dö på posten"], ["collocation_made_up", "dö i en olycka"]]);
  assert.ok(open.some((o) => o.kind === "related_unverified" && o.text === "lärsighet"));   // no dictionary has it: open, not verified
});

test("3: a sense the whole-card check calls unsupported and left on the card keeps it from being verified (av)", async () => {
  const d = fakeSupabase();
  card = baseCard({ lemma: "fot", forms: [{ type: "plural_indefinite", value: "fötter" }], meaning_zh: "脚；时不时", meaning_en: "foot" });
  check = okCheck({ unsupported_senses: ["时不时"] });
  const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "fot", nativeLanguage: "zh", pos: "noun", chargeQuota: false });
  assert.equal(sense(d, entryId).status, "present");
  assert.ok(sense(d, entryId).detail.open_items.some((o) => o.kind === "sense_doubted_by_card_check" && o.text === "时不时"));
});

test("3: an answer leaving out a collocation or related word is not used: asked again, then the card stays unchecked", async () => {
  const item = { key: "i1", lemma: "dö", pos: "verb", entry: { examples: [], collocations: [{ key: "i1.c0", phrase: "dö ut" }], related: [{ key: "i1.r0", word: "död" }] } };
  const answer = okCheck()(item);
  assert.deepEqual(checkProblems(item, answer), []);
  assert.deepEqual(checkProblems(item, { ...answer, related: [] }), ["related_missing:i1.r0"]);
  assert.deepEqual(checkProblems(item, { ...answer, collocations: [] }), ["collocation_missing:i1.c0"]);
  assert.deepEqual(checkProblems(item, { ...answer, related: [{ ...answer.related[0], verdict: "wrong_meaning" }] }), ["no_related_fix:i1.r0"]);
  // The echo may name the headword in the phrase ("köpa dricka" → "dricka"); a word not in it is no echo.
  const drink = { key: "i1", lemma: "dricka", pos: "noun", entry: { examples: [], collocations: [{ key: "i1.c0", phrase: "köpa dricka" }] } };
  const drinkAnswer = okCheck()(drink);
  assert.deepEqual(checkProblems(drink, { ...drinkAnswer, collocations: [{ ...drinkAnswer.collocations[0], phrase_start: "dricka" }] }), []);
  assert.deepEqual(checkProblems(drink, { ...drinkAnswer, collocations: [{ ...drinkAnswer.collocations[0], phrase_start: "sälja" }] }), ["collocation_echo:i1.c0"]);

  const d = fakeSupabase();
  card = doCard();
  check = (it) => ({ ...okCheck()(it), related: [] });
  const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "dö", nativeLanguage: "zh", pos: "verb", chargeQuota: false });
  assert.equal(checkPrompts.length, 2);                      // asked once more on its own
  assert.equal(sense(d, entryId).status, "missing");         // never counted as checked
  assert.equal(sense(d, entryId).source, "ai_check_failed");
});

// ---------------------------------------------------------------------------
// 4. A headword of several parts of speech typed in search ("man")
// ---------------------------------------------------------------------------

test("4: 'man' typed in search is not taken as the pronoun because SALDO lists it first", async () => {
  const r = await resolveWord(fakeSupabase(), "man");
  assert.equal(r.entryId, null);
  assert.deepEqual([r.pos, ...r.alsoPos].sort(), ["noun", "pronoun"]);
  const d = fakeSupabase();
  card = baseCard({ lemma: "man", meaning_zh: "男人", meaning_en: "man", swedish_explanation: "vuxen person av hankön",
    examples: [{ swedish: "Två män står vid dörren.", zh: "两个男人站在门口。", en: "Two men are standing at the door." }] });
  const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "man", nativeLanguage: "zh", chargeQuota: false });
  const user = prompts[0].input.at(-1).content;
  assert.match(user, /"man" is (pronoun, noun|noun, pronoun)/);
  assert.doesNotMatch(user, /forms nom: man/);                // the pronoun's forms are no longer the reference
  const row = d.tables.learning_objects.find((o) => o.id === entryId);
  assert.equal(row.part_of_speech, "noun");
  assert.match(formsOf(d, entryId).plural_indefinite, /^män/);   // man..nn.1, not manar (the mane)
  // The check is told the spelling is also a pronoun, so the pronoun's sense is looked for in the noun entry.
  assert.deepEqual(JSON.parse(checkPrompts[0].input.at(-1).content)[0].also_exists_as, ["pronoun"]);
});

test("4: with a part of speech asked for (reading, word links), nothing changes", async () => {
  const d = fakeSupabase();
  card = baseCard({ lemma: "man", pos: "pronoun", meaning_zh: "人们", meaning_en: "one, people", forms: [],
    examples: [{ swedish: "Man vet aldrig.", zh: "谁也说不准。", en: "You never know." }] });
  const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "man", nativeLanguage: "zh", pos: "pronoun", chargeQuota: false });
  assert.doesNotMatch(prompts[0].input.at(-1).content, /words of their own with the same spelling/);
  assert.equal(d.tables.learning_objects.find((o) => o.id === entryId).part_of_speech, "pronoun");
});

// ---------------------------------------------------------------------------
// 5. Letters of another script
// ---------------------------------------------------------------------------

test("5: letters of another script are found; Swedish, loanwords and Latin in Chinese are not", () => {
  assert.deepEqual(foreignLetters("保持 актуальность；仍然适用", "zh").length, 12);
  assert.ok(foreignLetters("过时的；不再 актуальной", "zh").length);
  assert.ok(foreignLetters("gällа", "sv").length);
  assert.ok(foreignLetters("てすと", "zh").length);
  for (const [text, lang] of [["En idé på ett café, naïv och über-cool.", "sv"], ["Hon åt crème brûlée på Åre.", "sv"], ["DNA分析；使变得 aktuell", "zh"], ["déjà vu, naïve", "en"], ["5–10 %", "sv"]]) {
    assert.deepEqual(foreignLetters(text, lang), [], text);
  }
  assert.equal(latinLookalikes("gällа"), "gälla");                       // Cyrillic а inside a Latin word
  assert.equal(latinLookalikes("Det gällеr alla."), "Det gäller alla.");
  assert.equal(latinLookalikes("актуальность"), "актуальность");         // a Russian word is not "repaired"
  assert.equal(latinLookalikes("idé"), "idé");
});

test("5: a related word or collocation with another script is dropped, a tip emptied, a meaning with it not saved", () => {
  const c = { meaning_zh: "现时的", meaning_en: "current", swedish_explanation: "som gäller nu",
    examples: [{ swedish: "Frågan är aktuell.", zh: "这个问题很 актуальный。", en: "The question is topical." }, { swedish: "Det är aktuellt nu.", zh: "现在很重要。", en: "It is current now." }],
    collocations: [{ phrase: "hålla sig aktuell", zh: "保持 актуальность", en: "stay current", example: "Han håller sig aktuell." }],
    related: [{ word: "inaktuell", zh: "过时的；不再 актуальной", en: "outdated" }, { word: "aktualitet", zh: "现实性", en: "topicality" }],
    memory_tip_zh: "актуальный", memory_tip_en: "act-ual" };
  const { foreign, badMeaning } = dropForeignScript(c);
  assert.deepEqual(badMeaning, []);
  assert.deepEqual(c.examples.map((e) => e.swedish), ["Det är aktuellt nu."]);
  assert.deepEqual(c.collocations, []);
  assert.deepEqual(c.related.map((r) => r.word), ["aktualitet"]);
  assert.equal(c.memory_tip_zh, "");
  assert.equal(c.memory_tip_en, "act-ual");
  assert.equal(foreign.length, 4);
  assert.deepEqual(dropForeignScript({ meaning_zh: "现时的 актуальный", meaning_en: "current" }).badMeaning, ["meaning_zh"]);
});

test("5: the real case 'aktuell' — Cyrillic in related words and collocations never reaches the saved card", async () => {
  const d = fakeSupabase();
  card = baseCard({ lemma: "aktuell", pos: "adjective", meaning_zh: "当前的；现实的", meaning_en: "current, topical", countability: "",
    examples: [{ swedish: "Frågan är fortfarande aktuell.", zh: "这个问题仍然很现实。", en: "The question is still topical." }],
    collocations: [{ phrase: "hålla sig aktuell", zh: "保持 актуальность；仍然适用或受关注", en: "stay relevant", example: "Hon håller sig aktuell." }],
    related: [{ word: "aktualisera", zh: "使变得 актуell；更新", en: "update", pos: "verb" }, { word: "inaktuell", zh: "过时的；不再 актуальной", en: "outdated", pos: "adjective" },
      { word: "aktualitet", zh: "现实性", en: "topicality", pos: "noun" }] });
  const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "aktuell", nativeLanguage: "zh", pos: "adjective", chargeQuota: false });
  const zh = translation(d, entryId, "zh");
  assert.equal(zh.related_words, "aktualitet | 现实性（名词）");
  assert.equal(zh.collocations || "", "");
  assert.doesNotMatch(JSON.stringify(d.tables), /[Ѐ-ӿ]/u);
  // The flagged parts went to the check marked, so it could correct them first.
  assert.match(checkPrompts[0].input[0].content, /another script/);
});

test("5: a meaning still in another script after the check is not saved; one the check corrected is", async () => {
  const d = fakeSupabase();
  card = baseCard({ lemma: "aktuell", pos: "adjective", meaning_zh: "现时的 актуальный", meaning_en: "current", countability: "" });
  await assert.rejects(generateWordEntry({ supabaseAdmin: d, userId: "u", word: "aktuell", nativeLanguage: "zh", pos: "adjective", chargeQuota: false }), { status: 422 });
  assert.equal(d.tables.learning_objects?.length || 0, 0);
  check = okCheck({ meaning_zh_fixed: "当前的；现实的", verdict: "fixed" });
  const { entryId } = await generateWordEntry({ supabaseAdmin: fakeSupabase(), userId: "u", word: "aktuell", nativeLanguage: "zh", pos: "adjective", chargeQuota: false }).catch((e) => ({ e }));
  assert.ok(entryId);
});

test("5: a check's correction in another script is not used", () => {
  const item = { key: "i1", lemma: "aktuell", pos: "adjective", entry: { examples: [{ key: "i1.e0", sv: "Frågan är aktuell.", zh: "x", en: "y" }] } };
  const c = { key: "i1", lemma: "aktuell", pos: "adjective", meaning_zh_fixed: "актуальный", examples: [{ key: "i1.e0", sv_start: "Frågan är aktuell.", fits_entry: true, translation_zh_ok: false, translation_zh_fixed: "问题 актуальный。", translation_en_ok: true, translation_en_fixed: "" }], other_pos_senses: [], unsupported_senses: [] };
  assert.deepEqual(checkProblems(item, c).sort(), ["bad_fix:meaning_zh_fixed", "bad_zh_fix:i1.e0"]);
});

test("5: a word typed or chosen with a look-alike letter is taken as the Swedish word", async () => {
  const text = "Reglerna gäller alla.";
  assert.equal(expressionInText({ expression_text: "gällа alla", source_sentence: text }, text), false);
  assert.equal(expressionInText({ expression_text: latinLookalikes("gällа alla"), source_sentence: text }, text), true);
  await assert.rejects(generateWordEntry({ supabaseAdmin: fakeSupabase(), userId: "u", word: "актуальный", nativeLanguage: "zh", chargeQuota: false }), { status: 400 });
});

// ---------------------------------------------------------------------------
// Follow-up (2026-11-08): words of the same spelling as separate entries, and the
// collocation / related-word errors the check still let through
// ---------------------------------------------------------------------------

const manNoun = { id: "man-noun", swedish: "man", part_of_speech: "noun", object_type: "word", status: "published", chinese: "男人；丈夫" };
const manPronoun = { id: "man-pron", swedish: "man", part_of_speech: "pronoun", object_type: "word", status: "ai_generated", chinese: "人们；一般人" };
const zhRow = (id) => ({ id: `t-${id}`, learning_object_id: id, native_language: "zh", meaning: "…" });

test("same spelling: with both entries there, each request gets its own and nothing is generated", async () => {
  const d = fakeSupabase({ learning_objects: [{ ...manNoun }, { ...manPronoun }], learning_object_translations: [zhRow("man-noun"), zhRow("man-pron")] });
  assert.equal((await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "man", nativeLanguage: "zh", pos: "noun", chargeQuota: false })).entryId, "man-noun");
  assert.equal((await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "man", nativeLanguage: "zh", pos: "pronoun", chargeQuota: false })).entryId, "man-pron");
  assert.equal((await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "män", nativeLanguage: "zh", chargeQuota: false })).entryId, "man-noun");
  const { created } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "man", nativeLanguage: "zh", chargeQuota: false });
  assert.equal(created, false);
  assert.equal(prompts.length, 0);
  assert.equal(d.tables.learning_objects.length, 2);
});

test("same spelling: the missing part of speech is generated as an entry of its own, the other left as it is", async () => {
  const d = fakeSupabase({ learning_objects: [{ ...manNoun }], learning_object_translations: [zhRow("man-noun")] });
  card = baseCard({ lemma: "man", pos: "pronoun", meaning_zh: "人们；一般人", meaning_en: "one, people", countability: "",
    examples: [{ swedish: "Man vet aldrig.", zh: "谁也说不准。", en: "You never know." }] });
  const { entryId, created } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "man", nativeLanguage: "zh", pos: "pronoun", chargeQuota: false });
  assert.ok(created);
  assert.notEqual(entryId, "man-noun");
  assert.deepEqual(d.tables.learning_objects.map((o) => o.part_of_speech).sort(), ["noun", "pronoun"]);
  assert.deepEqual(d.tables.learning_objects.find((o) => o.id === "man-noun"), manNoun);   // untouched
  // The check is told about the noun, so the noun's senses are not let into the pronoun entry.
  assert.deepEqual(JSON.parse(checkPrompts[0].input.at(-1).content)[0].also_exists_as, ["noun"]);
});

test("same spelling: a card of another part of speech than asked is not saved, nor given for the one asked", async () => {
  const d = fakeSupabase({ learning_objects: [{ ...manNoun }], learning_object_translations: [zhRow("man-noun")] });
  card = baseCard({ lemma: "man", pos: "noun", meaning_zh: "男人", meaning_en: "man", examples: [{ swedish: "En man kom.", zh: "来了一个男人。", en: "A man came." }] });
  await assert.rejects(generateWordEntry({ supabaseAdmin: d, userId: "u", word: "man", nativeLanguage: "zh", pos: "pronoun", chargeQuota: false }), { status: 422 });
  assert.equal(d.tables.learning_objects.length, 1);
});

test("same spelling: a part of speech no reference gives the word is not generated", async () => {
  const d = fakeSupabase({ learning_objects: [{ ...manNoun }], learning_object_translations: [zhRow("man-noun")] });
  card = baseCard({ lemma: "man", pos: "verb", meaning_zh: "操纵", meaning_en: "to man", countability: "", examples: [{ swedish: "De man båten.", zh: "他们操纵船。", en: "They man the boat." }] });
  check = okCheck({ pos_supported: false });
  await assert.rejects(generateWordEntry({ supabaseAdmin: d, userId: "u", word: "man", nativeLanguage: "zh", pos: "verb", chargeQuota: false }), { status: 422 });
  assert.equal(d.tables.learning_objects.length, 1);
});

test("same spelling: a finished generation of one part of speech never answers a request for another", async () => {
  // A lock written when the model chose the noun for a search, under the pronoun's key (before this fix).
  const d = fakeSupabase({ learning_objects: [{ ...manNoun }], learning_object_translations: [zhRow("man-noun")],
    generation_requests: [{ key: "man|pronoun|zh", status: "done", entry_id: "man-noun", updated_at: new Date().toISOString() }] });
  card = baseCard({ lemma: "man", pos: "pronoun", meaning_zh: "人们", meaning_en: "one", countability: "", examples: [{ swedish: "Man vet aldrig.", zh: "谁也说不准。", en: "You never know." }] });
  const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "man", nativeLanguage: "zh", pos: "pronoun", chargeQuota: false });
  assert.notEqual(entryId, "man-noun");
  assert.equal(d.tables.learning_objects.find((o) => o.id === entryId).part_of_speech, "pronoun");
  // Typed in search with several parts of speech to choose from, the lock names none.
  const s = fakeSupabase();
  card = baseCard({ lemma: "man", meaning_zh: "男人", meaning_en: "man", examples: [{ swedish: "Två män kom.", zh: "来了两个男人。", en: "Two men came." }] });
  await generateWordEntry({ supabaseAdmin: s, userId: "u", word: "man", nativeLanguage: "zh", chargeQuota: false });
  assert.deepEqual(s.tables.generation_requests.map((r) => r.key), ["man|zh"]);
});

test("wrong inflections of the headword are found; right forms, other words and compounds are not", async () => {
  const svika = ["svika", "sviker", "svek", "svikit", "svikande", "sviken", "svikna"];
  assert.deepEqual(await misinflections(null, "Han svikade inte sitt löfte.", svika), ["svikade"]);
  assert.deepEqual(await misinflections(null, "Hon hälde upp kaffe till gästerna.", await phraseForms(null, "hälla upp")), ["hälde"]);
  assert.deepEqual(await misinflections(null, "Föräldrarna vänjde barnet vid att somna.", await phraseForms(null, "vänja sig")), ["vänjde"]);
  assert.deepEqual(await misinflections(null, "Han svek inte sitt löfte. Det var ett svikfullt beteende.", svika), []);
  assert.deepEqual(await misinflections(null, "Vi gick dit till fots.", ["fot", "foten", "fötter", "fötterna"]), []);
  assert.deepEqual(await misinflections(null, "Han hällde upp mjölken.", await phraseForms(null, "hälla upp")), []);
});

test("a wrong inflection drops its example, or a collocation's example (the phrase stays), before the check", async () => {
  const d = fakeSupabase();
  card = baseCard({ lemma: "svika", pos: "verb", meaning_zh: "背叛；辜负", meaning_en: "betray, let down", countability: "",
    examples: [{ swedish: "Han svek sina vänner.", zh: "他背叛了朋友。", en: "He betrayed his friends." }, { swedish: "Hon har aldrig svikit och svikade aldrig.", zh: "…", en: "…" }],
    collocations: [{ phrase: "svika ett löfte", zh: "违背诺言", en: "break a promise", example: "Han svikade inte sitt löfte." },     // real round-2 error
      { phrase: "svika någons förtroende", zh: "辜负某人的信任", en: "betray someone's trust", example: "Hon svek hans förtroende." }] });
  const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "svika", nativeLanguage: "zh", pos: "verb", chargeQuota: false });
  const sent = JSON.parse(checkPrompts[0].input.at(-1).content)[0].entry;
  assert.deepEqual(sent.collocations.map((c) => c.phrase), ["svika ett löfte", "svika någons förtroende"]);
  assert.equal(sent.collocations[0].example || "", "", "the wrong sentence is not sent");
  assert.deepEqual(sent.examples.map((e) => e.sv), ["Han svek sina vänner."]);
  assert.deepEqual(examplesOf(d, entryId), ["Han svek sina vänner."]);
  assert.equal(sense(d, entryId).detail.dropped_collocations, undefined);
  assert.deepEqual(sense(d, entryId).detail.dropped_collocation_examples.find((x) => x.phrase === "svika ett löfte"),
    { phrase: "svika ett löfte", example: "Han svikade inte sitt löfte.", reason: "wrong_form:svikade" });
});

test("'not with the headword' is not taken for a phrase that has one of its forms; a compound still goes", async () => {
  const d = fakeSupabase();
  card = baseCard({ lemma: "byxa", meaning_zh: "裤子", meaning_en: "trousers",
    examples: [{ swedish: "Byxorna är för korta.", zh: "裤子太短了。", en: "The trousers are too short." }],
    collocations: [{ phrase: "ett par byxor", zh: "一条裤子", en: "a pair of trousers", example: "Hon köpte ett par byxor." },
      { phrase: "byxficka", zh: "裤兜", en: "trouser pocket", example: "Nyckeln låg i byxfickan." }] });
  check = okCheck({ collocation: { "ett par byxor": { verdict: "not_with_headword" }, "byxficka": { verdict: "not_with_headword" } } });
  const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "byxa", nativeLanguage: "zh", pos: "noun", chargeQuota: false });
  assert.equal(translation(d, entryId, "zh").collocations, "ett par byxor | 一条裤子 | Hon köpte ett par byxor.");
});


test("an example with a form the card doesn't show (the s-passive) is kept", async () => {
  const d = fakeSupabase();
  card = baseCard({ lemma: "slita", pos: "verb", meaning_zh: "磨损；辛苦工作", meaning_en: "wear; toil", countability: "",
    examples: [{ swedish: "Skorna har slitits av allt gående.", zh: "鞋子因走路太多而磨破了。", en: "The shoes have been worn out by all the walking." },   // real case
      { swedish: "Han jobbar hårt varje dag.", zh: "他每天努力工作。", en: "He works hard every day." }] });
  const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "slita", nativeLanguage: "zh", pos: "verb", chargeQuota: false });
  assert.deepEqual(examplesOf(d, entryId), ["Skorna har slitits av allt gående."]);
});

test("an example the focused check alone calls ungrammatical goes only when the program sees the error too", async () => {
  const { grammarSlip } = await import("../server-language-checks.mjs");
  assert.equal(grammarSlip("Min gammal telefon fungerar fortfarande bra.", "Min gamla telefon fungerar fortfarande bra."), true);
  assert.equal(grammarSlip("Jag kan inte komma, nämligen eftersom jag måste jobba.", "Jag kan inte komma, jag måste nämligen jobba."), true);
  assert.equal(grammarSlip("Det kommer kallt drag från fönstret.", "Det kommer kall drag från fönstret."), false);
  assert.equal(grammarSlip("Hon förhåller sig neutral i frågan.", "Hon förhåller sig neutralt i frågan."), false);
});

test("3: a bad example costs the sentence when both checks say so, not the combination", async () => {
  const d = fakeSupabase();
  card = doCard();
  // One check alone: the sentence stays, open ("Han äter mjölk och flingor" went for one check's word).
  check = okCheck({ collocation: { "dö av något": { verdict: "bad_example" }, "dö i en olycka": { verdict: "bad_example" } } });
  detail2 = { collocation: { "dö av något": { verdict: "fixed_expression" }, "dö i en olycka": { verdict: "free_combination" } } };
  let { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "dö", nativeLanguage: "zh", pos: "verb", chargeQuota: false });
  let line = translation(d, entryId, "en").collocations.split("\n").find((l) => l.startsWith("dö av något"));
  assert.match(line, /Han dog av cancer/);
  assert.ok(sense(d, entryId).detail.open_items.some((o) => o.kind === "collocation_example" && /Han dog av cancer/.test(o.text)));
  assert.doesNotMatch(translation(d, entryId, "en").collocations, /dö i en olycka/);   // nothing vouches for it: it goes
  // Both: the sentence goes, the combination stays when something vouches for it.
  const d2 = fakeSupabase();
  check = okCheck({ collocation: { "dö av något": { verdict: "bad_example" } } });
  detail2 = { collocation: { "dö av något": { verdict: "bad_example" } } };
  ({ entryId } = await generateWordEntry({ supabaseAdmin: d2, userId: "u", word: "dö", nativeLanguage: "zh", pos: "verb", chargeQuota: false }));
  const listed = sense(d2, entryId).detail.dropped_collocations?.some((x) => x.phrase === "dö av något");
  line = translation(d2, entryId, "en").collocations.split("\n").find((l) => l.startsWith("dö av något"));
  if (!listed) { assert.ok(line); assert.doesNotMatch(line, /Han dog av cancer/); }
  assert.deepEqual(sense(d2, entryId).detail.dropped_collocation_examples.map((x) => x.phrase), ["dö av något"]);
});

test("3: the corpus settles what the AI checks get wrong about a combination no dictionary lists", async () => {
  const { checkNewWordCard } = await import("../server-language-checks.mjs");
  const many = { total: 8, perCorpus: { GP2012: 4, ROMI: 4 }, match: "multiword" }, none = { total: 0, perCorpus: {}, match: "multiword" };
  const corpus = { "dö på fläcken": many, "dö med ögonen": none, "dö i luften": none, "dö i frid": many };
  const asked = [];
  const korp = async (p) => { asked.push(p); if (!(p in corpus)) throw new Error("no answer"); return corpus[p]; };
  const result = { ...doCard(), collocations: [
    { phrase: "dö på fläcken", zh: "当场死亡", en: "die on the spot", example: "Han dog på fläcken." },
    { phrase: "dö med ögonen", zh: "x", en: "x", example: "Hon dog med ögonen." },
    { phrase: "dö i luften", zh: "x", en: "x", example: "Idén dog i luften." },
    { phrase: "dö i sömnen", zh: "睡梦中去世", en: "die in one's sleep", example: "Han dog i sömnen." },
    { phrase: "dö i frid", zh: "安详地死去", en: "die in peace", example: "Hon fick dö i frid." },
  ] };
  check = okCheck({ collocation: { "dö på fläcken": { verdict: "not_swedish" }, "dö i luften": { verdict: "not_swedish" }, "dö i sömnen": { verdict: "not_swedish" }, "dö i frid": { verdict: "free_combination" } } });
  detail2 = { collocation: { "dö på fläcken": { verdict: "made_up" }, "dö med ögonen": { verdict: "fixed_expression" }, "dö i luften": { verdict: "made_up" }, "dö i sömnen": { verdict: "made_up" }, "dö i frid": { verdict: "made_up" } } };
  const out = await checkNewWordCard(fakeSupabase(), { lemma: "dö", pos: "verb", result, forms: result.forms, korp });
  const kept = out.result.collocations.map((c) => c.phrase);
  const open = out.sense.detail.open_items || [];
  assert.ok(kept.includes("dö på fläcken"), "both checks wrong, the corpus has it: kept");
  assert.ok(open.some((o) => o.kind === "collocation_disputed" && o.text === "dö på fläcken"));
  assert.ok(kept.includes("dö med ögonen") && open.some((o) => o.kind === "collocation_unattested" && o.text === "dö med ögonen"), "both checks keep it, the corpus never has it: open");
  assert.ok(!kept.includes("dö i luften"), "both checks and the corpus: made up");
  assert.ok(!kept.includes("dö i sömnen"), "Korp didn't answer: the two checks decide as before");
  assert.ok(kept.includes("dö i frid") && open.some((o) => o.kind === "collocation_disputed" && o.text === "dö i frid"), "free, and 'made up' against the corpus: kept, open");
  assert.equal(out.sense.status, "present");
});

test("3: a related word only parsed as a compound, called no word by a check, goes only when the corpus never has it", async () => {
  const { checkNewWordCard } = await import("../server-language-checks.mjs");
  const corpus = { "fartgräns": { total: 3, perCorpus: { GP2012: 3 }, match: "lemma" }, "sårbarhetsskydd": { total: 0, perCorpus: {}, match: "lemma" } };
  const korp = async (p) => { if (!(p in corpus)) throw new Error("no answer"); return corpus[p]; };
  const result = { ...doCard(), related: [
    { word: "fartgräns", zh: "限速", en: "speed limit", pos: "noun" },
    { word: "sårbarhetsskydd", zh: "x", en: "x", pos: "noun" },
    { word: "dödsskydd", zh: "x", en: "x", pos: "noun" },
  ] };
  check = okCheck({ related: { "fartgräns": { verdict: "not_a_word" }, "sårbarhetsskydd": { verdict: "not_a_word" }, "dödsskydd": { verdict: "not_a_word" } } });
  detail2 = null;
  const out = await checkNewWordCard(fakeSupabase(), { lemma: "dö", pos: "verb", result, forms: result.forms, korp });
  const kept = out.result.related.map((r) => r.word);
  assert.ok(kept.includes("fartgräns"), "the corpus has it: kept (open)");
  assert.ok(!kept.includes("sårbarhetsskydd"), "no dictionary, a check and the corpus: dropped");
  assert.ok(kept.includes("dödsskydd"), "Korp didn't answer: nothing decided");
  assert.deepEqual(out.sense.detail.dropped_related, [{ word: "sårbarhetsskydd", reason: "not_a_word_unattested" }]);
});

test("3: a predicative adjective that doesn't agree with its subject (agreementSlip)", async () => {
  const { agreementSlip } = await import("../server-language-checks.mjs");
  const forms = [{ type: "neuter_form", value: "säkert" }, { type: "plural_form", value: "säkra" }];
  assert.deepEqual(await agreementSlip(null, "Barnet känner sig säker med läraren.", { lemma: "säker", forms }), { subject: "barnet", said: "säker", want: "säkert" });
  assert.equal((await agreementSlip(null, "Något är säker om det är skyddat från fara.", { lemma: "säker", forms }))?.want, "säkert");
  assert.equal((await agreementSlip(null, "Vi känner oss säker här.", { lemma: "säker", forms })), null);   // only "sig" readings are judged
  assert.equal((await agreementSlip(null, "De är inte säker på svaret.", { lemma: "säker", forms }))?.want, "säkra");
  assert.equal(await agreementSlip(null, "Hon känner sig säker med läraren.", { lemma: "säker", forms }), null);
  assert.equal(await agreementSlip(null, "Barnet känner sig säkert hos sin mamma.", { lemma: "säker", forms }), null);
  assert.equal(await agreementSlip(null, "Barnen är säkra i bilen.", { lemma: "säker", forms }), null);
});

test("3: a noun's homographs of the other gender, as Lexin keeps them apart (lag)", async () => {
  const { homographEquivalents, referenceEntries } = await import("../server-references.mjs");
  const refs = await referenceEntries(null, "lag");
  const h = homographEquivalents(refs, [{ type: "singular_indefinite", value: "ett lag" }, { type: "singular_definite", value: "laget" }]);
  if (!h) return;   // the local Lexin index lacks lag
  assert.equal(h.gender, "n");
  assert.ok(h.own.some((e) => /team/i.test(e.text)));
  assert.ok(h.other.some((e) => /law/i.test(e.text)) && !h.own.some((e) => /law/i.test(e.text)));
  assert.equal(homographEquivalents(refs, [{ type: "singular_indefinite", value: "en bil" }].slice(0, 0)), null);
});

test("4: a multi-word request keeps its own words as the headword, a particle verb is a verb (gå ut på)", async () => {
  for (const [got, gotPos] of [["gå ut på någon/något", "other"], ["gå ut på något", "verb"], ["gå ut på", "other"]]) {
    const d = fakeSupabase();
    card = baseCard({ lemma: got, pos: gotPos, meaning_zh: "目的是；内容是", meaning_en: "to be about; to aim at", swedish_explanation: "handla om, syfta till",
      examples: [{ swedish: "Spelet går ut på att samla poäng.", zh: "这个游戏的目的是收集分数。", en: "The game is about collecting points." }] });
    const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "gå ut på", nativeLanguage: "zh", chargeQuota: false });
    const row = d.tables.learning_objects.find((r) => r.id === entryId);
    assert.equal(row.swedish, "gå ut på", got);
    // Saved as an expression (part_of_speech "other", as every multi-word entry), with forms as a verb's (gå: group 4).
    assert.equal(formsOf(d, entryId).verb_group, "4", `${got}: forms as a verb's`);
  }
  // Its valency written out with brackets and prepositions is the frame, not the headword, and
  // the right examples stay (g3 2026-11-09: "hålla med (någon) om något" lost both).
  for (const got of ["hålla med (någon) om något", "hålla med någon om något"]) {
    const d = fakeSupabase();
    card = baseCard({ lemma: got, pos: "verb", meaning_zh: "同意", meaning_en: "agree", swedish_explanation: "tycka samma sak",
      examples: [{ swedish: "Jag håller med dig om att det är en bra idé.", zh: "我同意你的看法，这是个好主意。", en: "I agree with you that it is a good idea." },
        { swedish: "Han höll med föregående talare.", zh: "他同意前一位发言人的看法。", en: "He agreed with the previous speaker." }] });
    const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "hålla med", nativeLanguage: "zh", chargeQuota: false });
    assert.equal(d.tables.learning_objects.find((r) => r.id === entryId).swedish, "hålla med", got);
    assert.equal(examplesOf(d, entryId).length, 2, `${got}: both examples kept`);
  }
  // A placeholder the request has stays; an idiom is not made a verb.
  const d = fakeSupabase();
  card = baseCard({ lemma: "ta tjuren vid hornen", pos: "other", meaning_zh: "迎难而上", meaning_en: "take the bull by the horns", swedish_explanation: "ta itu med något svårt", examples: [] });
  const { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "ta tjuren vid hornen", nativeLanguage: "zh", chargeQuota: false });
  assert.equal(d.tables.learning_objects.find((r) => r.id === entryId).swedish, "ta tjuren vid hornen");
});

test("knowledge v2: with MULTIWORD_SEARCH_CLASSIFY=on a searched combination is public only when a dictionary lists it", async () => {
  process.env.MULTIWORD_SEARCH_CLASSIFY = "on";
  try {
    const ex = (s) => [{ swedish: s, zh: "x", en: "x" }];
    let d = fakeSupabase();
    card = baseCard({ lemma: "växande intresse", pos: "other", meaning_zh: "日益增长的兴趣", meaning_en: "growing interest", swedish_explanation: "ett intresse som blir större", examples: ex("Det finns ett växande intresse för svensk mat.") });
    let { entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "växande intresse", nativeLanguage: "zh", chargeQuota: false });
    assert.equal(d.tables.learning_objects.find((r) => r.id === entryId).status, "draft", "not listed: written for the reader, kept out of the library");
    d = fakeSupabase();
    card = baseCard({ lemma: "ta det lugnt", pos: "other", meaning_zh: "放松", meaning_en: "take it easy", swedish_explanation: "inte stressa", examples: ex("Ta det lugnt, vi hinner.") });
    ({ entryId } = await generateWordEntry({ supabaseAdmin: d, userId: "u", word: "ta det lugnt", nativeLanguage: "zh", chargeQuota: false }));
    const row = d.tables.learning_objects.find((r) => r.id === entryId);
    assert.equal(row.status, "ai_generated", "a Lexin idiom is public");
    assert.equal(row.object_type, "expression");
  } finally { delete process.env.MULTIWORD_SEARCH_CLASSIFY; }
});

test("MULTIWORD_SEARCH_CLASSIFY=on before deploy: no duplicate, no skipped check, existing entries reused", async () => {
  const { resolveExpressionEntries } = await import("../server-reading.mjs");
  process.env.MULTIWORD_SEARCH_CLASSIFY = "on";
  try {
    const ex = [{ swedish: "Det finns ett växande intresse för svensk mat.", zh: "x", en: "x" }];
    const d = fakeSupabase();
    card = baseCard({ lemma: "växande intresse", pos: "other", meaning_zh: "日益增长的兴趣", meaning_en: "growing interest", swedish_explanation: "ett intresse som blir större", examples: ex });
    const first = await generateWordEntry({ supabaseAdmin: d, userId: "u1", word: "växande intresse", nativeLanguage: "zh", chargeQuota: false });
    assert.equal(checkPrompts.length > 0, true, "the word-card checks ran as for any card");
    const calls = prompts.length;
    // Another reader searching it (any spelling of it) gets the same draft, no second card, no AI.
    const again = await generateWordEntry({ supabaseAdmin: d, userId: "u2", word: "växande intresse", nativeLanguage: "zh", chargeQuota: false });
    assert.equal(again.entryId, first.entryId);
    assert.equal(again.created, false);
    assert.equal(prompts.length, calls);
    // A reading meeting it later links that draft (pending) rather than making another.
    const [r] = await resolveExpressionEntries(d, [{ expression_text: "växande intresse", meaning_zh: "x", source_sentence: "Ett växande intresse." }],
      { objectType: "phrase", category: "common_collocation", nativeLanguage: "zh", classify: async () => ({ cls: "F1", placement: "headword_usage", reasons: [] }) });
    assert.equal(r.expression_id, first.entryId);
    assert.equal(d.tables.learning_objects.filter((o) => o.object_type !== "word").length, 1);
    // An existing public phrase is reused as before, never reclassified or demoted.
    const p = fakeSupabase({ learning_objects: [{ id: "p1", swedish: "ta det lugnt", part_of_speech: "other", object_type: "expression", status: "human_reviewed", match_key: "ta det lugnt" }],
      learning_object_translations: [{ learning_object_id: "p1", native_language: "zh", meaning: "放松" }] });
    const before = prompts.length;
    const reused = await generateWordEntry({ supabaseAdmin: p, userId: "u3", word: "tar det lugnt", nativeLanguage: "zh", chargeQuota: false });
    assert.equal(reused.entryId, "p1");
    assert.equal(prompts.length, before);
    assert.equal(p.tables.learning_objects[0].status, "human_reviewed");
  } finally { delete process.env.MULTIWORD_SEARCH_CLASSIFY; }
});
