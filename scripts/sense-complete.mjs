// Round G (2026-11-12, owner's item A.1): every public sense needs its Chinese and its English. Cards the
// sense pairing found out of step — a sense in one language only, or a Chinese "remark" that names a
// meaning the English lacks (skjuts: "口语里也可指送一程") — get the missing side written, append only:
// nothing on the card is deleted or reworded. The model (gpt-5.4-mini, ledgered: target
// sense_completion) answers per finding: the counterpart to add, or that the piece is a remark after
// all, or not a meaning of this word (then nothing is written and the card goes to a person).
// Report first (default), --apply writes the meanings (old ones archived: content_audit_archive reason
// round_g_sense_complete). An added gloss is a sense without evidence: the card stays partial until
// Korp or a dictionary confirms it.
//   node --env-file=.env scripts/sense-complete.mjs --from <sense-apply results.json>[,<more>] --max-usd <cap> [--tag t] [--hold "a|b"] [--apply]
//   node --env-file=.env scripts/sense-complete.mjs --rollback <batch>
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { callOpenAIJson } from "../server-native.mjs";
import { openaiCost } from "../server-prices.mjs";
import { ledgeredCheck } from "../server-check-ledger.mjs";
import { enPieces, zhPieces } from "../server-senses.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
const opt = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const REASON = "round_g_sense_complete", TAG = opt("--tag") || "round_g_fix", APPLY = process.argv.includes("--apply");

if (process.argv.includes("--rollback")) {
  const batch = opt("--rollback");
  const rows = must(await db.from("content_audit_archive").select("learning_object_id, field, old_value").eq("batch_id", batch).eq("reason", REASON));
  for (const r of rows) {
    if (r.field === "chinese") must(await db.from("learning_objects").update({ chinese: JSON.parse(r.old_value) }).eq("id", r.learning_object_id));
    else must(await db.from("learning_object_translations").update({ meaning: JSON.parse(r.old_value) }).eq("learning_object_id", r.learning_object_id).eq("native_language", r.field));
  }
  // Kept for the record, marked so that these cards count as not completed.
  must(await db.from("content_audit_archive").update({ reason: `${REASON}_rolled_back` }).eq("batch_id", batch).eq("reason", REASON));
  console.log({ batch, restored: rows.length });
  process.exit(0);
}
const MAX_USD = Number(opt("--max-usd") || 0);
if (!(MAX_USD > 0)) throw new Error("--max-usd required");
const spent = async () => { let s = 0; for (let i = 0; ; i += 1000) { const d = must(await db.from("knowledge_checks").select("cost_usd").eq("rule_version", TAG).order("id").range(i, i + 999)); s += d.reduce((a, r) => a + Number(r.cost_usd), 0); if (d.length < 1000) return s; } };

const NEEDS = /incomplete|note_not_a_remark|unplaced/;
const cards = [];
for (const f of opt("--from").split(",")) for (const [id, r] of Object.entries(JSON.parse(readFileSync(f, "utf8")).results)) if ((r.reasons || []).some((x) => NEEDS.test(x))) cards.push({ id, ...r });

const SCHEMA = { type: "object", additionalProperties: false, required: ["items"], properties: { items: { type: "array", items: { type: "object", additionalProperties: false,
  required: ["n", "action", "add_en", "add_zh", "why"], properties: { n: { type: "integer" }, action: { type: "string", enum: ["add_counterpart", "remark", "not_a_meaning"] }, add_en: { type: "string" }, add_zh: { type: "string" }, why: { type: "string" } } } } } };
const SYSTEM = `A Swedish learner's dictionary gives each word an English and a Chinese meaning; each sense must appear in both. You get the word, its part of speech, both meanings in numbered pieces, and findings: pieces whose sense is missing in the other language. For each finding answer:
add_counterpart — the piece names a real sense of this Swedish word that the other language lacks: give that sense in the missing language only (add_en: a short English gloss, or add_zh: a short Chinese gloss), matching the piece's sense exactly, nothing more.
remark — the piece is only a remark on use, register or grammar, not a sense: add nothing.
not_a_meaning — the piece names something that is not a meaning of this Swedish word (as this part of speech): add nothing.
Never rewrite or drop existing pieces.`;

// A card completed once is not completed again from a stale results file: its meanings changed, the
// findings read from that file no longer hold, and a second run appended the same senses twice (round G,
// batch 859de7cb, rolled back). A rolled-back batch's rows are marked _rolled_back, so its cards come back.
const done = new Set();
for (let i = 0; ; i += 1000) { const d = must(await db.from("content_audit_archive").select("learning_object_id").eq("reason", REASON).order("id").range(i, i + 999)); d.forEach((r) => done.add(r.learning_object_id)); if (d.length < 1000) break; }
const HOLD = new Set((opt("--hold") || "").split("|").filter(Boolean));   // --hold "a|b": a person looks first
const batch = randomUUID(), out = [];
for (const c of cards) {
  if (done.has(c.id)) { out.push({ id: c.id, swedish: c.swedish, outcome: "completed_before" }); continue; }
  if (HOLD.has(c.swedish)) { out.push({ id: c.id, swedish: c.swedish, outcome: "held_for_person" }); continue; }
  if ((await spent()) >= MAX_USD) { console.log("budget reached"); break; }
  const o = must(await db.from("learning_objects").select("swedish, part_of_speech").eq("id", c.id).single());
  const m = Object.fromEntries(must(await db.from("learning_object_translations").select("native_language, meaning").eq("learning_object_id", c.id)).map((x) => [x.native_language, x.meaning]));
  const E = enPieces(m.en), Z = zhPieces(m.zh);
  // The findings: Chinese-only and English-only senses, Chinese notes that are not remarks, unplaced pieces.
  const findings = [];
  for (const s of c.senses || []) { if (!s.zh.length) for (const t of s.en) findings.push({ lang: "en", text: t }); if (!s.en.length) for (const t of s.zh) findings.push({ lang: "zh", text: t }); }
  for (const r of c.reasons) { const k = r.match(/^(en|zh)(\d+)_(note_not_a_remark|unplaced)$/); if (k) findings.push({ lang: k[1], text: (k[1] === "en" ? E : Z)[Number(k[2])] }); }
  const items = findings.filter((f) => f.text).map((f, n) => ({ n, ...f }));
  if (!items.length) { out.push({ id: c.id, swedish: o.swedish, outcome: "changed_since" }); continue; }
  const input = { word: o.swedish, part_of_speech: o.part_of_speech, english: E.map((t, n) => ({ n, t })), chinese: Z.map((t, n) => ({ n, t })), findings: items };
  let r;
  try { r = await ledgeredCheck(db, { learningObjectId: c.id, headword: o.swedish, pos: o.part_of_speech, field: "sense", target: "sense_completion", input, checkVersion: "sense-complete-1", ruleVersion: TAG, model: "gpt-5.4-mini", batchId: batch },
    async () => { const { result, usage } = await callOpenAIJson({ schemaName: "sense_completion", schema: SCHEMA, system: SYSTEM, user: JSON.stringify(input), maxOutputTokens: 2500 }); return { result, costUsd: openaiCost(usage).cost, calls: 1 }; }) }
  catch (e) { out.push({ id: c.id, swedish: o.swedish, outcome: "error", error: String(e.message || e).slice(0, 200) }); continue; }
  if (r.skipped) continue;
  const answers = r.row.result.items || [];
  const addEn = answers.filter((a) => a.action === "add_counterpart" && items[a.n]?.lang === "zh" && a.add_en.trim()).map((a) => a.add_en.trim());
  const addZh = answers.filter((a) => a.action === "add_counterpart" && items[a.n]?.lang === "en" && a.add_zh.trim()).map((a) => a.add_zh.trim());
  const flagged = answers.filter((a) => a.action === "not_a_meaning").map((a) => items[a.n]?.text);
  const newEn = addEn.length ? `${String(m.en).replace(/[;.\s]+$/, "")}; ${addEn.join("; ")}` : m.en;
  const newZh = addZh.length ? `${String(m.zh).replace(/[；;。\s]+$/, "")}；${addZh.join("；")}` : m.zh;
  out.push({ id: c.id, swedish: o.swedish, findings: items, answers, en: [m.en, newEn], zh: [m.zh, newZh], flagged, outcome: flagged.length ? "to_person" : addEn.length || addZh.length ? "completed" : "remarks_only" });
  if (APPLY && !flagged.length) for (const [lang, oldV, newV] of [["en", m.en, newEn], ["zh", m.zh, newZh]]) if (newV !== oldV) {
    must(await db.from("content_audit_archive").insert({ batch_id: batch, learning_object_id: c.id, table_name: "learning_object_translations", field: lang, old_value: JSON.stringify(oldV), new_value: newV, reason: REASON }));
    must(await db.from("learning_object_translations").update({ meaning: newV }).eq("learning_object_id", c.id).eq("native_language", lang).eq("meaning", oldV));
    // The entry keeps its own copy of the Chinese meaning: changed with it when it was the same.
    if (lang === "zh") {
      const { data: same } = await db.from("learning_objects").select("id").eq("id", c.id).eq("chinese", oldV);
      if (same?.length) {
        must(await db.from("content_audit_archive").insert({ batch_id: batch, learning_object_id: c.id, table_name: "learning_objects", field: "chinese", old_value: JSON.stringify(oldV), new_value: newV, reason: REASON }));
        must(await db.from("learning_objects").update({ chinese: newV }).eq("id", c.id).eq("chinese", oldV));
      }
    }
  }
}
writeFileSync(`data/reports/round-g/fix/sense-complete${APPLY ? "" : "-dry"}.json`, JSON.stringify(out, null, 1));
const tally = {};
for (const x of out) tally[x.outcome] = (tally[x.outcome] || 0) + 1;
console.log({ apply: APPLY, batch: APPLY ? batch : null, cards: cards.length, tally, spentTag: +(await spent()).toFixed(4) });
