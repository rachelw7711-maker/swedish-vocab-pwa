// Shared-resource dedup, normalisation and SALDO checks (2026-10-31).
//   node --test tests/
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { useSaldoFiles, lemmatize, saldoEntries, cardFieldsFromSaldo, compareWithSaldo } from "../server-lexicon.mjs";
import { expressionMatchKey, normalizeText, resolveWord, findExistingExpression, requiredFields, recordEntryStatus } from "../server-resources.mjs";
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
