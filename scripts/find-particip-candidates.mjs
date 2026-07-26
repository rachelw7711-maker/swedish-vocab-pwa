import "dotenv/config";
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Regex-narrows the full corpus down to a candidate pool of verb/adjective-
// tagged words that LOOK like presens/perfekt particip forms, per SPK-DIC-001
// §6-7 (see Reviews/SPK-DIC-001-完整标准核对与任务清单-2026-07-26.md). This
// heuristic is deliberately wide (some false positives expected) — the AI
// classification pass in classify-particip-candidates.mjs makes the real
// yes/no call per word. Cheaper than running AI classification over the
// whole 10,097-word corpus.

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

const words = await fetchAllPaginated(
  "learning_objects",
  "id, swedish, part_of_speech, chinese, swedish_explanation",
  (q) => q.eq("object_type", "word").in("part_of_speech", ["verb", "adjective"])
);

const perfektPattern = /(ad|ade|ат|en|na|dd|dda|tt|tta)$/i;
const presensPattern = /(ande|ende)$/i;

const candidates = words.filter((w) => presensPattern.test(w.swedish) || perfektPattern.test(w.swedish));
console.log(`Total verb/adjective words: ${words.length}`);
console.log(`Candidates (regex-matched): ${candidates.length}`);

writeFileSync(
  new URL("../Reviews/分词候选词清单.json", import.meta.url),
  JSON.stringify(candidates, null, 2)
);
console.log("Written to Reviews/分词候选词清单.json");
