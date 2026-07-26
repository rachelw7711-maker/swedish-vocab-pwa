import "dotenv/config";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Imports classify-particip-candidates.mjs's confirmed output: reclassifies
// part_of_speech to presens_particip/perfekt_particip, replaces the word's
// old (now wrong-POS) word_forms rows with the participle-specific fields
// from SPK-DIC-001 §6-7, writes function_tags/meaning_note, and links back
// to the base verb via a `derived_from` relationship when the base verb
// spelling matches an existing corpus entry.
//
// Usage: node scripts/import-particip-reclassification.mjs [--commit]

const COMMIT = process.argv.includes("--commit");
const INPUT_PATH = new URL("../Reviews/分词分类结果.json", import.meta.url);
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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

function stripNullBytes(value) {
  return typeof value === "string" ? value.replace(new RegExp(String.fromCharCode(0), "g"), "") : value;
}

async function main() {
  const all = JSON.parse(readFileSync(INPUT_PATH, "utf8"), (key, value) => stripNullBytes(value));
  const confirmed = all.filter((c) => c.is_participle);
  console.log(`Confirmed participles to reclassify: ${confirmed.length}`);

  const verbs = await fetchAllPaginated("learning_objects", "id, swedish", (q) => q.eq("object_type", "word").eq("part_of_speech", "verb"));
  const verbBySpelling = new Map(verbs.map((v) => [v.swedish.toLowerCase(), v.id]));

  let linked = 0;
  let unlinked = 0;
  const posUpdates = [];
  const formInserts = [];
  const relInserts = [];

  for (const c of confirmed) {
    posUpdates.push({
      id: c.id,
      part_of_speech: c.participle_type,
      function_tags: c.function_tags || [],
      meaning_note: c.meaning_note || null,
    });

    const forms = [];
    forms.push({ learning_object_id: c.id, form_type: "base_verb", form_value: c.base_verb || "", sort_order: 0 });
    if (c.participle_type === "presens_particip") {
      forms.push({ learning_object_id: c.id, form_type: "participle_form", form_value: c.swedish, sort_order: 1 });
    } else {
      forms.push({ learning_object_id: c.id, form_type: "en_form", form_value: c.en_form || c.swedish, sort_order: 1 });
      forms.push({ learning_object_id: c.id, form_type: "ett_form", form_value: c.ett_form || "", sort_order: 2 });
      forms.push({ learning_object_id: c.id, form_type: "plural_form", form_value: c.plural_form || "", sort_order: 3 });
      const dg = c.degree_forms || {};
      if (dg.comparative) forms.push({ learning_object_id: c.id, form_type: "comparative", form_value: dg.comparative, sort_order: 4 });
      if (dg.superlative_indefinite) forms.push({ learning_object_id: c.id, form_type: "superlative_indefinite", form_value: dg.superlative_indefinite, sort_order: 5 });
      if (dg.superlative_definite) forms.push({ learning_object_id: c.id, form_type: "superlative_definite", form_value: dg.superlative_definite, sort_order: 6 });
    }
    formInserts.push(...forms);

    const baseVerbId = verbBySpelling.get((c.base_verb || "").toLowerCase());
    if (baseVerbId) {
      relInserts.push({ from_object_id: c.id, to_object_id: baseVerbId, relationship_type: "derived_from" });
      linked++;
    } else {
      unlinked++;
    }
  }

  console.log(`Base verb linked: ${linked}, unlinked (no matching corpus verb, left without backlink): ${unlinked}`);
  console.log(`word_forms rows to write: ${formInserts.length}`);
  console.log(`derived_from relationship rows to write: ${relInserts.length}`);

  if (!COMMIT) {
    console.log("\nDry run. Sample POS update:", JSON.stringify(posUpdates[0], null, 2));
    console.log("Sample forms for that word:", JSON.stringify(formInserts.filter((f) => f.learning_object_id === posUpdates[0].id), null, 2));
    console.log("\nRe-run with --commit to write these.");
    return;
  }

  // 1. delete stale word_forms rows written under the old (wrong) POS
  const ids = confirmed.map((c) => c.id);
  for (let i = 0; i < ids.length; i += 200) {
    const batch = ids.slice(i, i + 200);
    const { error } = await supabase.from("word_forms").delete().in("learning_object_id", batch);
    if (error) throw new Error(`word_forms delete failed: ${JSON.stringify(error)}`);
  }
  console.log("Cleared stale word_forms rows for reclassified words.");

  // 2. reclassify part_of_speech + write function_tags/meaning_note
  for (const u of posUpdates) {
    const { error } = await supabase
      .from("learning_objects")
      .update({ part_of_speech: u.part_of_speech, function_tags: u.function_tags, meaning_note: u.meaning_note, updated_at: new Date().toISOString() })
      .eq("id", u.id);
    if (error) throw new Error(`learning_objects update failed for ${u.id}: ${JSON.stringify(error)}`);
  }
  console.log(`learning_objects reclassified: ${posUpdates.length}`);

  // 3. write new participle-specific word_forms rows
  for (let i = 0; i < formInserts.length; i += 500) {
    const batch = formInserts.slice(i, i + 500);
    const { error } = await supabase.from("word_forms").insert(batch);
    if (error) throw new Error(`word_forms insert failed: ${JSON.stringify(error)}`);
  }
  console.log(`word_forms inserted: ${formInserts.length}`);

  // 4. write derived_from backlinks (skip ones that would violate the unique constraint if re-run)
  for (let i = 0; i < relInserts.length; i += 500) {
    const batch = relInserts.slice(i, i + 500);
    const { error } = await supabase.from("learning_object_relationships").upsert(batch, { onConflict: "from_object_id,to_object_id,relationship_type", ignoreDuplicates: true });
    if (error) throw new Error(`relationship insert failed: ${JSON.stringify(error)}`);
  }
  console.log(`derived_from relationships inserted: ${relInserts.length}`);

  console.log("\nDone.");
}

main();
