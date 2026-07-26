import "dotenv/config";
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Computes, per word, exactly which SPK-DIC-001 fields it's still missing
// (run AFTER the particip reclassification so part_of_speech is stable).
// One row per word with a `needs` array — the generation script
// (fill-corpus-gaps.mjs) only asks the AI for what's actually listed here,
// so a word missing only 2 things doesn't pay for 10.

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
  "id, swedish, part_of_speech, chinese, swedish_explanation, cefr_level, countability, transitivity, adverb_form, comparison_type, passiv_s, memory_tip, usage_registers",
  (q) => q.eq("object_type", "word")
);

const exampleIds = await fetchAllPaginated("learning_object_examples", "learning_object_id").then((r) => new Set(r.map((x) => x.learning_object_id)));
const collocIds = await fetchAllPaginated("learning_object_collocations", "learning_object_id").then((r) => new Set(r.map((x) => x.learning_object_id)));
const relIds = await fetchAllPaginated("learning_object_relationships", "from_object_id").then((r) => new Set(r.map((x) => x.from_object_id)));

const gapped = [];
for (const w of words) {
  const needs = [];
  if (!w.cefr_level) needs.push("cefr_level");
  if (!exampleIds.has(w.id)) needs.push("second_example");
  if (!collocIds.has(w.id)) needs.push("collocations");
  if (!relIds.has(w.id)) needs.push("relationships");
  if (w.part_of_speech === "noun" && !w.countability) needs.push("countability");
  if (w.part_of_speech === "verb" && !w.transitivity) needs.push("transitivity");
  if (w.part_of_speech === "adjective" && !w.adverb_form) needs.push("adverb_form");
  if (w.part_of_speech === "adjective" && !w.comparison_type) needs.push("comparison_type");
  if (w.part_of_speech === "verb" && !w.passiv_s) needs.push("passiv_s");
  if (!w.memory_tip) needs.push("memory_tip");
  if (!w.usage_registers || w.usage_registers.length === 0) needs.push("usage_registers");

  if (needs.length > 0) {
    gapped.push({ id: w.id, swedish: w.swedish, part_of_speech: w.part_of_speech, chinese: w.chinese, swedish_explanation: w.swedish_explanation, needs });
  }
}

console.log(`Total words: ${words.length}`);
console.log(`Words with at least one gap: ${gapped.length}`);
const needCounts = {};
gapped.forEach((g) => g.needs.forEach((n) => (needCounts[n] = (needCounts[n] || 0) + 1)));
console.log("By field:", needCounts);
const byGapCount = {};
gapped.forEach((g) => (byGapCount[g.needs.length] = (byGapCount[g.needs.length] || 0) + 1));
console.log("Words by number of fields needed:", byGapCount);

writeFileSync(new URL("../Reviews/词库缺口清单.json", import.meta.url), JSON.stringify(gapped, null, 2));
console.log("Written to Reviews/词库缺口清单.json");
