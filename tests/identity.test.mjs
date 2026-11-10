// R6 (knowledge v2, 2026-11-09): which word a search without a part of speech means.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { useSaldoFiles } from "../server-lexicon.mjs";
import { useReferenceFiles } from "../server-references.mjs";
import { identityCandidates } from "../server-native.mjs";
import { fakeSupabase } from "./fake-supabase.mjs";

before(async () => { await useSaldoFiles(); await useReferenceFiles(); });

test("identity: several plausible words are all offered; one is no choice", async () => {
  const d = fakeSupabase({ learning_objects: [{ id: "w-fast", swedish: "fast", part_of_speech: "adjective", object_type: "word", status: "published" }] });
  const visa = await identityCandidates(d, "visa");
  assert.deepEqual(visa.map((c) => c.pos).sort(), ["noun", "verb"]);
  const fast = await identityCandidates(d, "fast");
  assert.equal(fast.find((c) => c.pos === "adjective").entryId, "w-fast");
  assert.ok(!fast.some((c) => c.pos === "adverb"), "a reading Lexin doesn't have and no entry uses is left out");
  assert.equal((await identityCandidates(d, "bil")).length, 1);
  // An inflected form reaches its lemma, and among homographs its own word.
  const laget = await identityCandidates(d, "laget");
  assert.equal(laget.length, 1);
  assert.match(laget[0].gloss, /grupp personer/);
  assert.doesNotMatch(laget[0].gloss, /rättsregel/);
  assert.deepEqual(await identityCandidates(d, "ta hand om"), []);
});

// Round G, decision 6: one spelling and part of speech can be two words (regel: regler "rule",
// reglar "bolt"). The lexeme key comes from the card's own forms; reuse never crosses words.
test("homographs: the lexeme key and reuse follow the card's forms", async () => {
  const { lexemeKeyOf, lexemeKeyOfForm } = await import("../server-lexicon.mjs");
  const { resolveWord } = await import("../server-resources.mjs");
  assert.equal(await lexemeKeyOf(null, "regel", "noun", ["regel", "regeln", "regler", "reglerna"]), "regel..nn.1");
  assert.equal(await lexemeKeyOf(null, "regel", "noun", ["reglar", "reglarna"]), "regel..nn.2");
  assert.equal(await lexemeKeyOf(null, "regel", "noun", ["regeln"]), null, "a shared form decides nothing");
  assert.equal(await lexemeKeyOf(null, "hus", "noun", ["husen"]), null, "one word: no key");
  assert.equal(await lexemeKeyOfForm(null, "regel", "noun", "reglar"), "regel..nn.2");
  const d = fakeSupabase({
    learning_objects: [{ id: "w-regel", swedish: "regel", part_of_speech: "noun", object_type: "word", status: "published", lexeme_key: null }],
    word_forms: [{ learning_object_id: "w-regel", form_type: "plural_indefinite", form_value: "regler" }],
  });
  // The rule card (unkeyed, its forms say nn.1) is the rule; it is not the bolt.
  assert.equal((await resolveWord(d, "regel", "noun", "regel..nn.1")).entryId, "w-regel");
  assert.equal((await resolveWord(d, "regel", "noun", "regel..nn.2")).entryId, null);
  assert.equal((await resolveWord(d, "regel", "noun")).entryId, "w-regel", "without a key: as before");
  assert.equal((await resolveWord(d, "reglar")).entryId, null, "the bolt's plural does not open the rule");
  assert.equal((await resolveWord(d, "regler")).entryId, "w-regel");
});

test("homographs: only conflicting forms make two words", async () => {
  const { lexemeKeyOf } = await import("../server-lexicon.mjs");
  // A participle or comparison one SALDO row lacks is not another word.
  assert.equal(await lexemeKeyOf(null, "lukta", "verb", ["luktar", "luktad"]), null);
  assert.equal(await lexemeKeyOf(null, "fyrkantig", "adjective", ["fyrkantigare"]), null);
  // fot: the unit's plural "fot" is also the headword, so only fötter decides.
  assert.equal(await lexemeKeyOf(null, "fot", "noun", ["fot", "foten", "fötter", "fötterna"]), "fot..nn.1");
  assert.equal(await lexemeKeyOf(null, "bal", "noun", ["baler"]), "bal..nn.2");
});
