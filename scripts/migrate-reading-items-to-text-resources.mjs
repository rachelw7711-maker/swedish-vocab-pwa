import "dotenv/config";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// One-time migration: existing reading_items rows (test data from Läsning
// V1) get a text_resources row created from their source_text, and
// text_resource_id set to point at it. Old analysis (summary_sv/key_words
// etc, freestanding AI text not linked to real word_id/expression_id) is
// intentionally NOT carried over — it doesn't fit the new schema's
// principle and the user re-analyzes to get real knowledge-base-linked
// results. See Reviews/AI成本控制与阅读模块-实施计划-2026-07-26.md 决策3.

const COMMIT = process.argv.includes("--commit");
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function textHash(cleaned) {
  return createHash("sha256").update(`sv:${cleaned}`).digest("hex");
}
function wordCount(text) {
  return (text.match(/[a-zA-ZåäöÅÄÖ]+/g) || []).length;
}

async function main() {
  const { data: rows, error } = await supabase
    .from("reading_items")
    .select("id, user_id, title, source_text, text_resource_id")
    .is("text_resource_id", null);
  if (error) throw error;
  console.log(`reading_items without text_resource_id: ${rows.length}`);

  for (const row of rows) {
    const cleaned = (row.source_text || "").trim();
    if (!cleaned) {
      console.log(`SKIP ${row.id} — empty source_text`);
      continue;
    }
    console.log(`${COMMIT ? "MIGRATE" : "DRY-RUN"} ${row.id} "${row.title || cleaned.slice(0, 30)}" (${wordCount(cleaned)} words)`);
    if (!COMMIT) continue;

    const { data: resource, error: insertError } = await supabase
      .from("text_resources")
      .insert({
        user_id: row.user_id,
        source_type: "paste",
        original_text: cleaned,
        cleaned_text: cleaned,
        text_hash: textHash(cleaned),
        language: "sv",
        word_count: wordCount(cleaned),
        analysis_status: "pending",
      })
      .select()
      .single();
    if (insertError) throw insertError;

    const { error: updateError } = await supabase.from("reading_items").update({ text_resource_id: resource.id }).eq("id", row.id);
    if (updateError) throw updateError;
  }
  console.log("\nDone.");
}

main();
