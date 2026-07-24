import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

import { documentWordPacks } from "../document-vocab-data.js";
import { educationWordPacks } from "../vocab-data.js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BATCH_SIZE = 500;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function clean(value) {
  return String(value || "").trim();
}

function sourceForPack(sourceName, pack) {
  return [sourceName, clean(pack.level), clean(pack.notebook)].filter(Boolean).join(" / ");
}

// Writes to public.learning_objects (renamed from `words` by
// supabase/migrations/20260719000100_learning_objects_phase1.sql). Field
// names below are checked directly against the live table (queried via
// `supabase db query --linked`, not just against the migration file) —
// the real, pre-existing columns are `part_of_speech` and `example_sv`,
// not `pos`/`example`; there was never a real `english` column either.
function toWordRow(word, pack, sourceName) {
  return {
    swedish: clean(word.swedish),
    part_of_speech: clean(word.pos) || "other",
    pos_detail: clean(word.pos_detail),
    object_type: "word",
    chinese: clean(word.chinese),
    swedish_explanation: clean(word.english),
    forms: clean(word.forms),
    example_sv: clean(word.example),
    collocations: clean(word.collocations),
    related_words: clean(word.related_words),
    tags: Array.isArray(word.tags) ? word.tags : [],
    notebook: clean(pack.notebook) || "Mina böcker",
    source: "import",
    status: "published",
  };
}

function toTranslationRow(learningObjectId, word) {
  return {
    learning_object_id: learningObjectId,
    native_language: "zh",
    meaning: clean(word.chinese),
  };
}

function collectWords() {
  const bySwedish = new Map();
  let total = 0;
  const sources = [
    { name: "vocab-data.js", packs: educationWordPacks },
    { name: "document-vocab-data.js", packs: documentWordPacks },
  ];

  for (const source of sources) {
    for (const pack of source.packs) {
      for (const word of pack.words || []) {
        total += 1;
        const swedish = clean(word.swedish);
        const key = swedish.toLocaleLowerCase("sv-SE");
        if (!key || bySwedish.has(key)) continue;
        bySwedish.set(key, { word, row: toWordRow(word, pack, source.name) });
      }
    }
  }

  return {
    total,
    uniqueEntries: [...bySwedish.values()],
  };
}

// NOTE: public.learning_objects has no unique constraint on `swedish` alone
// (a bare unique constraint would incorrectly block legitimate homographs
// with different pos, e.g. "vara" the noun vs. "vara" the verb), so this is
// insert-only, not a true upsert. Re-running this script against a database
// that has already been imported will currently create duplicate rows —
// that's a known limitation, not something this pass resolves, since fixing
// it safely requires inspecting the live table for existing duplicates
// first (not possible without direct database access at the time this was
// written). Track as a follow-up before running this script a second time
// against a populated database.
async function insertWords(entries) {
  for (let index = 0, batchNumber = 1; index < entries.length; index += BATCH_SIZE, batchNumber += 1) {
    const batch = entries.slice(index, index + BATCH_SIZE);
    const { data, error } = await supabase
      .from("learning_objects")
      .insert(batch.map((entry) => entry.row))
      .select("id, swedish");
    if (error) {
      console.error(JSON.stringify(error, null, 2));
      throw new Error(`Supabase insert failed on batch ${batchNumber}.`);
    }

    const idBySwedish = new Map((data || []).map((row) => [row.swedish, row.id]));
    const translationRows = batch
      .map((entry) => {
        const id = idBySwedish.get(entry.row.swedish);
        return id ? toTranslationRow(id, entry.word) : null;
      })
      .filter(Boolean);
    if (translationRows.length) {
      const { error: translationError } = await supabase
        .from("learning_object_translations")
        .insert(translationRows);
      if (translationError) {
        console.error(JSON.stringify(translationError, null, 2));
        throw new Error(`Supabase translation insert failed on batch ${batchNumber}.`);
      }
    }

    console.log(`Batch ${batchNumber} inserted: ${batch.length}`);
  }
}

async function countRemoteWords() {
  const { count, error } = await supabase
    .from("learning_objects")
    .select("*", { count: "exact", head: true });
  return { count, error };
}

const { total, uniqueEntries } = collectWords();
await insertWords(uniqueEntries);
const { count, error: countError } = await countRemoteWords();

console.log(`Local words read: ${total}`);
console.log(`Unique words after Swedish dedupe: ${uniqueEntries.length}`);
if (countError) {
  console.error(JSON.stringify(countError, null, 2));
  throw new Error("Supabase count failed.");
}
console.log(`Current learning_objects count: ${count}`);
