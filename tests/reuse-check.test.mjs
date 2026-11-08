// G6 (2026-11-09): a reused entry is shown as it is and only marked for the check, once per check
// version; an entry already verified or checked by this version is never marked (no repeat charge).
//   node --test tests/
import "./env-test.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
const { noteReuse } = await import("../server-native.mjs");
const { CHECK_VERSION } = await import("../server-language-checks.mjs");
const { fakeSupabase } = await import("./fake-supabase.mjs");

const upserts = (db) => db.calls.filter((c) => c.table === "resource_field_status" && c.op === "upsert").length;

test("an unchecked reused entry is marked once", async () => {
  const db = fakeSupabase({ resource_field_status: [{ learning_object_id: "a", field: "sense", status: "present", detail: { open: "no_dictionary_english" } }] });
  assert.equal(await noteReuse(db, "a"), "marked");
  assert.equal(await noteReuse(db, "a"), "marked");
  assert.equal(upserts(db), 1, "the second reuse writes nothing");
  const mark = db.tables.resource_field_status.find((r) => r.field === "reuse_check");
  assert.equal(mark.detail.check_version, CHECK_VERSION);
});

test("a verified entry, or one this check version saw, is not marked", async () => {
  const db = fakeSupabase({ resource_field_status: [
    { learning_object_id: "v", field: "sense", status: "verified", detail: {} },
    { learning_object_id: "c", field: "sense", status: "mismatch", detail: { check_version: CHECK_VERSION } },
  ] });
  assert.equal(await noteReuse(db, "v"), "checked");
  assert.equal(await noteReuse(db, "c"), "checked");
  assert.equal(upserts(db), 0);
});

test("a historical entry with no check on record is marked, not judged", async () => {
  const db = fakeSupabase({ resource_field_status: [] });
  assert.equal(await noteReuse(db, "h"), "marked");
  assert.equal(db.tables.resource_field_status.find((r) => r.field === "sense"), undefined, "no sense result is invented");
});
