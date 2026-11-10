// Round G, ledger 6: single words in a card's collocations (code single_word_as_collocation),
// READ-ONLY: what each is (SALDO: a compound with the headword as a part, a form of the headword,
// another word, unknown), whether the card's related words already have it, and where it belongs.
// Collocation = several words with the headword; related word = another word (compound, derivation,
// synonym). A compound goes to the related words with its meaning; its example sentence is kept
// in the archive (the related-words field has no examples). Writes the plan; changes nothing.
//   node --env-file=.env scripts/compound-collocations-sim.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { useSaldoFiles, saldoEntries, compoundRows, lemmatize } from "../server-lexicon.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
await useSaldoFiles();
const hits = new Map();
for (const l of readFileSync("data/reports/round-g/baseline-audit.ndjson", "utf8").split("\n")) {
  if (!l) continue;
  const r = JSON.parse(l);
  for (const f of r.findings) if (f.code === "single_word_as_collocation") (hits.get(r.id) || hits.set(r.id, { swedish: r.swedish, pos: r.pos, status: r.status, words: [] }).get(r.id)).words.push(f.phrase);
}
const ids = [...hits.keys()];
const tr = [];
for (let i = 0; i < ids.length; i += 200) { const { data, error } = await db.from("learning_object_translations").select("learning_object_id, native_language, collocations, related_words").in("learning_object_id", ids.slice(i, i + 200)); if (error) throw error; tr.push(...data); }
const lines = (t) => String(t || "").split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p) => p[0]);
const rows = [], tally = {};
for (const [id, h] of hits) {
  const head = h.swedish.toLowerCase();
  const own = (await saldoEntries(null, h.swedish, h.pos)).flatMap((e) => Object.values(e.forms || {}).flat()).map((f) => String(f).toLowerCase());
  const en = tr.find((t) => t.learning_object_id === id && t.native_language === "en"), zh = tr.find((t) => t.learning_object_id === id && t.native_language === "zh");
  const related = new Set([...lines(en?.related_words), ...lines(zh?.related_words)].map((p) => p[0].toLowerCase()));
  for (const w of h.words) {
    const lw = w.toLowerCase();
    const enLine = lines(en?.collocations).find((p) => p[0].toLowerCase() === lw), zhLine = lines(zh?.collocations).find((p) => p[0].toLowerCase() === lw);
    const readings = await lemmatize(null, lw);
    const split = (await compoundRows(null, lw).catch(() => [])) || [];
    const kind = own.includes(lw) || lw === head ? "form_of_headword"
      : (split.length && split.some((r) => JSON.stringify(r).toLowerCase().includes(head))) || ((lw.startsWith(head) || lw.endsWith(head)) && lw.length > head.length + 2) ? "compound_with_headword"
      : readings.length ? "other_word" : "unknown_to_saldo";
    const action = kind === "form_of_headword" ? "remove_duplicate_of_headword"
      : related.has(lw) ? "already_related:remove_from_collocations"
      : kind === "unknown_to_saldo" ? "review" : "move_to_related";
    tally[`${kind} → ${action}`] = (tally[`${kind} → ${action}`] || 0) + 1;
    rows.push({ id, swedish: h.swedish, status: h.status, word: w, kind, action, en: enLine?.[1] || null, zh: zhLine?.[1] || null, example: enLine?.[2] || zhLine?.[2] || null });
  }
}
writeFileSync("data/reports/round-g/compound-collocations-sim.json", JSON.stringify({ note: "simulation — nothing written", tally, rows }, null, 1));
console.log({ cards: hits.size, items: rows.length, tally });
