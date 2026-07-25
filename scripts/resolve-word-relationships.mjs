import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// learning_object_relationships is empty for the entire corpus, but 4,647
// words already carry a `related_words` flat-text field (from the AI
// generation batches) in the format "word | 中文释义" per line. This
// resolves those mentions against existing learning_objects rows and
// writes real relationship rows — no AI calls needed, since the content
// already exists, just not in relational form. Words that don't resolve
// to an existing row (spelling variants, words outside our corpus) are
// left alone; that's expected, not an error.
//
// relationship_type is written as "related" for all rows, since the flat
// text doesn't distinguish synonym/antonym/word-family — the existing
// frontend (enhanceExtendedLearningSection) already renders "related" as
// a generic Relaterade ord entry, so this is a safe, honest default. A
// future AI-assisted pass could re-classify types if ever needed.
//
// Usage: node scripts/resolve-word-relationships.mjs [--commit]

const COMMIT = process.argv.includes("--commit");
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function clean(v) {
  return typeof v === "string" ? v.trim() : "";
}

function parseRelatedWords(text) {
  return clean(text)
    .split("\n")
    .map((line) => clean(line.split("|")[0]))
    .filter(Boolean);
}

async function fetchAll(select, filter) {
  const PAGE = 1000;
  let offset = 0;
  const rows = [];
  for (;;) {
    let query = supabase.from("learning_objects").select(select).range(offset, offset + PAGE - 1);
    if (filter) query = filter(query);
    const { data, error } = await query;
    if (error) throw error;
    if (!data.length) break;
    rows.push(...data);
    offset += PAGE;
    if (data.length < PAGE) break;
  }
  return rows;
}

async function main() {
  console.log("Loading all learning_objects for lookup index...");
  const allWords = await fetchAll("id, swedish");
  const bySwedish = new Map(); // lowercased swedish -> [id, ...]
  for (const w of allWords) {
    const key = w.swedish.toLowerCase();
    if (!bySwedish.has(key)) bySwedish.set(key, []);
    bySwedish.get(key).push(w.id);
  }
  console.log(`Lookup index: ${bySwedish.size} distinct swedish keys across ${allWords.length} rows.`);

  console.log("Loading words with related_words text...");
  const sourceWords = await fetchAll("id, swedish, related_words", (q) =>
    q.not("related_words", "is", null).neq("related_words", ""),
  );
  console.log(`${sourceWords.length} words have related_words text.`);

  const pairs = new Set(); // `${from}::${to}` to dedup, including reverse-pair collapse
  const inserts = [];
  let mentionsTotal = 0;
  let resolved = 0;
  let ambiguousSkipped = 0;
  let selfSkipped = 0;
  let notFound = 0;

  for (const word of sourceWords) {
    const mentions = parseRelatedWords(word.related_words);
    for (const mention of mentions) {
      mentionsTotal++;
      const candidates = bySwedish.get(mention.toLowerCase());
      if (!candidates || candidates.length === 0) {
        notFound++;
        continue;
      }
      if (candidates.length > 1) {
        ambiguousSkipped++;
        continue; // homograph across POS — ambiguous which sense was meant, skip rather than guess
      }
      const toId = candidates[0];
      if (toId === word.id) {
        selfSkipped++;
        continue;
      }
      const key = [word.id, toId].sort().join("::");
      if (pairs.has(key)) continue; // avoid inserting both directions of the same pair
      pairs.add(key);
      resolved++;
      inserts.push({ from_object_id: word.id, to_object_id: toId, relationship_type: "related" });
    }
  }

  console.log(`Mentions parsed: ${mentionsTotal}`);
  console.log(`Resolved to existing words: ${resolved}`);
  console.log(`Skipped (ambiguous homograph): ${ambiguousSkipped}`);
  console.log(`Skipped (self-reference): ${selfSkipped}`);
  console.log(`Skipped (not found in corpus): ${notFound}`);

  if (!COMMIT) {
    console.log("\nDry run — sample of first 5 inserts:");
    console.log(JSON.stringify(inserts.slice(0, 5), null, 2));
    console.log("Re-run with --commit to write these.");
    return;
  }

  for (let i = 0; i < inserts.length; i += 500) {
    const batch = inserts.slice(i, i + 500);
    const { error } = await supabase.from("learning_object_relationships").insert(batch);
    if (error) throw new Error(`insert failed: ${JSON.stringify(error)}`);
    console.log(`Inserted ${Math.min(i + 500, inserts.length)}/${inserts.length}`);
  }
  console.log("Done.");
}

main();
