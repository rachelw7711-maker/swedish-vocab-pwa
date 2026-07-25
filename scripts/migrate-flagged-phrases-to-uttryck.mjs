import "dotenv/config";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Moves the 369 entries flagged by scripts/scan-phrase-like-entries.mjs
// (Reviews/待复核-疑似短语或整句的词条清单.md, produced 2026-07-24, never
// acted on until now — Rachel caught this 2026-07-25) out of the word
// corpus and into the Fraser/Uttryck catalog. Same learning_objects row
// (id unchanged), just reclassified — any existing user_words favorites
// keep working. No AI involved, pure reclassification of data that
// already exists.
//
// These are all full conversational sentences/expressions (not short
// 2-4 word collocations), so they map to Uttryck, not Fraser:
//   - ends with "?" -> category "sentence_pattern"
//   - otherwise      -> category "everyday_expression"
// object_type -> "expression", status -> "human_reviewed" (manually
// reviewed via this migration, not raw AI output) so they show up in
// the Fraser & Uttryck browsing view immediately.
//
// Usage: node scripts/migrate-flagged-phrases-to-uttryck.mjs [--commit]

const COMMIT = process.argv.includes("--commit");
const REVIEW_DOC = new URL("../Reviews/待复核-疑似短语或整句的词条清单.md", import.meta.url);
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function parseIds(markdown) {
  const ids = [];
  const rowRe = /^\|.*\| `([0-9a-f-]{36})` \|$/gm;
  let match;
  while ((match = rowRe.exec(markdown))) ids.push(match[1]);
  return ids;
}

function hasLikelyEnglishTail(text) {
  // Rough heuristic only, for reporting — not used to alter any content.
  return /\b(You|Hi|Hello|What|Have you|No,|Ah!)\b/.test(text);
}

async function main() {
  const markdown = readFileSync(REVIEW_DOC, "utf8");
  const ids = parseIds(markdown);
  console.log(`Parsed ${ids.length} ids from the review doc.`);

  const rows = [];
  for (let i = 0; i < ids.length; i += 200) {
    const batch = ids.slice(i, i + 200);
    const { data, error } = await supabase
      .from("learning_objects")
      .select("id, swedish, object_type, status")
      .in("id", batch);
    if (error) throw error;
    rows.push(...data);
  }
  console.log(`Found ${rows.length}/${ids.length} rows still in the database.`);

  const stillWord = rows.filter((row) => row.object_type === "word");
  const alreadyMoved = rows.filter((row) => row.object_type !== "word");
  console.log(`Still object_type=word: ${stillWord.length}. Already reclassified: ${alreadyMoved.length}.`);

  const suspectEnglish = stillWord.filter((row) => hasLikelyEnglishTail(row.swedish));
  if (suspectEnglish.length) {
    console.log(`\n${suspectEnglish.length} entries look like they might have English text mixed in (not touched, just flagged):`);
    suspectEnglish.forEach((row) => console.log(`  - ${row.swedish}`));
  }

  const updates = stillWord.map((row) => ({
    id: row.id,
    object_type: "expression",
    category: row.swedish.trim().endsWith("?") ? "sentence_pattern" : "everyday_expression",
    status: "human_reviewed",
  }));

  if (!COMMIT) {
    console.log(`\nDry run — would update ${updates.length} rows. Sample:`);
    console.log(JSON.stringify(updates.slice(0, 5), null, 2));
    console.log("Re-run with --commit to write these.");
    return;
  }

  for (const update of updates) {
    const { error } = await supabase
      .from("learning_objects")
      .update({ object_type: update.object_type, category: update.category, status: update.status, updated_at: new Date().toISOString() })
      .eq("id", update.id);
    if (error) throw new Error(`update failed for ${update.id}: ${JSON.stringify(error)}`);
  }
  console.log(`Updated ${updates.length} rows.`);
}

main();
