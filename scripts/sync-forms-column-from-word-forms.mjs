import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// No AI call — pure data-consistency fix. learning_objects.forms is a
// flattened text summary of the word_forms table, generated once at
// creation time; pass 3 of the AI content review (apply-ai-pos-forms-
// corrections.mjs) updates word_forms directly but never touched this
// redundant column, so the two would silently drift out of sync for any
// word it corrected. Regenerates `forms` from the current word_forms rows
// for every ai_generated word, not just the ones pass 3 touched, so the
// whole cohort is guaranteed consistent regardless of exactly which rows
// changed.

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function loadAll(table, select, filterFn) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  while (true) {
    let query = supabase.from(table).select(select).order("id").range(from, from + pageSize - 1);
    if (filterFn) query = filterFn(query);
    const { data, error } = await query;
    if (error) throw error;
    if (!data.length) break;
    rows.push(...data);
    from += pageSize;
  }
  return rows;
}

async function main() {
  const words = await loadAll("learning_objects", "id, forms", (q) => q.eq("object_type", "word").eq("status", "ai_generated"));
  console.log(`Loaded ${words.length} ai_generated words.`);

  const formsRows = await loadAll("word_forms", "learning_object_id, form_type, form_value, sort_order");
  const byWord = new Map();
  for (const row of formsRows) {
    if (!byWord.has(row.learning_object_id)) byWord.set(row.learning_object_id, []);
    byWord.get(row.learning_object_id).push(row);
  }

  let updated = 0;
  let unchanged = 0;
  let failed = 0;
  for (const word of words) {
    const rows = (byWord.get(word.id) || []).sort((a, b) => a.sort_order - b.sort_order);
    const newForms = rows.map((r) => `${r.form_type}: ${r.form_value}`).join("; ");
    if (newForms === (word.forms || "")) {
      unchanged += 1;
      continue;
    }
    const { error } = await supabase.from("learning_objects").update({ forms: newForms }).eq("id", word.id);
    if (error) {
      failed += 1;
      console.log(`FAILED ${word.id}: ${error.message}`);
      continue;
    }
    updated += 1;
  }
  console.log(`Done. Updated: ${updated}. Already in sync: ${unchanged}. Failed: ${failed}.`);
}

main();
