// Round G (2026-11-12, owner's items B and C): a sense the first Korp check did not show, checked on its
// own. The first check read 12 random sentences of the word — a less common sense seldom among them. Here
// 36 other sentences (another random seed) are read by the same two readers (judgeSenseFromSentences:
// every gloss of the card offered, so a sentence of another sense goes there, not to the one asked about),
// and only the senses still open are counted: a sense is attested with ≥2 sentences both readers confirm.
// Ledgered: target korp_sense_targeted, check korp-sense-targeted-1 (identity: the meaning and the query,
// so the same question is never paid twice). Which cards: sense-apply results whose only open senses are
// "ai_consistent" — the core (first) sense already verified (B), or (--core) the core itself open (C).
// Nothing is written to a card here: sense-apply.mjs reads these checks with the first ones.
//   node --env-file=.env scripts/sense-targeted.mjs --from <sense-apply results.json>[,…] --max-usd <cap> [--tag t] [--core] [--limit n]
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { useSaldoFiles } from "../server-lexicon.mjs";
import { korpAttestation, korpCqp, korpSentences, judgeSenseFromSentences, meaningParts } from "../server-korp.mjs";
import { callOpenAIJson } from "../server-native.mjs";
import { openaiCost } from "../server-prices.mjs";
import { ledgeredCheck } from "../server-check-ledger.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
const opt = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const TAG = opt("--tag") || "round_g_fix", MAX_USD = Number(opt("--max-usd") || 0), CORE = process.argv.includes("--core"), LIMIT = Number(opt("--limit")) || Infinity;
if (!(MAX_USD > 0)) throw new Error("--max-usd required");
await useSaldoFiles();
const spent = async () => { let s = 0; for (let i = 0; ; i += 1000) { const d = must(await db.from("knowledge_checks").select("cost_usd").eq("rule_version", TAG).order("id").range(i, i + 999)); s += d.reduce((a, r) => a + Number(r.cost_usd), 0); if (d.length < 1000) return s; } };

const cards = [];
for (const f of opt("--from").split(",")) for (const [id, r] of Object.entries(JSON.parse(readFileSync(f, "utf8")).results)) {
  if (r.outcome !== "partial_kept") continue;
  const open = r.reasons || [];
  if (!open.length || !open.every((x) => /^sense\d+_ai_consistent$/.test(x))) continue;   // a pairing or language problem first
  const core = open.includes("sense0_ai_consistent");
  if (core === CORE) cards.push({ id, swedish: r.swedish, senses: r.senses, open: r.senses.filter((s) => s.grade !== "verified").flatMap((s) => s.en) });
}
console.log({ cards: cards.length, mode: CORE ? "core open (C)" : "core verified, others open (B)", spentBefore: +(await spent()).toFixed(4) });

const out = [];
let stop = false;
const todo = cards.slice(0, LIMIT);
await Promise.all([1, 2, 3].map(async () => {
  while (todo.length && !stop) {
    const c = todo.shift();
    try {
      if ((await spent()) >= MAX_USD) { stop = true; break; }
      const o = must(await db.from("learning_objects").select("swedish, part_of_speech, object_type").eq("id", c.id).single());
      const m = Object.fromEntries(must(await db.from("learning_object_translations").select("native_language, meaning").eq("learning_object_id", c.id)).map((x) => [x.native_language, x.meaning]));
      const pos = o.object_type === "word" ? o.part_of_speech : null;
      const forms = must(await db.from("word_forms").select("form_value").eq("learning_object_id", c.id)).map((f) => f.form_value);
      const att = await korpAttestation(o.swedish, { forms });
      const cqp = att.match === "multiword" ? att.cqp : korpCqp(o.swedish, pos, { spelling: att.match === "spelling", forms });
      const sentences = await korpSentences(cqp, { count: 36, seed: 11 });
      if (sentences.length < 6) { out.push({ id: c.id, swedish: c.swedish, outcome: "too_few_sentences", n: sentences.length }); continue; }
      const r = await ledgeredCheck(db, { learningObjectId: c.id, headword: o.swedish, pos, field: "sense", senseRef: c.open.join("; "), target: "korp_sense_targeted",
        identity: { meaning_en: m.en, meaning_zh: m.zh, open: c.open, cqp }, input: { meaning_en: m.en, meaning_zh: m.zh, open: c.open, cqp, sentences },
        checkVersion: "korp-sense-targeted-1", ruleVersion: TAG, model: "gpt-5.4-mini" }, async () => {
        let cost = 0, calls = 0; const usage = [];
        const ai = async (args) => { const { result, usage: u } = await callOpenAIJson(args); const k = openaiCost(u, "gpt-5.4-mini"); cost += k.cost; calls++; usage.push({ input: k.input, cached: k.cached, output: k.output }); return result; };
        try {
          const j = await judgeSenseFromSentences({ word: o.swedish, pos, meaningZh: m.zh || "", meaningEn: m.en || "", sentences }, ai, { tokens: [5000, 6000] });
          return { result: { parts: j.parts, unattested: j.unattested, perPart: j.perPart, corpora: j.corpora, readings: j.readings }, costUsd: cost, calls, usage };
        } catch (e) { e.costUsd = cost; e.calls = calls; throw e; }
      });
      if (r.skipped) continue;
      const un = new Set((r.row.result.unattested || []).map((x) => x.toLowerCase()));
      const now = c.open.filter((p) => meaningParts(p).every((x) => !un.has(x.toLowerCase())));
      out.push({ id: c.id, swedish: c.swedish, open: c.open, attestedNow: now, outcome: now.length === c.open.length ? "all_open_attested" : now.length ? "some_attested" : "none_attested", reused: !!r.reused });
    } catch (e) { out.push({ id: c.id, swedish: c.swedish, outcome: "error", error: String(e.message || e).slice(0, 200) }); }
  }
}));
writeFileSync(`data/reports/round-g/fix/sense-targeted${CORE ? "-core" : ""}.json`, JSON.stringify(out, null, 1));
const t = {};
for (const x of out) t[x.outcome] = (t[x.outcome] || 0) + 1;
console.log({ tally: t, spentTag: +(await spent()).toFixed(4) });
