// Unified AI workload (2026-10-31): merges the scan's open fields (scripts/scan-resources.mjs:
// fill "ai" and "review") with the quality audit's findings (scripts/audit-quality.mjs:
// D missing, E looks wrong), de-duplicates per entry and field, sorts them into the
// owner's categories and estimates requests, tokens, cost and time. Read-only; runs no AI.
//
//   node --env-file=.env scripts/ai-workload.mjs [--status …/field-status.ndjson] [--issues …/quality/issues.ndjson]
//        [--out data/reports/prod/ai-workload.json] [--include-drafts]
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const statusFile = opt("--status", "data/reports/prod/field-status.ndjson");
const issuesFile = opt("--issues", "data/reports/prod/quality/issues.ndjson");
const outFile = opt("--out", "data/reports/prod/ai-workload.json");
const ndjson = (file) => readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l));

const PRICE = { input: 0.75, output: 4.5 };   // gpt-5.4-mini, USD per 1M tokens (as scripts/enrich-batch.mjs)
const BATCH_SIZE = 25;
const usd = (i, o, batch = false) => ((i / 1e6) * PRICE.input + (o / 1e6) * PRICE.output) * (batch ? 0.5 : 1);

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const objects = new Map();
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from("learning_objects").select("id, swedish, part_of_speech, object_type, status, access_tier, chinese").order("id").range(from, from + 999);
  if (error) throw error;
  data.forEach((o) => objects.set(o.id, o));
  if (data.length < 1000) break;
}

// (entry, field) → task. mode: generate (missing) | verify (stored value looks wrong) | human (better judged by a person).
const tasks = new Map();
const add = (id, field, mode, reason, extra = {}) => {
  const k = `${id}|${field}`;
  const prev = tasks.get(k);
  // verify/human beats generate: an entry with a dubious value needs a check, not a blind fill.
  if (prev && (prev.mode !== "generate" || mode === "generate")) { prev.reasons.add(reason); return; }
  tasks.set(k, { id, field, mode, reasons: new Set([...(prev?.reasons || []), reason]), ...extra });
};
for (const s of ndjson(statusFile)) {
  if (s.status !== "missing") continue;
  if (s.detail?.fill === "ai") add(s.learning_object_id, s.field, "generate", "scan:missing");
  else if (s.detail?.fill === "review") add(s.learning_object_id, s.field, s.field === "swedish_explanation" ? "human" : "verify", `scan:${s.detail.reason}`);
}
for (const i of ndjson(issuesFile)) {
  if (i.category === "D") add(i.id, i.field, "generate", `audit:${i.kind}`);
  // Held note texts may be copied glossary text: a person decides (copyright), not a model.
  else if (i.category === "E") add(i.id, i.field, /^note_text_held/.test(i.kind) ? "human" : "verify", `audit:${i.kind}`);
}

const VERB = /^form:(present|preteritum|supinum|imperative|infinitive|present_participle|perfect_participle|verb_group)$|^passiv_s$/;
const NOUN = /^form:(genus|declension_group|singular_indefinite|singular_definite|plural_indefinite|plural_definite)$|^countability$/;
const ADJ = /^form:(base_form|neuter_form|definite_form|plural_form|comparative|superlative|superlative_indefinite|superlative_definite)$/;
function category(t, o) {
  if (o.object_type === "phrase") return "固定搭配";
  if (o.object_type !== "word") return "地道表达";
  if (VERB.test(t.field)) return "动词词形及分词";
  if (NOUN.test(t.field)) return "名词性别、变格及复数";
  if (ADJ.test(t.field)) return "形容词变化";
  return { swedish_explanation: "瑞典语释义", meaning_zh: "中文释义", example: "例句", cefr_level: "CEFR" }[t.field] || "其他语义或语言质量问题";
}

const includeDrafts = args.includes("--include-drafts");
const rows = [];
let skippedDrafts = 0;
for (const t of tasks.values()) {
  const o = objects.get(t.id);
  if (!o || o.status === "retired") continue;
  if (o.status === "draft" && !includeDrafts) { skippedDrafts++; continue; }
  rows.push({ ...t, reasons: [...t.reasons], category: category(t, o), type: o.object_type, swedish: o.swedish, pos: o.part_of_speech, zhLength: (o.chinese || "").length });
}

// Requests: one per ≤25 entries that share mode, entry type and field set (one context line per entry).
const perEntry = new Map();
for (const r of rows.filter((x) => x.mode !== "human")) {
  const k = `${r.id}|${r.mode}`;
  (perEntry.get(k) ?? perEntry.set(k, { id: r.id, mode: r.mode, type: r.type, swedish: r.swedish, pos: r.pos, zhLength: r.zhLength, fields: [] }).get(k)).fields.push(r.field);
}
const groups = new Map();
for (const e of perEntry.values()) {
  const g = `${e.mode}|${e.type}|${e.fields.sort().join(",")}`;
  (groups.get(g) ?? groups.set(g, []).get(g)).push(e);
}
let requests = 0, inTok = 0, outTok = 0;
for (const [g, list] of groups) {
  const [mode] = g.split("|");
  for (let i = 0; i < list.length; i += BATCH_SIZE) {
    const chunk = list.slice(i, i + BATCH_SIZE);
    requests++;
    // system prompt ≈ 500 chars + 120 per field spec; one line per entry (id, headword, pos, Chinese meaning,
    // and for verify the stored value plus the reference) ≈ chars / 3.5 tokens.
    const fields = chunk[0].fields.length;
    const chars = 500 + 120 * fields + chunk.reduce((n, e) => n + 20 + e.swedish.length + (e.pos || "").length + e.zhLength * 2 + (mode === "verify" ? 60 * fields : 0), 0);
    inTok += Math.ceil(chars / 3.5) + 120;
    outTok += chunk.reduce((n, e) => n + 12 + e.fields.reduce((m, f) => m + (mode === "verify" ? 25 : f === "example" ? 45 : f === "swedish_explanation" ? 30 : 10), 0), 0);
  }
}

const tally = (list, key) => list.reduce((m, r) => { const k = key(r); m[k] = (m[k] || 0) + 1; return m; }, {});
const report = {
  createdAt: new Date().toISOString(),
  draftsExcluded: includeDrafts ? 0 : skippedDrafts,
  fields: rows.length,
  entries: new Set(rows.map((r) => r.id)).size,
  byMode: tally(rows, (r) => r.mode),
  byCategory: tally(rows, (r) => r.category),
  byCategoryAndMode: tally(rows, (r) => `${r.category} · ${r.mode}`),
  entriesByCategory: Object.fromEntries(Object.entries(rows.reduce((m, r) => { (m[r.category] ??= new Set()).add(r.id); return m; }, {})).map(([k, v]) => [k, v.size])),
  estimate: {
    requests, inputTokens: inTok, outputTokens: outTok,
    usdSync: +usd(inTok, outTok).toFixed(3), usdBatch: +usd(inTok, outTok, true).toFixed(3),
    // ≈ 12 s per request at concurrency 3; the Batch API returns within its 24 h window (≈ 15–60 min observed).
    minutesSync: Math.ceil((requests * 12) / 3 / 60),
  },
  tasks: rows,
};
writeFileSync(outFile, JSON.stringify(report, null, 1));
const { tasks: _, ...summary } = report;
console.log(JSON.stringify(summary, null, 1));
