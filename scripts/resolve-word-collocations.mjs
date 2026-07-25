import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// learning_object_collocations is empty for the entire corpus, but 4,644
// words already carry a flat `collocations` text field (format
// "phrase | 中文释义 | 例句" per line, one per collocation). This parses
// that text into real rows so the Fraser/Uttryck "promote a collocation
// into a standalone learning object" workflow (promoted_object_id) has
// something to operate on. No AI calls — the content already exists,
// just not in relational form (same pattern as resolve-word-relationships).
//
// This only creates the lightweight index row (phrase_text). The rich
// meaning/example for a given phrase still lives on the parent word's
// flat `collocations` field unless/until the phrase is promoted into its
// own learning_objects row (which does carry full chinese/example_sv).
//
// Usage: node scripts/resolve-word-collocations.mjs [--commit]

const COMMIT = process.argv.includes("--commit");
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function clean(v) {
  return typeof v === "string" ? v.trim() : "";
}

function parseCollocations(text) {
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
  console.log("Loading words with collocations text...");
  const sourceWords = await fetchAll("id, swedish, collocations", (q) =>
    q.not("collocations", "is", null).neq("collocations", ""),
  );
  console.log(`${sourceWords.length} words have collocations text.`);

  const inserts = [];
  let phrasesTotal = 0;
  for (const word of sourceWords) {
    const phrases = parseCollocations(word.collocations);
    phrases.forEach((phrase_text, index) => {
      phrasesTotal++;
      inserts.push({
        learning_object_id: word.id,
        phrase_text,
        category: null,
        sort_order: index,
      });
    });
  }
  console.log(`Total collocation lines parsed: ${phrasesTotal}`);

  if (!COMMIT) {
    console.log("\nDry run — sample of first 5 inserts:");
    console.log(JSON.stringify(inserts.slice(0, 5), null, 2));
    console.log("Re-run with --commit to write these.");
    return;
  }

  for (let i = 0; i < inserts.length; i += 500) {
    const batch = inserts.slice(i, i + 500);
    const { error } = await supabase.from("learning_object_collocations").insert(batch);
    if (error) throw new Error(`insert failed: ${JSON.stringify(error)}`);
    console.log(`Inserted ${Math.min(i + 500, inserts.length)}/${inserts.length}`);
  }
  console.log("Done.");
}

main();
