// Round G (2026-11-11), ledger M-2b: a card's Lexin constructions (valency — "ngn lovar ngn ngt",
// "ngn älskar ngn/ngt") are usage knowledge, shown under Fördjupning, not collocations. Only the
// senses the card teaches: the card's own Lexin word (not a homograph's), one sense directly, else
// the senses its English meaning covers (senseCoverage), never a particle verb's (säga upp) — the
// same rules as sense coverage. Zero AI; writes learning_objects.constructions only where it is
// null, so a rerun changes nothing it wrote. Read-only by default.
//   node --env-file=.env scripts/backfill-constructions.mjs [--apply]
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { ordered } from "./page-order.mjs";
import { useSaldoFiles } from "../server-lexicon.mjs";
import { useReferenceFiles, referenceEntries } from "../server-references.mjs";
import { constructionsOf } from "../server-evidence.mjs";

const APPLY = process.argv.includes("--apply");
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const all = async (t, c, f = (q) => q) => { const o = []; for (let i = 0; ; i += 1000) { const { data, error } = await ordered(f(db.from(t).select(c)), t).range(i, i + 999); if (error) throw error; o.push(...data); if (data.length < 1000) return o; } };
await useSaldoFiles();
await useReferenceFiles("data/reference");

const cards = await all("learning_objects", "id, swedish, part_of_speech, constructions", (q) => q.neq("status", "retired").eq("object_type", "word"));
const meaningEn = new Map((await all("learning_object_translations", "learning_object_id, meaning", (q) => q.eq("native_language", "en"))).map((t) => [t.learning_object_id, t.meaning]));
const formsOf = new Map();
for (const f of await all("word_forms", "learning_object_id, form_value")) (formsOf.get(f.learning_object_id) || formsOf.set(f.learning_object_id, []).get(f.learning_object_id)).push(f.form_value);
const list = [], tally = { cards: cards.length, with: 0, patterns: 0, byPos: {} };
for (const c of cards) {
  if (c.constructions != null) continue;
  const refs = await referenceEntries(null, c.swedish);
  const forms = [c.swedish, ...(formsOf.get(c.id) || [])];
  const out = constructionsOf(refs, c.part_of_speech, meaningEn.get(c.id), forms);
  if (!out.length) continue;
  tally.with++; tally.patterns += out.length; tally.byPos[c.part_of_speech] = (tally.byPos[c.part_of_speech] || 0) + 1;
  list.push({ id: c.id, swedish: c.swedish, pos: c.part_of_speech, constructions: out });
}
writeFileSync("data/reports/round-g/constructions-backfill.json", JSON.stringify({ tally, list }, null, 1));
console.log(JSON.stringify(tally));
if (APPLY) {
  let n = 0;
  for (const x of list) {
    const { data, error } = await db.from("learning_objects").update({ constructions: x.constructions }).eq("id", x.id).is("constructions", null).select("id");
    if (error) throw error;
    n += data.length;
  }
  console.log({ written: n });
}
