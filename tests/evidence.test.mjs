// Evidence rules of knowledge v2 (2026-11-09): grading, strict dictionary matching, the three
// questions about a multi-word combination, one part-of-speech rule, reuse, historical regrading.
//   node --test tests/evidence.test.mjs
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { useSaldoFiles } from "../server-lexicon.mjs";
import { useReferenceFiles, referenceEntries } from "../server-references.mjs";
import { evidence, gradeItem, mayRemove, phraseInListing, phraseSlots, lexinListings, dictionaryEvidenceForPhrase, classifyMultiword, associationOf, posDecision, reusePolicy, regradeLegacySense, isExplanatoryPart, senseCoverage, removalDecision } from "../server-evidence.mjs";

before(async () => { await useSaldoFiles(); await useReferenceFiles(); });

test("grade: nothing found or a failed lookup is never a refutation", () => {
  assert.equal(gradeItem([evidence("dictionary_listing", "not_found"), evidence("korp_attestation", "lookup_failed")]).grade, "unverified");
  assert.equal(mayRemove([evidence("dictionary_listing", "not_found"), evidence("korp_attestation", "not_found")]), false);
});

test("grade: AI answers and word overlap never verify on their own", () => {
  assert.equal(gradeItem([evidence("ai_two_agree", "supports"), evidence("candidate_dictionary_overlap", "supports")]).grade, "ai_consistent");
  assert.equal(gradeItem([evidence("legacy_ai", "supports")]).grade, "ai_consistent");
  assert.equal(gradeItem([evidence("legacy_ai", "supports"), evidence("dictionary_sense_link", "supports")]).grade, "verified");
});

test("grade: a dictionary outweighs two AI checks; one AI doubt removes nothing", () => {
  const listed = [evidence("dictionary_listing", "supports"), evidence("ai_two_agree", "refutes")];
  assert.equal(gradeItem(listed).grade, "disputed");
  assert.equal(mayRemove(listed), false);
  assert.equal(gradeItem([evidence("ai_one", "refutes")]).grade, "unverified");
  assert.equal(mayRemove([evidence("ai_one", "refutes")]), false);
  // Two AI checks against no evidence at all: proven wrong in the plan's sense.
  assert.equal(mayRemove([evidence("ai_two_agree", "refutes"), evidence("dictionary_listing", "not_found")]), true);
  // Corpus attestation against two AI checks: disputed, kept.
  assert.equal(gradeItem([evidence("korp_attestation", "supports"), evidence("ai_two_agree", "refutes")]).grade, "disputed");
  // A program rule (a wrong inflection) is proof.
  assert.equal(mayRemove([evidence("program", "refutes"), evidence("ai_one", "supports")]), true);
  // A human's decision overrides a dictionary's; a dictionary is protected against anything weaker.
  assert.equal(gradeItem([evidence("dictionary_original", "supports"), evidence("human", "refutes")]).grade, "refuted");
  assert.equal(gradeItem([evidence("dictionary_original", "supports")]).protected, true);
});

test("strict listing: in order, every word in one of its forms; slots only for slots", async () => {
  const slots = await phraseSlots(null, "drömma om något");
  assert.equal(phraseInListing(slots, "ngn drömmer om ngn/ngt"), true);
  assert.equal(phraseInListing(await phraseSlots(null, "vara beroende av något"), "ngn/ngt är beroende (av ngn/ngt)"), true);
  // A valency pattern does not list a concrete object.
  assert.equal(phraseInListing(await phraseSlots(null, "tända eld"), "ngn tänder ngt"), false);
  // Word order matters: "om drömma" is not listed.
  assert.equal(phraseInListing(await phraseSlots(null, "om drömma"), "ngn drömmer om ngn/ngt"), false);
  // An idiom in Lexin's inflected writing.
  assert.equal(phraseInListing(await phraseSlots(null, "ha hand om något"), "har hand om något"), true);
});

test("strict listing: an example sentence is existence, never a fixed-expression listing", async () => {
  const refs = await referenceEntries(null, "beslut");
  const hits = lexinListings(refs, await phraseSlots(null, "fatta beslut"), { pos: "noun" });
  assert.ok(hits.length > 0);
  assert.ok(hits.every((h) => h.kind === "example"));
  const ev = await dictionaryEvidenceForPhrase(null, "fatta beslut", [{ lemma: "beslut", pos: "noun" }, { lemma: "fatta", pos: "verb" }]);
  assert.equal(ev.listing?.kind === "construction" || ev.listing?.kind === "idiom" || ev.listing === null, true);
  assert.ok(ev.example);
});

test("strict listing: the six withdrawn free combinations are not listed (växande intresse, liknande system …)", async () => {
  const cases = [
    ["växande intresse", [{ lemma: "intresse", pos: "noun" }, { lemma: "växa", pos: "verb" }]],
    ["liknande system", [{ lemma: "system", pos: "noun" }]],
    ["tända eldar", [{ lemma: "tända", pos: "verb" }, { lemma: "eld", pos: "noun" }]],
    ["ta flera beslut", [{ lemma: "ta", pos: "verb" }, { lemma: "beslut", pos: "noun" }]],
    ["gå ner till stranden", [{ lemma: "gå", pos: "verb" }, { lemma: "strand", pos: "noun" }]],
    ["sätta upp regler för något", [{ lemma: "sätta", pos: "verb" }, { lemma: "regel", pos: "noun" }]],
  ];
  for (const [phrase, heads] of cases) assert.equal((await dictionaryEvidenceForPhrase(null, phrase, heads)).listing, null, phrase);
});

test("strict listing: another part of speech's listing is not this word's", async () => {
  // "beroende" the noun has no construction "vara beroende av"; the adjective has.
  const refs = await referenceEntries(null, "beroende");
  const slots = await phraseSlots(null, "vara beroende av något");
  assert.equal(lexinListings(refs, slots, { pos: "noun" }).filter((h) => h.kind !== "example").length, 0);
  assert.ok(lexinListings(refs, slots, { pos: "adjective" }).some((h) => h.kind === "construction"));
});

test("multi-word: three separate questions — a free combination is not wrong", () => {
  const free = classifyMultiword({ dictionary: { listing: null, example: null }, attestation: { status: "ok", ok: true, total: 40 }, association: { status: "ok", rank: null, lmi: 0 }, ai: { verdict: "neither" } });
  assert.equal(free.cls, "F0");
  assert.equal(free.placement, "reading_only");
  assert.equal(free.authenticity, "verified");   // real Swedish, only not an entry
  assert.equal(free.retireable, true);
  const typical = classifyMultiword({ dictionary: { listing: null, example: null }, attestation: { status: "ok", ok: true, total: 300 }, association: { status: "ok", rank: 1, lmi: 2974 }, ai: { verdict: "neither" } });
  assert.equal(typical.cls, "F1");
  assert.equal(typical.placement, "headword_usage");
});

test("multi-word: missing evidence and failed lookups decide nothing", () => {
  const failed = classifyMultiword({ dictionary: { listing: null }, attestation: { status: "failed" }, association: { status: "failed" }, ai: { verdict: "neither" } });
  assert.equal(failed.cls, null);
  assert.equal(failed.retireable, false);
  assert.equal(failed.placement, "reading_only");   // no public entry, nothing removed
  const idiomNoCorpus = classifyMultiword({ dictionary: { listing: null }, attestation: { status: "ok", ok: false, total: 1 }, ai: { verdict: "idiom" } });
  assert.equal(idiomNoCorpus.review, true);
  assert.equal(idiomNoCorpus.cls, null);
  assert.equal(idiomNoCorpus.retireable, false);
});

test("multi-word: an idiom no dictionary lists is fixed on corpus attestation (sense verified later)", () => {
  const r = classifyMultiword({ dictionary: { listing: null }, attestation: { status: "ok", ok: true, total: 331 }, association: { status: "not_applicable" }, ai: { verdict: "idiom" } });
  assert.equal(r.cls, "F3");
  assert.equal(r.review, false);
  assert.equal(r.placement, "own_entry");
  // Attested but rare (under 100 hits): the AI's "idiom" alone decides nothing — review, no entry.
  const rare = classifyMultiword({ dictionary: { listing: null }, attestation: { status: "ok", ok: true, total: 69 }, association: { status: "not_applicable" }, ai: { verdict: "idiom" } });
  assert.equal(rare.cls, null);
  assert.equal(rare.review, true);
  assert.equal(rare.retireable, false);
  const listed = classifyMultiword({ dictionary: { listing: { kind: "idiom", text: "går i taket", source: "lexin_sv" } }, ai: { verdict: "idiom" } });
  assert.equal(listed.cls, "F3");
  const disputed = classifyMultiword({ dictionary: { listing: { kind: "construction", text: "ngn är beroende av ngt", source: "lexin_sv" } }, ai: { verdict: "neither" } });
  assert.equal(disputed.cls, "F2");
  assert.equal(disputed.review, true);
});

test("association: rank within one relation, one row per partner lemma", () => {
  const rel = [
    { head: "tända..vb.1", rel: "OBJ", dep: "eld..nn.2", freq: 329, mi: 2974 },
    { head: "tända..vb.1", rel: "OBJ", dep: "eld..nn.1", freq: 304, mi: 2726 },
    { head: "tända..vb.1", rel: "OBJ", dep: "ljus..nn.1", freq: 233, mi: 2000 },
    { head: "stor..av.1", rel: "AT", dep: "intresse..nn.1", freq: 907, mi: 2171 },
  ];
  assert.deepEqual(associationOf(rel, "tända", "ljus").rank, 2);
  assert.equal(associationOf(rel, "tända", "eld").rank, 1);
  assert.equal(associationOf(rel, "intresse", "stor").rank, 1);
  assert.equal(associationOf(rel, "intresse", "växande").rank, null);
  assert.equal(associationOf(null, "x", "y").status, "failed");
});

test("part of speech: one rule — oavsett is a preposition, explicit as an adverb is not rejected", () => {
  assert.deepEqual(posDecision({ pos: "adverb", references: { all: ["preposition"] } }).pos, "preposition");
  assert.equal(posDecision({ pos: "adverb", references: { all: ["preposition"] } }).status, "corrected");
  assert.equal(posDecision({ pos: "adverb", references: { all: ["adjective"] } }).status, "unconfirmed");
  assert.equal(posDecision({ pos: "verb", references: { all: ["noun"] } }).status, "rejected");
  assert.equal(posDecision({ pos: "verb", references: { all: ["noun"] }, aiSupports: true }).status, "unconfirmed");
  assert.equal(posDecision({ pos: "noun", references: { all: [] } }).status, "unconfirmed");
  assert.equal(posDecision({ pos: "noun", references: { all: ["noun", "verb"] } }).status, "confirmed");   // dricka
});

test("reuse: a draft is linked as pending, a retired entry never reused", () => {
  assert.deepEqual(reusePolicy({ status: "draft" }), { reuse: "pending", recheck: false, label: "pending" });
  assert.equal(reusePolicy({ status: "retired" }).reuse, "never");
  assert.deepEqual(reusePolicy({ status: "published", verification: "verified" }), { reuse: "public", recheck: false, label: "verified" });
  assert.deepEqual(reusePolicy({ status: "human_reviewed", verification: "legacy_ai_only" }), { reuse: "public", recheck: true, label: "pending" });
});

test("historical regrading: overlap is a candidate; a missing part touches only itself", () => {
  const all = regradeLegacySense({ parts: [{ text: "rice", overlap: true }] });
  assert.equal(all.entry, "ai_consistent");
  const linked = regradeLegacySense({ parts: [{ text: "rule", overlap: true, lexinLink: true }, { text: "regulation", overlap: false }] });
  assert.equal(linked.entry, "partial");
  assert.deepEqual(linked.recheck, ["regulation"]);
  assert.equal(linked.parts[0].grade, "verified");
  const korp = regradeLegacySense({ parts: [{ text: "husband", overlap: true, korp: "refuted" }, { text: "also used as a general pronoun", overlap: false }] });
  assert.equal(korp.parts[1].explanatory, true);
  assert.equal(korp.entry, "needs_review");
  assert.equal(isExplanatoryPart("relating to Poland, its people, or its language"), true);
  assert.equal(isExplanatoryPart("shop window"), false);
});

test("classification: the AI's 'fixed phrase' plus a strong corpus association is a typical combination under review, never a shared entry (calibration 2026-11-09)", () => {
  const c = classifyMultiword({ dictionary: { listing: null, example: null }, attestation: { status: "ok", ok: true, total: 2483 }, association: { status: "ok", rank: 1, lmi: 9538 }, ai: { verdict: "fast_fras" } });
  assert.equal(c.cls, "F1");
  assert.equal(c.placement, "headword_usage");
  assert.equal(c.review, true);
  assert.equal(c.retireable, false);
  // Listed by a dictionary it is fixed.
  const listed = classifyMultiword({ dictionary: { listing: { kind: "construction", text: "ha tillgång till ngt" }, example: null }, attestation: null, association: null, ai: { verdict: "fast_fras" } });
  assert.equal(listed.cls, "F2");
  assert.equal(listed.placement, "own_entry");
});

test("word card collocations: strict listing — the phrase itself, not any construction containing its words", async () => {
  const { collocationEvidence } = await import("../server-language-checks.mjs");
  const drömma = await referenceEntries(null, "drömma");
  const listed = await collocationEvidence(null, drömma, "drömma om något", ["drömma", "drömmer"], { pos: "verb" });
  assert.equal(listed.kind, "dictionary");
  assert.equal(listed.listing, true);
  assert.equal((await collocationEvidence(null, drömma, "drömma snabbt", ["drömma"], { pos: "verb" })).kind, "none");
  // The words of a construction in another order are not it.
  assert.equal((await collocationEvidence(null, drömma, "om något drömma", ["drömma"], { pos: "verb" })).kind, "none");
});

test("sense coverage (R7): Lexin senses the card's English misses; a particle verb's sense is not missing", async () => {
  const { saldoEntries } = await import("../server-lexicon.mjs");
  const forms = async (w, p) => (await saldoEntries(null, w, p)).flatMap((r) => Object.values(r.forms || {}).flat());
  const regel = senseCoverage(await referenceEntries(null, "regel"), "noun", "rule; regulation", await forms("regel", "noun"));
  assert.deepEqual(regel.filter((s) => !s.covered).map((s) => s.english[0]), ["bolt"]);
  const säga = senseCoverage(await referenceEntries(null, "säga"), "verb", "say; tell", await forms("säga", "verb"));
  const dismiss = säga.find((s) => s.english.includes("dismiss"));
  assert.equal(dismiss.covered, false);
  assert.equal(dismiss.particleVerb, true, "\"100 man har sagts upp\": säga upp's sense");
});

test("protection (R8): confirmed content is disputed, not removed, by a later AI check; a stated stronger reason may remove it", () => {
  // sticka "stab" tied to its Lexin sense, then an AI check calls it wrong.
  const held = [evidence("dictionary_sense_link", "supports"), evidence("legacy_ai", "supports")];
  const ai = [evidence("ai_two_agree", "refutes", { note: "wrong_sense" })];
  assert.deepEqual(removalDecision(held, ai).action, "dispute");
  // Even a dictionary refutation needs a reason against protected content.
  const lexin = [evidence("dictionary_listing", "refutes")];
  assert.equal(removalDecision(held, lexin).action, "dispute");
  assert.equal(removalDecision(held, lexin, { reason: "lexin_new_edition" }).action, "remove");
  // Unprotected: AI answers alone never remove (review); a dictionary refutation does.
  const legacy = [evidence("legacy_ai", "supports")];
  assert.equal(removalDecision(legacy, ai).action, "dispute");
  assert.equal(removalDecision(legacy, [evidence("ai_one", "refutes")]).action, "dispute");
  assert.equal(removalDecision(legacy, lexin).action, "remove");
  // Nothing found against it: kept.
  assert.equal(removalDecision(legacy, [evidence("korp_attestation", "not_found")]).action, "keep");
});
