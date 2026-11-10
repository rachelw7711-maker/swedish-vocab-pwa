// Round G, decision 7: Folkets lexikon is auxiliary evidence — read from the database only when a
// caller asks for it, so the generation's and the checks' gates stay Lexin's (no files loaded here).
import { test } from "node:test";
import assert from "node:assert/strict";
import { referenceEntries, referenceFilesLoaded, FOLKETS_SOURCE_ID } from "../server-references.mjs";
import { fakeSupabase } from "./fake-supabase.mjs";

test("folkets: read from the database only when asked for", async () => {
  assert.equal(referenceFilesLoaded(), false);
  const d = fakeSupabase({ reference_entries: [
    { source: "lexin-sv-en", headword: "afton", data: { pos: "noun", english: ["evening"] } },
    { source: FOLKETS_SOURCE_ID, headword: "afton", data: { pos: "noun", english: ["eve"] } },
  ] });
  const plain = await referenceEntries(d, "afton");
  assert.equal(plain.lexin_en.length, 1);
  assert.equal(plain.folkets.length, 0);
  assert.equal((await referenceEntries(d, "afton", { aux: true })).folkets.length, 1);
});
