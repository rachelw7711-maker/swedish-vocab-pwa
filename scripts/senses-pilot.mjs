// Sense pilot (2026-11-01): splits a few entries into senses inside the meanings they
// already have. Local first: each entry's Chinese / English glosses, Swedish explanation,
// examples and the other entries with the same spelling are collected; the model only
// groups those glosses by Swedish meaning (near-synonyms stay one sense, glosses that
// belong to another entry are named, nothing new is added), writes a short Swedish
// explanation per sense, assigns existing examples and writes an example only for a sense
// that has none. An entry the model sees as one sense gets no sense rows.
//
//   node --env-file=.env scripts/senses-pilot.mjs plan|run|sql --job senses-pilot-2026-11-01
// plan: local only. run: one synchronous call per 5 entries; raw answers, tokens and cost
// are kept in the job folder. sql: senses.sql / senses-rollback.sql / preview.tsv; never
// writes to the database.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { useSaldoFiles, saldoEntries } from "../server-lexicon.mjs";

const [command] = process.argv.slice(2);
const args = process.argv.slice(3);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const job = opt("--job", "senses-pilot-2026-11-01");
const dir = `data/enrichment/${job}`;
mkdirSync(dir, { recursive: true });
const MODEL = "gpt-5.4-mini";
const PRICE = { input: 0.75, cachedInput: 0.075, output: 4.5 };   // USD per 1M tokens, synchronous
const usd = (u) => ((u.input - u.cached) * PRICE.input + u.cached * PRICE.cachedInput + u.output * PRICE.output) / 1e6;
const PILOT = [["klar", "adjective"], ["fil", "noun"], ["rätt", "adjective"], ["slå", "verb"], ["ta", "verb"], ["stå", "verb"], ["dra", "verb"],
  ["man", "noun"], ["skål", "noun"], ["tag", "noun"], ["lång", "adjective"], ["kort", "noun"], ["lätt", "adjective"], ["fast", "adjective"],
  ["fast", "conjunction"], ["vara", "verb"], ["ställe", "noun"], ["bank", "noun"], ["lägenhet", "noun"], ["läsk", "noun"]];
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const CJK = /[㐀-鿿]/;
const statePath = `${dir}/state.json`;
const load = () => JSON.parse(readFileSync(statePath, "utf8"));
const save = (s) => writeFileSync(statePath, JSON.stringify(s, null, 1));

async function plan() {
  const entries = [];
  for (const [swedish, pos] of PILOT) {
    const { data: rows, error } = await db.from("learning_objects")
      .select("id, swedish, part_of_speech, swedish_explanation, chinese, example_sv, learning_object_translations(native_language, meaning), learning_object_examples(id, example_swedish, sort_order, learning_object_example_translations(native_language, translation))")
      .eq("swedish", swedish).eq("part_of_speech", pos).neq("status", "retired");
    if (error) throw error;
    if (rows.length !== 1) throw new Error(`${swedish}/${pos}: ${rows.length} rows`);
    const o = rows[0];
    const { data: same } = await db.from("learning_objects").select("part_of_speech, learning_object_translations(native_language, meaning)").eq("swedish", swedish).neq("status", "retired").neq("id", o.id);
    const tr = (list, lang) => (list || []).find((t) => t.native_language === lang)?.meaning || "";
    entries.push({
      id: o.id, swedish, pos,
      zh: tr(o.learning_object_translations, "zh") || o.chinese || "", en: tr(o.learning_object_translations, "en"), sv: o.swedish_explanation || "",
      examples: (o.learning_object_examples || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((e) => ({
        id: e.id, sv: e.example_swedish, zh: e.learning_object_example_translations.find((t) => t.native_language === "zh")?.translation || "", en: e.learning_object_example_translations.find((t) => t.native_language === "en")?.translation || "" })),
      fallbackExample: (o.learning_object_examples || []).length ? null : (o.example_sv || "").split("\n")[0] || null,
      otherEntries: (same || []).map((s) => `${s.part_of_speech}: ${tr(s.learning_object_translations, "en") || tr(s.learning_object_translations, "zh")}`),
      glossCount: Math.max(...[tr(o.learning_object_translations, "zh") || o.chinese || "", tr(o.learning_object_translations, "en")].map((g, i) => g.split(i ? /;/ : /[；;]/).filter((x) => x.trim()).length)),
    });
  }
  const prev = existsSync(statePath) ? load() : {};
  save({ id: job, model: MODEL, createdAt: new Date().toISOString(), usage: prev.usage || { input: 0, cached: 0, output: 0 }, calls: prev.calls || 0, entries, results: prev.results || {} });
  console.log(JSON.stringify(entries.map((e) => [e.swedish, e.pos, e.glossCount, e.examples.length, e.otherEntries.length]), null, 0));
}

const schema = {
  type: "object", additionalProperties: false, required: ["entries"],
  properties: { entries: { type: "array", items: {
    type: "object", additionalProperties: false, required: ["id", "senses", "other_entry_glosses", "note"],
    properties: {
      id: { type: "string" },
      note: { type: "string" },
      other_entry_glosses: { type: "array", items: { type: "string" } },
      senses: { type: "array", items: {
        type: "object", additionalProperties: false,
        required: ["definition_sv", "meaning_zh", "meaning_en", "usage_note_sv", "register", "example_ids", "new_example"],
        properties: {
          definition_sv: { type: "string" }, meaning_zh: { type: "string" }, meaning_en: { type: "string" },
          usage_note_sv: { type: "string" }, register: { type: "string", enum: ["neutral", "vardagligt", "formellt"] },
          example_ids: { type: "array", items: { type: "string" } },
          new_example: { type: "object", additionalProperties: false, required: ["sv", "zh", "en"], properties: { sv: { type: "string" }, zh: { type: "string" }, en: { type: "string" } } },
        },
      } },
    },
  } } },
};
const instructions = `You organise Swedish dictionary entries for Chinese- and English-speaking learners (A1–B2) into senses.
For each entry you get its part of speech, its stored Chinese and English glosses, its Swedish explanation, its examples (with ids) and the other entries with the same spelling.
Rules:
- Divide by Swedish meaning and use, not by the number of glosses. Near-synonymous glosses ("ready; finished" when they are one use, "place; spot") are ONE sense. Most entries with 2 glosses have one sense.
- Use only meanings already present in the stored glosses or explanation. Never add a meaning the entry does not already state.
- A gloss that belongs to another part of speech or another entry (an adjective sense stored on a noun, a pronoun use stored on a noun, a particle verb like "slå upp") is not a sense: list it in other_entry_glosses.
- If the entry has one sense, return exactly one sense (it will not be split).
- Order senses from most to least common.
- definition_sv: a short, simple Swedish explanation (max 14 words), without the headword.
- meaning_zh: the sense in Simplified Chinese, reusing the stored wording; meaning_en: the same in English, reusing the stored wording. Keep near-synonyms of the sense together, separated by "; ".
- usage_note_sv: a short Swedish note only when the sense has a clear use (construction, register, typical object); else "".
- example_ids: ids of stored examples that clearly show this sense; an example belongs to at most one sense; leave unclear examples out.
- new_example: only for a sense with no example_ids — one natural A2–B1 Swedish sentence using the headword in this sense, with Chinese and English translations. Otherwise all three "".
- note: one short line on how you divided the entry (English).`;

async function run() {
  const s = load();
  const todo = s.entries.filter((e) => !s.results[e.id]);
  for (let i = 0; i < todo.length; i += 5) {
    const batch = todo.slice(i, i + 5);
    const input = JSON.stringify(batch.map((e) => ({ id: e.id, headword: e.swedish, part_of_speech: e.pos, glosses_zh: e.zh, glosses_en: e.en, explanation_sv: e.sv,
      examples: e.examples.length ? e.examples.map((x) => ({ id: x.id, sv: x.sv })) : [], other_entries_same_spelling: e.otherEntries })));
    const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, instructions, input, reasoning: { effort: "medium" }, max_output_tokens: 12000, text: { format: { type: "json_schema", name: "senses", strict: true, schema } } }) });
    const data = await r.json();
    appendFileSync(`${dir}/raw.jsonl`, JSON.stringify({ at: new Date().toISOString(), ids: batch.map((e) => e.id), response: data }) + "\n");
    // Every billed call counts, an incomplete one too.
    const u = data.usage || {};
    s.usage.input += u.input_tokens || 0; s.usage.cached += u.input_tokens_details?.cached_tokens || 0; s.usage.output += u.output_tokens || 0; s.calls++;
    save(s);
    if (!r.ok || data.status !== "completed") throw new Error(`call not completed: ${data.status} ${JSON.stringify(data.incomplete_details || data.error || {})}`);
    const text = (data.output || []).flatMap((o) => o.content || []).map((c) => c.text || "").join("");
    for (const item of JSON.parse(text).entries) if (batch.some((e) => e.id === item.id)) s.results[item.id] = item;
    save(s);
  }
  console.log(JSON.stringify({ calls: s.calls, usage: s.usage, usd: +usd(s.usage).toFixed(4), results: Object.keys(s.results).length }));
}

// Checks before anything is written: Swedish and Chinese in the right fields, only the
// entry's own examples, each example once, new examples that use the word.
async function validate(e, r) {
  const problems = [];
  const forms = new Set([e.swedish, ...(await saldoEntries(null, e.swedish)).flatMap((x) => Object.values(x.forms).flat())].map((f) => f.toLowerCase()));
  const own = new Set(e.examples.map((x) => x.id)), seen = new Set();
  if (!r.senses.length || r.senses.length > 6) problems.push("sense count");
  r.senses.forEach((x, i) => {
    if (!x.definition_sv.trim() || CJK.test(x.definition_sv)) problems.push(`sense ${i + 1}: definition_sv`);
    if (x.definition_sv.toLowerCase().split(/[^\p{L}]+/u).includes(e.swedish.toLowerCase())) problems.push(`sense ${i + 1}: definition_sv repeats the headword`);
    if (!CJK.test(x.meaning_zh)) problems.push(`sense ${i + 1}: meaning_zh`);
    if (!x.meaning_en.trim() || CJK.test(x.meaning_en)) problems.push(`sense ${i + 1}: meaning_en`);
    for (const id of x.example_ids) { if (!own.has(id)) problems.push(`sense ${i + 1}: foreign example ${id}`); if (seen.has(id)) problems.push(`example ${id} twice`); seen.add(id); }
    if (x.new_example.sv) {
      if (x.example_ids.length) problems.push(`sense ${i + 1}: new example although one exists`);
      const words = x.new_example.sv.toLowerCase().split(/[^\p{L}]+/u);
      if (!words.some((w) => forms.has(w))) problems.push(`sense ${i + 1}: new example lacks the word`);
      if (!CJK.test(x.new_example.zh) || CJK.test(x.new_example.en) || !x.new_example.en.trim()) problems.push(`sense ${i + 1}: example translations`);
    }
  });
  return problems;
}

async function sql() {
  await useSaldoFiles();
  const s = load();
  const batch = randomUUID();
  const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
  const out = [`-- Sense pilot ${job} (${batch}): AI-grouped senses inside the entries' own glosses.`, "begin;"];
  const back = ["begin;"];
  const preview = ["headword\tpos\tsense\tdefinition_sv\tmeaning_zh\tmeaning_en\tusage\texamples\tnew_example"];
  const report = [];
  // Editor corrections made after reading the AI result (overrides.json): a whole division
  // or single fields; they are marked as the editor's in source.
  const overrides = existsSync(`${dir}/overrides.json`) ? JSON.parse(readFileSync(`${dir}/overrides.json`, "utf8")) : {};
  for (const e of s.entries) {
    let r = s.results[e.id];
    const ov = overrides[e.id];
    if (r && ov?.senses) r = { ...r, senses: ov.senses, other_entry_glosses: [] };
    if (r && ov?.patch) r = { ...r, senses: r.senses.map((x, i) => ({ ...x, ...(ov.patch[i + 1] || {}) })) };
    if (!r) { report.push([e.swedish, e.pos, "no result"]); continue; }
    if (r.senses.length > 1) {
      const problems = await validate(e, r);
      if (problems.length) { report.push([e.swedish, e.pos, "held: " + problems.join("; ")]); continue; }
    }
    if (r.senses.length === 1) { report.push([e.swedish, e.pos, `one sense, not split${r.other_entry_glosses.length ? "; other entry: " + r.other_entry_glosses.join(" | ") : ""}`]); continue; }
    report.push([e.swedish, e.pos, `${r.senses.length} senses${r.other_entry_glosses.length ? "; other entry: " + r.other_entry_glosses.join(" | ") : ""}`]);
    const source = ov?.senses ? `editor:${job}` : ov?.patch ? `ai_pilot+editor:${MODEL}:${job}` : `ai_pilot:${MODEL}:${job}`;
    r.senses.forEach((x, i) => {
      const order = i + 1, sid = `(select id from public.learning_object_senses where learning_object_id = ${q(e.id)} and sense_order = ${order})`;
      out.push(`insert into public.learning_object_senses (learning_object_id, sense_order, definition_sv, usage_note, register, source) values (${q(e.id)}, ${order}, ${q(x.definition_sv.trim())}, ${q(x.usage_note_sv.trim())}, ${q(x.register === "neutral" ? null : x.register)}, ${q(source)}) on conflict (learning_object_id, sense_order) do nothing;`);
      for (const [lang, m] of [["zh", x.meaning_zh], ["en", x.meaning_en]]) out.push(`insert into public.learning_object_sense_translations (sense_id, native_language, meaning) select ${sid}, ${q(lang)}, ${q(m.trim())} on conflict (sense_id, native_language) do nothing;`);
      for (const id of x.example_ids) out.push(`update public.learning_object_examples set sense_id = ${sid} where id = ${q(id)} and sense_id is null;`);
      if (x.new_example.sv) {
        // Re-runnable: the example is added once.
        out.push(`with ex as (insert into public.learning_object_examples (learning_object_id, example_swedish, example_chinese, sort_order, sense_id) select ${q(e.id)}, ${q(x.new_example.sv.trim())}, ${q(x.new_example.zh.trim())}, ${100 + order}, ${sid} where not exists (select 1 from public.learning_object_examples where learning_object_id = ${q(e.id)} and example_swedish = ${q(x.new_example.sv.trim())}) returning id)
  insert into public.learning_object_example_translations (example_id, native_language, translation) select ex.id, l.lang, l.t from ex, (values ('zh', ${q(x.new_example.zh.trim())}), ('en', ${q(x.new_example.en.trim())})) l(lang, t);`);
      }
      preview.push([e.swedish, e.pos, order, x.definition_sv, x.meaning_zh, x.meaning_en, x.usage_note_sv, x.example_ids.map((id) => e.examples.find((y) => y.id === id)?.sv).join(" / "), x.new_example.sv ? `${x.new_example.sv} | ${x.new_example.zh} | ${x.new_example.en}` : ""].join("\t"));
    });
    // Rollback: the pilot's own examples go, stored examples lose their sense, senses go.
    back.push(`delete from public.learning_object_examples where learning_object_id = ${q(e.id)} and sense_id in (select id from public.learning_object_senses where learning_object_id = ${q(e.id)} and source = ${q(source)}) and sort_order > 100;`);
    back.push(`update public.learning_object_examples set sense_id = null where learning_object_id = ${q(e.id)};`);
    back.push(`delete from public.learning_object_senses where learning_object_id = ${q(e.id)} and source = ${q(source)};`);
  }
  out.push("commit;"); back.push("commit;");
  writeFileSync(`${dir}/senses.sql`, out.join("\n") + "\n");
  writeFileSync(`${dir}/senses-rollback.sql`, back.join("\n") + "\n");
  writeFileSync(`${dir}/preview.tsv`, preview.join("\n") + "\n");
  writeFileSync(`${dir}/report.tsv`, report.map((r) => r.join("\t")).join("\n") + "\n");
  console.log(report.map((r) => r.join(" | ")).join("\n"));
  console.log(JSON.stringify({ batch, calls: s.calls, usage: s.usage, usd: +usd(s.usage).toFixed(4) }));
}

const commands = { plan, run, sql };
if (!commands[command]) { console.error("usage: senses-pilot.mjs plan|run|sql --job <id>"); process.exit(1); }
await commands[command]();
