// Knowledge v2 regression set (round G, 2026-11-10): real problems the baseline audit found in the
// library, each with the expected result, what the old rule did and what the rule does now. A case is
// added whenever a problem class is fixed; none is removed. Cases are real entries (ids in the audit).
import test from "node:test";
import assert from "node:assert/strict";
import { fakeSupabase } from "./fake-supabase.mjs";
import { evidenceOfSource } from "../server-evidence.mjs";
import { recordCheck, senseGrade } from "../server-language-checks.mjs";

// The summary rule before 2026-11-10 (migration 20261110130000): a row without a grade was graded by
// its source, and only the bare source "audit-2026-11-02" counted as AI. Kept here as the old rule.
const oldSummaryGrade = (row) => row.grade ?? (row.source === "audit-2026-11-02" ? "ai_consistent" : "verified");

// H — history: status vs evidence. Sources as stored in production (resource_field_status.source).
const H = [
  { id: "H1", case: "AI check + English overlap with Lexin (637 rows)", source: "audit-2026-11-02+dictionary-en", expected: "ai_consistent", old: "verified" },
  { id: "H2", case: "AI fix + English overlap", source: "audit-2026-11-02:fix+dictionary-en", expected: "ai_consistent", old: "verified" },
  { id: "H3", case: "'manual_review' written by the 2026-11-02 assistant session, no person (140 rows)", source: "audit-2026-11-02:ai_check+sv-wiktionary+manual_review", expected: "ai_consistent", old: "verified" },
  { id: "H4", case: "AI check; Lexin only shows the word exists", source: "ai_check+sv-wiktionary+lexin-sv-2020", expected: "ai_consistent", old: "verified" },
  { id: "H5", case: "Korp sense check (independent) must not be downgraded", source: "audit-2026-11-02;korp", expected: "verified", old: "verified" },
  { id: "H6", case: "Korp after an English overlap: the Korp check decides", source: "audit-2026-11-02+dictionary-en;korp", expected: "verified", old: "verified" },
  { id: "H7", case: "compound rule (SALDO split + parts' dictionary English + Korp), no AI", source: "audit-2026-11-02;compound-rule", expected: "verified", old: "verified" },
  { id: "H8", case: "bare AI audit (already handled by migration B)", source: "audit-2026-11-02", expected: "ai_consistent", old: "ai_consistent" },
];
for (const c of H) {
  test(`regression ${c.id}: ${c.case}`, () => {
    assert.equal(oldSummaryGrade({ source: c.source, grade: null }), c.old, "old rule as recorded");
    assert.equal(evidenceOfSource(c.source).grade, c.expected);
  });
}

test("regression H9: an unknown source is left alone, not downgraded by guess", () => {
  assert.equal(evidenceOfSource("something-new").grade, null);
});

test("regression H10: a newly written sense row always carries its grade (old: none, so the summary read it as verified)", async () => {
  const db = fakeSupabase({ resource_field_status: [] });
  // The generation check passed with an English overlap: what server-native records.
  await recordCheck(db, "e1", "sense", "verified", "ai_check+sv-wiktionary+lexin-sv-2020", {}, { grade: "ai_consistent" });
  // A caller that gives no grade: an AI-path verified is ai_consistent, never verified by default.
  await recordCheck(db, "e2", "sense", "verified", "ai_check", {});
  await recordCheck(db, "e3", "sense", "mismatch", "ai_check", {});
  await recordCheck(db, "e4", "pos", "verified", "saldo-morphology-2017", {});
  const row = (id, f) => db.tables.resource_field_status.find((r) => r.learning_object_id === id && r.field === f);
  assert.equal(row("e1", "sense").grade, "ai_consistent");
  assert.equal(row("e2", "sense").grade, "ai_consistent");
  assert.equal(row("e3", "sense").grade, "disputed");
  assert.equal(row("e4", "pos").grade, undefined, "only sense rows are graded");
  assert.ok(row("e1", "sense").rule_version);
});

test("regression H11: only independent evidence grades a sense verified", () => {
  assert.equal(senseGrade("verified"), "ai_consistent");
  assert.equal(senseGrade("verified", "verified"), "verified");
  assert.equal(senseGrade("present"), "unverified");
});
