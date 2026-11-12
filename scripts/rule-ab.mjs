// Round G (2026-11-11), owner's rules A and B for the P3 sense checks that did not pass
// (data/reports/round-g/p3-failures.json, from scripts/p3-failure-classes.mjs). Zero AI.
//   A (extra_unsupported)  the Korp check confirmed the core (the first meaning part) and some other part
//       has no support anywhere: each such extra gloss leaves the public card —
//         pending   a part sharing no word with any confirmed part on a common card (A1–B1): perhaps a
//                   sense of its own; out of view, re-checked only on new evidence
//         excluded  otherwise (a redundant or minor synonym) — not "wrong", never checked again automatically
//       A dictionary-supported unconfirmed part stays public. The card's public meaning is then fully
//       evidenced (Korp or dictionary per part): sense verified.
//   B (sample_only)  every unconfirmed part has the dictionaries' English and the rest Korp: verified,
//       nothing removed — unless the spelling is several words (SALDO homographs that inflect
//       differently, or Lexin words of this part of speech that differ): then left as it is.
// Kept out of either: a card whose first part Korp did not confirm (its core is open), and one whose
// Chinese parts don't line up with the English (a part can't be removed from both safely).
// Dry run by default (→ data/reports/round-g/rule-ab-<A|B>.json); --apply writes (content_withheld,
// archived old meanings and sense rows, reason round_g_rule_ab); --rollback <batch>.
//   node --env-file=.env scripts/rule-ab.mjs --rule A|B [--limit n] [--apply]
import { readFileSync, writeFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { useSaldoFiles, saldoEntries, lexemesConflict } from "../server-lexicon.mjs";
import { useReferenceFiles, referenceEntries, englishEquivalents, meaningPartSupported, meaningSupport, lexinWordsOf } from "../server-references.mjs";
import { meaningParts } from "../server-korp.mjs";
import { callOpenAIJson } from "../server-native.mjs";
import { openaiCost } from "../server-prices.mjs";
import { ledgeredCheck } from "../server-check-ledger.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
const opt = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const RULE = opt("--rule"), APPLY = process.argv.includes("--apply"), LIMIT = Number(opt("--limit")) || Infinity;

if (process.argv.includes("--rollback")) {
  const batch = opt("--rollback");
  const rows = must(await db.from("content_audit_archive").select("*").eq("batch_id", batch).eq("reason", "round_g_rule_ab"));
  for (const r of rows) {
    if (r.table_name === "learning_object_translations" && (typeof r.old_value !== "string" || r.old_value.startsWith("["))) throw new Error(`archived ${r.field} of ${r.learning_object_id} is not a meaning`);
    if (r.table_name === "learning_object_translations") must(await db.from("learning_object_translations").update({ meaning: r.old_value }).eq("learning_object_id", r.learning_object_id).eq("native_language", r.field));
    else if (r.table_name === "resource_field_status") must(await db.from("resource_field_status").upsert({ learning_object_id: r.learning_object_id, field: "sense", ...JSON.parse(r.old_value) }, { onConflict: "learning_object_id,field" }));
  }
  const ids = [...new Set(rows.map((r) => r.learning_object_id))];
  must(await db.from("content_withheld").delete().in("learning_object_id", ids).eq("evidence->>batch", batch));
  for (let i = 0; i < ids.length; i += 200) must(await db.rpc("refresh_resource_summary", { p_ids: ids.slice(i, i + 200) }));
  console.log({ batch, restoredCards: ids.length });
  process.exit(0);
}
if (!["A", "B"].includes(RULE)) throw new Error("--rule A|B");
await useSaldoFiles();
await useReferenceFiles("data/reference", { extra: true });

const CLS = { A: "extra_unsupported", B: "sample_only" }[RULE];
const fails = JSON.parse(readFileSync("data/reports/round-g/p3-failures.json", "utf8")).cards.filter((c) => c.cls === CLS);
const norm = (s) => String(s || "").toLowerCase().replace(/[.!?。]+$/, "").trim();
const words = (s) => new Set(norm(s).split(/[^\p{L}]+/u).filter((w) => w.length > 2 && !["the", "and", "for", "with", "someone", "something", "one's"].includes(w)));
const zhParts = (s) => String(s || "").replace(/[。.]\s*$/, "").split(/[；;]/).map((x) => x.trim()).filter(Boolean);
const keyOf = (id, en) => createHash("sha256").update(`${id}|gloss|${norm(en)}`).digest("hex").slice(0, 32);

const out = [], tally = {};
for (const f of fails.slice(0, LIMIT)) {
  const card = must(await db.from("learning_objects").select("id, swedish, part_of_speech, status, cefr_level").eq("id", f.id).single());
  const t = Object.fromEntries(must(await db.from("learning_object_translations").select("native_language, meaning").eq("learning_object_id", f.id)).map((x) => [x.native_language, x.meaning]));
  const sense = must(await db.from("resource_field_status").select("status, grade, source, detail, rule_version").eq("learning_object_id", f.id).eq("field", "sense").maybeSingle());
  const check = must(await db.from("knowledge_checks").select("id, result").eq("learning_object_id", f.id).eq("rule_version", "round_g_p3").eq("status", "done").order("finished_at", { ascending: false }).limit(1).single());
  const parts = meaningParts(t.en || ""), unconfirmed = new Set((check.result.unattested || []).map(norm));
  const r = { id: f.id, swedish: card.swedish, pos: card.part_of_speech, en: t.en, zh: t.zh };
  const done = (decision, extra = {}) => { tally[decision] = (tally[decision] || 0) + 1; out.push({ ...r, decision, ...extra }); };
  if (!["published", "human_reviewed", "ai_generated"].includes(card.status) || (sense?.status === "verified" && sense?.grade === "verified") || sense?.status === "mismatch") { done("skip_state_changed"); continue; }
  if (norm(check.result.parts?.join("|")) !== norm(parts.join("|"))) { done("skip_meaning_changed"); continue; }
  if (unconfirmed.has(norm(parts[0]))) { done("keep_core_open"); continue; }
  const refs = card.part_of_speech ? await referenceEntries(null, card.swedish) : {};
  const eq = card.part_of_speech ? englishEquivalents(refs, card.part_of_speech) : [];
  // several words behind one spelling: their evidence must not be mixed (fil: yoghurt / metal file)
  const saldo = card.part_of_speech ? await saldoEntries(null, card.swedish, card.part_of_speech) : [];
  const { words: lexWords } = card.part_of_speech ? lexinWordsOf(refs, card.part_of_speech) : { words: [] };
  const homographs = saldo.some((a, i) => saldo.slice(i + 1).some((b) => lexemesConflict(a, b, card.part_of_speech))) || lexWords.length > 1;
  const per = parts.map((p, i) => ({ i, en: p, korp: !unconfirmed.has(norm(p)), dictionary: eq.length > 0 && meaningPartSupported(p, eq) }));
  const drop = per.filter((p) => !p.korp && !p.dictionary);
  if (RULE === "B" && drop.length) { done("skip_not_b"); continue; }
  if (per.some((p) => !p.korp && p.dictionary) && homographs) { done("keep_homographs", { per }); continue; }
  // Rule A, revised after the pilot (instrument "instrument, device", medicin "medical science" would
  // have gone): an unconfirmed part leaves the card only when Lexin gives the word a single sense here,
  // the Korp-confirmed core is that sense, and nothing in the dictionaries touches the part — it goes
  // beyond the word's only sense (excluded, not "wrong"). A part the dictionaries partly support, or
  // one of a word with several senses (perhaps a real sense of its own), stays public and is listed
  // with its evidence gap; the card then stays partial.
  const lexSenses = card.part_of_speech ? lexWords.flatMap((w) => (w.pos === card.part_of_speech ? w.lexemes || [] : [])) : [];
  const singleSense = lexSenses.length === 1;
  const touched = (p) => eq.length > 0 && meaningSupport(p.en, eq).length > 0;
  const gaps = drop.filter((p) => touched(p) || !singleSense).map((p) => ({ en: p.en, gap: touched(p) ? "dictionary_partly_supports" : lexSenses.length ? "word_has_several_senses" : "no_dictionary_sense" }));
  const out_ = drop.filter((p) => !touched(p) && singleSense);
  if (gaps.length) { done("keep_listed", { per, gaps, removable: out_.map((p) => p.en) }); continue; }
  const zh = zhParts(t.zh);
  const items = out_.map((p) => ({ ...p, state: "excluded" }));
  const keep = per.filter((p) => !out_.includes(p));
  done(out_.length ? "withhold_and_verify" : "verify", { per, items, keepIdx: keep.map((p) => p.i), zhSegs: zh, newEn: keep.map((p) => p.en).join("; "), check: check.id, sense });
}
// Chinese pieces of a withheld English gloss (round G): AI proposes which pieces translate only the
// removed glosses; the program accepts only a deletion of whole pieces that leaves the rest in order
// and something for every kept gloss count-wise; otherwise the card is left as it is. Ledgered
// (target zh_alignment): never paid twice; capped by --align-usd (owner: 2 USD).
const ALIGN_USD = Number(opt("--align-usd") || 0);
const zhPieces = (s) => String(s || "").replace(/[。.]\s*$/, "").split(/[；;]/).map((x) => x.trim()).filter(Boolean);   // whole segments only: a note's commas stay
async function alignZh(c) {
  const pieces = zhPieces(c.zhText);
  const spent = (must(await db.from("knowledge_checks").select("cost_usd").eq("target", "zh_alignment"))).reduce((a, r) => a + Number(r.cost_usd), 0);
  if (spent >= ALIGN_USD) return { ok: false, reason: "align_budget" };
  const r = await ledgeredCheck(db, { learningObjectId: c.id, headword: c.swedish, pos: c.pos, field: "meaning_zh", target: "zh_alignment", input: { kept: c.newEn, removed: c.items.map((x) => x.en), pieces },
    checkVersion: "zh-align-2", ruleVersion: "round_g_rule_a", model: "gpt-5.4-mini" }, async () => {
    const { result, usage } = await callOpenAIJson({ schemaName: "zh_align", maxOutputTokens: 1200,
      schema: { type: "object", additionalProperties: false, properties: { delete: { type: "array", items: { type: "integer" } } }, required: ["delete"] },
      system: "A Swedish word's Chinese meaning is split into numbered pieces. Some English glosses are kept, some removed. Return the numbers of the Chinese pieces that translate ONLY removed glosses (nothing a kept gloss says). If unsure, or a piece mixes kept and removed meaning, don't list it. Return [] when none.",
      user: JSON.stringify({ word: c.swedish, kept_english: c.newEn, removed_english: c.items.map((x) => x.en), chinese_pieces: pieces.map((p, i) => ({ n: i, text: p })) }) });
    return { result, costUsd: openaiCost(usage).cost, calls: 1 };
  });
  if (r.skipped) return { ok: false, reason: "running" };
  const del = [...new Set(r.row.result.delete || [])].filter((n) => Number.isInteger(n) && n >= 0 && n < pieces.length);
  const left = pieces.filter((_, i) => !del.includes(i));
  if (!left.length) return { ok: false, reason: "would_delete_all" };
  const end = /[。.]\s*$/.test(c.zhText) ? "。" : "";
  return { ok: true, del: del.map((i) => pieces[i]), newZh: del.length ? left.join("；") + end : c.zhText, reused: !!r.reused };
}
if (process.argv.includes("--align") || APPLY) for (const c of out.filter((x) => x.decision === "withhold_and_verify").slice(0, Number(opt("--align-limit")) || Infinity)) {
  c.zhText = (await db.from("learning_object_translations").select("meaning").eq("learning_object_id", c.id).eq("native_language", "zh").single()).data?.meaning;
  const a = await alignZh(c);
  c.align = a;
  if (a.ok) { c.newZh = a.newZh; c.items = c.items.map((x) => ({ ...x, zh: a.del.join("；") || null })); }
  else c.decision = `keep_align_${a.reason}`;
}
writeFileSync(`data/reports/round-g/rule-ab-${RULE}.json`, JSON.stringify({ tally, cards: out }, null, 1));
console.log({ rule: RULE, cards: out.length, tally, items: out.flatMap((c) => c.items || []).reduce((m, x) => ((m[x.state] = (m[x.state] || 0) + 1), m), {}) });

if (APPLY) {
  for (const c of out) if (c.items?.length && (typeof c.zhText !== "string" || typeof c.en !== "string")) throw new Error(`no original meaning for ${c.swedish}`);
  const batch = randomUUID(), now = new Date().toISOString();
  const todo = out.filter((c) => c.decision === "verify" || c.decision === "withhold_and_verify");
  for (const c of todo) {
    const archive = [{ batch_id: batch, learning_object_id: c.id, table_name: "resource_field_status", field: "sense", old_value: JSON.stringify(c.sense || { status: "present", source: null, grade: null, detail: null }), new_value: "verified", reason: "round_g_rule_ab" }];
    if (c.items?.length) archive.push(...["en", "zh"].map((l) => ({ batch_id: batch, learning_object_id: c.id, table_name: "learning_object_translations", field: l, old_value: l === "en" ? c.en : c.zhText, new_value: l === "en" ? c.newEn : c.newZh, reason: "round_g_rule_ab" })));
    must(await db.from("content_audit_archive").insert(archive));
    if (c.items?.length) {
      must(await db.from("content_withheld").insert(c.items.map((x) => ({ item_key: keyOf(c.id, x.en), learning_object_id: c.id, content_type: "gloss", position: x.i, content: { en: x.en, zh: x.zh }, was_public: true, state: x.state,
        reason: x.state === "pending" ? "extra gloss with no evidence; may be a sense of its own" : "extra gloss with no evidence; redundant or minor",
        priority: x.state === "pending" ? 2 : 3, evidence: { batch, rule: RULE, knowledge_check: c.check, korp: "not confirmed in 12 sentences", dictionary: "no English equivalent" },
        recheck_when: x.state === "pending" ? "a new source (a dictionary sense, human review) or a learner report" : null,
        history: [{ at: now, state: x.state, by: `rule ${RULE}`, reason: "round G" }] }))));
      for (const l of ["en", "zh"]) must(await db.from("learning_object_translations").update({ meaning: l === "en" ? c.newEn : c.newZh }).eq("learning_object_id", c.id).eq("native_language", l));
    }
    must(await db.from("resource_field_status").upsert({ learning_object_id: c.id, field: "sense", status: "verified", grade: "verified", rule_version: `kv2-2026-11-11/rule-${RULE}`,
      source: `${c.sense?.source || "ai_check"};korp`, detail: { ...(c.sense?.detail || {}), open: undefined, korp: { check: c.check, parts: c.per.map((p) => ({ en: p.en, korp: p.korp, dictionary: p.dictionary })) }, withheld: (c.items || []).map((x) => keyOf(c.id, x.en)) }, updated_at: now }, { onConflict: "learning_object_id,field" }));
  }
  for (let i = 0; i < todo.length; i += 200) must(await db.rpc("refresh_resource_summary", { p_ids: todo.slice(i, i + 200).map((c) => c.id) }));
  console.log({ batch, written: todo.length });
}
