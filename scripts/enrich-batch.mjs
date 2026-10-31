// Batch AI fill for fields only generated text can supply (2026-10-31).
// Nothing is written to the database unless --apply is given, and a full run
// needs the owner's go-ahead (cost and production data).
//
//   node --env-file=.env scripts/enrich-batch.mjs <command> [options]
//
// Commands
//   plan      Build a job from the scan's field-status file: one task per entry,
//             grouped by kind and field set. Prints counts, tokens and cost.
//   run       Work through a job's pending tasks with the synchronous API
//             (--limit N for a sample). Results are validated and stored in the
//             job's state; resumable — re-run continues where it stopped.
//   batchfile Write the pending tasks as an OpenAI Batch API JSONL (half price,
//             results within 24 h); `submit` uploads it and starts the batch,
//             `fetch` checks it and, when finished, downloads and collects the results.
//   collect   Read a downloaded Batch API output file (collect <results.jsonl>).
//   apply     Write a job's validated results into empty fields only (re-checked
//             right before each write). Needs --apply as a second confirmation.
//
// Options: --job <id> --status <field-status.ndjson> --types word,phrase,expression
//          --include-drafts --batch-size 25 --concurrency 3 --min-interval-ms 400
//          --budget-usd 1.00 --limit N --backup <dir> (read entries from a backup)
//
// State: data/enrichment/<job>/state.json (tasks, attempts, results, tokens, cost).
import { createClient } from "@supabase/supabase-js";
import { gunzipSync } from "node:zlib";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";

const [command, ...rest] = process.argv.slice(2);
const opt = (n, d = null) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : d; };
const flag = (n) => rest.includes(n);

const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const PRICE = { input: 0.75, output: 4.5 };          // USD per 1M tokens, synchronous
const BATCH_DISCOUNT = 0.5;                          // OpenAI Batch API
const MAX_ATTEMPTS = 3;

const escape = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const usesHeadword = (text, headword) => !/\s/.test(headword.trim())
  && new RegExp(`(^|[^\\p{L}])${escape(headword.trim().toLowerCase())}([^\\p{L}]|$)`, "u").test(text.toLowerCase());

// What each AI field asks for and how its answer is checked.
const FIELD_SPECS = {
  swedish_explanation: {
    schema: { type: "string" },
    ask: "swedish_explanation: one short, simple Swedish definition (max 20 words) a B1 learner understands; do not just repeat the headword",
    // A definition that uses the headword itself ("kopia: en likadan kopia …") is sent back.
    valid: (v, e) => typeof v === "string" && v.length >= 4 && v.length <= 200 && !/[\u3400-\u9fff]/.test(v) && !usesHeadword(v, e.swedish),
  },
  meaning_en: {
    schema: { type: "string" },
    ask: "meaning_en: concise English meaning matching the Chinese meaning given",
    valid: (v) => typeof v === "string" && v.length >= 1 && v.length <= 120 && !/[㐀-鿿]/.test(v),
  },
  meaning_zh: {
    schema: { type: "string" },
    ask: "meaning_zh: concise Simplified Chinese meaning",
    valid: (v) => typeof v === "string" && /[㐀-鿿]/.test(v) && v.length <= 60,
  },
  example: {
    schema: { type: "object", additionalProperties: false, properties: { swedish: { type: "string" }, zh: { type: "string" } }, required: ["swedish", "zh"] },
    ask: "example: one natural Swedish sentence using the headword (any inflection) with a Chinese translation",
    valid: (v, e) => v && typeof v.swedish === "string" && v.swedish.length <= 200 && /[㐀-鿿]/.test(v.zh || "")
      && v.swedish.toLowerCase().includes(e.swedish.toLowerCase().slice(0, Math.max(3, e.swedish.length - 3))),
  },
  cefr_level: {
    schema: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    ask: "cefr_level: the CEFR level at which learners typically meet the word",
    valid: (v) => ["A1", "A2", "B1", "B2", "C1", "C2"].includes(v),
  },
};
// Forms: the standard written form, or for comparison the periphrastic "mer …/mest …" when that is what Swedish uses.
const FORM_ASK = {
  comparative: "comparative (e.g. \"större\", or \"mer intressant\" when Swedish compares with mer)",
  superlative_indefinite: "superlative_indefinite (e.g. \"störst\" / \"mest intressant\")",
  superlative_definite: "superlative_definite (e.g. \"största\" / \"mest intressanta\")",
  superlative: "superlative (adverbs)",
};
const formSpec = (type) => ({
  schema: { type: "string" },
  ask: `form:${type}: ${FORM_ASK[type] || type.replace(/_/g, " ")}; "" if the word has no such form`,
  valid: (v) => typeof v === "string" && v.length <= 60 && !/[㐀-鿿]/.test(v),
});
const spec = (field) => (field.startsWith("form:") ? formSpec(field.slice(5)) : FIELD_SPECS[field]);

const usd = (inTok, outTok, batch = false) => ((inTok / 1e6) * PRICE.input + (outTok / 1e6) * PRICE.output) * (batch ? BATCH_DISCOUNT : 1);
const dirOf = (job) => `data/enrichment/${job}`;
const load = (job) => JSON.parse(readFileSync(`${dirOf(job)}/state.json`, "utf8"));
const save = (state) => { mkdirSync(dirOf(state.id), { recursive: true }); writeFileSync(`${dirOf(state.id)}/state.json`, JSON.stringify(state, null, 1)); };
const db = () => createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ---------------------------------------------------------------------------
// Entry context: headword, part of speech, Chinese meaning (anchors the sense).
// ---------------------------------------------------------------------------
async function loadEntries(ids) {
  const backup = opt("--backup");
  if (backup) {
    const L = (t) => JSON.parse(gunzipSync(readFileSync(`${backup}/${t}.json.gz`)));
    const zh = new Map(L("learning_object_translations").filter((t) => t.native_language === "zh").map((t) => [t.learning_object_id, t.meaning]));
    const want = new Set(ids);
    return new Map(L("learning_objects").filter((o) => want.has(o.id)).map((o) => [o.id, { id: o.id, swedish: o.swedish, pos: o.part_of_speech, type: o.object_type, status: o.status, zh: zh.get(o.id) || o.chinese || "" }]));
  }
  const out = new Map();
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data, error } = await db().from("learning_objects").select("id, swedish, part_of_speech, object_type, status, chinese, learning_object_translations(native_language, meaning)").in("id", chunk);
    if (error) throw error;
    for (const o of data) {
      const zh = o.learning_object_translations?.find((t) => t.native_language === "zh")?.meaning;
      out.set(o.id, { id: o.id, swedish: o.swedish, pos: o.part_of_speech, type: o.object_type, status: o.status, zh: zh || o.chinese || "" });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Requests: one call per batch of entries that need the same fields.
// ---------------------------------------------------------------------------
function requestFor(group, tasks, entries) {
  const fields = group.split("|")[1].split(",");
  const item = { type: "object", additionalProperties: false, properties: { id: { type: "string" } }, required: ["id"] };
  for (const f of fields) { item.properties[f] = spec(f).schema; item.required.push(f); }
  const schema = { type: "object", additionalProperties: false, properties: { items: { type: "array", items: item } }, required: ["items"] };
  const system = `You complete entries in a Swedish learner's dictionary for Chinese-speaking learners. For every input line return one item with the same id and these fields:\n- ${fields.map((f) => spec(f).ask).join("\n- ")}\nThe Chinese meaning tells you which sense is meant. Never invent other senses.`;
  const user = tasks.map((t) => { const e = entries.get(t.id); return `${t.id.slice(0, 8)}\t${e.swedish}\t${e.pos}\t${e.zh}`; }).join("\n");
  return {
    model: MODEL, reasoning: { effort: "low" }, max_output_tokens: 300 + tasks.length * 60 * fields.length,
    text: { format: { type: "json_schema", name: "dictionary_fill", strict: true, schema } },
    input: [{ role: "system", content: system }, { role: "user", content: user }],
  };
}

function acceptResults(state, tasks, items, entries) {
  const byShort = new Map(items.map((it) => [it.id, it]));
  for (const t of tasks) {
    const it = byShort.get(t.id.slice(0, 8));
    const e = entries.get(t.id);
    const good = {}, bad = [], noForm = [];
    for (const f of t.fields) {
      const v = it?.[f];
      if (v === "" && f.startsWith("form:")) { noForm.push(f); continue; }   // the word has no such form
      if (it && spec(f).valid(v, e)) good[f] = v; else bad.push(f);
    }
    t.attempts++;
    t.result = { ...(t.result || {}), ...good };
    t.notApplicable = [...new Set([...(t.notApplicable || []), ...noForm])];
    t.invalid = bad;
    t.status = bad.length === 0 ? "done" : t.attempts >= MAX_ATTEMPTS ? "failed" : "pending";
    if (bad.length && t.status === "pending") t.fields = bad;       // retry only what failed
  }
  state.updatedAt = new Date().toISOString();
}

async function callOpenAI(body) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) { const err = new Error(data.error?.message || `HTTP ${response.status}`); err.status = response.status; throw err; }
  const text = typeof data.output_text === "string" ? data.output_text : (data.output || []).flatMap((o) => o.content || []).map((c) => c.text || "").join("");
  return { items: JSON.parse(text).items || [], usage: data.usage || {} };
}

const groupsOf = (tasks) => {
  const g = {};
  for (const t of tasks) (g[`${t.type}|${t.fields.join(",")}`] ??= []).push(t);
  return g;
};
function batches(state, limit = Infinity) {
  const size = Number(opt("--batch-size", state.batchSize || 25));
  const pending = state.tasks.filter((t) => t.status === "pending").slice(0, limit);
  const out = [];
  for (const [group, list] of Object.entries(groupsOf(pending))) for (let i = 0; i < list.length; i += size) out.push({ group, tasks: list.slice(i, i + size) });
  return out;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
async function plan() {
  const types = (opt("--types", "word,phrase,expression")).split(",");
  const status = readFileSync(opt("--status", "data/reports/field-status.ndjson"), "utf8").trim().split("\n").map((l) => JSON.parse(l))
    .filter((s) => s.status === "missing" && s.detail?.fill === "ai");
  const perEntry = new Map();
  for (const s of status) (perEntry.get(s.learning_object_id) ?? perEntry.set(s.learning_object_id, []).get(s.learning_object_id)).push(s.field);
  const entries = await loadEntries([...perEntry.keys()]);
  const tasks = [];
  for (const [id, fields] of perEntry) {
    const e = entries.get(id);
    if (!e || !types.includes(e.type === "word" ? "word" : e.type)) continue;
    if (e.status === "draft" && !flag("--include-drafts")) continue;   // drafts aren't shown to anyone
    tasks.push({ id, type: e.type, fields: fields.filter((f) => spec(f)).sort(), status: "pending", attempts: 0 });
  }
  const state = { id: opt("--job") || randomUUID(), model: MODEL, createdAt: new Date().toISOString(), batchSize: Number(opt("--batch-size", 25)), spentUsd: 0, inputTokens: 0, outputTokens: 0, calls: 0, tasks: tasks.filter((t) => t.fields.length) };
  // Token estimate from request size (≈ 4 chars per token for this mixed text) and per-field output.
  let inTok = 0, outTok = 0;
  for (const b of batches(state)) {
    const body = requestFor(b.group, b.tasks, entries);
    inTok += Math.ceil(JSON.stringify(body.input).length / 3.5) + 120;
    outTok += b.tasks.reduce((n, t) => n + 12 + t.fields.reduce((m, f) => m + (f === "example" ? 45 : f === "swedish_explanation" ? 30 : 10), 0), 0);
  }
  state.estimate = { requests: batches(state).length, inputTokens: inTok, outputTokens: outTok, usdSync: +usd(inTok, outTok).toFixed(4), usdBatch: +usd(inTok, outTok, true).toFixed(4) };
  save(state);
  const byGroup = Object.fromEntries(Object.entries(groupsOf(state.tasks)).map(([g, l]) => [g, l.length]));
  console.log(JSON.stringify({ job: state.id, tasks: state.tasks.length, fields: state.tasks.reduce((n, t) => n + t.fields.length, 0), estimate: state.estimate, byGroup }, null, 1));
}

async function run() {
  const state = load(opt("--job"));
  const budget = Number(opt("--budget-usd", "0.50"));
  const concurrency = Number(opt("--concurrency", 3));
  const minInterval = Number(opt("--min-interval-ms", 400));
  const work = batches(state, Number(opt("--limit", Infinity)));
  const entries = await loadEntries([...new Set(work.flatMap((b) => b.tasks.map((t) => t.id)))]);
  let next = 0, lastStart = 0, stopped = "";
  const started = Date.now();
  async function worker() {
    while (next < work.length && !stopped) {
      const b = work[next++];
      const body = requestFor(b.group, b.tasks, entries);
      const worst = usd(Math.ceil(JSON.stringify(body.input).length / 3), body.max_output_tokens);
      if (state.spentUsd + worst > budget) { stopped = `budget ${budget} USD reached`; break; }
      const wait = lastStart + minInterval - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastStart = Date.now();
      try {
        const { items, usage } = await callOpenAI(body);
        state.calls++; state.inputTokens += usage.input_tokens || 0; state.outputTokens += usage.output_tokens || 0;
        state.spentUsd = +usd(state.inputTokens, state.outputTokens).toFixed(6);
        acceptResults(state, b.tasks, items, entries);
      } catch (error) {
        for (const t of b.tasks) { t.attempts++; t.lastError = String(error.message).slice(0, 300); if (t.attempts >= MAX_ATTEMPTS) t.status = "failed"; }
        if (error.status === 429) await new Promise((r) => setTimeout(r, 10_000));   // rate limited: back off
      }
      save(state);                                                               // resumable after every call
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  const count = (s) => state.tasks.filter((t) => t.status === s).length;
  console.log(JSON.stringify({ job: state.id, calls: state.calls, seconds: Math.round((Date.now() - started) / 1000), inputTokens: state.inputTokens, outputTokens: state.outputTokens, spentUsd: state.spentUsd, done: count("done"), pending: count("pending"), failed: count("failed"), stopped: stopped || null }, null, 1));
}

async function batchfile() {
  const state = load(opt("--job"));
  const work = batches(state, Number(opt("--limit", Infinity)));
  const entries = await loadEntries([...new Set(work.flatMap((b) => b.tasks.map((t) => t.id)))]);
  const lines = work.map((b, i) => JSON.stringify({ custom_id: `${state.id}:${i}:${b.tasks.map((t) => t.id).join(",")}`, method: "POST", url: "/v1/responses", body: requestFor(b.group, b.tasks, entries) }));
  const file = `${dirOf(state.id)}/batch-input.jsonl`;
  writeFileSync(file, lines.join("\n") + "\n");
  console.log(`wrote ${lines.length} requests to ${file} — upload with purpose "batch" and create a batch for /v1/responses (24h window), then: collect <output.jsonl>`);
}

async function collect() {
  const state = load(opt("--job"));
  const file = rest.find((a) => a.endsWith(".jsonl"));
  const all = readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const ids = [...new Set(all.flatMap((r) => r.custom_id.split(":")[2].split(",")))];
  const entries = await loadEntries(ids);
  for (const r of all) {
    const tasks = r.custom_id.split(":")[2].split(",").map((id) => state.tasks.find((t) => t.id === id)).filter(Boolean);
    const body = r.response?.body;
    if (!body) continue;
    const text = (body.output || []).flatMap((o) => o.content || []).map((c) => c.text || "").join("");
    state.inputTokens += body.usage?.input_tokens || 0; state.outputTokens += body.usage?.output_tokens || 0;
    acceptResults(state, tasks, JSON.parse(text).items || [], entries);
  }
  state.spentUsd = +usd(state.inputTokens, state.outputTokens, true).toFixed(6);
  save(state);
  console.log("collected", all.length, "responses");
}

async function apply() {
  if (!flag("--apply")) throw new Error("apply writes to the database: pass --apply to confirm");
  const state = load(opt("--job"));
  const client = db();
  let written = 0, skipped = 0;
  for (const t of state.tasks.filter((t) => t.status === "done" && t.result && !t.applied)) {
    const applied = [];
    for (const [field, value] of Object.entries(t.result)) {
      // Re-check right before writing: only an empty field is filled.
      if (field === "swedish_explanation" || field === "cefr_level") {
        const { data } = await client.from("learning_objects").update({ [field]: value }).eq("id", t.id).or(`${field}.is.null,${field}.eq.`).select("id");
        data?.length ? applied.push(field) : skipped++;
      } else if (field.startsWith("form:")) {
        const { data } = await client.from("word_forms").upsert({ learning_object_id: t.id, form_type: field.slice(5), form_value: value, sort_order: 100 }, { onConflict: "learning_object_id,form_type", ignoreDuplicates: true }).select("learning_object_id");
        data?.length ? applied.push(field) : skipped++;
      } else if (field === "meaning_en" || field === "meaning_zh") {
        const lang = field.slice(-2);
        const { data: row } = await client.from("learning_object_translations").select("id, meaning").eq("learning_object_id", t.id).eq("native_language", lang).maybeSingle();
        if (row?.meaning) { skipped++; continue; }
        if (row) await client.from("learning_object_translations").update({ meaning: value }).eq("id", row.id);
        else await client.from("learning_object_translations").insert({ learning_object_id: t.id, native_language: lang, meaning: value });
        applied.push(field);
      } else if (field === "example") {
        const { count } = await client.from("learning_object_examples").select("id", { count: "exact", head: true }).eq("learning_object_id", t.id);
        if (count) { skipped++; continue; }
        const { data: ex } = await client.from("learning_object_examples").insert({ learning_object_id: t.id, example_swedish: value.swedish, sort_order: 0 }).select("id").single();
        if (ex) await client.from("learning_object_example_translations").insert({ example_id: ex.id, native_language: "zh", translation: value.zh });
        applied.push(field);
      }
    }
    if (t.notApplicable?.length) {
      await client.from("resource_field_status").upsert(t.notApplicable.map((field) => ({ learning_object_id: t.id, field, status: "not_applicable", source: "openai-generated", detail: { job: state.id }, updated_at: new Date().toISOString() })), { onConflict: "learning_object_id,field" });
    }
    if (applied.length || t.notApplicable?.length) {
      if (applied.length) await client.from("resource_field_status").upsert(applied.map((field) => ({ learning_object_id: t.id, field, status: "present", source: "openai-generated", detail: { job: state.id }, updated_at: new Date().toISOString() })), { onConflict: "learning_object_id,field" });
      await client.rpc("refresh_resource_summary", { p_ids: [t.id] });
      written += applied.length;
    }
    t.applied = applied;
    save(state);
  }
  console.log(JSON.stringify({ job: state.id, written, skipped }));
}

async function openai(path, init = {}) {
  const response = await fetch(`https://api.openai.com/v1/${path}`, { ...init, headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, ...(init.headers || {}) } });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status} ${(await response.text()).slice(0, 300)}`);
  return response;
}

async function submit() {
  const state = load(opt("--job"));
  const file = `${dirOf(state.id)}/batch-input.jsonl`;
  const form = new FormData();
  form.append("purpose", "batch");
  form.append("file", new Blob([readFileSync(file)]), "batch-input.jsonl");
  const uploaded = await (await openai("files", { method: "POST", body: form })).json();
  const batch = await (await openai("batches", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ input_file_id: uploaded.id, endpoint: "/v1/responses", completion_window: "24h", metadata: { job: state.id } }) })).json();
  state.batch = { id: batch.id, status: batch.status, submittedAt: new Date().toISOString() };
  save(state);
  console.log(JSON.stringify(state.batch));
}

async function fetchBatch() {
  const state = load(opt("--job"));
  const batch = await (await openai(`batches/${state.batch.id}`)).json();
  state.batch = { ...state.batch, status: batch.status, counts: batch.request_counts };
  save(state);
  console.log(JSON.stringify(state.batch));
  if (batch.status !== "completed" || !batch.output_file_id) return;
  const out = `${dirOf(state.id)}/batch-output.jsonl`;
  writeFileSync(out, await (await openai(`files/${batch.output_file_id}/content`)).text());
  rest.push(out);
  await collect();
  state.batch.completedAt = new Date().toISOString();
}

const commands = { plan, run, batchfile, submit, fetch: fetchBatch, collect, apply };
if (!commands[command]) { console.error("usage: enrich-batch.mjs plan|run|batchfile|collect|apply …"); process.exit(1); }
if (command !== "plan" && !opt("--job")) throw new Error("--job <id> is required");
if (command !== "plan" && !existsSync(`${dirOf(opt("--job"))}/state.json`)) throw new Error("unknown job");
await commands[command]();
