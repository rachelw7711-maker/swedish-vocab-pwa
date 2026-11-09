// Calibration of the multi-word evidence (knowledge v2, 2026-11-09): for labelled combinations —
// free ones withdrawn from the shared library, kept expressions, Lexin idioms — what the
// dictionaries and Korp (free) say. No AI, no database writes. Writes data/reports/round-f/calibrate-multiword.json.
//   node scripts/calibrate-multiword.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { useSaldoFiles } from "../server-lexicon.mjs";
import { useReferenceFiles } from "../server-references.mjs";
import { multiwordEvidence } from "../server-evidence.mjs";
await useSaldoFiles();
await useReferenceFiles();
const hide = JSON.parse(readFileSync("data/reports/round-e/reading-hide.json", "utf8"));
const keep = JSON.parse(readFileSync("data/reports/round-e/reading-keep-reviewed.json", "utf8"));
const sets = {
  free: [...hide.filter((h) => /free combination/.test(h.why)).map((h) => h.swedish), "växande intresse", "ta flera beslut", "sätta upp regler för något", "gå ner till stranden", "liknande system", "tända eldar"],
  kept: keep.map((k) => k.swedish),
  typical: ["tända eld", "fatta beslut", "starkt kaffe", "dricka kaffe", "stort intresse", "ställa en fråga", "borsta tänderna", "tvätta händerna", "lägga märke till", "dra slutsatser"],
  lexin_idiom: ["gå i taket", "ta illa upp", "slå två flugor i en smäll", "ha hand om något", "lägga näsan i blöt", "ta det lugnt", "hålla tummarna", "gå som på räls", "stå på sig", "ge upp"],
};
const out = {};
for (const [set, list] of Object.entries(sets)) {
  out[set] = [];
  for (const phrase of list) {
    const ev = await multiwordEvidence(null, phrase, { timeout: 60000 });
    out[set].push({ phrase, listing: ev.dictionary.listing?.kind || null, example: Boolean(ev.dictionary.example), attested: ev.attestation.status === "ok" ? ev.attestation.ok : "failed", total: ev.attestation.total, assoc: ev.association.status === "ok" ? [ev.association.rank, ev.association.lmi, ev.association.rel] : ev.association.status });
    console.log(set.padEnd(12), phrase.padEnd(32), JSON.stringify(out[set].at(-1)).slice(phrase.length + 13));
  }
}
writeFileSync("data/reports/round-f/calibrate-multiword.json", JSON.stringify(out, null, 1));
