// Korp evidence for parts of speech and senses no dictionary confirms (2026-11-04; server-korp.mjs).
//   node --env-file=.env scripts/korp-verify.mjs --max-usd 3 [--fields pos,sense] [--limit n] [--write]
// Picks the statuses still "present" because no reference has the word or its English
// (pos: open=no_reference; sense: open=no_dictionary_english / dictionary_english_differs), the
// ones new cards and corrections leave behind too. Existence and part of speech are counted;
// a sense also needs two independent readings of real sentences (gpt-5.4-mini, capped by
// --max-usd). Verified only when every check passes; otherwise the evidence and the failed check
// are kept in detail.korp and the status stays present. Mismatches are never touched.
// Results are cached in data/reports/korp-verify/ (resumable); --write updates the statuses, archived.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { korpAttestation, judgeAttestation, korpCqp, korpSentences, judgeSenseFromSentences } from "../server-korp.mjs";
import { callOpenAIJson } from "../server-native.mjs";

const opt = (name, d = null) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : d; };
const WRITE = process.argv.includes("--write");
const MAX_USD = Number(opt("--max-usd", "0"));
const FIELDS = opt("--fields", "pos,sense").split(",");
const LIMIT = Number(opt("--limit", "0")) || Infinity;
const OUT = "data/reports/korp-verify/";
mkdirSync(OUT, { recursive: true });
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };

// gpt-5.4-mini: $0.75 / 1M input, $4.50 / 1M output tokens.
const LEDGER = OUT + "spend.json";
const spend = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, "utf8")) : { usd: 0, calls: 0 };
async function ai(args) {
  if (spend.usd >= MAX_USD) throw new Error(`spending cap $${MAX_USD} reached`);
  const { result, usage } = await callOpenAIJson(args);
  spend.usd += (usage.input_tokens || 0) * 0.75e-6 + (usage.output_tokens || 0) * 4.5e-6;
  spend.calls++;
  writeFileSync(LEDGER, JSON.stringify(spend));
  return result;
}

async function pageAll(build) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const part = must(await build().range(from, from + 999));
    rows.push(...part);
    if (part.length < 1000) return rows;
  }
}
const OPEN = { pos: ["no_reference"], sense: ["no_dictionary_english", "dictionary_english_differs"] };
const statuses = (await pageAll(() => db.from("resource_field_status").select("learning_object_id, field, status, source, detail").in("field", FIELDS).eq("status", "present")))
  .filter((s) => OPEN[s.field]?.includes(s.detail?.open));
const ids = [...new Set(statuses.map((s) => s.learning_object_id))].slice(0, LIMIT);
console.log({ statuses: statuses.length, entries: ids.length, write: WRITE, maxUsd: MAX_USD });

const CACHE = OUT + "results.json";
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
const save = () => writeFileSync(CACHE, JSON.stringify(cache, null, 1));

async function check(id) {
  const o = must(await db.from("learning_objects").select("id, swedish, part_of_speech, object_type, status, word_forms(form_value), learning_object_translations(native_language, meaning)").eq("id", id).single());
  if (o.status === "retired") return { skipped: "retired" };
  const mine = statuses.filter((s) => s.learning_object_id === id);
  const { data: posRow } = await db.from("resource_field_status").select("status").eq("learning_object_id", id).eq("field", "pos").maybeSingle();
  const pos = o.object_type === "word" ? o.part_of_speech : null;
  const forms = o.word_forms.map((f) => f.form_value);
  const attestation = await korpAttestation(o.swedish, { forms });
  const verdict = judgeAttestation(attestation, pos);
  const out = { lemma: o.swedish, part_of_speech: pos, object_type: o.object_type, at: new Date().toISOString(),
    attestation: { cqp: attestation.cqp, match: attestation.match, total: attestation.total, perCorpus: attestation.perCorpus, byPos: attestation.byPos }, verdict };
  if (mine.some((s) => s.field === "pos")) out.pos = verdict.exists.ok && verdict.pos.ok ? { ok: true } : { ok: false, open: !verdict.exists.ok ? "korp_not_attested" : verdict.pos.differs ? "korp_pos_differs" : "korp_pos_unconfirmed" };
  if (mine.some((s) => s.field === "sense")) {
    const posOk = !pos || verdict.pos.ok || posRow?.status === "verified";
    if (!verdict.exists.ok) out.sense = { ok: false, open: "korp_not_attested" };
    else if (!posOk) out.sense = { ok: false, open: "korp_pos_unconfirmed" };
    else {
      const m = Object.fromEntries(o.learning_object_translations.map((t) => [t.native_language, t.meaning]));
      const cqp = attestation.match === "multiword" ? attestation.cqp : korpCqp(o.swedish, pos, { spelling: attestation.match === "spelling", forms });
      const sentences = await korpSentences(cqp, { count: 12 });
      const judged = await judgeSenseFromSentences({ word: o.swedish, pos, meaningZh: m.zh || "", meaningEn: m.en || "", sentences }, ai);
      out.sense = { ok: judged.ok, ...(judged.ok ? {} : { open: "korp_sense_unconfirmed" }), cqp, reason: judged.reason, senses: judged.senses, unattested: judged.unattested, corpora: judged.corpora,
        sentences: sentences.map((s) => ({ ...s, ...(judged.readings.find((r) => r.n === s.n) || {}) })) };
    }
  }
  return out;
}

const todo = ids.filter((id) => !cache[id]);
let done = 0;
async function worker() {
  while (todo.length) {
    const id = todo.shift();
    try { cache[id] = await check(id); } catch (e) {
      if (/spending cap/.test(e.message)) { console.log(e.message); todo.length = 0; return; }
      console.error(id, e.message); continue;
    }
    if (++done % 20 === 0) { save(); console.log("checked", done, "left", todo.length, `$${spend.usd.toFixed(3)}`); }
  }
}
await Promise.all([1, 2, 3, 4].map(worker));
save();

const tally = {};
for (const s of statuses) {
  const r = cache[s.learning_object_id]?.[s.field];
  if (r && typeof r !== "object") continue;   // (results cached before 2026-11-04 kept the part of speech under "pos")
  const k = `${s.field}:${r ? (r.ok ? "verified" : r.open) : "unchecked"}`;
  tally[k] = (tally[k] || 0) + 1;
}
console.log(tally, `spent $${spend.usd.toFixed(3)} in ${spend.calls} calls`);

if (WRITE) {
  const batch = randomUUID(), at = new Date().toISOString();
  let written = 0;
  for (const s of statuses) {
    const c = cache[s.learning_object_id], r = c?.[s.field];
    if (!r || typeof r !== "object") continue;
    const korp = { checked_at: c.at, attestation: c.attestation, existence: c.verdict.exists, pos: c.verdict.pos, ...(s.field === "sense" ? { sense: { cqp: r.cqp, reason: r.reason, senses: r.senses, unattested: r.unattested, corpora: r.corpora, sentences: r.sentences } } : {}) };
    const next = { status: r.ok ? "verified" : "present", source: r.ok ? `${s.source};korp` : s.source, detail: { ...(s.detail || {}), open: r.ok ? undefined : r.open, korp } };
    // still the row we read (not changed by someone else meanwhile)
    const { data: cur } = await db.from("resource_field_status").select("status, detail").eq("learning_object_id", s.learning_object_id).eq("field", s.field).maybeSingle();
    if (cur?.status !== "present" || cur.detail?.open !== s.detail?.open) continue;
    must(await db.from("content_audit_archive").insert({ batch_id: batch, learning_object_id: s.learning_object_id, table_name: "resource_field_status", field: s.field,
      old_value: JSON.stringify({ status: s.status, source: s.source, open: s.detail?.open }), new_value: JSON.stringify({ status: next.status, open: next.detail.open || null }), reason: "korp_evidence" }));
    must(await db.from("resource_field_status").update({ ...next, updated_at: at }).eq("learning_object_id", s.learning_object_id).eq("field", s.field));
    written++;
  }
  const touched = [...new Set(statuses.filter((s) => cache[s.learning_object_id]?.[s.field]).map((s) => s.learning_object_id))];
  for (let i = 0; i < touched.length; i += 200) must(await db.rpc("refresh_resource_summary", { p_ids: touched.slice(i, i + 200) }));
  console.log({ batch, written });
}
