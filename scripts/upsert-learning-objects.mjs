import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Safe, reusable upsert pipeline for adding new word entries to
// public.learning_objects. Fixes the documented "known limitation" in
// scripts/import-words-to-supabase.mjs (insert-only, unsafe to rerun
// against a populated database, no cross-source dedup). Field shapes below
// mirror src/lib/db.js's toWordRow()/toWordTranslationRow() exactly, so
// entries written here render identically to words saved through the app's
// own word-edit UI.
//
// Usage:
//   node scripts/upsert-learning-objects.mjs <entries.json>          # dry run (default) — no writes
//   node scripts/upsert-learning-objects.mjs <entries.json> --commit # actually writes to Supabase
//
// Input file: a JSON array of entries shaped like scripts/lib/entry-shape.md
// documents (see that file for the full field list per part of speech).

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const [, , inputPath, ...flags] = process.argv;
const COMMIT = flags.includes("--commit");
if (!inputPath) {
  throw new Error("Usage: node scripts/upsert-learning-objects.mjs <entries.json> [--commit]");
}

function clean(value) {
  return String(value || "").trim();
}

function normLemma(s) {
  return clean(s).toLocaleLowerCase("sv-SE");
}

// ---------------------------------------------------------------------------
// 1. Load existing learning_objects for dedup — keyed by normalized swedish
//    spelling ALONE, matching a real UNIQUE(swedish) constraint discovered
//    live on production (name: words_swedish_key — a leftover from before
//    the words -> learning_objects rename, present on the live table but
//    declared NOWHERE in schema.sql or any tracked migration; schema.sql
//    only shows a non-unique index). This means the "same spelling,
//    different part of speech" homograph model that the Ordbok field spec
//    / SPK-FND-003 assume (e.g. "vara" the noun vs "vara" the verb as two
//    rows) is NOT actually supported by the live schema today — confirmed
//    by hitting this exact collision while committing the 2026-07-24 pilot
//    batch. Flagged to Rachel as an open architecture question rather than
//    silently dropping or altering the constraint. Deduping on swedish
//    alone here matches what the database will actually accept.
// ---------------------------------------------------------------------------
async function fetchExistingKeys() {
  const pageSize = 1000;
  let from = 0;
  const keys = new Set();
  for (;;) {
    const { data, error } = await supabase
      .from("learning_objects")
      .select("swedish")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Supabase fetch failed: ${JSON.stringify(error)}`);
    if (!data || data.length === 0) break;
    for (const row of data) {
      keys.add(normLemma(row.swedish));
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return keys;
}

// ---------------------------------------------------------------------------
// 2. Row builders — same field names/shape as src/lib/db.js toWordRow() /
//    toWordTranslationRow(), so the app's read path (normalizeWord in
//    src/lib/db.js) displays these identically to app-saved words.
// ---------------------------------------------------------------------------
function toWordRow(entry, id) {
  return {
    id,
    swedish: clean(entry.swedish),
    part_of_speech: clean(entry.pos) || "other",
    pos_detail: clean(entry.pos_detail),
    object_type: "word",
    category: clean(entry.category) || null,
    cefr_level: clean(entry.cefr_level) || null,
    ipa: clean(entry.ipa),
    chinese: clean(entry.meaning_zh),
    swedish_explanation: clean(entry.swedish_explanation),
    example_sv: clean(entry.example_sv),
    forms: clean(entry.forms_text),
    collocations: clean(entry.collocations_text),
    related_words: clean(entry.related_words_text),
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    // Must be a concrete string, never `undefined` — supabase-js sends an
    // explicit NULL for keys whose value is undefined rather than omitting
    // the column and letting Postgres apply its `not null default` (as
    // happened here: notebook is `not null default 'Mina böcker'` on the
    // base schema, but passing `undefined` still 23502'd on NULL).
    notebook: clean(entry.notebook) || "词库扩充候选",
    source: clean(entry.source) || "ai_generated",
    status: clean(entry.status) || "ai_generated",
    updated_at: new Date().toISOString(),
  };
}

function toTranslationRow(entry, id) {
  return {
    learning_object_id: id,
    native_language: "zh",
    meaning: clean(entry.meaning_zh),
    explanation: clean(entry.explanation_zh),
    example_translation: clean(entry.example_zh),
    learning_tip: clean(entry.learning_tip_zh),
    updated_at: new Date().toISOString(),
  };
}

function toWordFormsRows(entry, id) {
  if (!Array.isArray(entry.forms) || !entry.forms.length) return [];
  return entry.forms
    .filter((f) => clean(f?.form_type) && clean(f?.form_value))
    .map((f, index) => ({
      learning_object_id: id,
      form_type: clean(f.form_type),
      form_value: clean(f.form_value),
      sort_order: index,
      updated_at: new Date().toISOString(),
    }));
}

// ---------------------------------------------------------------------------
// 3. Main
// ---------------------------------------------------------------------------
const entries = JSON.parse(readFileSync(inputPath, "utf8"));
if (!Array.isArray(entries)) throw new Error("Input file must contain a JSON array of entries.");

console.log(`Loaded ${entries.length} entries from ${inputPath}.`);
console.log(`Mode: ${COMMIT ? "COMMIT (will write to Supabase)" : "DRY RUN (no writes — pass --commit to apply)"}`);

const existingKeys = await fetchExistingKeys();
console.log(`Existing learning_objects keys (swedish+pos): ${existingKeys.size}`);

const toInsert = [];
const skippedDuplicate = [];
const skippedInvalid = [];
const seenThisBatch = new Set();

for (const entry of entries) {
  const swedish = clean(entry.swedish);
  if (!swedish) {
    skippedInvalid.push(entry);
    continue;
  }
  const key = normLemma(swedish);
  if (existingKeys.has(key) || seenThisBatch.has(key)) {
    skippedDuplicate.push(entry);
    continue;
  }
  seenThisBatch.add(key);
  toInsert.push(entry);
}

console.log(`New entries to insert: ${toInsert.length}`);
console.log(`Skipped (already exists): ${skippedDuplicate.length}`);
console.log(`Skipped (invalid, no swedish field): ${skippedInvalid.length}`);

if (!toInsert.length) {
  console.log("Nothing to do.");
  process.exit(0);
}

const wordRows = [];
const translationRows = [];
const wordFormsRows = [];
for (const entry of toInsert) {
  const id = randomUUID();
  wordRows.push(toWordRow(entry, id));
  translationRows.push(toTranslationRow(entry, id));
  wordFormsRows.push(...toWordFormsRows(entry, id));
}

if (!COMMIT) {
  console.log("\n--- Sample of first 3 rows that would be inserted into learning_objects ---");
  console.log(JSON.stringify(wordRows.slice(0, 3), null, 2));
  console.log(`\n--- word_forms rows that would be inserted: ${wordFormsRows.length} ---`);
  console.log(JSON.stringify(wordFormsRows.slice(0, 6), null, 2));
  console.log("\nDry run complete. Re-run with --commit to write these to Supabase.");
  process.exit(0);
}

const BATCH_SIZE = 500;
for (let i = 0; i < wordRows.length; i += BATCH_SIZE) {
  const batch = wordRows.slice(i, i + BATCH_SIZE);
  const { error } = await supabase.from("learning_objects").insert(batch);
  if (error) throw new Error(`learning_objects insert failed: ${JSON.stringify(error)}`);
  console.log(`Inserted learning_objects batch ${i / BATCH_SIZE + 1}: ${batch.length} rows`);
}
for (let i = 0; i < translationRows.length; i += BATCH_SIZE) {
  const batch = translationRows.slice(i, i + BATCH_SIZE);
  const { error } = await supabase.from("learning_object_translations").insert(batch);
  if (error) throw new Error(`learning_object_translations insert failed: ${JSON.stringify(error)}`);
}
for (let i = 0; i < wordFormsRows.length; i += BATCH_SIZE) {
  const batch = wordFormsRows.slice(i, i + BATCH_SIZE);
  const { error } = await supabase.from("word_forms").insert(batch);
  if (error) throw new Error(`word_forms insert failed: ${JSON.stringify(error)}`);
}

console.log(`\nDone. Inserted ${wordRows.length} words, ${translationRows.length} translations, ${wordFormsRows.length} word_forms rows.`);
