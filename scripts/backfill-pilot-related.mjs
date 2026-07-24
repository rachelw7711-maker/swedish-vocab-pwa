import "dotenv/config";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const entries = JSON.parse(readFileSync(process.argv[2], "utf8"));

function clean(v) { return String(v || "").trim(); }

const swedishList = entries.map((e) => clean(e.swedish));
const { data: rows, error } = await supabase
  .from("learning_objects")
  .select("id, swedish")
  .in("swedish", swedishList);
if (error) throw error;
const idBySwedish = new Map(rows.map((r) => [r.swedish, r.id]));

// Guard against backfilling onto a pre-existing row that happens to share
// the same spelling (e.g. "vara"/"ta" here, both skipped by the import step
// as already-existing) — only touch objects that don't already have a 'zh'
// translation row, never overwrite one that predates this pilot batch.
const candidateIds = [...idBySwedish.values()];
const { data: existingTranslations, error: existingError } = await supabase
  .from("learning_object_translations")
  .select("learning_object_id")
  .eq("native_language", "zh")
  .in("learning_object_id", candidateIds);
if (existingError) throw existingError;
const idsWithTranslation = new Set((existingTranslations || []).map((r) => r.learning_object_id));

const translationRows = [];
const formsRows = [];
for (const entry of entries) {
  const id = idBySwedish.get(clean(entry.swedish));
  if (!id || idsWithTranslation.has(id)) continue; // already has content — pre-existing row, not part of this pilot
  translationRows.push({
    learning_object_id: id,
    native_language: "zh",
    meaning: clean(entry.meaning_zh),
    explanation: clean(entry.explanation_zh),
    example_translation: clean(entry.example_zh),
    learning_tip: clean(entry.learning_tip_zh),
    updated_at: new Date().toISOString(),
  });
  if (Array.isArray(entry.forms)) {
    entry.forms.forEach((f, i) => {
      if (!clean(f?.form_type) || !clean(f?.form_value)) return;
      formsRows.push({
        learning_object_id: id,
        form_type: clean(f.form_type),
        form_value: clean(f.form_value),
        sort_order: i,
        updated_at: new Date().toISOString(),
      });
    });
  }
}

console.log(`Backfilling ${translationRows.length} translations, ${formsRows.length} word_forms rows.`);
if (translationRows.length) {
  const { error: e1 } = await supabase.from("learning_object_translations").insert(translationRows);
  if (e1) throw e1;
}
if (formsRows.length) {
  const { error: e2 } = await supabase.from("word_forms").insert(formsRows);
  if (e2) throw e2;
}
console.log("Done.");
