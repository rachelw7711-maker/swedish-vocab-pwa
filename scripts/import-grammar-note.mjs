import "dotenv/config";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Imports fill-grammar-note.mjs's output into learning_objects.grammar_note.
// Usage: node scripts/import-grammar-note.mjs [--commit]

const COMMIT = process.argv.includes("--commit");
const INPUT_PATH = new URL("../Reviews/名词grammar_note结果.json", import.meta.url);
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function stripNullBytes(value) {
  return typeof value === "string" ? value.replace(new RegExp(String.fromCharCode(0), "g"), "") : value;
}

async function main() {
  const results = JSON.parse(readFileSync(INPUT_PATH, "utf8"), (key, value) => stripNullBytes(value));
  console.log(`Loaded ${results.length} results.`);

  if (!COMMIT) {
    console.log("Dry run. Sample:", JSON.stringify(results[0], null, 2));
    console.log("Re-run with --commit to write these.");
    return;
  }

  let updated = 0;
  async function worker(queue) {
    while (queue.length) {
      const r = queue.shift();
      let attempt = 0;
      while (true) {
        attempt++;
        const { error } = await supabase.from("learning_objects").update({ grammar_note: r.grammar_note, updated_at: new Date().toISOString() }).eq("id", r.id);
        if (!error) break;
        if (attempt >= 3) throw new Error(`update failed for ${r.id} after 3 attempts: ${JSON.stringify(error)}`);
        await new Promise((res) => setTimeout(res, 500 * attempt));
      }
      updated++;
      if (updated % 500 === 0) console.log(`updated ${updated}/${results.length}`);
    }
  }
  const queue = [...results];
  await Promise.all(Array.from({ length: 10 }, () => worker(queue)));
  console.log(`\nDone. Updated: ${updated}`);
}

main();
