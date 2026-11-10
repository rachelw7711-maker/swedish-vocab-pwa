// Round G (2026-11-11), READ-ONLY simulation for the owner's decision on "partial" (option A): every
// public card now "partial" whose core sense has no verified-grade evidence, classified by what
// could verify it. Zero AI; changes nothing. Classes (first that applies):
//   conflict            the sense row is disputed / a mismatch is open
//   evidence_unlinked   independent evidence already exists but the sense row doesn't carry it: a
//                       Korp sense check that passed (korp-verify cache or the row's detail.korp)
//   dictionary_link     Lexin ties the card to one sense now (lexinSenseLink: English part by part and
//                       the Swedish definition) — writable with no AI
//   compound_rule       not in Lexin as this word, a SALDO compound whose meaning is its parts'
//                       (compoundMeaningSupport) — needs only Korp existence, no AI
//   dictionary_candidate Lexin has the word as this part of speech and its English overlaps, but the
//                       definitions don't tie — needs a sense check (Korp sentences + AI readers)
//   no_dictionary_sense nothing in Lexin (or Folkets, same family) for this word and part of speech —
//                       needs a sense check
// Learners (user_words rows) are counted per class. AI cost is estimated from the 2026-11-04 Korp
// sense run (data/reports/korp-verify/spend.json: dollars per checked card), scaled to terra prices.
//   node --env-file=.env scripts/partial-core-sim.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { ordered } from "./page-order.mjs";
import { useSaldoFiles, compoundRows } from "../server-lexicon.mjs";
import { useReferenceFiles, referenceEntries, posFamilies, englishEquivalents, meaningSupport, compoundMeaningSupport } from "../server-references.mjs";
import { lexinSenseLink } from "../server-evidence.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
const all = async (t, c, f = (q) => q) => { const o = []; for (let i = 0; ; i += 1000) { const d = must(await ordered(f(db.from(t).select(c)), t).range(i, i + 999)); o.push(...d); if (d.length < 1000) return o; } };
await useSaldoFiles();
await useReferenceFiles("data/reference", { extra: true });

const cards = (await all("learning_objects", "id, swedish, part_of_speech, object_type, status, swedish_explanation", (q) => q.in("status", ["published", "human_reviewed", "ai_generated"]).eq("verification_status", "partial")));
const ids = new Set(cards.map((c) => c.id));
const status = new Map();
for (const r of await all("resource_field_status", "learning_object_id, field, status, grade, source, detail", (q) => q.in("field", ["sense", "pos"])))
  if (ids.has(r.learning_object_id)) (status.get(r.learning_object_id) || status.set(r.learning_object_id, {}).get(r.learning_object_id))[r.field] = r;
const en = new Map((await all("learning_object_translations", "learning_object_id, meaning", (q) => q.eq("native_language", "en"))).filter((t) => ids.has(t.learning_object_id)).map((t) => [t.learning_object_id, t.meaning]));
const formsOf = new Map();
for (const f of await all("word_forms", "learning_object_id, form_value")) if (ids.has(f.learning_object_id)) (formsOf.get(f.learning_object_id) || formsOf.set(f.learning_object_id, []).get(f.learning_object_id)).push(f.form_value);
const learners = new Map();
for (const u of await all("user_words", "word_id")) if (ids.has(u.word_id)) learners.set(u.word_id, (learners.get(u.word_id) || 0) + 1);
const korpCache = existsSync("data/reports/korp-verify/results.json") ? JSON.parse(readFileSync("data/reports/korp-verify/results.json", "utf8")) : {};
const senseOk = (v) => { try { return (typeof v === "string" ? JSON.parse(v.replace(/'/g, '"').replace(/True/g, "true").replace(/False/g, "false").replace(/None/g, "null")) : v)?.sense?.ok === true; } catch { return /'sense': \{'ok': True/.test(String(v)); } };

const out = [], tally = {};
for (const c of cards) {
  const st = status.get(c.id) || {};
  if (st.sense?.status === "verified" && st.sense?.grade === "verified") continue;   // core verified already
  const word = c.object_type === "word" && !/\s/.test(c.swedish.trim());
  const meaningEn = en.get(c.id) || "";
  let cls;
  if (st.sense?.status === "mismatch" || st.sense?.grade === "disputed") cls = "conflict";
  else if (st.sense?.detail?.korp?.sense?.ok === true || senseOk(korpCache[c.id]?.verdict)) cls = "evidence_unlinked";
  else if (!word) cls = "no_dictionary_sense";
  else {
    const refs = await referenceEntries(null, c.swedish);
    const link = await lexinSenseLink(null, refs, c.part_of_speech, { meaningEn, swedishExplanation: c.swedish_explanation, forms: [c.swedish, ...(formsOf.get(c.id) || [])] });
    if (link.linked) cls = "dictionary_link";
    else if (posFamilies(refs, c.part_of_speech).includes("lexin") && meaningSupport(meaningEn, englishEquivalents(refs, c.part_of_speech)).length) cls = "dictionary_candidate";
    else {
      const comp = await compoundRows(null, c.swedish, c.part_of_speech);
      let ok = false;
      if (comp.length && !comp[0].compound.ambiguous) {
        const [first, head] = [comp[0].compound.first.split("..")[0], comp[0].compound.head.split("..")[0]];
        ok = compoundMeaningSupport(meaningEn, { first, firstEquivalents: englishEquivalents(await referenceEntries(null, first), "noun").concat(englishEquivalents(await referenceEntries(null, first), c.part_of_speech)), headEquivalents: englishEquivalents(await referenceEntries(null, head), c.part_of_speech) });
      }
      cls = ok ? "compound_rule" : posFamilies(refs, c.part_of_speech).includes("lexin") ? "dictionary_candidate" : "no_dictionary_sense";
    }
  }
  const t = (tally[cls] ||= { cards: 0, words: 0, expressions: 0, withLearners: 0, learnerRows: 0 });
  t.cards++; t[word ? "words" : "expressions"]++;
  const n = learners.get(c.id) || 0;
  if (n) { t.withLearners++; t.learnerRows += n; }
  out.push({ id: c.id, swedish: c.swedish, pos: c.part_of_speech, type: c.object_type, cls, learners: n, senseSource: st.sense?.source || null });
}
// Cost: the 2026-11-04 run's dollars per card (gpt-5.4-mini $0.75/$4.50), scaled to terra ($1/$5).
const spend = existsSync("data/reports/korp-verify/spend.json") ? JSON.parse(readFileSync("data/reports/korp-verify/spend.json", "utf8")) : null;
const perCard = spend ? (spend.usd / Object.keys(korpCache).length) * (5 / 4.5) : null;
const needAI = (tally.dictionary_candidate?.cards || 0) + (tally.no_dictionary_sense?.cards || 0);
const result = { at: new Date().toISOString(), partialPublic: cards.length, tally, cost: { perCardUSD: perCard && +perCard.toFixed(4), needAI, estimateUSD: perCard && +(perCard * needAI).toFixed(2), basis: spend && `${spend.usd.toFixed(2)} USD / ${Object.keys(korpCache).length} cards (2026-11-04 Korp sense run), ×5/4.5 for terra` } };
writeFileSync("data/reports/round-g/partial-core-sim.json", JSON.stringify({ ...result, cards: out }, null, 1));
console.log(JSON.stringify(result, null, 1));
