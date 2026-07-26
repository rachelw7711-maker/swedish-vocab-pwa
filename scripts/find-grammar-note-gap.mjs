import "dotenv/config";
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// grammar_note (SPK-DIC-001 §3, noun-specific) was added as a column
// (20260726100000 migration) but got missed from find-corpus-gaps.mjs's
// needs list — this catches it as its own small follow-up run.

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAllPaginated(table, select, filters = (q) => q) {
  let all = [];
  let from = 0;
  while (true) {
    let q = supabase.from(table).select(select);
    q = filters(q);
    q = q.order("id").range(from, from + 999);
    const { data, error } = await q;
    if (error) throw error;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

const nouns = await fetchAllPaginated(
  "learning_objects",
  "id, swedish, part_of_speech, chinese, swedish_explanation, grammar_note",
  (q) => q.eq("object_type", "word").eq("part_of_speech", "noun")
);
const missing = nouns.filter((n) => !n.grammar_note);
console.log(`Nouns total: ${nouns.length}, missing grammar_note: ${missing.length}`);
writeFileSync(new URL("../Reviews/名词grammar_note缺口清单.json", import.meta.url), JSON.stringify(missing, null, 2));
