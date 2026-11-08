// The grammar note against SALDO (server-grammar-consistency.mjs, 2026-11-08): sjöfart's note
// gave a plural the table (and SALDO, and Lexin) doesn't have.
import { test, before } from "node:test";
import assert from "node:assert/strict";
const { useSaldoFiles } = await import("../server-lexicon.mjs");
const { useReferenceFiles, referenceEntries } = await import("../server-references.mjs");
const { grammarNoteConflicts, plainGrammarNote } = await import("../server-grammar-consistency.mjs");
before(async () => { await useSaldoFiles(); await useReferenceFiles(); });
const kinds = async (lemma, pos, note) => (await grammarNoteConflicts(null, { lemma, pos, note, refs: await referenceEntries(null, lemma) })).map((c) => c.kind);

test("a plural, a group or a gender SALDO doesn't have is a conflict", async () => {
  assert.deepEqual(await kinds("sjöfart", "noun", "这是一个 en-词，属于第3变格组：单数定式加 -en 成 sjöfarten，复数不定式加 -er 成 sjöfarter，复数定式加 -na 成 sjöfarterna。"), ["plural_for_no_plural", "unknown_form"]);
  assert.deepEqual(await kinds("mjölk", "noun", "这是第2变格组的 utrum 名词，单数定式在词尾加 -en，复数不定式加 -er。"), ["plural_for_no_plural"]);
  assert.deepEqual(await kinds("hus", "noun", "en-词，第2变格组：复数 husar。"), ["group", "gender", "unknown_form"]);
  assert.deepEqual(await kinds("springa", "verb", "springa 是第1组动词：springade。"), ["group", "unknown_form"]);
});

test("SALDO alone without a plural is not enough: Lexin decides, else a reviewer", async () => {
  // intrång: SALDO nn_0n, but Lexin gives the plural intrång, intrången.
  assert.deepEqual(await kinds("intrång", "noun", "这是第5变格的中性名词，单数不定式与复数不定式同形为 intrång，复数定式加 -en 变为 intrången。"), ["plural_unconfirmed"]);
  // design: both say no plural.
  assert.deepEqual(await kinds("design", "noun", "这是一个第3变格的 en 词，复数通常加 -er 变成 designer。"), ["plural_for_no_plural", "unknown_form"]);
});

test("right notes, special plurals explained, homographs and irregular nouns pass", async () => {
  for (const [w, p, n] of [
    ["bok", "noun", "这是第3变格的 en 名词，复数通常加 -er，并在词干中发生元音变化；定单数为 bok-en，定复数为 böcker-na。"],
    ["fot", "noun", "en-词，第3变格组：单数定式 foten，复数 fötter，复数定式 fötterna。"],
    ["kaffe", "noun", "ett-词，第4变格组：单数定式 kaffet，复数 kaffen，复数定式 kaffena，表示不可数意义时不用复数。"],
    ["lärare", "noun", "这是第5变格的 en 名词，单数和复数不定式都为 lärare，单数定式加 -n 成 läraren，复数定式加 -na 成 lärarna。"],
    ["vatten", "noun", "这是一个中性名词，属于第5变格组；定式单数 vattnet，定式复数 vattnen。"],
    ["pengar", "noun", "只有复数形式（plurale tantum）：复数 pengar，复数定式 pengarna。"],
    ["öga", "noun", "ett-词，复数 ögon，复数定式 ögonen。"],
    ["springa", "verb", "springa 是第4组强变化动词：sprang, sprungit。"],
    ["mjölk", "noun", "en-词，通常不可数，没有复数；说不同种类时偶尔用 mjölker。"],
  ]) assert.deepEqual(await kinds(w, p, n), [], w);
});

test("a note written again from SALDO: no plural for sjöfart; none for a homograph", async () => {
  assert.equal((await plainGrammarNote(null, { lemma: "sjöfart", pos: "noun", refs: await referenceEntries(null, "sjöfart") })).zh, "en-词，通常不可数，只用单数：单数定式 sjöfarten，没有复数形式。");
  assert.match((await plainGrammarNote(null, { lemma: "hus", pos: "noun" })).en, /declension group 5: definite singular huset, plural hus, definite plural husen/);
  assert.equal(await plainGrammarNote(null, { lemma: "bok", pos: "noun" }), null);
  assert.equal(await plainGrammarNote(null, { lemma: "sjöfart", pos: "noun" }), null, "no plural only with Lexin agreeing");
});
