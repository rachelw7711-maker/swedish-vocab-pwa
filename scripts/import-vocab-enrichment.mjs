import "dotenv/config";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Imports the output of scripts/enrich-vocab-content.mjs
// (Reviews/词条批量增强结果.json) into three places:
//   1. learning_object_examples — 2nd example sentence (sort_order 1)
//   2. learning_object_relationships — reclassify existing "related" rows
//      into synonym/antonym/derived_from/related based on the AI's
//      per-target classification
//   3. learning_objects — Uttryck candidates, written as status "draft"
//      (NOT human_reviewed/published) so they stay out of the public
//      Fraser/Uttryck browsing view (loadPhraseObjects filters to
//      human_reviewed/published) until manually curated — quality on a
//      30-word pilot was ~50% genuinely idiomatic, so these need a human
//      pass before going live, not auto-publish.
//
// Usage: node scripts/import-vocab-enrichment.mjs [--commit]

const COMMIT = process.argv.includes("--commit");
const SKIP_EXAMPLES = process.argv.includes("--skip-examples");
const SKIP_RELATIONSHIPS = process.argv.includes("--skip-relationships");
const INPUT_PATH = new URL("../Reviews/词条批量增强结果.json", import.meta.url);
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Postgres text columns reject the null byte (code point 0) — one entry
// in this batch ("hektar") had one embedded in a generated sentence.
// Strip it from every string field rather than trust the model never
// emits one.
const NULL_BYTE_RE = new RegExp(String.fromCharCode(0), "g");
function clean(value) {
  return typeof value === "string" ? value.replace(NULL_BYTE_RE, "") : value;
}

async function main() {
  const entries = JSON.parse(readFileSync(INPUT_PATH, "utf8"));
  console.log(`Loaded ${entries.length} enrichment entries.`);

  // Build a swedish -> id lookup for relationship target resolution.
  // Must paginate — an unbounded select() silently caps at 1000 rows.
  const idBySwedish = new Map();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data: page, error: wordsError } = await supabase
      .from("learning_objects")
      .select("id, swedish")
      .range(from, from + PAGE - 1);
    if (wordsError) throw wordsError;
    for (const w of page) {
      const key = w.swedish.toLowerCase();
      if (!idBySwedish.has(key)) idBySwedish.set(key, w.id);
    }
    if (page.length < PAGE) break;
  }
  console.log(`Word lookup index: ${idBySwedish.size} distinct swedish keys.`);

  const exampleInserts = [];
  const relationshipUpdates = [];
  const uttryckInserts = [];
  let relationshipsUnmatched = 0;

  for (const entry of entries) {
    if (entry.second_example_sv) {
      exampleInserts.push({
        learning_object_id: entry.id,
        example_swedish: clean(entry.second_example_sv),
        example_chinese: clean(entry.second_example_zh) || "",
        sort_order: 1,
      });
    }

    for (const rel of entry.relationship_classifications || []) {
      const targetId = idBySwedish.get((rel.target_swedish || "").toLowerCase());
      if (!targetId) {
        relationshipsUnmatched++;
        continue;
      }
      relationshipUpdates.push({ from_object_id: entry.id, to_object_id: targetId, type: rel.type });
    }

    if (entry.uttryck) {
      const u = entry.uttryck;
      const id = randomUUID();
      uttryckInserts.push({
        id,
        swedish: clean(u.swedish),
        part_of_speech: "other",
        pos_detail: "",
        object_type: "expression",
        category: u.category,
        cefr_level: null,
        ipa: "",
        chinese: clean(u.meaning_zh),
        swedish_explanation: "",
        example_sv: clean(u.example_sv),
        forms: "",
        collocations: "",
        related_words: "",
        tags: [],
        notebook: "Uttryck",
        source: `AI candidate, derived from ${entry.swedish}`,
        status: "draft",
        updated_at: new Date().toISOString(),
        _example_zh: clean(u.example_zh), // pulled out below, not a learning_objects column
      });
    }
  }

  console.log(`Second examples to insert: ${exampleInserts.length}`);
  console.log(`Relationship reclassifications to apply: ${relationshipUpdates.length} (${relationshipsUnmatched} unmatched targets skipped)`);
  console.log(`Uttryck draft candidates to insert: ${uttryckInserts.length}`);

  if (!COMMIT) {
    console.log("\nDry run — sample second example:", JSON.stringify(exampleInserts[0], null, 2));
    console.log("Sample relationship update:", JSON.stringify(relationshipUpdates[0], null, 2));
    console.log("Sample uttryck candidate:", JSON.stringify(uttryckInserts[0], null, 2));
    console.log("\nRe-run with --commit to write these.");
    return;
  }

  if (SKIP_EXAMPLES) {
    console.log("Skipping example insert (--skip-examples, already done in a prior run).");
  } else {
    for (let i = 0; i < exampleInserts.length; i += 500) {
      const batch = exampleInserts.slice(i, i + 500);
      const { error } = await supabase.from("learning_object_examples").insert(batch);
      if (error) throw new Error(`examples insert failed: ${JSON.stringify(error)}`);
      console.log(`Examples inserted ${Math.min(i + 500, exampleInserts.length)}/${exampleInserts.length}`);
    }
  }

  // 10K+ individual UPDATEs one-at-a-time is slow and, over a long run,
  // vulnerable to transient connection drops (hit a GOAWAY mid-run once
  // already) — run with limited concurrency and per-item retry so a
  // single flaky request doesn't kill the whole batch.
  async function updateOneRelationship(rel, attempt = 1) {
    const { error } = await supabase
      .from("learning_object_relationships")
      .update({ relationship_type: rel.type })
      .eq("from_object_id", rel.from_object_id)
      .eq("to_object_id", rel.to_object_id);
    if (error) {
      if (attempt < 3) return updateOneRelationship(rel, attempt + 1);
      throw new Error(`relationship update failed after retries: ${JSON.stringify(error)}`);
    }
  }
  if (SKIP_RELATIONSHIPS) {
    console.log("Skipping relationship updates (--skip-relationships, already done in a prior run).");
  } else {
    const relQueue = [...relationshipUpdates];
    let relDone = 0;
    async function relWorker() {
      while (relQueue.length) {
        const rel = relQueue.shift();
        await updateOneRelationship(rel);
        relDone++;
        if (relDone % 1000 === 0) console.log(`Relationships updated ${relDone}/${relationshipUpdates.length}`);
      }
    }
    await Promise.all(Array.from({ length: 12 }, relWorker));
    console.log(`Relationship types updated: ${relDone}`);
  }

  let uttryckInserted = 0;
  let uttryckSkippedDuplicate = 0;
  for (const entry of uttryckInserts) {
    const { _example_zh, ...row } = entry;
    const { error: insertError } = await supabase.from("learning_objects").insert(row);
    if (insertError) {
      // 23505 = duplicate (swedish, part_of_speech) — either two source
      // words independently surfaced the same idiom this run, or it's
      // already in the corpus as a different phrase/word. Either way,
      // skip rather than crash the whole batch; this also makes reruns
      // after a mid-batch failure safe (already-inserted rows just "skip").
      if (insertError.code === "23505") {
        uttryckSkippedDuplicate++;
        continue;
      }
      throw new Error(`uttryck insert failed for ${row.swedish}: ${JSON.stringify(insertError)}`);
    }
    const { error: translationError } = await supabase.from("learning_object_translations").insert({
      learning_object_id: row.id,
      native_language: "zh",
      meaning: row.chinese,
      example_translation: _example_zh || "",
      updated_at: row.updated_at,
    });
    if (translationError) throw new Error(`uttryck translation insert failed for ${row.swedish}: ${JSON.stringify(translationError)}`);
    uttryckInserted++;
  }
  console.log(`Uttryck draft candidates inserted: ${uttryckInserted} (skipped ${uttryckSkippedDuplicate} duplicates)`);
  console.log("\nDone.");
}

main();
