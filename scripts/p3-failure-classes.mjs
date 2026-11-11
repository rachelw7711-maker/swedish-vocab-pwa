// Round G (2026-11-11), READ-ONLY: the P3 Korp sense checks that did not pass, by why — zero AI.
// For each meaning part the two readers did not confirm in the Korp sentences:
//   dictionary  the dictionaries' English supports the part (meaningPartSupported): the sentences
//               were too few or too one-sided; the gloss itself has evidence
//   unsupported nothing supports it: the card may claim a gloss the word doesn't have
// A card: all_unconfirmed (not one part shown) / extra_unsupported (some part with no support at all) /
// sample_only (every unconfirmed part is in a dictionary). → data/reports/round-g/p3-failures.json
//   node --env-file=.env scripts/p3-failure-classes.mjs
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { ordered } from "./page-order.mjs";
import { useReferenceFiles, referenceEntries, englishEquivalents, meaningPartSupported } from "../server-references.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
await useReferenceFiles("data/reference", { extra: true });
const rows = [];
for (let i = 0; ; i += 1000) {
  const d = must(await ordered(db.from("knowledge_checks").select("id, learning_object_id, headword, part_of_speech, result").eq("rule_version", "round_g_p3").eq("status", "done"), "knowledge_checks").range(i, i + 999));
  rows.push(...d); if (d.length < 1000) break;
}
const failed = rows.filter((r) => r.result && !r.result.ok);
const learners = new Set();
for (let i = 0; i < failed.length; i += 200) for (const u of must(await db.from("user_words").select("word_id").in("word_id", failed.slice(i, i + 200).map((r) => r.learning_object_id)))) learners.add(u.word_id);
const tally = {}, out = [];
for (const r of failed) {
  const parts = r.result.parts || [], un = r.result.unattested || [];
  const eq = r.part_of_speech ? englishEquivalents(await referenceEntries(null, r.headword), r.part_of_speech) : [];
  const per = un.map((p) => ({ part: p, support: eq.length && meaningPartSupported(p, eq) ? "dictionary" : "unsupported" }));
  const cls = un.length >= parts.length ? "all_unconfirmed" : per.some((p) => p.support === "unsupported") ? "extra_unsupported" : "sample_only";
  const k = `${cls}${learners.has(r.learning_object_id) ? "+learners" : ""}`;
  tally[k] = (tally[k] || 0) + 1;
  out.push({ id: r.learning_object_id, headword: r.headword, pos: r.part_of_speech, cls, parts, unconfirmed: per, learners: learners.has(r.learning_object_id) });
}
writeFileSync("data/reports/round-g/p3-failures.json", JSON.stringify({ failed: failed.length, tally, cards: out }, null, 1));
console.log({ failed: failed.length, tally });
