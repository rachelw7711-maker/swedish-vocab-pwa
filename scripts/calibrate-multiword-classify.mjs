// What classifyMultiword makes of the calibration set (scripts/calibrate-multiword.mjs output), for
// both AI verdicts a reading can give: how many become shared entries. Pure, offline.

import { readFileSync } from "node:fs";
import { classifyMultiword } from "../server-evidence.mjs";
const data = JSON.parse(readFileSync("data/reports/round-f/calibrate-multiword.json", "utf8"));
for (const [set, rows] of Object.entries(data)) {
  for (const verdict of ["fast_fras", "idiom"]) {
    const tally = {};
    const ents = [];
    for (const r of rows) {
      const c = classifyMultiword({ dictionary: { listing: r.listing ? { kind: r.listing, text: r.phrase } : null, example: r.example ? { text: "" } : null },
        attestation: r.attested === "failed" ? { status: "failed" } : { status: "ok", ok: r.attested, total: r.total },
        association: Array.isArray(r.assoc) ? { status: "ok", rank: r.assoc[0], lmi: r.assoc[1] } : { status: r.assoc }, ai: { verdict } });
      const k = `${c.cls || "none"}${c.review ? "?" : ""}`; tally[k] = (tally[k] || 0) + 1;
      if (c.placement === "own_entry") ents.push(r.phrase);
    }
    console.log(set.padEnd(12), verdict.padEnd(10), JSON.stringify(tally), "entries:", ents.length, set === "free" ? ents.join("; ") : "");
  }
}
