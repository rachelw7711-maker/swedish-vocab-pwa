// Round G (2026-11-12): the owner's items A and E — a card verified sense by sense (server-senses.mjs)
// and the form fixes — with the cases that went wrong before: real senses lost (kring "approximately",
// tak "upper limit"), notes taken for senses (min), Chinese and English out of step (skjuts), word
// overlap counted as proof, a lone verb group on an idiom (gå som på räls).
import "./env-test.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
const { gradeCardSenses, enPieces, zhPieces, isRemarkEn, isRemarkZh } = await import("../server-senses.mjs");
const { withoutGroupOfPhrase } = await import("../server-native.mjs");

const kring = { E: enPieces("around; about; approximately"), Z: zhPieces("围绕；关于；大约") };
const pairKring = { senses: [{ en: [0], zh: [0], label: "around" }, { en: [1], zh: [1], label: "about" }, { en: [2], zh: [2], label: "approximately" }], notes: { en: [], zh: [] } };

test("every sense with Korp sentences: verified; one sense without: partial, and nothing is removed", () => {
  const all = gradeCardSenses({ ...kring, pairing: pairKring, korp: { parts: ["around", "about", "approximately"], unattested: [] } });
  assert.equal(all.verified, true);
  assert.deepEqual(all.senses.map((s) => s.grade), ["verified", "verified", "verified"]);
  const one = gradeCardSenses({ ...kring, pairing: pairKring, korp: { parts: ["around", "about", "approximately"], unattested: ["approximately"] } });
  assert.equal(one.verified, false);
  assert.equal(one.senses.length, 3, "the unconfirmed sense stays");
  assert.equal(one.senses[2].grade, "ai_consistent");
  assert.ok(one.senses[2].evidence.some((e) => e.kind === "korp_sense" && e.result === "not_found"), "not in the sentences is not a refutation");
});

test("synonyms of one sense: one attested piece is enough for the sense", () => {
  const E = enPieces("friend; companion; classmate"), Z = zhPieces("朋友；同学");
  const pairing = { senses: [{ en: [0, 1], zh: [0] }, { en: [2], zh: [1] }], notes: { en: [], zh: [] } };
  const r = gradeCardSenses({ E, Z, pairing, korp: { parts: ["friend", "companion", "classmate"], unattested: ["companion"] } });
  assert.deepEqual(r.senses.map((s) => s.grade), ["verified", "verified"]);
  assert.equal(r.verified, true);
});

test("word overlap with a dictionary's English, or the AI's check, never verifies a sense", () => {
  const r = gradeCardSenses({ ...kring, pairing: pairKring, korp: null, dictionary: () => true });
  assert.equal(r.verified, false);
  assert.deepEqual(r.senses.map((s) => s.grade), ["ai_consistent", "ai_consistent", "ai_consistent"]);
  const linked = gradeCardSenses({ ...kring, pairing: pairKring, korp: { parts: ["about", "approximately"], unattested: [] }, lexinVariant: "123" });
  assert.equal(linked.senses[0].grade, "verified", "a Lexin sense link verifies the first sense");
  assert.equal(linked.verified, true);
});

test("a public sense needs both languages; every piece placed once", () => {
  const E = enPieces("journalism; news reporting"), Z = zhPieces("新闻学");
  const r = gradeCardSenses({ E, Z, pairing: { senses: [{ en: [0], zh: [0] }, { en: [1], zh: [] }], notes: { en: [], zh: [] } }, korp: { parts: ["journalism", "news reporting"], unattested: [] } });
  assert.equal(r.verified, false);
  assert.ok(r.reasons.includes("sense1_incomplete"));
  const unplaced = gradeCardSenses({ E, Z, pairing: { senses: [{ en: [0], zh: [0] }], notes: { en: [], zh: [] } }, korp: { parts: ["journalism", "news reporting"], unattested: [] } });
  assert.ok(unplaced.problems.includes("en1_unplaced"));
  assert.equal(unplaced.verified, false);
});

test("a note must be a remark: grammar notes stay notes (min), a sense called a note does not pass (skjuts, kö)", () => {
  assert.ok(isRemarkEn("mitt for ett words") && isRemarkEn("mina for plurals") && isRemarkEn("often used in formal contexts"));
  assert.ok(!isRemarkEn("a person who leads a group"), "length is no sign of a remark");
  assert.ok(isRemarkZh("语气较正式。") && isRemarkZh("常用形式是 gifta sig。") && isRemarkZh("常用于健康、禁烟和生活习惯语境。"));
  assert.ok(!isRemarkZh("口语里也可指“送一程、载一程”。") && !isRemarkZh("排队。") && !isRemarkZh("可指人、地点、情况，也可指被隔热处理过的东西。"));
  const E = enPieces("my; mine; mitt for ett words; mina for plurals"), Z = zhPieces("我的");
  const min = gradeCardSenses({ E, Z, pairing: { senses: [{ en: [0, 1], zh: [0] }], notes: { en: [2, 3], zh: [] } }, korp: { parts: ["my", "mine"], unattested: [] } });
  assert.equal(min.verified, true);
  const E2 = enPieces("lift; ride"), Z2 = zhPieces("搭车；口语里也可指“送一程、载一程”。");
  const skjuts = gradeCardSenses({ E: E2, Z: Z2, pairing: { senses: [{ en: [0, 1], zh: [0] }], notes: { en: [], zh: [1] } }, korp: { parts: ["lift", "ride"], unattested: [] } });
  assert.equal(skjuts.verified, false);
  assert.ok(skjuts.problems.includes("zh1_note_not_a_remark"));
});

test("a shared Chinese piece marks both senses shared, never dropped", () => {
  const E = enPieces("apply; implement"), Z = zhPieces("应用、适用");
  const r = gradeCardSenses({ E, Z, pairing: { senses: [{ en: [0], zh: [0] }, { en: [1], zh: [0] }], notes: { en: [], zh: [] } }, korp: { parts: ["apply", "implement"], unattested: [] } });
  assert.deepEqual(r.senses.map((s) => s.shared), [true, true]);
  assert.equal(r.verified, true);
});

test("E: a verb group stays on a particle verb, leaves any other multi-word headword", () => {
  const forms = [{ type: "verb_group", value: "4" }, { type: "present", value: "går ut på" }];
  assert.deepEqual(withoutGroupOfPhrase(forms, false), forms);
  assert.deepEqual(withoutGroupOfPhrase(forms, true), [{ type: "present", value: "går ut på" }]);
});

test("D: a search asks only the dictionaries about a multi-word card — no Korp while the searcher waits", async () => {
  const { useSaldoFiles } = await import("../server-lexicon.mjs");
  const { useReferenceFiles } = await import("../server-references.mjs");
  const { multiwordEvidence } = await import("../server-evidence.mjs");
  await useSaldoFiles(); await useReferenceFiles();
  const asked = [];
  const korp = { attest: async (p) => { asked.push(p); return { total: 999, perCorpus: {}, byPos: {} }; }, relations: async (l) => { asked.push(l); return []; } };
  const lean = await multiwordEvidence(null, "slå två flugor i en smäll", { korp, need: "dictionary" });
  assert.deepEqual(asked, []);
  assert.equal(lean.attestation, null);
  assert.equal(lean.association, null);
  const full = await multiwordEvidence(null, "slå två flugor i en smäll", { korp });
  assert.ok(asked.length > 0, "the background review still asks Korp");
  assert.equal(full.attestation.status, "ok");
});

test("C: a few lemma hits are no answer — Korp is asked for the spelling too (Stockholm, oerhört, skull)", async () => {
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { korpAttestation, judgeAttestation } = await import("../server-korp.mjs");
  const saved = { offline: process.env.KORP_OFFLINE, dir: process.env.KORP_CACHE_DIR, fetch: globalThis.fetch };
  delete process.env.KORP_OFFLINE;
  process.env.KORP_CACHE_DIR = mkdtempSync(`${tmpdir()}/korp-`);
  const answer = (total, corpora) => ({ combined: { sums: { absolute: total }, rows: [{ value: { pos: ["PM"] }, absolute: total }] },
    corpora: Object.fromEntries(corpora.map((c) => [c, { sums: { absolute: Math.floor(total / corpora.length) }, rows: [] }])) });
  globalThis.fetch = async (url) => ({ json: async () => (decodeURIComponent(String(url).replace(/\+/g, " ")).includes("lemma contains") ? answer(6, ["GP2012", "ROMI"]) : answer(73000, ["GP2012", "GP2013", "ROMI", "SUC3"])) });
  try {
    const a = await korpAttestation("Stockholm");
    assert.equal(a.match, "spelling");
    assert.equal(judgeAttestation(a, null).exists.ok, true);
  } finally {
    globalThis.fetch = saved.fetch;
    process.env.KORP_OFFLINE = saved.offline;
    if (saved.dir === undefined) delete process.env.KORP_CACHE_DIR; else process.env.KORP_CACHE_DIR = saved.dir;
  }
});

test("C: '...' in a sentence pattern is a slot of 1–3 words for Korp, not nothing", async () => {
  const { korpCqp } = await import("../server-korp.mjs");
  assert.equal(korpCqp("Det blir ... kronor."), '[lemma contains "Det" | word="Det"%c] [lemma contains "blir" | word="blir"%c] []{1,3} [lemma contains "kronor" | word="kronor"%c]');
  assert.equal(korpCqp("Den börjar klockan …"), '[lemma contains "Den" | word="Den"%c] [lemma contains "börjar" | word="börjar"%c] [lemma contains "klockan" | word="klockan"%c]', "a slot at the end is dropped");
});
