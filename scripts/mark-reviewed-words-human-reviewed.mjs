import "dotenv/config";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Final step of the 2026-08-31 AI content review pipeline (Reviews/AI内容审核-
// 2026-08-31/), found missing by Rachel when she spotted "samvete" still
// showing the ai_generated badge despite having been through the full
// 5-pass review + correction pipeline. The pipeline corrected real content
// (chinese/pos/forms/collocations/grammar fields, all logged in the audit
// files in that folder) but never flipped `status` itself — the same
// status="human_reviewed" transition the existing "Markera som granskat"
// button in Profil already performs one word at a time (see
// server-words.mjs's markWordsReviewed / api/review/mark-reviewed.js).
// This applies that exact same transition in bulk, scoped to precisely the
// 4,646 word IDs that actually went through Pass 1 (ai-word-review-results.json)
// — not a blanket status filter, so it can never touch a word outside the
// reviewed set even if new ai_generated words get created later.
//
// Usage: node scripts/mark-reviewed-words-human-reviewed.mjs

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const REVIEW_PATH = new URL("../Reviews/AI内容审核-2026-08-31/ai-word-review-results.json", import.meta.url);

async function main() {
  const review = JSON.parse(readFileSync(REVIEW_PATH, "utf8"));
  const ids = review.map((w) => w.id);
  console.log(`Words to mark human_reviewed: ${ids.length}`);

  const { count: beforeCount } = await supabase
    .from("learning_objects")
    .select("id", { count: "exact", head: true })
    .eq("status", "ai_generated")
    .eq("object_type", "word");
  console.log(`Currently status=ai_generated (word): ${beforeCount}`);

  const CHUNK = 500;
  let updated = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const { data, error } = await supabase.from("learning_objects").update({ status: "human_reviewed" }).in("id", chunk).select("id");
    if (error) throw error;
    updated += data.length;
  }
  console.log(`Rows updated to human_reviewed: ${updated}`);

  const { count: afterAiCount } = await supabase
    .from("learning_objects")
    .select("id", { count: "exact", head: true })
    .eq("status", "ai_generated")
    .eq("object_type", "word");
  const { count: afterReviewedCount } = await supabase
    .from("learning_objects")
    .select("id", { count: "exact", head: true })
    .eq("status", "human_reviewed")
    .eq("object_type", "word");
  console.log(`After: status=ai_generated remaining: ${afterAiCount} | status=human_reviewed: ${afterReviewedCount}`);

  const { data: samvete } = await supabase.from("learning_objects").select("swedish,status").eq("id", "dc9a115c-bde5-47af-aa72-a1a5ce669a59").maybeSingle();
  console.log(`samvete now: ${JSON.stringify(samvete)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
