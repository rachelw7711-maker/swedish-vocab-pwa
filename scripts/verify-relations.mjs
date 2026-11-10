// Round G (2026-11-11), Fördjupning: which relations between live word cards a dictionary or a
// structured etymology backs — a derivation (betala → betalning, påverka → påverkan), a synonym, an
// antonym — without AI and never from spelling alone. Read-only by default; --apply writes.
// Evidence (data/reference, the files of server-references.mjs):
//   Lexin sv–en <Derivation>, Folkets <derivation>   one dictionary family (Folkets builds on Lexin)
//   Wiktionary etymology templates suffix / prefix / af / affix with one base and an affix
//     (betalning: suffix|betala|ning) — a derivation only together with SALDO having both words in
//     these parts of speech (two signals); a compound (two bases) is never a derivation
//   Lexin <Antonym> (Swedish side), Folkets <synonym level≥3.5>, Wiktionary synonyms / antonyms
// A relation the July AI pass typed synonym / antonym is verified when one dictionary lists the pair
// (the AI's type + a dictionary: two signals). A derivation or a Lexin antonym between two cards
// with no row yet gets a row of its own (evidence.added_by). Nothing is deleted; a type nothing
// backs stays as it was (grade null) and is shown as a related word.
//   node --env-file=.env scripts/verify-relations.mjs [--apply]
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";
import { ordered } from "./page-order.mjs";
import { useSaldoFiles, saldoEntries } from "../server-lexicon.mjs";

const APPLY = process.argv.includes("--apply");
const BATCH = "round-g-relations-2026-11-11";
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const all = async (t, c, f = (q) => q) => { const o = []; for (let i = 0; ; i += 1000) { const { data, error } = await ordered(f(db.from(t).select(c)), t).range(i, i + 999); if (error) throw error; o.push(...data); if (data.length < 1000) return o; } };
const key = (s) => String(s || "").trim().toLowerCase().replace(/^(en|ett|att) /, "").replace(/\|/g, "");
await useSaldoFiles();

const cards = (await all("learning_objects", "id, swedish, part_of_speech, object_type, status", (q) => q.neq("status", "retired").eq("object_type", "word")));
const byLemma = new Map();
for (const c of cards) (byLemma.get(key(c.swedish)) || byLemma.set(key(c.swedish), []).get(key(c.swedish))).push(c);
const one = (w, pos = null) => { const l = (byLemma.get(key(w)) || []).filter((c) => !pos || c.part_of_speech === pos); return l.length === 1 ? l[0] : null; };

// pairs: "fromId>toId" → { type, evidence: [...] }; a derivation is recorded as derived_from on the
// derived word and word_family on its base.
const found = new Map();
const note = (from, to, type, ev) => {
  if (!from || !to || from.id === to.id) return;
  const k = `${from.id}>${to.id}>${type}`;
  const x = found.get(k) || found.set(k, { from, to, type, evidence: [] }).get(k);
  if (!x.evidence.some((e) => e.source === ev.source)) x.evidence.push(ev);
};
const derivation = (derived, base, ev) => { note(derived, base, "derived_from", ev); note(base, derived, "word_family", ev); };

// Lexin sv–en: <Word Value Type> … <BaseLang> … <Derivation>x</Derivation> <Antonym Value=x/> … </BaseLang>
const LEXIN_POS = { "subst.": "noun", verb: "verb", "adj.": "adjective", "adv.": "adverb" };
const lexin = readFileSync("data/reference/lexin/swe_eng.xml", "utf8");
for (const m of lexin.matchAll(/<Word [^>]*Type="([^"]*)" Value="([^"]*)"[^>]*>([\s\S]*?)<\/Word>/g)) {
  const pos = LEXIN_POS[m[1]];
  const base = m[3].match(/<BaseLang>([\s\S]*?)<\/BaseLang>/)?.[1] || "";
  // The headword: an Index value that is a card of this part of speech (verbs are listed in the present).
  // Only the word's own forms: a compound (fack|litteratur) is never its first part.
  const v = key(m[2]);
  const heads = [...new Set([v, ...[...base.matchAll(/<Index Value="([^"]*)" \/>/g)].map((x) => key(x[1]))
    .filter((h) => !h.includes(" ") && h.slice(0, Math.max(3, v.length - 3)) === v.slice(0, Math.max(3, v.length - 3)) && Math.abs(h.length - v.length) <= 3)])];
  const head = pos && heads.map((h) => one(h, pos)).find(Boolean);
  if (!head) continue;
  for (const d of base.matchAll(/<Derivation[^>]*>([^<]+)/g)) {
    const w = one(d[1].trim());
    if (w) derivation(w, head, { source: "lexin-sv-en", kind: "dictionary_listing", ref: m[2] });
  }
  for (const a of base.matchAll(/<Antonym Value="([^"]*)"/g)) {
    const w = one(a[1]);
    if (w) { note(head, w, "antonym", { source: "lexin-sv-en", kind: "dictionary_listing", ref: m[2] }); note(w, head, "antonym", { source: "lexin-sv-en", kind: "dictionary_listing", ref: m[2] }); }
  }
}

// Folkets: <word value class> … <derivation value/> <synonym level value/> … </word>
const FOLKETS_POS = { nn: "noun", vb: "verb", jj: "adjective", ab: "adverb" };
const folkets = readFileSync("data/reference/folkets/folkets_sv_en_public.xml", "utf8");
for (const m of folkets.matchAll(/<word ([^>]*)>([\s\S]*?)<\/word>/g)) {
  const attr = (n) => m[1].match(new RegExp(`${n}="([^"]*)"`))?.[1];
  const head = one(attr("value"), FOLKETS_POS[attr("class")]);
  if (!head) continue;
  for (const d of m[2].matchAll(/<derivation [^>]*value="([^"]*)"/g)) {
    const w = one(d[1]);
    if (w) derivation(w, head, { source: "folkets-lexikon", kind: "dictionary_listing", ref: attr("value") });
  }
  for (const s of m[2].matchAll(/<synonym ([^>]*)\/>/g)) {
    const level = Number(s[1].match(/level="([^"]*)"/)?.[1] || 0), w = one(s[1].match(/value="([^"]*)"/)?.[1]);
    if (w && level >= 3.5) note(head, w, "synonym", { source: "folkets-lexikon", kind: "dictionary_listing", level, ref: attr("value") });
  }
}

// Wiktionary: etymology templates (derivations) and synonym / antonym lists.
const WIKI_POS = { noun: "noun", verb: "verb", adj: "adjective", adv: "adverb" };
const rl = createInterface({ input: createReadStream("data/reference/enwiktionary/sv.jsonl") });
for await (const line of rl) {
  const w0 = line.match(/"word": "([^"]*)"/)?.[1];
  if (!w0 || !byLemma.has(key(w0))) continue;
  const e = JSON.parse(line);
  const head = one(e.word, WIKI_POS[e.pos]);
  if (!head) continue;
  for (const t of e.etymology_templates || []) {
    if (!["suffix", "prefix", "af", "affix"].includes(t.name)) continue;
    const parts = Object.entries(t.args || {}).filter(([k]) => /^\d+$/.test(k) && k !== "1").map(([, v]) => String(v));
    // suffix|base|suf, prefix|pre|base; af/affix mark affixes with a hyphen.
    const affixes = t.name === "suffix" ? [parts[1]] : t.name === "prefix" ? [parts[0]] : parts.filter((p) => /^-|-$/.test(p));
    const bases = t.name === "suffix" ? [parts[0]] : t.name === "prefix" ? [parts[1]] : parts.filter((p) => !/^-|-$/.test(p));
    if (bases.length !== 1 || !affixes.filter(Boolean).length) continue;
    const base = one(bases[0]);
    if (!base || base.id === head.id) continue;
    // SALDO has both words in these parts of speech: the second signal.
    if (!(await saldoEntries(null, head.swedish, head.part_of_speech)).length || !(await saldoEntries(null, base.swedish, base.part_of_speech)).length) continue;
    derivation(head, base, { source: "en-wiktionary", kind: "wiktionary_etymology+saldo", ref: `${t.name}: ${parts.join(" + ")}` });
  }
  const lists = { synonym: [...(e.synonyms || []), ...(e.senses || []).flatMap((s) => s.synonyms || [])], antonym: [...(e.antonyms || []), ...(e.senses || []).flatMap((s) => s.antonyms || [])] };
  for (const [type, l] of Object.entries(lists)) for (const s of l) {
    const w = one(s.word);
    if (w) note(head, w, type, { source: "en-wiktionary", kind: "wiktionary", ref: e.word });
  }
}

// Existing rows: which typed ones a dictionary backs; which verified relations have no row yet.
const rows = await all("learning_object_relationships", "id, from_object_id, to_object_id, relationship_type, grade");
const rowKey = (r) => `${r.from_object_id}>${r.to_object_id}>${r.relationship_type}`;
const have = new Map(rows.map((r) => [rowKey(r), r]));
const strong = (x) => x.evidence.some((e) => e.kind === "dictionary_listing" || e.kind === "wiktionary_etymology+saldo");
const verify = [], add = [], tally = {};
const inc = (k) => (tally[k] = (tally[k] || 0) + 1);
for (const x of found.values()) {
  const k = `${x.from.id}>${x.to.id}>${x.type}`;
  const row = have.get(k)
    // The July pass wrote a derivation as word_family or derived_from in either direction.
    || (x.type === "derived_from" || x.type === "word_family" ? have.get(`${x.from.id}>${x.to.id}>${x.type === "derived_from" ? "word_family" : "derived_from"}`) : null);
  // A synonym or antonym from Wiktionary alone backs an AI-typed row, never a new one.
  if (row) { if (row.relationship_type === x.type || x.type !== "synonym") { verify.push({ row, x }); inc(`verify ${x.type}`); } continue; }
  // New rows only for derivations: a dictionary's antonym belongs to one of its senses (liten
  // "short" ↔ lång), which the card may not teach; it backs an AI-typed row, never a new one.
  if (strong(x) && (x.type === "derived_from" || x.type === "word_family")) { add.push(x); inc(`add ${x.type}`); }
  else inc(`skip ${x.type} (${x.evidence.map((e) => e.source).join("+")})`);
}
const typed = rows.filter((r) => ["synonym", "antonym", "derived_from", "word_family"].includes(r.relationship_type));
const verifiedIds = new Set(verify.map((v) => v.row.id));
for (const t of ["synonym", "antonym", "derived_from", "word_family"]) tally[`typed ${t}: backed / all`] = `${typed.filter((r) => r.relationship_type === t && verifiedIds.has(r.id)).length} / ${typed.filter((r) => r.relationship_type === t).length}`;
const show = (x) => `${x.from.swedish} (${x.from.part_of_speech}) → ${x.to.swedish} (${x.to.part_of_speech}) ${x.type} [${x.evidence.map((e) => e.ref ? `${e.source}: ${e.ref}` : e.source).join("; ")}]`;
writeFileSync("data/reports/round-g/relations-verify.json", JSON.stringify({ tally, verify: verify.map((v) => ({ id: v.row.id, rowType: v.row.relationship_type, line: show(v.x), evidence: v.x.evidence })), add: add.map((x) => ({ line: show(x), from: x.from.id, to: x.to.id, type: x.type, evidence: x.evidence })) }, null, 1));
console.log(JSON.stringify(tally, null, 1));

if (APPLY) {
  // Typed rows a dictionary backs: grade + evidence; then the new rows (removed again by the rollback).
  for (let i = 0; i < verify.length; i += 200) {
    for (const v of verify.slice(i, i + 200)) {
      const { error } = await db.from("learning_object_relationships").update({ grade: "verified", evidence: { batch: BATCH, sources: v.x.evidence } }).eq("id", v.row.id).is("grade", null);
      if (error) throw error;
    }
  }
  for (let i = 0; i < add.length; i += 500) {
    const { error } = await db.from("learning_object_relationships").insert(add.slice(i, i + 500).map((x) => ({ from_object_id: x.from.id, to_object_id: x.to.id, relationship_type: x.type, grade: "verified", evidence: { batch: BATCH, added_by: BATCH, sources: x.evidence } })));
    if (error) throw error;
  }
  const { count } = await db.from("learning_object_relationships").select("id", { count: "exact", head: true }).eq("grade", "verified");
  console.log({ applied: { verified: verify.length, added: add.length }, readBackVerified: count });
}
