import "dotenv/config";
import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

// One-off backfill: Kelly_M3_CEFR.xls is itself frequency-ordered (its `ID`
// column is the rank; SweWaC/T2-sourced rows also carry a real WPM value).
// generate-vocab-content.mjs never wrote frequency_rank/frequency_band
// during the 6 CEFR batches even though the columns existed — this fills
// that gap directly from the Kelly source file, no AI calls needed.
//
// Usage: node scripts/backfill-kelly-frequency.mjs [--commit]

const COMMIT = process.argv.includes("--commit");
const KELLY_PATH =
  "/Users/huijingwang/Desktop/临时文件/SpråkLab Language Resources/Swedish-Kelly_M3_CEFR.xls";

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Same Kelly wordClass -> our pos taxonomy mapping as generate-vocab-content.mjs.
const POS_MAP = {
  numeral: "numeral",
  adjective: "adjective",
  "noun-en": "noun",
  "noun-ett": "noun",
  noun: "noun",
  "proper name": "other",
  conj: "conjunction",
  verb: "verb",
  prep: "preposition",
  pronoun: "pronoun",
  det: "pronoun",
  subj: "conjunction",
  adverb: "adverb",
  particle: "adverb",
  interj: "interjection",
  "aux verb": "verb",
};

function band(rank) {
  if (rank <= 500) return "Kelly Top 500";
  if (rank <= 1000) return "Kelly Top 1000";
  if (rank <= 2000) return "Kelly Top 2000";
  if (rank <= 4000) return "Kelly Top 4000";
  return "Kelly Top 8425";
}

function loadKelly() {
  const wb = XLSX.readFile(KELLY_PATH);
  const sheet = wb.Sheets["Swedish_M3_CEFR"];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const [, ...dataRows] = rows;
  const byKey = new Map(); // `${swedish}::${pos}` -> { rank, band }
  for (const row of dataRows) {
    const [id, , , , , , lemma, wordClass] = row;
    if (!lemma || !id) continue;
    const pos = POS_MAP[String(wordClass || "").trim()];
    if (!pos) continue;
    const swedish = String(lemma).trim();
    const key = `${swedish}::${pos}`;
    // Kelly is already frequency-ordered; keep the first (highest-freq) hit.
    if (!byKey.has(key)) byKey.set(key, { rank: id, band: band(id) });
  }
  return byKey;
}

async function main() {
  const kellyByKey = loadKelly();
  console.log(`Kelly lookup table: ${kellyByKey.size} (swedish, pos) keys.`);

  const PAGE = 1000;
  let offset = 0;
  let scanned = 0;
  let matched = 0;
  const updates = [];
  for (;;) {
    const { data, error } = await supabase
      .from("learning_objects")
      .select("id, swedish, part_of_speech, frequency_rank")
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    if (!data.length) break;
    for (const row of data) {
      scanned++;
      if (row.frequency_rank != null) continue; // don't clobber anything already set
      const hit = kellyByKey.get(`${row.swedish}::${row.part_of_speech}`);
      if (!hit) continue;
      matched++;
      updates.push({ id: row.id, frequency_rank: hit.rank, frequency_band: hit.band });
    }
    offset += PAGE;
  }
  console.log(`Scanned ${scanned} learning_objects rows, ${matched} matched a Kelly entry.`);

  if (!COMMIT) {
    console.log("Dry run — sample of first 5 updates:");
    console.log(JSON.stringify(updates.slice(0, 5), null, 2));
    console.log("Re-run with --commit to write these.");
    return;
  }

  for (let i = 0; i < updates.length; i += 200) {
    const batch = updates.slice(i, i + 200);
    await Promise.all(
      batch.map((u) =>
        supabase
          .from("learning_objects")
          .update({ frequency_rank: u.frequency_rank, frequency_band: u.frequency_band })
          .eq("id", u.id)
          .then(({ error }) => {
            if (error) throw new Error(`update failed for ${u.id}: ${JSON.stringify(error)}`);
          }),
      ),
    );
    console.log(`Updated ${Math.min(i + 200, updates.length)}/${updates.length}`);
  }
  console.log("Done.");
}

main();
