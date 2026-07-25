import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// Applies the corrections computed by scripts/scan-verb-conjugation-errors.mjs
// (same detection/fix logic, re-run here so this script has no dependency on
// a stale generated file). Dry-run by default; pass --commit to write.
//
// Updates, per flagged row:
//   - `forms` column (structured text field) — set to the corrected string
//     even if it was empty before, since the correction is derived from
//     the SAME source (note-embedded forms) either way.
//   - the "Forms:" section embedded in `note`, so the two stay consistent
//     (note is still what most read paths fall back to for un-resaved rows).
//   - `word_forms` rows (infinitive/present/preteritum/supinum), if any
//     already exist for this learning_object_id.
// Only touches the 75/78 rows with a confident suggestion — the 3 exceptions
// (spå/utse/övergå) are structurally excluded, same as the scan.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const COMMIT = process.argv.includes("--commit");

function clean(v) {
  return String(v || "").trim();
}

function readNoteSection(note, label) {
  const text = clean(note);
  if (!text) return "";
  const pattern = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n\\n[A-Z][^\\n:]+:|$)`);
  return clean(text.match(pattern)?.[1]);
}

function extractForms(row) {
  const raw = clean(row.forms) || readNoteSection(row.note, "Forms");
  if (!raw) return null;
  const fields = {};
  for (const part of raw.split(/[;\n]+/)) {
    const [rawLabel, ...rest] = part.split(":");
    if (!rest.length) continue;
    fields[clean(rawLabel).toLowerCase()] = clean(rest.join(":"));
  }
  return {
    infinitiv: fields["infinitiv"] || "",
    presens: fields["presens"] || "",
    preteritum: fields["preteritum"] || "",
    supinum: fields["supinum"] || "",
  };
}

const VOWELS = "aeiouyåäö";
function isBuggyPresensEnding(presens) {
  if (presens.length < 2 || !presens.endsWith("r")) return false;
  if (/(ar|er)$/.test(presens)) return false;
  return !VOWELS.includes(presens[presens.length - 2].toLowerCase());
}

function suggestFix(infinitiv, preteritum, supinum) {
  if (!infinitiv.toLowerCase().endsWith("a")) return null;
  const stem = infinitiv.slice(0, -1);
  const suggestion = { presens: `${stem}ar`, preteritum, supinum };
  if (preteritum.toLowerCase() === `${stem}de`.toLowerCase()) suggestion.preteritum = `${stem}ade`;
  if (supinum.toLowerCase() === `${stem}t`.toLowerCase()) suggestion.supinum = `${stem}at`;
  return suggestion;
}

function replaceFormsSectionInNote(note, correctedFormsLine) {
  const text = clean(note);
  if (!text) return text;
  const pattern = /Forms:\s*([\s\S]*?)(?=\n\n[A-Z][^\n:]+:|$)/;
  if (!pattern.test(text)) return text;
  return text.replace(pattern, `Forms:\n${correctedFormsLine}`);
}

async function fetchAllVerbs() {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    const { data, error } = await supabase
      .from("learning_objects")
      .select("id, swedish, forms, note")
      .eq("part_of_speech", "verb")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Supabase fetch failed: ${JSON.stringify(error)}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

const rows = await fetchAllVerbs();
const fixes = [];
for (const row of rows) {
  const forms = extractForms(row);
  if (!forms || !forms.presens || !forms.infinitiv) continue;
  if (!isBuggyPresensEnding(forms.presens)) continue;
  const suggestion = suggestFix(forms.infinitiv, forms.preteritum, forms.supinum);
  if (!suggestion) continue; // the 3 spå/utse/övergå-style exceptions
  const correctedFormsLine = `infinitiv: ${forms.infinitiv}; presens: ${suggestion.presens}; preteritum: ${suggestion.preteritum}; supinum: ${suggestion.supinum}`;
  fixes.push({
    id: row.id,
    swedish: row.swedish,
    before: `${forms.infinitiv}/${forms.presens}/${forms.preteritum}/${forms.supinum}`,
    after: `${forms.infinitiv}/${suggestion.presens}/${suggestion.preteritum}/${suggestion.supinum}`,
    newForms: correctedFormsLine,
    newNote: replaceFormsSectionInNote(row.note, correctedFormsLine),
    suggestion,
  });
}

console.log(`Scanned ${rows.length} verbs, ${fixes.length} confident fixes to apply.`);
console.log(`Mode: ${COMMIT ? "COMMIT" : "DRY RUN (pass --commit to apply)"}`);
console.log("");
for (const fix of fixes.slice(0, 8)) {
  console.log(`${fix.swedish}: ${fix.before}  ->  ${fix.after}`);
}
if (fixes.length > 8) console.log(`... and ${fixes.length - 8} more`);

if (!COMMIT) {
  console.log("\nDry run complete. Re-run with --commit to write these fixes.");
  process.exit(0);
}

// Also patch any existing word_forms rows for these ids.
const ids = fixes.map((f) => f.id);
const { data: existingFormRows, error: formsFetchError } = await supabase
  .from("word_forms")
  .select("id, learning_object_id, form_type")
  .in("learning_object_id", ids);
if (formsFetchError) throw new Error(`word_forms fetch failed: ${JSON.stringify(formsFetchError)}`);
const formRowsByObjectId = new Map();
for (const row of existingFormRows || []) {
  if (!formRowsByObjectId.has(row.learning_object_id)) formRowsByObjectId.set(row.learning_object_id, []);
  formRowsByObjectId.get(row.learning_object_id).push(row);
}

let updatedCount = 0;
let wordFormsUpdatedCount = 0;
for (const fix of fixes) {
  const { error } = await supabase
    .from("learning_objects")
    .update({ forms: fix.newForms, note: fix.newNote, updated_at: new Date().toISOString() })
    .eq("id", fix.id);
  if (error) throw new Error(`learning_objects update failed for ${fix.swedish}: ${JSON.stringify(error)}`);
  updatedCount += 1;

  const existingForThisWord = formRowsByObjectId.get(fix.id) || [];
  const valueByType = {
    present: fix.suggestion.presens,
    preteritum: fix.suggestion.preteritum,
    supinum: fix.suggestion.supinum,
  };
  for (const wfRow of existingForThisWord) {
    if (!(wfRow.form_type in valueByType)) continue;
    const { error: wfError } = await supabase
      .from("word_forms")
      .update({ form_value: valueByType[wfRow.form_type], updated_at: new Date().toISOString() })
      .eq("id", wfRow.id);
    if (wfError) throw new Error(`word_forms update failed for ${fix.swedish}/${wfRow.form_type}: ${JSON.stringify(wfError)}`);
    wordFormsUpdatedCount += 1;
  }
}

console.log(`\nDone. Updated ${updatedCount} learning_objects rows and ${wordFormsUpdatedCount} word_forms rows.`);
