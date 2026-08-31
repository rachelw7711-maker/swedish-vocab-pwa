// AI-content-review Option B (2026-08-31): zero-AI-cost structural sanity
// check — cross-reference SpråkLab's stored part_of_speech against SALDO's
// own partOfSpeech tag for the same written form. This only ever produces
// a report of candidate mismatches for human follow-up; it never writes
// to the database.
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SALDO_PATH = "/Users/huijingwang/Desktop/临时文件/SpråkLab Language Resources/saldo.xml";

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// SALDO POS tags -> the SpråkLab part_of_speech categories they can confirm.
// presens_particip/perfekt_particip/phrase/abbreviation/other are
// deliberately left unmapped (too ambiguous in SALDO's own tagset to check
// reliably) — for those we only report SALDO coverage, not a match/mismatch.
const SALDO_TO_SPRAKLAB = {
  nn: ["noun"],
  vb: ["verb"],
  // SALDO has no separate participle category — adjectival participles are
  // just tagged "av" there, so both of SpråkLab's participle categories
  // (a real SPK-DIC-001 distinction SALDO doesn't make) count as a match.
  av: ["adjective", "presens_particip", "perfekt_particip"],
  ab: ["adverb"],
  pn: ["pronoun"],
  ps: ["pronoun"],
  pp: ["preposition"],
  kn: ["conjunction"],
  sn: ["conjunction"],
  in: ["interjection"],
  nl: ["numeral"],
  rg: ["numeral"],
  ro: ["numeral"],
};

function parseSaldo(path) {
  console.log("Reading SALDO XML (this file is ~74MB, may take a moment)...");
  const xml = readFileSync(path, "utf-8");
  const map = new Map(); // lowercased writtenForm -> Set of SALDO POS tags
  const lemmaBlockRe = /<Lemma>([\s\S]*?)<\/Lemma>/g;
  const formRe = /<FormRepresentation>([\s\S]*?)<\/FormRepresentation>/;
  const writtenFormRe = /att="writtenForm" val="([^"]*)"/;
  const posRe = /att="partOfSpeech" val="([^"]*)"/;
  let match;
  let count = 0;
  while ((match = lemmaBlockRe.exec(xml)) !== null) {
    const firstForm = formRe.exec(match[1]);
    if (!firstForm) continue;
    const wf = writtenFormRe.exec(firstForm[1]);
    const pos = posRe.exec(firstForm[1]);
    if (!wf || !pos) continue;
    const key = wf[1].toLocaleLowerCase("sv-SE");
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(pos[1]);
    count += 1;
  }
  console.log(`Parsed ${count} SALDO lemma entries, ${map.size} unique written forms.`);
  return map;
}

async function loadAllWords() {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  while (true) {
    const { data, error } = await supabase
      .from("learning_objects")
      .select("id, swedish, part_of_speech, status")
      .eq("object_type", "word")
      .order("id")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data.length) break;
    rows.push(...data);
    from += pageSize;
  }
  return rows;
}

async function main() {
  const saldoMap = parseSaldo(SALDO_PATH);
  const words = await loadAllWords();
  console.log(`Checking ${words.length} SpråkLab word entries against SALDO...`);

  const mismatches = [];
  const notInSaldo = [];
  let checked = 0;
  let confirmed = 0;
  let skippedAmbiguousPos = 0;

  for (const word of words) {
    const key = (word.swedish || "").toLocaleLowerCase("sv-SE");
    const saldoTags = saldoMap.get(key);
    if (!saldoTags) {
      notInSaldo.push(word);
      continue;
    }
    const expectedSpraklabPos = new Set();
    for (const tag of saldoTags) {
      for (const p of SALDO_TO_SPRAKLAB[tag] || []) expectedSpraklabPos.add(p);
    }
    if (expectedSpraklabPos.size === 0) {
      // SALDO only had tags we don't map (e.g. purely proper-noun/interjection
      // edge cases) — not a reliable check either way.
      skippedAmbiguousPos += 1;
      continue;
    }
    checked += 1;
    if (expectedSpraklabPos.has(word.part_of_speech)) {
      confirmed += 1;
    } else {
      mismatches.push({
        id: word.id,
        swedish: word.swedish,
        spraklab_pos: word.part_of_speech,
        saldo_pos_tags: [...saldoTags],
        saldo_expected_spraklab_pos: [...expectedSpraklabPos],
        status: word.status,
      });
    }
  }

  console.log(`\n=== Results ===`);
  console.log(`Total words: ${words.length}`);
  console.log(`Not found in SALDO (no coverage, not checkable): ${notInSaldo.length}`);
  console.log(`Found but SALDO POS tag not in our mapping (skipped): ${skippedAmbiguousPos}`);
  console.log(`Checked (POS comparable): ${checked}`);
  console.log(`  Confirmed matching: ${confirmed}`);
  console.log(`  Candidate mismatches: ${mismatches.length}`);

  writeFileSync(
    "scripts/output/saldo-pos-mismatches.json",
    JSON.stringify({ generatedAt: new Date().toISOString(), summary: { total: words.length, notInSaldo: notInSaldo.length, skippedAmbiguousPos, checked, confirmed, mismatches: mismatches.length }, mismatches }, null, 2),
  );
  console.log(`\nWrote scripts/output/saldo-pos-mismatches.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
