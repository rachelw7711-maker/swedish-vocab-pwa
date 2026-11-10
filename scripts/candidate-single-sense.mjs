// Round G (2026-11-11), READ-ONLY: of the "dictionary_candidate" cards of partial-core-sim.json, those
// whose word Lexin gives one sense for this part of speech and whose every English part matches it
// (a proposed zero-AI rule R-8b, not applied). → data/reports/round-g/candidate-single-sense.json
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";


const L = await import("../server-lexicon.mjs"); await L.useSaldoFiles();
const R = await import("../server-references.mjs"); await R.useReferenceFiles("data/reference", { extra: true });
const E = await import("../server-evidence.mjs");
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sim = JSON.parse(readFileSync("data/reports/round-g/partial-core-sim.json", "utf8")).cards.filter((c) => c.cls === "dictionary_candidate");
const ids = sim.map((c) => c.id), en = new Map();
for (let i = 0; i < ids.length; i += 200) for (const t of (await db.from("learning_object_translations").select("learning_object_id, meaning").eq("native_language", "en").in("learning_object_id", ids.slice(i, i + 200))).data) en.set(t.learning_object_id, t.meaning);
const c = { single_all_parts: 0, single_some: 0, multi_all_parts_one_sense: 0, multi_other: 0 }, samples = [];
for (const s of sim) {
  const refs = await R.referenceEntries(null, s.swedish);
  const own = (refs.lexin_en || []).filter((e) => e.pos === s.pos && e.english?.length);
  const parts = String(en.get(s.id) || "").split(/[;；]/).map((p) => p.trim()).filter(Boolean);
  const per = own.map((e) => parts.map((p) => R.meaningSupport(p, e.english.map((t) => ({ source: "lexin_en", text: t }))).length > 0));
  if (own.length === 1) { if (per[0].every(Boolean)) { c.single_all_parts++; if (samples.length < 400) samples.push({ ...s, en: en.get(s.id), lexin: own[0].english.join(", ") }); } else c.single_some++; }
  else if (per.some((p) => p.every(Boolean))) c.multi_all_parts_one_sense++; else c.multi_other++;
}
writeFileSync("data/reports/round-g/candidate-single-sense.json", JSON.stringify({ c, samples }, null, 1));
console.log(c);
