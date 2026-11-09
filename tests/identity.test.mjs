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
