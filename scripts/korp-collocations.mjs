// Korp evidence for every collocation and expression the baseline audit (scripts/baseline-audit.mjs)
// found without a dictionary listing — zero AI, Korp is Språkbanken's free public API. Each distinct
// phrase is asked once (file cache data/reports/korp-cache shared by every script), CONCURRENCY at a
// time; resumable (phrases already in the output are skipped); stops cleanly on SIGINT.
// Per phrase: the corpus count of the sequence (existence — never fixedness) and the association of
// its content words (Korp relations: how typical the combination is). Results:
//   attested     the sequence is in the corpora (judgeAttestation)
//   not_found    asked, no or too few hits — NOT evidence that it is wrong
//   failed       Korp did not answer: retry
//   form_n/a     one content word left (slots, reflexives): a count says nothing about a combination
//   node --env-file=.env scripts/korp-collocations.mjs [--concurrency 4] [--limit N]
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { useSaldoFiles } from "../server-lexicon.mjs";
import { useReferenceFiles } from "../server-references.mjs";
import { multiwordEvidence } from "../server-evidence.mjs";

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const CONCURRENCY = Number(arg("--concurrency", 4));
// --limit N: at most N phrases this run (0 is zero, not "all": an inventory without asking Korp).
const LIMIT = process.argv.includes("--limit") ? Number(arg("--limit")) : Infinity;
const OUT = "data/reports/round-g/korp-collocations.ndjson";
const STATS = "data/reports/round-g/korp-collocations-stats.json";
delete process.env.KORP_OFFLINE;
await useSaldoFiles();
await useReferenceFiles("data/reference");

// The phrases: collocations without a dictionary listing, expressions whose lookup failed.
const WANT = new Set(["no_dictionary_evidence", "only_in_dictionary_example", "headword_form_not_found", "headword_only_in_compound", "korp_lookup_failed"]);
const phrases = new Map();
for (const line of readFileSync("data/reports/round-g/baseline-audit.ndjson", "utf8").split("\n")) {
  if (!line) continue;
  const r = JSON.parse(line);
  for (const f of r.findings) if (WANT.has(f.code)) {
    const p = f.code === "korp_lookup_failed" ? r.swedish : f.phrase;
    if (!p || !/\s/.test(p.trim())) continue;
    const k = p.trim().toLowerCase();
    (phrases.get(k) || phrases.set(k, { phrase: p.trim(), entries: [] }).get(k)).entries.push(r.id);
  }
}
if (!existsSync(OUT)) writeFileSync(OUT, "");
const done = new Set(readFileSync(OUT, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).key));
// Phrases shared by more entries first: a run stopped early has covered the most cards.
const todo = [...phrases].filter(([k]) => !done.has(k)).sort((a, b) => b[1].entries.length - a[1].entries.length).slice(0, LIMIT);

// Every request to Korp, cached or not (the cache answers before fetch is called).
const stats = existsSync(STATS) ? JSON.parse(readFileSync(STATS, "utf8")) : { runs: 0, requests: 0, failedRequests: 0, phrases: 0, ms: 0, results: {} };
stats.runs++;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const korp = String(url).includes("spraakbanken.gu.se") || String(url).includes("korp");
  if (korp) stats.requests++;
  try { return await realFetch(url, init); } catch (e) { if (korp) stats.failedRequests++; throw e; }
};
console.log({ distinct: phrases.size, done: done.size, now: todo.length, concurrency: CONCURRENCY });

let stop = false;
process.on("SIGINT", () => { stop = true; console.log("stopping after the running phrases …"); });
const t0 = Date.now();
let i = 0;
async function worker() {
  while (!stop && i < todo.length) {
    const [key, { phrase, entries }] = todo[i++];
    const s = Date.now();
    // Two steps: the association first (Korp relations, cached per lemma: fast); a pair Korp
    // lists together is attested by co-occurrence and needs no sequence count. Otherwise the count
    // (several seconds) says whether the sequence occurs at all.
    let ev = await multiwordEvidence(null, phrase, { timeout: 120000, need: "for", verdict: "fixed" }).catch((e) => ({ error: String(e.message || e) }));
    const paired = !ev.error && ev.association?.status === "ok" && ev.association.rank != null;
    if (!paired && !ev.dictionary?.listing) ev = await multiwordEvidence(null, phrase, { timeout: 120000 }).catch((e) => ({ error: String(e.message || e) }));
    if (paired) ev.attestation = { status: "by_association" };
    const a = ev.attestation, as = ev.association;
    const result = ev.dictionary?.listing ? "dictionary_listed" : a?.status === "by_association" ? "associated" : ev.error || a?.status === "failed" ? "failed" : a?.status === "not_applicable" ? "form_n/a" : a?.ok ? "attested" : "not_found";
    const row = { key, phrase, entries: entries.length, result, total: a?.total ?? null, association: as ? { status: as.status, rank: as.rank ?? null, lmi: as.lmi ?? null } : null,
      listing: ev.dictionary?.listing ? ev.dictionary.listing.kind : null, error: ev.error || null, ms: Date.now() - s };
    appendFileSync(OUT, JSON.stringify(row) + "\n");
    stats.phrases++; stats.results[result] = (stats.results[result] || 0) + 1;
    if (stats.phrases % 200 === 0) { stats.ms += Date.now() - t0; writeFileSync(STATS, JSON.stringify(stats, null, 1)); console.log(stats.phrases, JSON.stringify(stats.results), `requests ${stats.requests}`); }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
stats.lastRunMs = Date.now() - t0;
writeFileSync(STATS, JSON.stringify(stats, null, 1));
console.log("done", stats);
