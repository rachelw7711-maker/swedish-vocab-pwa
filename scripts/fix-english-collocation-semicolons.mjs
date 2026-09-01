import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// Bug fix, zero AI cost (2026-09-01): generate-english-translations.mjs's
// output naturally used "; " to join multiple synonym glosses within one
// collocation/related-word meaning (e.g. "feel guilty; have a bad
// conscience") — normal English list style. But the app's client-side
// parser (app.js splitCollocations/splitRelatedWords) splits each
// collocations/related_words TEXT BLOB on /[\n;]+/, treating ANY semicolon
// as a new-line separator — correct for the existing Chinese content (which
// uses the full-width "；", never ASCII ";"), but wrong for this English
// content. Result: a well-formed 3-part line like
// "phrase | meaning-a; meaning-b | example" gets split into two malformed
// fragments mid-meaning, shifting phrase/meaning/example out of alignment.
// Confirmed live: "samvete"'s Fraser section showed the Swedish phrase
// replaced by English text and a hardcoded "中文释义待补" placeholder.
//
// Pure text fix: replace ";" with "," WITHIN each already-parsed
// phrase/meaning/example segment (never touching the "\n" or " | "
// structural characters themselves), for every native_language='en' row.
// No AI call needed — the underlying meaning content is unchanged.
//
// Usage: node scripts/fix-english-collocation-semicolons.mjs [--dry-run]

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY_RUN = process.argv.includes("--dry-run");

function fixField(text) {
  if (!text) return text;
  return text
    .split("\n")
    .map((line) => line.split(" | ").map((part) => part.replace(/;/g, ",")).join(" | "))
    .join("\n");
}

async function fetchAll(table, select, filter) {
  let all = [];
  for (let offset = 0; ; offset += 1000) {
    let q = supabase.from(table).select(select);
    if (filter) q = filter(q);
    const { data, error } = await q.range(offset, offset + 999);
    if (error) throw error;
    all = all.concat(data);
    if (data.length < 1000) break;
  }
  return all;
}

async function main() {
  const rows = await fetchAll("learning_object_translations", "id, collocations, related_words", (q) => q.eq("native_language", "en"));
  const fixes = [];
  for (const row of rows) {
    const fixedCollocations = fixField(row.collocations);
    const fixedRelatedWords = fixField(row.related_words);
    if (fixedCollocations !== row.collocations || fixedRelatedWords !== row.related_words) {
      fixes.push({ id: row.id, collocations: fixedCollocations, related_words: fixedRelatedWords });
    }
  }
  console.log(`${fixes.length} of ${rows.length} rows need a fix.`);
  if (DRY_RUN) {
    console.log("Dry run — sample:", JSON.stringify(fixes.slice(0, 2), null, 2));
    return;
  }
  const CHUNK = 200;
  let updated = 0;
  for (let i = 0; i < fixes.length; i += CHUNK) {
    const chunk = fixes.slice(i, i + CHUNK);
    await Promise.all(
      chunk.map(async (fix) => {
        const { error } = await supabase.from("learning_object_translations").update({ collocations: fix.collocations, related_words: fix.related_words }).eq("id", fix.id);
        if (error) throw error;
      }),
    );
    updated += chunk.length;
    console.log(`Updated ${updated}/${fixes.length}...`);
  }
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
