// Knowledge v2 (2026-11-09) — READ-ONLY: what the multi-word rules (server-evidence.mjs
// classifyMultiword) make of the shared library's phrases and expressions, with the dictionaries
// and Korp (free). The AI verdict is the one the entry already carries: a phrase was filed as a
// fixed phrase, an expression as an idiom. No AI, no writes; a report for the S6 review list.
//   node --env-file=.env scripts/classify-library-multiword.mjs
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { useSaldoFiles } from "../server-lexicon.mjs";
import { useReferenceFiles } from "../server-references.mjs";
import { multiwordEvidence, classifyMultiword } from "../server-evidence.mjs";
import { ordered } from "./page-order.mjs";

await useSaldoFiles();
await useReferenceFiles();
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await ordered(db.from("learning_objects").select("id, swedish, object_type, status, source").in("object_type", ["phrase", "expression"]).neq("status", "retired"), "learning_objects").range(from, from + 999);
  if (error) throw error;
  rows.push(...data);
  if (data.length < 1000) break;
}
const out = [];
const tally = {};
const add = (k) => (tally[k] = (tally[k] || 0) + 1);
// Four at a time: Korp is a shared public service, and most answers come from the cache on a rerun.
let next = 0, doneCount = 0;
async function one(r) {
  const verdict = r.object_type === "expression" ? "idiom" : "fast_fras";
  const ev = await multiwordEvidence(null, r.swedish, { timeout: 60000 }).catch((e) => ({ error: e.message }));
  const c = ev.error ? { cls: null, placement: "reading_only", review: true, reasons: [`evidence_failed:${ev.error}`] } : classifyMultiword({ ...ev, ai: { verdict } });
  return { id: r.id, swedish: r.swedish, object_type: r.object_type, status: r.status, source: r.source, cls: c.cls, placement: c.placement, review: c.review, authenticity: c.authenticity, reasons: c.reasons,
    listing: ev.dictionary?.listing?.kind || null, attested: ev.attestation?.status === "ok" ? ev.attestation.ok : ev.attestation?.status, hits: ev.attestation?.total, assoc: ev.association?.status === "ok" ? [ev.association.rank, ev.association.lmi] : ev.association?.status };
}
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < rows.length) {
    const r = rows[next++];
    const row = await one(r);
    out.push(row);
    add(`${r.status}:${row.placement}`);
    if (++doneCount % 50 === 0) console.log(doneCount, "/", rows.length, JSON.stringify(tally));
  }
}));
const file = `data/reports/round-f/classify-library-multiword-${new Date().toISOString().slice(0, 10)}.json`;
writeFileSync(file, JSON.stringify({ note: "read-only — nothing written", tally, rows: out }, null, 1));
console.log("DONE", JSON.stringify(tally), file);
