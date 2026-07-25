import "dotenv/config";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Imports scripts/backfill-legacy-word-forms.mjs's output
// (Reviews/老词条语法补全结果.json) into word_forms + the new
// countability/transitivity columns on learning_objects.
//
// Usage: node scripts/import-legacy-word-forms.mjs [--commit]

const COMMIT = process.argv.includes("--commit");
const INPUT_PATH = new URL("../Reviews/老词条语法补全结果.json", import.meta.url);
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const entries = JSON.parse(readFileSync(INPUT_PATH, "utf8"));
  console.log(`Loaded ${entries.length} entries.`);

  const formInserts = [];
  const attrUpdates = [];
  for (const entry of entries) {
    (entry.forms || []).forEach((f, index) => {
      if (!f.form_type || !f.form_value) return;
      formInserts.push({ learning_object_id: entry.id, form_type: f.form_type, form_value: f.form_value, sort_order: index });
    });
    if (entry.countability || entry.transitivity) {
      attrUpdates.push({ id: entry.id, countability: entry.countability || null, transitivity: entry.transitivity || null });
    }
  }
  console.log(`word_forms rows to insert: ${formInserts.length}`);
  console.log(`learning_objects rows to update (countability/transitivity): ${attrUpdates.length}`);

  if (!COMMIT) {
    console.log("\nDry run — sample form insert:", JSON.stringify(formInserts[0], null, 2));
    console.log("Sample attr update:", JSON.stringify(attrUpdates.find((u) => u.countability) || attrUpdates[0], null, 2));
    console.log("\nRe-run with --commit to write these.");
    return;
  }

  for (let i = 0; i < formInserts.length; i += 500) {
    const batch = formInserts.slice(i, i + 500);
    const { error } = await supabase.from("word_forms").insert(batch);
    if (error) throw new Error(`word_forms insert failed: ${JSON.stringify(error)}`);
    console.log(`word_forms inserted ${Math.min(i + 500, formInserts.length)}/${formInserts.length}`);
  }

  for (const update of attrUpdates) {
    const { error } = await supabase
      .from("learning_objects")
      .update({ countability: update.countability, transitivity: update.transitivity, updated_at: new Date().toISOString() })
      .eq("id", update.id);
    if (error) throw new Error(`attr update failed for ${update.id}: ${JSON.stringify(error)}`);
  }
  console.log(`learning_objects attributes updated: ${attrUpdates.length}`);
  console.log("\nDone.");
}

main();
