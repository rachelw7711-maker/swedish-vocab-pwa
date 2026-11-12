// Round G (2026-11-12, owner's item A), READ-ONLY: the public partial cards whose sense is not verified-grade
// (and not open with a mismatch), in the owner's order — with learners, then most frequent (Kelly rank,
// then CEFR) — each with what it still needs: a Korp sense check of its meaning as it is now (ledger or
// the 2026-11-04 run) and a pairing. Writes data/reports/round-g/fix/queue.json.
//   node --env-file=.env scripts/sense-queue.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { meaningParts } from "../server-korp.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
async function all(table, cols, f = (q) => q) {
  const out = [];
  for (let i = 0; ; i += 1000) { const d = must(await f(db.from(table).select(cols)).range(i, i + 999)); out.push(...d); if (d.length < 1000) return out; }
}
const PUBLIC = ["published", "human_reviewed", "ai_generated"];
const cards = await all("learning_objects", "id, swedish, object_type, part_of_speech, frequency_rank, cefr_level", (q) => q.in("status", PUBLIC).eq("verification_status", "partial").order("id"));
const sense = new Map((await all("resource_field_status", "learning_object_id, status, grade", (q) => q.eq("field", "sense").order("learning_object_id"))).map((r) => [r.learning_object_id, r]));
const learners = new Set((await all("user_words", "word_id", (q) => q.order("id"))).map((u) => u.word_id));
const en = new Map((await all("learning_object_translations", "learning_object_id, meaning", (q) => q.eq("native_language", "en").order("id"))).map((t) => [t.learning_object_id, t.meaning]));
const korp = new Map();
for (const k of await all("knowledge_checks", "learning_object_id, input", (q) => q.eq("target", "korp_sense_parts").eq("status", "done").order("id"))) (korp.get(k.learning_object_id) || korp.set(k.learning_object_id, new Set()).get(k.learning_object_id)).add(k.input?.meaning_en);
const pairs = new Set((await all("knowledge_checks", "learning_object_id", (q) => q.eq("target", "sense_pairing").eq("status", "done").order("id"))).map((k) => k.learning_object_id));
const legacy = existsSync("data/reports/korp-verify/results.json") ? JSON.parse(readFileSync("data/reports/korp-verify/results.json", "utf8")) : {};
const norm = (a) => JSON.stringify((a || []).map((x) => String(x).toLowerCase().replace(/[.!?]+$/, "").trim()));
const CEFR = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
const q = cards.filter((c) => { const s = sense.get(c.id); return !(s?.status === "verified" && s?.grade === "verified") && s?.status !== "mismatch"; }).map((c) => {
  const m = en.get(c.id) || "", l = legacy[c.id]?.sense;
  const hasKorp = korp.get(c.id)?.has(m) || (l?.method === "parts" && norm(l.parts) === norm(meaningParts(m)));
  const korpFailedBefore = !hasKorp && (korp.has(c.id) || !!l);
  return { id: c.id, swedish: c.swedish, learners: learners.has(c.id), rank: c.frequency_rank ?? 1e9, cefr: CEFR[c.cefr_level] ?? 9, sense: sense.get(c.id)?.grade || sense.get(c.id)?.status || "none", hasKorp, korpFailedBefore, paired: pairs.has(c.id) };
}).sort((a, b) => b.learners - a.learners || a.rank - b.rank || a.cefr - b.cefr);
mkdirSync("data/reports/round-g/fix", { recursive: true });
writeFileSync("data/reports/round-g/fix/queue.json", JSON.stringify(q));
const t = {};
for (const c of q) { const k = `${c.sense}|korp:${c.hasKorp ? "yes" : c.korpFailedBefore ? "earlier_meaning_or_no_parts" : "no"}|paired:${c.paired}`; t[k] = (t[k] || 0) + 1; }
console.log({ partialPublic: cards.length, queue: q.length, withLearners: q.filter((c) => c.learners).length, tally: t });
