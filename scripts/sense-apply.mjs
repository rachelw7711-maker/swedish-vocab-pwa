// Round G (2026-11-12, owner's item A): a card's senses written one by one, each with its evidence, and
// the card's sense verified when every sense shown has independent evidence (server-senses.mjs
// gradeCardSenses). No AI call here — it only reads what was paid for already:
//   the pairing   knowledge_checks target sense_pairing (sense-pair-1), for the meanings as they are now;
//   Korp          the latest knowledge_checks korp_sense_parts check of the same English meaning, else the
//                 2026-11-04 run (data/reports/korp-verify/results.json) when its parts are the meaning's;
//                 a sense it missed counts when a targeted check of the same meaning showed it (korp_sense_targeted);
//   dictionary    word overlap with Lexin/Folkets English for the card's part of speech (recorded, a
//                 candidate only).
// A card without a pairing or a Korp check of its meaning is left as it is ("needs_pairing" /
// "needs_korp"). Written (--apply): learning_object_senses (the card's senses, read by nobody yet: the
// app shows the meanings as before), content_evidence rows per sense (rule version RULE, the batch in
// source_ref), and — only when every sense is verified — resource_field_status "sense" verified with
// grade verified; the earlier rows archived (content_audit_archive, reason round_g_sense_level) and the
// card's status recomputed. A card whose sense is already verified-grade, or open with a mismatch, keeps
// its row. Nothing is removed from any card, no user table is touched.
//   node --env-file=.env scripts/sense-apply.mjs --ids <file.json> [--apply] [--out name] [--hold "a|b"]
//   node --env-file=.env scripts/sense-apply.mjs --rollback <batch>
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { useReferenceFiles, referenceEntries, englishEquivalents, meaningPartSupported } from "../server-references.mjs";
import { EVIDENCE_KINDS } from "../server-evidence.mjs";
import { useSaldoFiles, saldoEntries, lexemesConflict } from "../server-lexicon.mjs";
import { meaningParts } from "../server-korp.mjs";
import { hashOf, taskKey } from "../server-check-ledger.mjs";
import { enPieces, zhPieces, gradeCardSenses } from "../server-senses.mjs";

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw error; return data; };
const opt = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const RULE = "kv2-2026-11-12/sense-level", REASON = "round_g_sense_level";

if (process.argv.includes("--rollback")) {
  const batch = opt("--rollback");
  const rows = must(await db.from("content_audit_archive").select("learning_object_id, table_name, old_value").eq("batch_id", batch).eq("reason", REASON));
  for (const r of rows) {
    const old = JSON.parse(r.old_value);
    if (r.table_name === "learning_object_senses") {
      must(await db.from("learning_object_senses").delete().eq("learning_object_id", r.learning_object_id));
      if (old.length) must(await db.from("learning_object_senses").insert(old));
    } else must(await db.from("resource_field_status").upsert({ learning_object_id: r.learning_object_id, field: "sense", ...old }, { onConflict: "learning_object_id,field" }));
  }
  must(await db.from("content_evidence").delete().eq("rule_version", RULE).eq("source_ref->>batch", batch));
  const ids = [...new Set(rows.map((r) => r.learning_object_id))];
  for (let i = 0; i < ids.length; i += 200) must(await db.rpc("refresh_resource_summary", { p_ids: ids.slice(i, i + 200) }));
  console.log({ batch, cards: ids.length, archived_rows: rows.length });
  process.exit(0);
}

const APPLY = process.argv.includes("--apply");
const HOLD = new Set((opt("--hold") || "").split("|").filter(Boolean));   // --hold "a|b": a person looks first
await useReferenceFiles("data/reference", { extra: true });
await useSaldoFiles();
const legacyKorp = existsSync("data/reports/korp-verify/results.json") ? JSON.parse(readFileSync("data/reports/korp-verify/results.json", "utf8")) : {};
const norm = (a) => JSON.stringify((a || []).map((x) => String(x).toLowerCase().replace(/[.!?]+$/, "").trim()));
const batch = randomUUID();

async function one(id) {
  const c = must(await db.from("learning_objects").select("id, swedish, part_of_speech, object_type, status, verification_status").eq("id", id).maybeSingle());
  if (!c) return { outcome: "gone" };
  const m = Object.fromEntries(must(await db.from("learning_object_translations").select("native_language, meaning").eq("learning_object_id", id)).map((x) => [x.native_language, x.meaning]));
  const E = enPieces(m.en), Z = zhPieces(m.zh);
  const pairKey = taskKey({ learningObjectId: id, field: "sense", target: "sense_pairing", inputHash: hashOf({ E, Z }), checkVersion: "sense-pair-1" });
  const pair = must(await db.from("knowledge_checks").select("id, result, status").eq("task_key", pairKey).maybeSingle());
  if (pair?.status !== "done") return { outcome: "needs_pairing" };
  // Korp: a ledgered check of this very English meaning, else the 2026-11-04 run's of the same parts.
  const checks = must(await db.from("knowledge_checks").select("id, input, result, finished_at").eq("learning_object_id", id).eq("target", "korp_sense_parts").eq("status", "done").order("finished_at", { ascending: false }));
  const ledgered = checks.find((k) => k.input?.meaning_en === m.en);
  const legacy = legacyKorp[id]?.sense;
  const korp = ledgered ? { parts: ledgered.result.parts, unattested: ledgered.result.unattested || [], ref: { check: ledgered.id } }
    : legacy?.method === "parts" && norm(legacy.parts) === norm(meaningParts(m.en)) ? { parts: legacy.parts, unattested: legacy.unattested || [], ref: { korp_verify: "2026-11-04" } } : null;
  // A sense the first check missed, shown by a targeted check of the same meaning (sense-targeted.mjs).
  if (korp) {
    const targeted = must(await db.from("knowledge_checks").select("id, input, result").eq("learning_object_id", id).eq("target", "korp_sense_targeted").eq("status", "done"))
      .filter((k) => k.input?.meaning_en === m.en);
    for (const k of targeted) {
      const still = new Set((k.result.unattested || []).map((x) => x.toLowerCase()));
      const shown = (k.result.parts || []).filter((p) => !still.has(p.toLowerCase())).map((p) => p.toLowerCase());
      if (shown.length) { korp.unattested = korp.unattested.filter((u) => !shown.includes(u.toLowerCase())); korp.ref = { ...korp.ref, targeted: [...(korp.ref.targeted || []), k.id] }; }
    }
  }
  const row = must(await db.from("resource_field_status").select("status, grade, source, detail, rule_version, updated_at").eq("learning_object_id", id).eq("field", "sense").maybeSingle());
  const eq = c.object_type === "word" && c.part_of_speech ? englishEquivalents(await referenceEntries(null, c.swedish), c.part_of_speech) : [];
  const graded = gradeCardSenses({ E, Z, pairing: pair.result, korp, dictionary: (en) => eq.length > 0 && en.some((x) => meaningPartSupported(x, eq)), legacy: row?.grade === "ai_consistent" || /audit|ai_check/.test(row?.source || "") });
  // Two words of one spelling that inflect differently (lag: en lag "law", ett lag "team"): senses of
  // both on one card are a homograph mix, for a person to part — never verified as one word.
  if (graded.senses.length > 1 && c.object_type === "word") {
    const rows = await saldoEntries(null, c.swedish, c.part_of_speech);
    if (rows.some((a, i) => rows.slice(i + 1).some((b) => lexemesConflict(a, b, c.part_of_speech)))) { graded.verified = false; graded.reasons.push("saldo_homographs"); }
  }
  const out = { swedish: c.swedish, verified: graded.verified, reasons: graded.reasons, senses: graded.senses.map((s) => ({ en: s.en, zh: s.zh, grade: s.grade, korp: s.korp })), notes: graded.notes,
    korp: korp ? (ledgered ? "ledger" : "korp_verify_2026_11_04") : "none" };
  if (!korp) return { outcome: "needs_korp", ...out };
  if (HOLD.has(c.swedish)) return { outcome: "held_for_person", ...out };
  const already = row?.status === "verified" && row?.grade === "verified";
  const outcome = already ? "already_verified" : row?.status === "mismatch" ? "mismatch_open" : graded.verified ? "verified" : "partial_kept";
  if (!APPLY) return { outcome, ...out };

  const now = new Date().toISOString();
  const oldSenses = must(await db.from("learning_object_senses").select("*").eq("learning_object_id", id));
  must(await db.from("content_audit_archive").insert({ batch_id: batch, learning_object_id: id, table_name: "learning_object_senses", field: "senses", old_value: JSON.stringify(oldSenses), new_value: String(graded.senses.length), reason: REASON }));
  must(await db.from("learning_object_senses").delete().eq("learning_object_id", id));
  if (graded.senses.length) must(await db.from("learning_object_senses").insert(graded.senses.map((s) => ({ learning_object_id: id, sense_order: s.order, meaning_en: s.en.join("; "), meaning_zh: s.zh.join("；"), grade: s.grade, rule_version: RULE, updated_at: now }))));
  const ev = graded.senses.flatMap((s) => s.evidence.map((e) => ({ learning_object_id: id, item_type: "sense", item_ref: `sense:${s.order}`, kind: e.kind, result: e.result, strength: EVIDENCE_KINDS[e.kind].strength,
    source_ref: { batch, pairing: pair.id, ...(e.kind === "korp_sense" ? korp.ref : {}), ...(e.ref ? { lexin_variant: e.ref } : {}) }, rule_version: RULE, note: e.kind === "korp_sense" && e.result === "not_found" ? "not among the Korp sentences read" : "" })));
  if (ev.length) must(await db.from("content_evidence").upsert(ev, { onConflict: "learning_object_id,item_type,item_ref,kind,rule_version" }));
  if (outcome === "verified") {
    must(await db.from("content_audit_archive").insert({ batch_id: batch, learning_object_id: id, table_name: "resource_field_status", field: "sense", old_value: JSON.stringify(row || { status: "present", source: null, grade: null, detail: null }), new_value: "verified", reason: REASON }));
    must(await db.from("resource_field_status").upsert({ learning_object_id: id, field: "sense", status: "verified", grade: "verified", rule_version: RULE, source: `${row?.source || "ai_check"};korp-senses`,
      detail: { ...(row?.detail || {}), open: undefined, sense_level: { batch, senses: graded.senses.length, pairing: pair.id, korp: korp.ref } }, updated_at: now }, { onConflict: "learning_object_id,field" }));
    must(await db.rpc("refresh_resource_summary", { p_ids: [id] }));
  }
  return { outcome, ...out };
}

const ids = JSON.parse(readFileSync(opt("--ids"), "utf8"));
const results = {};
let n = 0;
const todo = [...ids];
await Promise.all([1, 2, 3, 4].map(async () => {
  while (todo.length) {
    const id = todo.shift();
    try { results[id] = await one(id); } catch (e) { results[id] = { outcome: "error", reason: String(e.message || e).slice(0, 200) }; }
    if (++n % 100 === 0) console.log(n, "of", ids.length);
  }
}));
mkdirSync("data/reports/round-g/fix", { recursive: true });
const file = `data/reports/round-g/fix/${opt("--out") || "sense-apply"}${APPLY ? "" : "-dry"}.json`;
writeFileSync(file, JSON.stringify({ batch: APPLY ? batch : null, results }, null, 1));
const tally = {}, why = {};
for (const r of Object.values(results)) {
  tally[r.outcome] = (tally[r.outcome] || 0) + 1;
  if (r.outcome === "partial_kept") for (const x of new Set((r.reasons || []).map((x) => x.replace(/^(en|zh)\d+_/, "$1_").replace(/^sense\d+_/, "sense_")))) why[x] = (why[x] || 0) + 1;
}
console.log({ apply: APPLY, batch: APPLY ? batch : null, tally, partialReasons: why, file });
