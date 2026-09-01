import "dotenv/config";
import { writeFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// Multi-native-language support, English pilot (Reviews/多母语支持-架构与实施
// 方案-2026-09-01.md + follow-up structure cleanup, 2026-09-01). Generates
// English content for the six native-language-dependent fields on
// learning_object_translations, one row per learning_object at
// native_language='en'. Writes to English readers what a Chinese explanation
// already writes to Chinese readers — NOT a literal translation of the
// Chinese text (that loses fidelity across two hops); the Swedish word/
// example/pos is the source, the existing Chinese content is passed along
// only as a meaning-consistency reference.
//
// Usage:
//   node scripts/generate-english-translations.mjs --pilot 20   # first N words, for quality/cost check
//   node scripts/generate-english-translations.mjs              # full run, resumable

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY in .env.");
const MODEL = "gpt-5.4";

const args = process.argv.slice(2);
function flagValue(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}
const PILOT_LIMIT = Number(flagValue("pilot", "0")) || 0;
const CONCURRENCY = Number(flagValue("concurrency", "8"));
const OUTPUT_DIR = new URL("../scripts/output/", import.meta.url);
mkdirSync(OUTPUT_DIR, { recursive: true });
const OUTPUT_PATH = new URL("english-translations-results.json", OUTPUT_DIR);

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// 2026-09-01: the first full run stalled for close to an hour with mostly
// "fetch failed" errors while plain curl to api.openai.com worked fine at
// the same time — looked like accumulated hung/stale connections in a
// long-lived process rather than a real outage. maxRetries gives OpenAI's
// own client a chance to recover from a transient failure instead of
// immediately logging the entry as failed; timeout bounds how long a
// single hung request can block a worker.
const client = new OpenAI({ apiKey: OPENAI_API_KEY, maxRetries: 3, timeout: 60_000 });

// Same phrase|meaning|example flat-text format app.js's splitCollocations/
// splitRelatedWords parse client-side — reimplemented here rather than
// imported (that file is browser JS, this is a Node script) so the AI is
// only ever asked for the ENGLISH MEANING of each already-parsed line, never
// asked to reproduce the Swedish phrase/example text itself (removes any
// risk of it silently altering those while "translating").
function splitPipeList(text, partsExpected) {
  return (text || "")
    .split(/[\n;]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+\|\s+/).map((p) => p.trim());
      if (partsExpected === 3) return { phrase: parts[0] || "", meaning: parts[1] || "", example: parts[2] || "" };
      return { word: parts[0] || "", meaning: parts.slice(1).join(" | ") || "" };
    })
    .filter((item) => item.phrase || item.word);
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    meaning: { type: "string" },
    example_translation: { type: "string" },
    learning_tip: { type: "string" },
    grammar_note: { type: "string" },
    meaning_note: { type: "string" },
    collocation_meanings: { type: "array", items: { type: "string" } },
    related_word_meanings: { type: "array", items: { type: "string" } },
    second_example_translation: { type: "string" },
  },
  required: [
    "meaning",
    "example_translation",
    "learning_tip",
    "grammar_note",
    "meaning_note",
    "collocation_meanings",
    "related_word_meanings",
    "second_example_translation",
  ],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You write English-language learning content for English-speaking adults learning Swedish, for a dictionary app. You are given a Swedish word/expression and the equivalent Chinese-language content the app already shows Chinese-speaking learners, as a MEANING REFERENCE ONLY — do not translate the Chinese text word-for-word. Write natural English explanations a native English speaker would find clear and idiomatic, semantically equivalent to what the Chinese conveys.

Rules:
- meaning: a short English gloss/definition, same register and length as a dictionary entry (not a full sentence).
- example_translation: an English translation of the given Swedish example sentence. Leave "" if no Swedish example was given or the Chinese reference example_translation is empty.
- learning_tip / grammar_note / meaning_note: leave "" if the corresponding Chinese reference field is empty. Otherwise write an equivalent English version (not a literal translation) — these are short prose notes.
- collocation_meanings: exactly one English meaning per input collocation, same order, each a short gloss matching the corresponding Chinese meaning's intent. Empty array if no collocations given. NEVER use a semicolon or newline inside a meaning string — the app stores these in a "phrase | meaning | example" pipe/newline-delimited text format and a semicolon or newline inside a field corrupts it. If you need to give more than one gloss, join them with a comma or "/" instead (e.g. "feel guilty, have a bad conscience").
- related_word_meanings: exactly one English meaning per input related word, same order, same rule (comma/slash instead of semicolon, never a newline).
- second_example_translation: an English translation of the given second Swedish example sentence. Leave "" if none was given.
- Never invent content that has no Chinese-reference counterpart. Never translate the Swedish word/phrase/example text itself — only ever produce the requested English meaning fields.`;

function buildUserPrompt(word, zh, collocationItems, relatedItems) {
  return JSON.stringify({
    swedish: word.swedish,
    part_of_speech: word.part_of_speech,
    example_sv: word.example_sv || "",
    second_example_sv: word.secondExample?.example_swedish || "",
    chinese_reference: {
      meaning: zh?.meaning || "",
      example_translation: zh?.example_translation || "",
      learning_tip: zh?.learning_tip || "",
      grammar_note: zh?.grammar_note || "",
      meaning_note: zh?.meaning_note || "",
      second_example_translation: word.secondExample?.example_chinese || "",
    },
    collocations: collocationItems.map((c) => ({ phrase: c.phrase, chinese_meaning: c.meaning })),
    related_words: relatedItems.map((r) => ({ word: r.word, chinese_meaning: r.meaning })),
  });
}

async function generateOne(word, zh) {
  const collocationItems = splitPipeList(zh?.collocations, 3);
  const relatedItems = splitPipeList(zh?.related_words, 2);
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(word, zh, collocationItems, relatedItems) },
    ],
    response_format: { type: "json_schema", json_schema: { name: "english_translation", strict: true, schema: RESPONSE_SCHEMA } },
  });
  const usage = completion.usage;
  const parsed = JSON.parse(completion.choices[0].message.content);

  // Never drop the "example" segment even when empty — the client parser
  // (app.js splitCollocations) infers "phrase | X" (2 parts) as
  // {phrase, example: X}, no meaning at all. Filtering out an empty
  // example used to collapse "phrase | meaning | " down to 2 parts,
  // silently reinterpreting the real meaning as an example. Always emit
  // all 3 segments so a present meaning is never lost to that fallback.
  // Also strip any stray semicolon/newline the model produced despite the
  // prompt instruction — defense in depth, since either corrupts this
  // pipe/newline-delimited format the same way.
  const sanitizeMeaning = (value) => (value || "").replace(/[;\n]+/g, ", ").trim();
  const collocationsText = collocationItems
    .map((c, i) => [c.phrase, sanitizeMeaning(parsed.collocation_meanings[i]), c.example].join(" | "))
    .join("\n");
  const relatedWordsText = relatedItems.map((r, i) => `${r.word} | ${sanitizeMeaning(parsed.related_word_meanings[i])}`).join("\n");

  return {
    row: {
      learning_object_id: word.id,
      native_language: "en",
      meaning: parsed.meaning,
      example_translation: parsed.example_translation,
      learning_tip: parsed.learning_tip,
      grammar_note: parsed.grammar_note,
      meaning_note: parsed.meaning_note,
      collocations: collocationsText,
      related_words: relatedWordsText,
    },
    secondExampleRow: word.secondExample
      ? { example_id: word.secondExample.id, native_language: "en", translation: parsed.second_example_translation }
      : null,
    usage,
  };
}

// Supabase caps an unpaginated select() at 1000 rows — bit the very first
// full run of this script (silently returned only 1000 of ~10939 entries).
// Explicit .range() paging, same fix this project has needed before.
async function loadWords() {
  const PAGE_SIZE = 1000;
  const all = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("learning_objects")
      .select("id, swedish, part_of_speech, example_sv")
      .in("object_type", ["word", "phrase", "expression"])
      .order("swedish", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return all;
}

async function loadZhTranslations(ids) {
  const map = new Map();
  const CHUNK = 500;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const { data, error } = await supabase.from("learning_object_translations").select("*").eq("native_language", "zh").in("learning_object_id", chunk);
    if (error) throw error;
    data.forEach((row) => map.set(row.learning_object_id, row));
  }
  return map;
}

// The 2nd+ example sentence (2026-07-25 enrichment pass, 10,096 rows —
// essentially one per word) lived in learning_object_examples.example_chinese,
// the exact same hardcoded-Chinese gap learning_objects itself had. Fixed
// alongside this English pass (migration 20260901120000) rather than as a
// separate follow-up pass, per Rachel's instruction to find the full scope
// before running anything at scale.
async function loadSecondExamples(ids) {
  const map = new Map();
  const CHUNK = 500;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("learning_object_examples")
      .select("id, learning_object_id, example_swedish, example_chinese")
      .in("learning_object_id", chunk);
    if (error) throw error;
    data.forEach((row) => map.set(row.learning_object_id, row));
  }
  return map;
}

async function main() {
  const allWords = await loadWords();
  const words = PILOT_LIMIT ? allWords.slice(0, PILOT_LIMIT) : allWords;
  console.log(`Generating English translations for ${words.length} entries${PILOT_LIMIT ? " (pilot)" : ""}...`);

  const zhByWordId = await loadZhTranslations(words.map((w) => w.id));
  const secondExampleByWordId = await loadSecondExamples(words.map((w) => w.id));

  const existing = existsSync(OUTPUT_PATH) ? JSON.parse(readFileSync(OUTPUT_PATH, "utf8")) : [];
  const doneIds = new Set(existing.map((e) => e.learning_object_id));
  const remaining = words.filter((w) => !doneIds.has(w.id));
  console.log(`Already done: ${existing.length}. Remaining: ${remaining.length}.`);

  const results = [...existing];
  let inputTokens = 0;
  let outputTokens = 0;
  let failed = 0;

  async function worker(queue) {
    while (queue.length) {
      const word = queue.shift();
      try {
        const zh = zhByWordId.get(word.id);
        word.secondExample = secondExampleByWordId.get(word.id) || null;
        const { row, secondExampleRow, usage } = await generateOne(word, zh);
        inputTokens += usage.prompt_tokens || 0;
        outputTokens += usage.completion_tokens || 0;
        const { error } = await supabase.from("learning_object_translations").upsert(row, { onConflict: "learning_object_id,native_language" });
        if (error) throw error;
        if (secondExampleRow) {
          const { error: exampleErr } = await supabase.from("learning_object_example_translations").upsert(secondExampleRow, { onConflict: "example_id,native_language" });
          if (exampleErr) throw exampleErr;
        }
        results.push({ learning_object_id: word.id, swedish: word.swedish, meaning: row.meaning });
        writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
      } catch (error) {
        failed += 1;
        console.error(`Failed for "${word.swedish}" (${word.id}):`, error.message);
      }
    }
  }

  const queue = [...remaining];
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker(queue)));

  const cost = (inputTokens / 1_000_000) * 2.5 + (outputTokens / 1_000_000) * 15;
  console.log(`\nDone. ${results.length} total rows written (${remaining.length - failed} this run, ${failed} failed).`);
  console.log(`This run's cost: $${cost.toFixed(4)} (${inputTokens} in / ${outputTokens} out tokens, ${MODEL}).`);
  if (remaining.length) console.log(`Per-entry avg cost this run: $${(cost / (remaining.length - failed || 1)).toFixed(5)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
