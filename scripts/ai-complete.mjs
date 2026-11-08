// Unified AI completion (2026-11-01): one job for every word-card field only generated
// text can supply, after the local fills and corrections. One task per entry carries all
// of that entry's open fields, so each entry's context is sent once; requests group
// entries of one kind (≤ 25 per request) and go through the Batch API (half price).
//
// Task modes
//   fill   — the field is empty: generate it (definitions, meanings, example translation,
//            CEFR, forms SALDO doesn't have), or pick among SALDO's candidates when SALDO
//            has more than one or the entry conflicts with it. Written to empty fields only.
//   check  — a stored value looks wrong: the model gives a verdict and a suggestion, stored
//            in public.content_suggestions. Never overwrites.
// Text held for copyright reasons (glossary lines in the definition slot) is never sent:
// the definition is written anew from the headword and its meaning.
//
//   node --env-file=.env scripts/ai-complete.mjs plan  [--status …/field-status.ndjson] [--issues …/quality/issues.ndjson] [--job <id>]
//   node --env-file=.env scripts/ai-complete.mjs run   --job <id> --limit <entries> [--budget-usd 0.5]   (synchronous sample)
//   node --env-file=.env scripts/ai-complete.mjs batch --job <id>      (write JSONL of pending tasks, upload, start)
//   node --env-file=.env scripts/ai-complete.mjs fetch --job <id>      (poll; collects results when done)
//   node --env-file=.env scripts/ai-complete.mjs sql   --job <id>      (fill SQL + rollback, suggestions SQL; no DB writes)
// State: data/enrichment/<job>/state.json.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { useSaldoFiles, saldoEntries, cardFieldsFromSaldo, variants } from "../server-lexicon.mjs";

const [command, ...rest] = process.argv.slice(2);
const opt = (n, d = null) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : d; };
const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const PRICE = { input: 0.75, cachedInput: 0.075, output: 4.5 };   // USD per 1M tokens, synchronous
const BATCH_SIZE = 25, MAX_ATTEMPTS = 3;
const usd = (u, batch = false) => (((u.input - u.cached) * PRICE.input + u.cached * PRICE.cachedInput + u.output * PRICE.output) / 1e6) * (batch ? 0.5 : 1);
const dirOf = (job) => `data/enrichment/${job}`;
const load = (job) => JSON.parse(readFileSync(`${dirOf(job)}/state.json`, "utf8"));
const save = (s) => { mkdirSync(dirOf(s.id), { recursive: true }); writeFileSync(`${dirOf(s.id)}/state.json`, JSON.stringify(s, null, 1)); };
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const CJK = /[㐀-鿿]/;
const ENGLISH = /\b(the|and|of|to|is|are|with|for|someone|something|when|which)\b/i;

// ---------------------------------------------------------------------------
// Field definitions: what the model is asked, and how an answer is accepted.
// ---------------------------------------------------------------------------
const escape = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// A phrase's explanation must not just restate the phrase ("ta något på allvar: att ta något på allvar …").
const norm = (t) => t.toLowerCase().replace(/[^\p{L}\s]/gu, " ").replace(/\s+/g, " ").trim();
const restatesPhrase = (text, hw) => /\s/.test(hw.trim()) && [norm(hw), norm(hw).replace(/\b(något|någon|ngt|ngn|sig)\b/g, "").replace(/\s+/g, " ").trim()].some((p) => norm(text).includes(p));
const usesHeadword = (text, hw) => !/\s/.test(hw.trim()) && new RegExp(`(^|[^\\p{L}])${escape(hw.trim().toLowerCase())}([^\\p{L}]|$)`, "u").test(text.toLowerCase());
const FIELDS = {
  swedish_explanation: { ask: "a short, simple Swedish definition (max 20 words) a B1 learner understands; explain, don't repeat the headword", ok: (v, e) => v.length >= 4 && v.length <= 200 && !CJK.test(v) && !ENGLISH.test(v) && !usesHeadword(v, e.swedish) && !restatesPhrase(v, e.swedish) },
  meaning_en: { ask: "a concise English meaning matching the Chinese meaning", ok: (v) => v.length >= 1 && v.length <= 120 && !CJK.test(v) },
  meaning_zh: { ask: "a concise Simplified Chinese meaning", ok: (v) => CJK.test(v) && v.length <= 60 },
  example_sv: { ask: "one natural Swedish example sentence using the headword (any inflection)", ok: (v, e) => v.length <= 200 && !CJK.test(v) && v.toLowerCase().includes(e.swedish.toLowerCase().slice(0, Math.max(3, e.swedish.length - 3))) },
  example_zh: { ask: "Simplified Chinese translation of the Swedish example (yours, or the one given)", ok: (v) => CJK.test(v) && v.length <= 200 },
  cefr_level: { ask: "CEFR level (A1–C2) at which learners typically meet it", ok: (v) => /^(A1|A2|B1|B2|C1|C2)$/.test(v) },
  passiv_s: { ask: "the s-passive infinitive (pick from the candidates) only if the verb is transitive and its s-passive is used in normal Swedish (\"boken läses\"); \"\" for intransitive verbs (försvinna, drunkna, slappna av) and verbs whose s-passive nobody uses", ok: () => true },
  // The forms are then built locally: SALDO's -are/-ast forms, or mer/mest.
  comparison: { ask: "how the adjective is compared: \"synthetic\" (större, största), \"periphrastic\" (mer intressant, mest intressant) or \"none\" when it is not compared (relational or absolute adjectives: polsk, månatlig, diagnostisk, slutgiltig, död)", ok: (v, e) => v === "periphrastic" || v === "none" || (v === "synthetic" && !!e.saldo?.comparative) },
};
const FORM_ASK = {
  comparative: "comparative: the SALDO form when Swedish compares this adjective that way, \"mer <base>\" when it is compared with mer, \"\" when it is not compared at all (relational/absolute adjectives)",
  superlative_indefinite: "superlative indefinite: matching the comparative (\"-ast\" form, \"mest <base>\", or \"\")",
  superlative_definite: "superlative definite: matching the comparative (\"-aste\" form, \"mest <base-a form>\", or \"\")",
};
const fieldAsk = (f) => (f.startsWith("form:") ? FORM_ASK[f.slice(5)] || `${f.slice(5).replace(/_/g, " ")} form, "" if the word has none` : FIELDS[f].ask);

function accept(task, field, value, e) {
  const v = String(value ?? "").trim();
  if (task.mode === "check") return true;
  if (task.candidates) return v === "" || task.candidates.includes(v);
  if (field.startsWith("form:")) {
    if (v === "") return true;                                      // not applicable to this word
    if (v.length > 60 || CJK.test(v)) return false;
    const komp = e.saldo?.comparative;
    if (field === "form:comparative" && komp) return v === komp || v === `mer ${e.base || e.swedish}`;
    if (/superlative/.test(field) && e.saldo?.[field.slice(5)]) return v === e.saldo[field.slice(5)] || v.startsWith("mest ");
    return /^[a-zåäöéü -]+$/i.test(v);
  }
  return v !== "" && FIELDS[field].ok(v, e);
}

// ---------------------------------------------------------------------------
// Plan: collect every open field, merge per entry, attach context.
// ---------------------------------------------------------------------------
async function all(table, cols, filter = (q) => q) {
  let out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await filter(db.from(table).select(cols)).order("id").range(from, from + 999);
    if (error) throw error;
    out = out.concat(data);
    if (data.length < 1000) return out;
  }
}
const ndjson = (f) => readFileSync(f, "utf8").trim().split("\n").map((l) => JSON.parse(l));

async function plan() {
  await useSaldoFiles();
  const objects = new Map((await all("learning_objects", "id, swedish, part_of_speech, object_type, status, chinese, swedish_explanation, example_sv, example_zh, cefr_level, passiv_s, comparison_type")).filter((o) => o.status !== "retired").map((o) => [o.id, o]));
  const tr = await all("learning_object_translations", "id, learning_object_id, native_language, meaning, example_translation");
  const zh = new Map(), en = new Map(), exTr = new Map();
  for (const t of tr) { if (t.native_language === "zh") { zh.set(t.learning_object_id, t.meaning); exTr.set(t.learning_object_id, t.example_translation); } if (t.native_language === "en") en.set(t.learning_object_id, t.meaning); }
  const forms = new Map();
  for (const f of await all("word_forms", "id, learning_object_id, form_type, form_value")) (forms.get(f.learning_object_id) ?? forms.set(f.learning_object_id, {}).get(f.learning_object_id))[f.form_type] = f.form_value;

  const tasks = new Map();   // id → { id, fields: { field: { mode, candidates?, stored?, reference?, issue? } } }
  const put = (id, field, info) => {
    if (!objects.has(id)) return;
    const t = tasks.get(id) ?? tasks.set(id, { id, fields: {} }).get(id);
    const prev = t.fields[field];
    if (prev && prev.mode === "check" && info.mode !== "check") return;   // a stored value to check beats a blind fill
    t.fields[field] = { ...prev, ...info, reasons: [...new Set([...(prev?.reasons || []), info.reason])] };
  };

  // 1. Scan: empty fields (ai) and empty fields whose SALDO value needs a choice (review).
  for (const s of ndjson(opt("--status", "data/reports/prod2/field-status.ndjson"))) {
    if (s.status !== "missing") continue;
    const reason = `scan:${s.detail?.reason || s.detail?.fill}`;
    if (s.detail?.fill === "ai") put(s.learning_object_id, s.field === "example" ? "example_sv" : s.field, { mode: "fill", reason });
    else if (s.detail?.fill === "review") {
      if (s.field === "swedish_explanation") put(s.learning_object_id, s.field, { mode: "fill", reason });   // held text: written anew, not sent
      else if (s.field === "form:declension_group" || s.field === "form:verb_group") continue;               // groups follow the forms (local)
      else put(s.learning_object_id, s.field, { mode: "fill", candidates: [...new Set(String(s.detail.reference || "").split(/\s*\|\s*|\s*\/\s*/).filter(Boolean))], reason });
    }
  }
  // 2. Audit: D missing → fill; E looks wrong → check (held note texts are fills above).
  for (const i of ndjson(opt("--issues", "data/reports/prod2/quality/issues.ndjson"))) {
    if (i.category === "D" && i.field !== "form:declension_group") put(i.id, i.field === "example" ? "example_sv" : i.field, { mode: "fill", reason: `audit:${i.kind}` });
    // Not sent: group checks (the group follows the forms, derived locally) and the course-list
    // annotation in 13 definitions (fixed locally: scripts/fix-kelly-annotations).
    if (i.category === "E" && !/^note_text_held/.test(i.kind) && i.field !== "form:declension_group" && i.kind !== "contains_chinese") put(i.id, i.field, { mode: "check", stored: i.stored ?? null, reference: i.reference ?? null, issue: i.kind, reason: `audit:${i.kind}` });
  }
  // 3. Phrases and expressions: what their cards show (definition, meanings, example translation, level).
  for (const o of objects.values()) {
    if (o.object_type === "word") continue;
    if (!o.swedish_explanation) put(o.id, "swedish_explanation", { mode: "fill", reason: "expr:missing" });
    if (!en.get(o.id)) put(o.id, "meaning_en", { mode: "fill", reason: "expr:missing" });
    if (!zh.get(o.id) && !o.chinese) put(o.id, "meaning_zh", { mode: "fill", reason: "expr:missing" });
    if (o.example_sv && !o.example_zh && !exTr.get(o.id)) put(o.id, "example_zh", { mode: "fill", reason: "expr:missing" });
    if (!o.cefr_level) put(o.id, "cefr_level", { mode: "fill", reason: "expr:missing" });
  }

  // Comparison: superlatives follow a stored comparative locally; a missing comparative is
  // asked as one classification (the forms are built from it); "non-comparable" entries need nothing.
  const CMP = ["form:comparative", "form:superlative_indefinite", "form:superlative_definite"];
  const prefilled = new Map();
  for (const t of tasks.values()) {
    const open = CMP.filter((f) => t.fields[f]?.mode === "fill");
    if (!open.length) continue;
    const o = objects.get(t.id), f = forms.get(t.id) || {};
    const rows = await saldoEntries(null, o.swedish, o.part_of_speech);
    const sal = rows.length === 1 ? cardFieldsFromSaldo(rows[0], o.part_of_speech).forms : {};
    const local = {};
    if (o.comparison_type === "non-comparable") open.forEach((k) => { local[k] = ""; });
    else if (f.comparative) {
      const definiteBase = f.definite_form || f.plural_form || `${f.base_form || o.swedish}a`;
      for (const k of open.filter((k) => k !== "form:comparative")) {
        if (f.comparative.startsWith("mer ")) local[k] = k.endsWith("definite") && !k.endsWith("indefinite") ? `mest ${definiteBase}` : `mest ${f.comparative.slice(4)}`;
        else if (sal.comparative && sal.comparative === f.comparative && sal[k.slice(5)]) local[k] = sal[k.slice(5)];
      }
    }
    for (const k of Object.keys(local)) delete t.fields[k];
    if (Object.keys(local).length) prefilled.set(t.id, local);
    if (!f.comparative && o.comparison_type !== "non-comparable" && open.includes("form:comparative")) {
      CMP.forEach((k) => delete t.fields[k]);
      t.fields.comparison = { mode: "fill", reasons: ["comparative missing"] };
    }
  }

  // A word without an example gets sentence and translation together.
  for (const t of tasks.values()) if (t.fields.example_sv && !t.fields.example_zh) t.fields.example_zh = { mode: "fill", reasons: ["with example_sv"] };

  // Context per entry, and the request family it belongs to.
  const list = [];
  for (const id of prefilled.keys()) if (!tasks.has(id)) tasks.set(id, { id, fields: {} });
  for (const t of tasks.values()) {
    const o = objects.get(t.id);
    const f = forms.get(t.id) || {};
    const rows = o.object_type === "word" ? await saldoEntries(null, o.swedish, o.part_of_speech) : [];
    const saldo = rows.length === 1 ? cardFieldsFromSaldo(rows[0], o.part_of_speech).forms : null;
    const entry = { swedish: o.swedish, pos: o.part_of_speech, type: o.object_type, zh: zh.get(o.id) || o.chinese || "", en: en.get(o.id) || "",
      example: o.object_type === "word" ? "" : (o.example_sv || "").split("\n")[0], forms: Object.entries(f).filter(([k, v]) => v && !/group|genus/.test(k)).map(([k, v]) => `${k}=${v}`).join("; ").slice(0, 300),
      definiteBase: f.definite_form || f.plural_form, saldo: saldo ? { comparative: saldo.comparative, superlative_indefinite: saldo.superlative_indefinite, superlative_definite: saldo.superlative_definite } : null, base: f.base_form };
    // Judgement calls (comparison, passive) go to their own requests with more reasoning.
    const JUDGE = new Set(["comparison", "passiv_s"]);
    for (const [mode, family, pick] of [["fill", o.object_type === "word" ? "word" : "expression", (f) => !JUDGE.has(f)], ["fill", "grammar", (f) => JUDGE.has(f)], ["check", "check", () => true]]) {
      const fields = Object.entries(t.fields).filter(([f, v]) => v.mode === mode && pick(f));
      if (!fields.length) continue;
      list.push({ id: t.id, family, mode, entry, fields: Object.fromEntries(fields), status: "pending", attempts: 0, result: {} });
    }
    const local = prefilled.get(t.id);
    if (local) list.push({ id: t.id, family: "local", mode: "fill", entry, fields: Object.fromEntries(Object.keys(local).map((k) => [k, { mode: "fill", reasons: ["local"] }])),
      status: "done", attempts: 0, result: Object.fromEntries(Object.entries(local).map(([k, v]) => [k, { value: v, verdict: "local", note: "" }])) });
  }
  // Re-planning keeps answers already paid for (same entry, family and field).
  const jobId = opt("--job") || randomUUID();
  if (existsSync(`${dirOf(jobId)}/state.json`)) {
    const old = load(jobId);
    for (const t of list) {
      const prev = old.tasks.find((o) => o.id === t.id && o.family === t.family);
      if (!prev) continue;
      for (const f of Object.keys(t.fields)) if (prev.result[f] && (t.family === "check" || accept(t.fields[f], f, prev.result[f].value, t.entry))) t.result[f] = prev.result[f];
      t.attempts = prev.attempts;
      if (Object.keys(t.fields).every((f) => t.result[f])) t.status = "done";
    }
    var carried = { usage: old.usage, calls: old.calls };
  }
  const state = { id: jobId, model: MODEL, createdAt: new Date().toISOString(), usage: carried?.usage || { input: 0, cached: 0, output: 0 }, usageBatch: { input: 0, cached: 0, output: 0 }, calls: carried?.calls || 0, tasks: list };
  state.estimate = estimate(state);
  save(state);
  console.log(JSON.stringify(summary(state), null, 1));
}

function summary(state) {
  const tally = (f) => state.tasks.reduce((m, t) => { for (const [k, v] of Object.entries(t.fields)) { const key = f(t, k, v); m[key] = (m[key] || 0) + 1; } return m; }, {});
  return { job: state.id, entries: new Set(state.tasks.map((t) => t.id)).size, tasks: state.tasks.length, fields: state.tasks.reduce((n, t) => n + Object.keys(t.fields).length, 0),
    byFamily: tally((t) => t.family), byField: tally((t, k, v) => `${t.family} ${v.candidates ? "choose" : t.mode} ${k}`), estimate: state.estimate };
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------
const SYSTEM = {
  word: `You complete entries in a Swedish learner's dictionary for Chinese-speaking learners (SFI/SVA). Each input line is one entry: id, headword, part of speech, Chinese meaning (it fixes the sense — never switch to another sense), English meaning, the stored forms, and "need:" with the fields to return. Return one item per line with the same id and one value per needed field.
Field rules:
- swedish_explanation: ${FIELDS.swedish_explanation.ask}.
- meaning_en: ${FIELDS.meaning_en.ask}. meaning_zh: ${FIELDS.meaning_zh.ask}.
- example_sv: ${FIELDS.example_sv.ask}. example_zh: ${FIELDS.example_zh.ask}.
- cefr_level: ${FIELDS.cefr_level.ask}.
- form:<type>: the standard written form of that type for this word, or "" when the word has no such form (do not invent forms Swedish doesn't use). ${FORM_ASK.comparative}. Superlatives must match the comparative.
- When a field lists candidates, answer with exactly one candidate that fits this word and sense, or "" if none does.
- passiv_s: ${FIELDS.passiv_s.ask}.`,
  expression: `You complete fixed phrases and idiomatic expressions in a Swedish learner's dictionary for Chinese-speaking learners (SFI/SVA). Each input line: id, the phrase, its Chinese meaning (it fixes the sense), English meaning, a Swedish example, and "need:" with the fields to return. Return one item per line with the same id and one value per needed field.
- swedish_explanation: a short, simple Swedish explanation of what the whole phrase means (max 20 words), not a word-by-word gloss. Paraphrase: do not repeat the phrase or its key words ("börja med något" → "sätta i gång en aktivitet").
- meaning_en: the natural English equivalent. meaning_zh: a concise Simplified Chinese meaning.
- example_zh: the given Swedish example translated into Simplified Chinese (Chinese characters only, never Swedish).
- cefr_level: the CEFR level (A1–C2) at which learners typically meet this phrase.`,
  grammar: `You make grammar judgements for entries in a Swedish learner's dictionary. Each input line: id, headword, part of speech, Chinese meaning (fixes the sense), stored forms, SALDO's mechanical comparison forms when there are any, and "need:" with the judgements to return. Return one item per line with the same id and one value per needed field.
- comparison: ${FIELDS.comparison.ask}. SALDO lists -are/-ast forms for almost every adjective, so they are no evidence that Swedish uses them. Long adjectives and those in -isk, -ad, -ande/-ende, participles usually take mer/mest; nationality, material, time-period and absolute adjectives are not compared.
- passiv_s: ${FIELDS.passiv_s.ask}.`,
  check: `You review stored values in a Swedish learner's dictionary. Each input line: id, headword, part of speech, Chinese meaning (fixes the sense), stored forms, and "check:" items, each with the field, the stored value, a reference value from the SALDO morphology when there is one, and the reason it was flagged. For each item return: verdict "ok" (the stored value is correct for this word and field), "wrong" (give the correct value) or "unsure"; value = the correct value (the stored one when ok); note = at most 12 words on why. Prefer SALDO's form unless it belongs to a different word or sense. For an example sentence that doesn't contain the headword, "wrong" means the sentence should be replaced; give a corrected sentence.`,
};
const ITEM_SCHEMA = {
  type: "object", additionalProperties: false, required: ["items"],
  properties: { items: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "values"], properties: {
    id: { type: "string" },
    values: { type: "array", items: { type: "object", additionalProperties: false, required: ["field", "value", "verdict", "note"], properties: {
      field: { type: "string" }, value: { type: "string" }, verdict: { type: "string", enum: ["fill", "ok", "wrong", "unsure"] }, note: { type: "string" } } } } } } } },
};
function line(t) {
  const e = t.entry;
  const need = Object.entries(t.fields).map(([f, v]) => {
    if (t.mode === "check") return `${f} stored="${v.stored ?? ""}"${v.reference ? ` saldo="${v.reference}"` : ""} reason=${v.issue}`;
    return v.candidates ? `${f} (candidates: ${v.candidates.join(" | ")})` : f;
  });
  const parts = [t.id.slice(0, 8), e.swedish, e.pos, `zh: ${e.zh}`];
  if (e.en) parts.push(`en: ${e.en}`);
  if (e.example) parts.push(`example: ${e.example}`);
  if (e.forms && t.family !== "expression") parts.push(`forms: ${e.forms}`);
  if (e.saldo?.comparative && Object.keys(t.fields).some((f) => /comparative|superlative/.test(f))) parts.push(`saldo: ${e.saldo.comparative}, ${e.saldo.superlative_indefinite}, ${e.saldo.superlative_definite}`);
  parts.push(`${t.mode === "check" ? "check" : "need"}: ${need.join("; ")}`);
  return parts.join(" | ");
}
function requestFor(family, tasks) {
  const fieldCount = tasks.reduce((n, t) => n + Object.keys(t.fields).length, 0);
  return { model: MODEL, reasoning: { effort: family === "grammar" ? "medium" : "low" }, max_output_tokens: 2000 + fieldCount * (family === "check" || family === "grammar" ? 400 : 120),
    text: { format: { type: "json_schema", name: "dictionary", strict: true, schema: ITEM_SCHEMA } },
    input: [{ role: "system", content: SYSTEM[family] }, { role: "user", content: tasks.map(line).join("\n") }] };
}
function batchesOf(tasks) {
  const out = [];
  const byFamily = {};
  for (const t of tasks) (byFamily[t.family] ??= []).push(t);
  for (const [family, list] of Object.entries(byFamily)) for (let i = 0; i < list.length; i += BATCH_SIZE) out.push({ family, tasks: list.slice(i, i + BATCH_SIZE) });
  return out;
}
function estimate(state) {
  let input = 0, output = 0;
  const work = batchesOf(state.tasks.filter((t) => t.status === "pending"));
  for (const b of work) {
    input += Math.ceil(JSON.stringify(requestFor(b.family, b.tasks).input).length / 3.2);
    output += b.tasks.reduce((n, t) => n + 15 + Object.entries(t.fields).reduce((m, [f]) => m + (t.mode === "check" ? 40 : /example/.test(f) ? 45 : f === "swedish_explanation" ? 35 : 18), 0), 0) * 1.6;   // reasoning tokens
  }
  const u = { input, cached: 0, output: Math.round(output) };
  return { requests: work.length, inputTokens: input, outputTokens: u.output, usdSync: +usd(u).toFixed(3), usdBatch: +usd(u, true).toFixed(3) };
}

function acceptItems(state, tasks, items) {
  const byShort = new Map(items.map((it) => [it.id, it]));
  for (const t of tasks) {
    const it = byShort.get(t.id.slice(0, 8));
    const values = new Map((it?.values || []).map((v) => [v.field, v]));
    const bad = [];
    for (const f of Object.keys(t.fields)) {
      if (t.result[f] && !values.has(f)) continue;   // answered in an earlier round, not asked again
      const v = values.get(f);
      if (v && (t.mode === "check" ? ["ok", "wrong", "unsure"].includes(v.verdict) : accept(t.fields[f], f, v.value, t.entry))) t.result[f] = { value: String(v.value).trim(), verdict: v.verdict, note: v.note };
      else bad.push(f);
    }
    // Comparison forms belong together: a synthetic comparative with periphrastic superlatives is dropped.
    const k = t.result["form:comparative"]?.value, s = t.result["form:superlative_indefinite"]?.value;
    if (k !== undefined && s !== undefined && (k === "") !== (s === "") || (k?.startsWith("mer ") && s && !s.startsWith("mest "))) for (const f of ["form:comparative", "form:superlative_indefinite", "form:superlative_definite"]) if (t.result[f]) { delete t.result[f]; bad.push(f); }
    t.attempts++;
    t.invalid = [...new Set(bad)];
    t.status = !bad.length ? "done" : t.attempts >= MAX_ATTEMPTS ? "failed" : "pending";
  }
}
const pendingView = (t) => ({ ...t, fields: Object.fromEntries(Object.entries(t.fields).filter(([f]) => !(f in t.result))) });

async function callOpenAI(body) {
  const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await r.json();
  if (!r.ok) { const err = new Error(data.error?.message || `HTTP ${r.status}`); err.status = r.status; throw err; }
  return parseResponse(data);
}
function parseResponse(data) {
  const text = (data.output || []).flatMap((o) => o.content || []).map((c) => c.text || "").join("");
  const u = data.usage || {};
  return { items: JSON.parse(text).items || [], usage: { input: u.input_tokens || 0, cached: u.input_tokens_details?.cached_tokens || 0, output: u.output_tokens || 0 } };
}
const addUsage = (a, b) => { a.input += b.input; a.cached += b.cached; a.output += b.output; };

async function run() {
  const state = load(opt("--job"));
  const limit = Number(opt("--limit", 50)), budget = Number(opt("--budget-usd", "0.5"));
  // A sample takes entries from every family and mode, so quality is seen for each.
  const pending = state.tasks.filter((t) => t.status === "pending");
  const perFamily = Math.ceil(limit / 4);
  const chosen = ["word", "expression", "grammar", "check"].flatMap((f) => pending.filter((t) => t.family === f).slice(0, perFamily));
  for (const b of batchesOf(chosen.map(pendingView))) {
    if (usd(state.usage) > budget) { console.log("budget reached"); break; }
    const tasks = b.tasks.map((v) => state.tasks.find((t) => t.id === v.id && t.family === v.family));
    try {
      const { items, usage } = await callOpenAI(requestFor(b.family, b.tasks));
      state.calls++; addUsage(state.usage, usage);
      acceptItems(state, tasks, items);
    } catch (error) { for (const t of tasks) { t.attempts++; t.lastError = String(error.message).slice(0, 300); } }
    save(state);
  }
  const done = chosen.map((v) => state.tasks.find((t) => t.id === v.id && t.family === v.family));
  console.log(JSON.stringify({ calls: state.calls, usage: state.usage, usdSync: +usd(state.usage).toFixed(4), done: done.filter((t) => t.status === "done").length, open: done.filter((t) => t.status !== "done").length }, null, 1));
}

async function openai(path, init = {}) {
  const r = await fetch(`https://api.openai.com/v1/${path}`, { ...init, headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status} ${(await r.text()).slice(0, 300)}`);
  return r;
}
async function batch() {
  const state = load(opt("--job"));
  const work = batchesOf(state.tasks.filter((t) => t.status === "pending").map(pendingView));
  // custom_id is limited to 512 characters: it carries an index, the job state the entry ids.
  const stamp = Date.now();
  const lines = work.map((b, i) => JSON.stringify({ custom_id: `${stamp}:${i}`, method: "POST", url: "/v1/responses", body: requestFor(b.family, b.tasks) }));
  const file = `${dirOf(state.id)}/batch-input-${Date.now()}.jsonl`;
  writeFileSync(file, lines.join("\n") + "\n");
  const form = new FormData();
  form.append("purpose", "batch");
  form.append("file", new Blob([readFileSync(file)]), "batch-input.jsonl");
  const uploaded = await (await openai("files", { method: "POST", body: form })).json();
  const b = await (await openai("batches", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input_file_id: uploaded.id, endpoint: "/v1/responses", completion_window: "24h", metadata: { job: state.id } }) })).json();
  (state.batches ??= []).push({ id: b.id, requests: lines.length, status: b.status, submittedAt: new Date().toISOString(), map: Object.fromEntries(work.map((w, i) => [`${stamp}:${i}`, { family: w.family, ids: w.tasks.map((t) => t.id) }])) });
  save(state);
  console.log(JSON.stringify({ batch: b.id, requests: lines.length }));
}
async function fetchBatch() {
  const state = load(opt("--job"));
  const open = (state.batches || []).filter((b) => !b.collected);
  for (const entry of open) {
    const b = await (await openai(`batches/${entry.id}`)).json();
    Object.assign(entry, { status: b.status, counts: b.request_counts });
    if (["failed", "expired", "cancelled"].includes(b.status)) { entry.collected = `not run: ${b.status}`; continue; }
    if (b.status !== "completed") continue;
    const outputs = [b.output_file_id, b.error_file_id].filter(Boolean);
    for (const fileId of outputs) {
      const text = await (await openai(`files/${fileId}/content`)).text();
      writeFileSync(`${dirOf(state.id)}/${fileId}.jsonl`, text);
      for (const l of text.trim().split("\n").filter(Boolean)) {
        const r = JSON.parse(l);
        const { family, ids } = entry.map[r.custom_id];
        const tasks = ids.map((id) => state.tasks.find((t) => t.id === id && t.family === family)).filter(Boolean);
        if (r.response?.status_code !== 200) { for (const t of tasks) { t.attempts++; t.lastError = JSON.stringify(r.error || r.response?.body?.error || "").slice(0, 300); if (t.attempts >= MAX_ATTEMPTS) t.status = "failed"; } continue; }
        try { const { items, usage } = parseResponse(r.response.body); addUsage(state.usageBatch, usage); state.calls++; acceptItems(state, tasks, items); }
        catch (error) { for (const t of tasks) { t.attempts++; t.lastError = String(error.message).slice(0, 300); } }
      }
    }
    entry.collected = new Date().toISOString();
  }
  save(state);
  const count = (s) => state.tasks.filter((t) => t.status === s).length;
  console.log(JSON.stringify({ batches: state.batches.map((b) => ({ id: b.id, status: b.status, counts: b.counts, collected: !!b.collected })), done: count("done"), pending: count("pending"), failed: count("failed"),
    usageBatch: state.usageBatch, usdBatch: +usd(state.usageBatch, true).toFixed(4), usdSample: +usd(state.usage).toFixed(4) }, null, 1));
}

// ---------------------------------------------------------------------------
// SQL: fills (empty fields only, archived, reversible) and suggestions.
// ---------------------------------------------------------------------------
async function sql() {
  const state = load(opt("--job"));
  const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
  const batchId = randomUUID();
  const fills = [], notApplicable = [], suggestions = [];
  for (const t of state.tasks) for (const [field, r] of Object.entries(t.result)) {
    if (t.mode === "check") { suggestions.push({ id: t.id, field, current: t.fields[field].stored, value: r.value, verdict: r.verdict, note: r.note, issue: t.fields[field].issue }); continue; }
    // Noun plurals the model supplied are not written: for mass and abstract nouns it produces
    // forms nobody uses (svettar, lagringar), and stored countability is not reliable enough to tell.
    if (t.entry.pos === "noun" && /^form:plural_/.test(field)) { suggestions.push({ id: t.id, field, current: null, value: r.value, verdict: "unsure", note: r.value ? "AI plural for an empty field; confirm the noun has a plural" : "AI: no plural", issue: "ai_plural_held" }); continue; }
    if (r.value === "") { notApplicable.push({ id: t.id, field }); continue; }
    if (field === "example_zh" && t.result.example_sv) continue;   // written with its sentence
    if (field === "comparison") {
      const e = t.entry, base = e.base || e.swedish, def = e.definiteBase || `${base}a`;
      const formsFor = { synthetic: [e.saldo?.comparative, e.saldo?.superlative_indefinite, e.saldo?.superlative_definite], periphrastic: [`mer ${base}`, `mest ${base}`, `mest ${def}`] }[r.value];
      ["form:comparative", "form:superlative_indefinite", "form:superlative_definite"].forEach((k, i) => (formsFor?.[i] ? fills.push({ id: t.id, field: k, value: formsFor[i], type: e.type }) : notApplicable.push({ id: t.id, field: k })));
      // The column has no periphrastic value; "regular" already covers the mer/mest entries.
      fills.push({ id: t.id, field: "comparison_type", value: { synthetic: "regular", periphrastic: "regular", none: "non-comparable" }[r.value], type: e.type });
      continue;
    }
    fills.push({ id: t.id, field, value: field === "example_sv" ? `${r.value}\n${t.result.example_zh?.value || ""}` : r.value, type: t.entry.type });
  }
  const A = `public.content_audit_archive a where a.batch_id = ${q(batchId)}`;
  const out = [`-- AI completion job ${state.id}, batch ${batchId}: ${fills.length} fills, ${notApplicable.length} not applicable.`, "begin;"];
  for (let i = 0; i < fills.length; i += 500) out.push(`insert into public.content_audit_archive (batch_id, learning_object_id, table_name, field, old_value, new_value, reason) values\n  ${fills.slice(i, i + 500).map((f) => `(${q(batchId)}, ${q(f.id)}, 'ai_fill', ${q(f.field)}, null, ${q(f.value)}, ${q(`ai:${state.id}`)})`).join(",\n  ")};`);
  for (const col of ["swedish_explanation", "cefr_level", "passiv_s", "comparison_type"]) out.push(`update public.learning_objects lo set ${col} = a.new_value, updated_at = now() from ${A} and a.field = '${col}' and lo.id = a.learning_object_id and coalesce(lo.${col}, '') = '';`);
  // Phrases and expressions keep their example on the row; its translation goes beside it.
  out.push(`update public.learning_objects lo set example_zh = a.new_value, updated_at = now() from ${A} and a.field = 'example_zh' and lo.id = a.learning_object_id and coalesce(lo.example_zh, '') = '';`);
  for (const lang of ["zh", "en"]) {
    out.push(`update public.learning_object_translations t set meaning = a.new_value, updated_at = now() from ${A} and a.field = 'meaning_${lang}' and t.learning_object_id = a.learning_object_id and t.native_language = '${lang}' and coalesce(t.meaning, '') = '';`);
    out.push(`insert into public.learning_object_translations (learning_object_id, native_language, meaning) select a.learning_object_id, '${lang}', a.new_value from ${A} and a.field = 'meaning_${lang}' on conflict (learning_object_id, native_language) do nothing;`);
  }
  out.push(`insert into public.word_forms (learning_object_id, form_type, form_value, sort_order) select a.learning_object_id, substr(a.field, 6), a.new_value, 100 from ${A} and a.field like 'form:%' on conflict (learning_object_id, form_type) do nothing;`);
  out.push(`with ex as (insert into public.learning_object_examples (learning_object_id, example_swedish, sort_order)
    select a.learning_object_id, split_part(a.new_value, E'\\n', 1), 0 from ${A} and a.field = 'example_sv' and not exists (select 1 from public.learning_object_examples e where e.learning_object_id = a.learning_object_id)
    returning id, learning_object_id, example_swedish)
  insert into public.learning_object_example_translations (example_id, native_language, translation)
    select ex.id, 'zh', split_part(a.new_value, E'\\n', 2) from ex join ${A.replace(" where ", " on ")} and a.field = 'example_sv' and a.learning_object_id = ex.learning_object_id where split_part(a.new_value, E'\\n', 2) <> '';`);
  const now = new Date().toISOString();
  const statusRows = [...fills.map((f) => [f.id, f.field === "example_sv" ? "example" : f.field, "present"]), ...notApplicable.map((n) => [n.id, n.field, "not_applicable"])].filter(([, f]) => f !== "example_zh" && f !== "comparison_type");
  for (let i = 0; i < statusRows.length; i += 500) out.push(`insert into public.resource_field_status (learning_object_id, field, status, source, detail, updated_at) values\n  ${statusRows.slice(i, i + 500).map(([id, f, s]) => `(${q(id)}, ${q(f)}, ${q(s)}, 'openai-generated', ${q(JSON.stringify({ job: state.id, batch: batchId }))}::jsonb, ${q(now)})`).join(",\n  ")}\n  on conflict (learning_object_id, field) do update set status = excluded.status, source = excluded.source, detail = excluded.detail, updated_at = excluded.updated_at where public.resource_field_status.status = 'missing';`);
  // A reading-analysis draft this batch completed stays a draft (2026-11-09, G4): it becomes an
  // ordinary entry only after the word-card check passes — scripts/check-entries.mjs
  // --drafts-only --write, run after these fills are applied.
  out.push(`select public.refresh_resource_summary(array(select distinct a.learning_object_id from ${A}));`);
  out.push(`insert into public.enrichment_jobs (kind, name, status, model, use_batch_api, spent_usd, params, finished_at) values ('ai_fill', ${q(`AI completion ${state.id}`)}, 'done', ${q(state.model)}, true, ${(usd(state.usageBatch, true) + usd(state.usage)).toFixed(4)}, ${q(JSON.stringify({ job: state.id, batch: batchId, fills: fills.length, notApplicable: notApplicable.length }))}::jsonb, now());`);
  out.push("commit;");
  const dir = dirOf(state.id);
  writeFileSync(`${dir}/fills.sql`, out.join("\n") + "\n");
  writeFileSync(`${dir}/fills-rollback.sql`, ["begin;",
    // Text columns go back to "" (not null), the two checked ones to null.
    ...["swedish_explanation", "cefr_level", "passiv_s", "comparison_type", "example_zh"].map((col) => `update public.learning_objects lo set ${col} = ${["cefr_level", "comparison_type"].includes(col) ? "null" : "''"} from ${A} and a.field = '${col}' and lo.id = a.learning_object_id and lo.${col} = a.new_value;`),
    ...["zh", "en"].map((lang) => `update public.learning_object_translations t set meaning = '' from ${A} and a.field = 'meaning_${lang}' and t.learning_object_id = a.learning_object_id and t.native_language = '${lang}' and t.meaning = a.new_value;`),
    `delete from public.word_forms w using ${A} and a.field like 'form:%' and w.learning_object_id = a.learning_object_id and w.form_type = substr(a.field, 6) and w.form_value = a.new_value;`,
    `delete from public.learning_object_examples e using ${A} and a.field = 'example_sv' and e.learning_object_id = a.learning_object_id and e.example_swedish = split_part(a.new_value, E'\\n', 1);`,
    `update public.learning_objects lo set status = 'draft' from ${A} and a.field = 'status' and a.table_name = 'learning_objects' and lo.id = a.learning_object_id and lo.status = 'ai_generated';`,
    `update public.resource_field_status set status = 'missing', source = null where detail->>'batch' = ${q(batchId)};`,
    `delete from public.content_audit_archive where batch_id = ${q(batchId)};`, "commit;"].join("\n") + "\n");
  writeFileSync(`${dir}/suggestions.sql`, ["begin;", ...Array.from({ length: Math.ceil(suggestions.length / 500) }, (_, i) => `insert into public.content_suggestions (learning_object_id, field, current_value, suggested_value, verdict, note, issue, source, job_id) values\n  ${suggestions.slice(i * 500, i * 500 + 500).map((s) => `(${q(s.id)}, ${q(s.field)}, ${q(s.current)}, ${q(s.value)}, ${q(s.verdict)}, ${q(s.note)}, ${q(s.issue)}, ${q(`ai:${state.model}`)}, ${q(state.id)})`).join(",\n  ")};`), "commit;"].join("\n") + "\n");
  writeFileSync(`${dir}/fills-preview.tsv`, "headword\ttype\tfield\tvalue\n" + fills.map((f) => [state.tasks.find((t) => t.id === f.id).entry.swedish, f.type, f.field, f.value.replace(/\n/g, " ‖ ")].join("\t")).join("\n") + "\n");
  const tally = (l, k) => l.reduce((m, x) => { m[k(x)] = (m[k(x)] || 0) + 1; return m; }, {});
  console.log(JSON.stringify({ batch: batchId, fills: fills.length, byField: tally(fills, (f) => `${f.type} ${f.field}`), notApplicable: tally(notApplicable, (n) => n.field), suggestions: tally(suggestions, (s) => `${s.field.startsWith("form:") ? "form" : s.field} ${s.verdict}`) }, null, 1));
}

const commands = { plan, run, batch, fetch: fetchBatch, sql };
if (!commands[command]) { console.error("usage: ai-complete.mjs plan|run|batch|fetch|sql"); process.exit(1); }
if (command !== "plan" && !existsSync(`${dirOf(opt("--job"))}/state.json`)) throw new Error("--job <id> of an existing plan is required");
await commands[command]();
