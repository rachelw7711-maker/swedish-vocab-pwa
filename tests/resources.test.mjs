// Shared-resource dedup, normalisation and SALDO checks (2026-10-31).
//   node --test tests/
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { useSaldoFiles, lemmatize, saldoEntries, cardFieldsFromSaldo, compareWithSaldo } from "../server-lexicon.mjs";
import { expressionMatchKey, normalizeText, resolveWord, findExistingExpression, requiredFields, recordEntryStatus, markDependentsForRecheck, completeNounForms } from "../server-resources.mjs";
import { compoundRows } from "../server-lexicon.mjs";
import { fakeSupabase } from "./fake-supabase.mjs";

before(async () => { await useSaldoFiles(); });

test("SALDO: inflected forms lead to their lemma", async () => {
  const hits = await lemmatize(null, "utvecklade");
  assert.ok(hits.some((h) => h.lemma === "utveckla" && h.pos === "verb"));
  assert.ok((await lemmatize(null, "husen")).some((h) => h.lemma === "hus" && h.pos === "noun"));
});

test("SALDO: part of speech keeps homographs apart", async () => {
  assert.equal((await saldoEntries(null, "fast", "conjunction")).length, 1);
  assert.equal((await saldoEntries(null, "fast", "adjective")).length, 1);
  assert.equal((await saldoEntries(null, "fast", "noun")).length, 0);
});

test("SALDO: card fields — groups, gender, countability, participles", async () => {
  const f = async (w, pos) => cardFieldsFromSaldo((await saldoEntries(null, w, pos))[0], pos);
  assert.equal((await f("köpa", "verb")).forms.verb_group, "2b");
  assert.equal((await f("ringa", "verb")).forms.verb_group, "2a");
  assert.equal((await f("skriva", "verb")).forms.verb_group, "4");
  assert.equal((await f("skriva", "verb")).forms.perfect_participle, "skriven");
  assert.equal((await f("bil", "noun")).forms.declension_group, "2");
  assert.equal((await f("hus", "noun")).forms.declension_group, "5");
  assert.equal((await f("äpple", "noun")).forms.declension_group, "4");
  assert.equal((await f("bil", "noun")).forms.genus, "en");
  assert.equal((await f("allemansrätt", "noun")).countability, "uncountable");
});

test("SALDO comparison: spelling variants agree, real errors are flagged", async () => {
  const rows = await saldoEntries(null, "bil", "noun");
  const ok = compareWithSaldo({ pos: "noun", forms: { genus: "utrum", singular_indefinite: "en bil", plural_indefinite: "bilar", declension_group: "grupp 2" } }, rows).fields;
  assert.equal(ok["form:genus"].status, "verified");
  assert.equal(ok["form:singular_indefinite"].status, "verified");
  assert.equal(ok["form:declension_group"].status, "verified");
  assert.equal(ok["form:plural_definite"].status, "missing");
  const bad = compareWithSaldo({ pos: "noun", forms: { genus: "ett", declension_group: "1" } }, rows).fields;
  assert.equal(bad["form:genus"].status, "mismatch");
  assert.equal(bad["form:declension_group"].status, "mismatch");
  const adj = compareWithSaldo({ pos: "adjective", forms: { comparative: "mer intressant" } }, await saldoEntries(null, "intressant", "adjective")).fields;
  assert.equal(adj["form:comparative"].status, "present");   // SALDO can't decide mer/mest
  assert.deepEqual(compareWithSaldo({ pos: "noun", forms: {} }, []), { found: false, fields: {} });  // unknown ≠ wrong
});

test("SALDO comparison: homographs that disagree give no fill value", async () => {
  // "vara" (be: varit) and "vara" (last: varat) are both verbs.
  const rows = await saldoEntries(null, "vara", "verb");
  assert.ok(rows.length >= 2);
  const { fields } = compareWithSaldo({ pos: "verb", forms: {} }, rows);
  assert.equal(fields["form:supinum"].status, "missing");
  assert.equal(fields["form:supinum"].ambiguous, true);
  // One entry only: the missing form has a single reference.
  const { fields: one } = compareWithSaldo({ pos: "verb", forms: {} }, await saldoEntries(null, "springa", "verb"));
  assert.equal(one["form:supinum"].reference, "sprungit");
  assert.ok(!one["form:supinum"].ambiguous);
});

test("expression keys unify inflection, placeholders and pronouns — not meaning", async () => {
  const k = (t) => expressionMatchKey(null, t);
  assert.equal(await k("tar hand om någon"), await k("ta hand om ngn"));
  assert.equal(await k("att ta sig an något"), await k("ta sig an ngt"));
  assert.equal(await k("göra mitt bästa"), await k("göra sitt bästa"));
  assert.equal(await k("ta hand om (någon)"), "ta hand om ngn");
  assert.notEqual(await k("ta hand om"), await k("ta vara på"));
  assert.notEqual(await k("hålla med"), await k("hålla på"));
  assert.notEqual(await k("Det är fint!"), await k("Det är fint?"));   // question ≠ statement
  assert.notEqual(await k("Kom igen!"), await k("komma igen"));         // sentence keeps its verb form
  assert.equal(await k("Det låter bra."), await k("Det låter bra!"));
  assert.equal(await k("stannar hemma"), await k("stanna hemma"));
});

function lexiconDb() {
  return fakeSupabase({
    learning_objects: [
      { id: "w-utveckla", swedish: "utveckla", part_of_speech: "verb", object_type: "word", status: "published" },
      { id: "w-fast-adj", swedish: "fast", part_of_speech: "adjective", object_type: "word", status: "published" },
      { id: "x-tahand", swedish: "ta hand om någon", part_of_speech: "other", object_type: "expression", status: "human_reviewed", match_key: "ta hand om ngn" },
      { id: "p-old", swedish: "lägga märke till", part_of_speech: "other", object_type: "phrase", status: "ai_generated", match_key: null },
    ],
  });
}

test("words: inflections reuse the lemma entry, other parts of speech don't", async () => {
  const db = lexiconDb();
  assert.equal((await resolveWord(db, "utvecklade")).entryId, "w-utveckla");
  assert.equal((await resolveWord(db, "utvecklar", "verb")).entryId, "w-utveckla");
  assert.equal((await resolveWord(db, "fast", "adjective")).entryId, "w-fast-adj");
  const conj = await resolveWord(db, "fast", "conjunction");
  assert.equal(conj.entryId, null);
  assert.equal(conj.lemma, "fast");
  const fresh = await resolveWord(db, "jäsningen", "noun");
  assert.equal(fresh.entryId, null);
  assert.equal(fresh.lemma, "jäsning");     // a new entry gets the lemma, never the inflected form
  assert.ok(fresh.saldo);
});

test("words: a text that is a headword itself is never another word's form (visa, not visum's plural)", async () => {
  const db = fakeSupabase({ learning_objects: [{ id: "w-visum", swedish: "visum", part_of_speech: "noun", object_type: "word", status: "human_reviewed" }] });
  const song = await resolveWord(db, "visa", "noun");
  assert.equal(song.entryId, null);
  assert.equal(song.lemma, "visa");
  assert.equal((await resolveWord(db, "visumet", "noun")).entryId, "w-visum");   // a real form still reuses
});

test("phrases and expressions: found across modules by key or plain spelling", async () => {
  const db = lexiconDb();
  assert.equal((await findExistingExpression(db, "tar hand om ngn"))?.id, "x-tahand");
  assert.equal((await findExistingExpression(db, "Lägga märke till"))?.id, "p-old");
  assert.equal(await findExistingExpression(db, "ta vara på"), null);
});

test("required fields and recorded status", async () => {
  assert.deepEqual(requiredFields("phrase", "other"), ["meaning_zh", "meaning_en", "example", "swedish_explanation"]);
  assert.ok(requiredFields("word", "noun").includes("cefr_level"));
  const db = fakeSupabase();
  await recordEntryStatus(db, "id1", { type: "word", pos: "noun", forms: { plural_indefinite: "bilar" }, meaning_zh: true, example: false, cefr_level: true },
    { saldoRows: await saldoEntries(null, "bil", "noun") });
  const status = Object.fromEntries(db.tables.resource_field_status.map((r) => [r.field, r.status]));
  assert.equal(status["form:plural_indefinite"], "verified");
  assert.equal(status["form:plural_definite"], "missing");
  assert.equal(status.example, "missing");
  assert.equal(status.meaning_zh, "present");
  assert.ok(db.tables.learning_object_sources.some((s) => s.source_id === "saldo-morphology-2017"));
  assert.ok(db.calls.some((c) => c.rpc === "refresh_resource_summary"));
});

test("an uncountable noun has no missing plural", async () => {
  const db = fakeSupabase();
  await recordEntryStatus(db, "id2", { type: "word", pos: "noun", forms: {}, countability: "uncountable", meaning_zh: true, example: true, cefr_level: true, swedish_explanation: true },
    { saldoRows: await saldoEntries(null, "allemansrätt", "noun") });
  const status = Object.fromEntries(db.tables.resource_field_status.map((r) => [r.field, r.status]));
  assert.equal(status["form:plural_indefinite"], "not_applicable");
});

test("normalizeText", () => {
  assert.equal(normalizeText("  Hålla  ögonen  öppna! "), "hålla ögonen öppna");
});

test("SALDO comparison: an irregular word may be called irregular, group 2 covers 2a/2b", async () => {
  const cmp = async (w, pos, forms) => compareWithSaldo({ pos, forms }, await saldoEntries(null, w, pos)).fields;
  assert.equal((await cmp("göra", "verb", { verb_group: "irregular" }))["form:verb_group"].status, "verified");
  assert.equal((await cmp("lägga", "verb", { verb_group: "4" }))["form:verb_group"].status, "verified");
  assert.equal((await cmp("köpa", "verb", { verb_group: "4" }))["form:verb_group"].status, "mismatch");
  assert.equal((await cmp("ha", "verb", { verb_group: "4" }))["form:verb_group"].status, "verified", "haft");
  assert.equal((await cmp("skilja", "verb", { verb_group: "4" }))["form:verb_group"].status, "mismatch", "skilde, skilt: 2a");
  assert.equal((await cmp("köpa", "verb", { verb_group: "2" }))["form:verb_group"].status, "verified");
  assert.equal((await cmp("svärfar", "noun", { declension_group: "irregular" }))["form:declension_group"].status, "verified");
  assert.equal((await cmp("bil", "noun", { declension_group: "irregular" }))["form:declension_group"].status, "mismatch");
  assert.equal((await cmp("fågel", "noun", { declension_group: "irregular" }))["form:declension_group"].status, "mismatch");
  // Filling an empty group takes SALDO's number, never "irregular".
  assert.equal((await cmp("göra", "verb", {}))["form:verb_group"].reference, "2a");
});

test("a changed core fact sends each language's dependent fields back to a re-check", async () => {
  const db = fakeSupabase({ resource_field_status: [
    { learning_object_id: "n1", field: "grammar_note_zh", status: "verified" },
    { learning_object_id: "n1", field: "grammar_note_en", status: "missing" },
    { learning_object_id: "n1", field: "meaning_zh", status: "verified" },
  ] });
  const rows = await markDependentsForRecheck(db, "n1", ["group"], { reason: "group 1→2" });
  assert.deepEqual(rows.map((r) => r.field), ["grammar_note_zh"], "missing stays missing");
  const st = Object.fromEntries(db.tables.resource_field_status.map((r) => [r.field, r.status]));
  assert.equal(st.grammar_note_zh, "present");
  assert.equal(st.meaning_zh, "verified", "a group change says nothing about the meaning");
  const pos = await markDependentsForRecheck(db, "n1", ["pos"]);
  assert.deepEqual(pos.map((r) => r.field).sort(), ["example_en", "example_zh", "grammar_note_zh", "meaning_en", "meaning_zh"]);
});

test("a new countable noun gets all four forms from the compound analysis or Lexin, never made up", async () => {
  const [row] = (await compoundRows(null, "yogastudio", "noun")).filter((r) => !r.compound.ambiguous);
  assert.ok(row, "SALDO splits yogastudio");
  const forms = [{ type: "singular_indefinite", value: "yogastudio" }, { type: "singular_definite", value: "yogastudion" }];
  const added = completeNounForms(forms, { countability: "countable", compoundRow: row });
  assert.deepEqual(added.map((a) => [a.type, a.value, a.source]), [["plural_indefinite", "yogastudior", "saldo-compound"], ["plural_definite", "yogastudiorna", "saldo-compound"]]);
  // same as the singular is a real plural (hus – husen), from Lexin
  const hus = [{ type: "singular_indefinite", value: "lekhus" }];
  completeNounForms(hus, { countability: "countable", lexinNounForms: { singular_definite: "lekhuset", plural_indefinite: "lekhus", plural_definite: "lekhusen" } });
  assert.deepEqual(hus.map((f) => f.value), ["lekhus", "lekhuset", "lekhus", "lekhusen"]);
  // uncountable: no plural asked for; nothing to go on: stays missing
  const mjolk = [{ type: "singular_indefinite", value: "x" }];
  assert.deepEqual(completeNounForms(mjolk, { countability: "uncountable", lexinNounForms: { singular_definite: "x-en", plural_indefinite: "x-ar" } }).map((a) => a.type), ["singular_definite"]);
  assert.deepEqual(completeNounForms([{ type: "singular_indefinite", value: "y" }], { countability: "countable" }), []);
});

test("a plural-only noun (SALDO nn_rp) gets no gender or group", async () => {
  const [row] = await saldoEntries(null, "kläder", "noun");
  const f = cardFieldsFromSaldo(row, "noun").forms;
  assert.equal(f.genus, "plurale_tantum");
  assert.equal(f.declension_group, "plurale_tantum");
  assert.equal(f.plural_definite, "kläderna");
  assert.equal(f.singular_indefinite, undefined);
});

test("match key: a leading participle stays (R9: växande intresse, liknande system), a verb form is lemmatised", async () => {
  assert.equal(await expressionMatchKey(null, "växande intresse"), "växande intresse");
  assert.equal(await expressionMatchKey(null, "liknande system"), "liknande system");
  assert.equal(await expressionMatchKey(null, "stängda dörrar"), "stängda dörrar");
  assert.equal(await expressionMatchKey(null, "stannar hemma"), "stanna hemma");
  assert.equal(await expressionMatchKey(null, "tar hand om någon"), "ta hand om ngn");
  assert.equal(await expressionMatchKey(null, "har stängt dörren"), "ha stängt dörren");
});
