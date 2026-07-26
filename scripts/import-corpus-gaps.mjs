import "dotenv/config";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Imports fill-corpus-gaps.mjs's output (Reviews/词库补全结果.json) into the
// DB, writing only the fields each word's `needs` list actually asked for
// (defensive — never overwrites a field the word wasn't flagged as missing).
//
// Usage: node scripts/import-corpus-gaps.mjs [--commit]

const COMMIT = process.argv.includes("--commit");
const INPUT_PATH = new URL("../Reviews/词库补全结果.json", import.meta.url);
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const USAGE_REGISTER_ENUM = new Set(["spoken", "written", "formal", "informal", "everyday"]);
const RELATIONSHIP_TYPE_ENUM = new Set(["related", "synonym", "antonym", "derived_from", "word_family", "particle_verb", "reflexive"]);

function stripNullBytes(value) {
  return typeof value === "string" ? value.replace(new RegExp(String.fromCharCode(0), "g"), "") : value;
}

async function fetchAllPaginated(table, select, filters = (q) => q) {
  let all = [];
  let from = 0;
  while (true) {
    let q = supabase.from(table).select(select);
    q = filters(q);
    q = q.range(from, from + 999);
    const { data, error } = await q;
    if (error) throw error;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function main() {
  const results = JSON.parse(readFileSync(INPUT_PATH, "utf8"), (key, value) => stripNullBytes(value));
  console.log(`Loaded ${results.length} results.`);

  // spelling -> id, for resolving relationship candidates to real corpus rows
  const allWords = await fetchAllPaginated("learning_objects", "id, swedish", (q) => q.eq("object_type", "word"));
  const idBySpelling = new Map(allWords.map((w) => [w.swedish.toLowerCase(), w.id]));

  // current flat collocations/related_words text, so we only fill if empty
  const currentTextRows = await fetchAllPaginated("learning_objects", "id, collocations, related_words", (q) => q.eq("object_type", "word"));
  const currentTextById = new Map(currentTextRows.map((r) => [r.id, r]));

  const loUpdates = [];
  const exampleInserts = [];
  const collocIndexInserts = [];
  const relInserts = [];
  let skippedRelationships = 0;

  for (const r of results) {
    const needs = new Set(r.needs || []);
    const update = { id: r.id };
    let hasUpdate = false;

    if (needs.has("cefr_level") && r.cefr_level) {
      update.cefr_level = r.cefr_level;
      hasUpdate = true;
    }
    if (needs.has("countability") && r.countability) {
      update.countability = r.countability;
      hasUpdate = true;
    }
    if (needs.has("transitivity") && r.transitivity) {
      update.transitivity = r.transitivity;
      hasUpdate = true;
    }
    if (needs.has("adverb_form") && r.adverb_form) {
      update.adverb_form = r.adverb_form;
      hasUpdate = true;
    }
    if (needs.has("comparison_type") && r.comparison_type) {
      update.comparison_type = r.comparison_type;
      hasUpdate = true;
    }
    if (needs.has("passiv_s") && r.passiv_s) {
      update.passiv_s = r.passiv_s;
      hasUpdate = true;
    }
    if (needs.has("memory_tip") && r.memory_tip) {
      update.memory_tip = r.memory_tip;
      hasUpdate = true;
    }
    if (needs.has("usage_registers") && Array.isArray(r.usage_registers) && r.usage_registers.length) {
      const clean = r.usage_registers.filter((v) => USAGE_REGISTER_ENUM.has(v));
      if (clean.length) {
        update.usage_registers = clean;
        hasUpdate = true;
      }
    }

    if (needs.has("second_example") && r.second_example_sv) {
      exampleInserts.push({ learning_object_id: r.id, example_swedish: r.second_example_sv, example_chinese: r.second_example_zh || "", sort_order: 1 });
    }

    if (needs.has("collocations") && Array.isArray(r.collocations) && r.collocations.length) {
      const current = currentTextById.get(r.id);
      if (current && !current.collocations) {
        update.collocations = r.collocations.map((c) => `${c.phrase} | ${c.meaning_zh} | ${c.example_sv}`).join("\n");
        hasUpdate = true;
      }
      r.collocations.forEach((c, i) => collocIndexInserts.push({ learning_object_id: r.id, phrase_text: c.phrase, sort_order: i }));
    }

    if (needs.has("relationships") && Array.isArray(r.relationships) && r.relationships.length) {
      const current = currentTextById.get(r.id);
      if (current && !current.related_words) {
        update.related_words = r.relationships.map((rel) => `${rel.word} | ${rel.meaning_zh}`).join("\n");
        hasUpdate = true;
      }
      for (const rel of r.relationships) {
        const toId = idBySpelling.get((rel.word || "").toLowerCase());
        if (!toId || toId === r.id) {
          skippedRelationships++;
          continue;
        }
        const type = RELATIONSHIP_TYPE_ENUM.has(rel.type) ? rel.type : "related";
        relInserts.push({ from_object_id: r.id, to_object_id: toId, relationship_type: type });
      }
    }

    if (hasUpdate) loUpdates.push(update);
  }

  console.log(`\nlearning_objects updates: ${loUpdates.length}`);
  console.log(`learning_object_examples inserts: ${exampleInserts.length}`);
  console.log(`learning_object_collocations inserts: ${collocIndexInserts.length}`);
  console.log(`learning_object_relationships inserts: ${relInserts.length} (skipped, no corpus match: ${skippedRelationships})`);

  if (!COMMIT) {
    console.log("\nDry run. Sample learning_objects update:", JSON.stringify(loUpdates.find((u) => Object.keys(u).length > 3), null, 2));
    console.log("\nRe-run with --commit to write these.");
    return;
  }

  let updated = 0;
  async function updateWorker(queue) {
    while (queue.length) {
      const u = queue.shift();
      const { id, ...fields } = u;
      let attempt = 0;
      while (true) {
        attempt++;
        const { error } = await supabase.from("learning_objects").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", id);
        if (!error) break;
        if (attempt >= 3) throw new Error(`learning_objects update failed for ${id} after 3 attempts: ${JSON.stringify(error)}`);
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
      updated++;
      if (updated % 500 === 0) console.log(`learning_objects updated ${updated}/${loUpdates.length}`);
    }
  }
  const updateQueue = [...loUpdates];
  await Promise.all(Array.from({ length: 10 }, () => updateWorker(updateQueue)));
  console.log(`learning_objects updated: ${updated}`);

  for (let i = 0; i < exampleInserts.length; i += 500) {
    const batch = exampleInserts.slice(i, i + 500);
    const { error } = await supabase.from("learning_object_examples").insert(batch);
    if (error) throw new Error(`examples insert failed: ${JSON.stringify(error)}`);
  }
  console.log(`learning_object_examples inserted: ${exampleInserts.length}`);

  for (let i = 0; i < collocIndexInserts.length; i += 500) {
    const batch = collocIndexInserts.slice(i, i + 500);
    const { error } = await supabase.from("learning_object_collocations").insert(batch);
    if (error) throw new Error(`collocations insert failed: ${JSON.stringify(error)}`);
  }
  console.log(`learning_object_collocations inserted: ${collocIndexInserts.length}`);

  for (let i = 0; i < relInserts.length; i += 500) {
    const batch = relInserts.slice(i, i + 500);
    const { error } = await supabase.from("learning_object_relationships").upsert(batch, { onConflict: "from_object_id,to_object_id,relationship_type", ignoreDuplicates: true });
    if (error) throw new Error(`relationships insert failed: ${JSON.stringify(error)}`);
  }
  console.log(`learning_object_relationships inserted: ${relInserts.length}`);

  console.log("\nDone.");
}

main();
