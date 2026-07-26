import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// Admin-only curation tool (SPK-ADR-001/SPK-SPEC-003 V1 scope: no
// user-facing "share" button — only an explicit admin action can promote a
// reading analysis into the reusable Public Knowledge Library). Marks
// text_analysis.visibility = 'public' for a given text_resource. The
// underlying article text (text_resources.original_text/cleaned_text)
// stays private to its original submitter regardless — only the
// structured knowledge (selected_vocabulary/selected_expressions/summary)
// becomes reusable.
//
// Usage:
//   node scripts/curate-public-reading-analysis.mjs --list                 # show private analyses with a title/snippet to review
//   node scripts/curate-public-reading-analysis.mjs --resource-id <id>     # promote one to public
//   node scripts/curate-public-reading-analysis.mjs --resource-id <id> --revoke   # demote back to private

const args = process.argv.slice(2);
function flagValue(name) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : undefined;
}
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function list() {
  const { data, error } = await supabase
    .from("text_analysis")
    .select("id, text_resource_id, visibility, selected_vocabulary, selected_expressions, summary_sv, text_resources(word_count, cleaned_text, source_type)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  data.forEach((row) => {
    const snippet = (row.text_resources?.cleaned_text || "").slice(0, 60).replace(/\n/g, " ");
    console.log(
      `[${row.visibility}] resource=${row.text_resource_id} words=${row.text_resources?.word_count} vocab=${(row.selected_vocabulary || []).length} expr=${(row.selected_expressions || []).length} — "${snippet}..."`,
    );
  });
}

async function setVisibility(resourceId, visibility) {
  const { data, error } = await supabase
    .from("text_analysis")
    .update({ visibility })
    .eq("text_resource_id", resourceId)
    .select();
  if (error) throw error;
  console.log(`Updated ${data.length} analysis row(s) for resource ${resourceId} to visibility="${visibility}".`);
}

async function main() {
  if (args.includes("--list")) {
    await list();
    return;
  }
  const resourceId = flagValue("resource-id");
  if (!resourceId) {
    console.log("Usage: --list | --resource-id <id> [--revoke]");
    return;
  }
  await setVisibility(resourceId, args.includes("--revoke") ? "private" : "public");
}

main();
