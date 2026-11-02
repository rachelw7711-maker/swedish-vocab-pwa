// Real-model evaluation of the AI sense check against hand-checked cases (tests/fixtures/sense-gold.json).
// usage: node --env-file=.env scripts/eval-sense-check.mjs [runs]   — no database writes.
import { readFileSync } from "node:fs";
import { aiSenseCheck, wiktionaryEvidence } from "../server-language-checks.mjs";
import { saldoPartsOfSpeech } from "../server-lexicon.mjs";
import { lookupWiktionary } from "../server-wiktionary.mjs";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const gold = JSON.parse(readFileSync(new URL("../tests/fixtures/sense-gold.json", import.meta.url), "utf8")).cases;
const runs = Number(process.argv[2] || 1);
const items = [];
for (const g of gold) {
  // Shuffled order on purpose, so a wrong match between items would show.
  items.push({ id: g.id, lemma: g.lemma, pos: g.pos, entry: g.entry,
    references: { saldo_pos: await saldoPartsOfSpeech(sb, g.lemma), wiktionary: wiktionaryEvidence(await lookupWiktionary(sb, g.lemma)) } });
}
const tally = { tp: 0, fp: 0, fn: 0, tn: 0, failures: 0, wrongKind: [] };
const totals = { calls: 0, cost: 0, retries: 0 };
for (let run = 0; run < runs; run += 1) {
  const order = [...items].sort(() => Math.random() - 0.5);
  const { checks, failures, usage } = await aiSenseCheck(null, order);
  totals.calls += usage.calls; totals.cost += usage.cost; totals.retries += usage.retries;
  for (const g of gold) {
    const c = checks.get(g.id);
    if (!c) { tally.failures += 1; console.log("FAILED", g.id, failures.get(g.id)); continue; }
    const found = [];
    if (c.other_pos_senses.length || !c.pos_supported) found.push("other_pos_sense");
    if (c.examples.some((x) => !x.translation_zh_ok || !x.translation_en_ok)) found.push("translation");
    const flagged = found.length > 0 || c.verdict !== "ok";
    if (g.bad.length && flagged) { tally.tp += 1; for (const k of g.bad) if (!found.includes(k)) tally.wrongKind.push(`${g.id}: missed ${k}`); }
    else if (g.bad.length) { tally.fn += 1; console.log("MISSED", g.id, c.note); }
    else if (flagged) { tally.fp += 1; console.log("FALSE ALARM", g.id, found, c.note); }
    else tally.tn += 1;
  }
}
const precision = tally.tp / Math.max(1, tally.tp + tally.fp), recall = tally.tp / Math.max(1, tally.tp + tally.fn);
console.log(JSON.stringify({ runs, cases: gold.length, ...tally, precision: +precision.toFixed(3), recall: +recall.toFixed(3), ...totals, cost: +totals.cost.toFixed(4) }, null, 1));
