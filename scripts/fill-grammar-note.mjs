import "dotenv/config";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// SPK-DIC-001 §3: Grammar Note — "用一句正向说明总结该词的变化规律" (one
// positive sentence summarizing the noun's inflection pattern). Missed from
// the main fill-corpus-gaps.mjs run — this is the standalone follow-up for
// all 6,169 nouns.
//
// Usage:
//   node scripts/fill-grammar-note.mjs --limit 25   # pilot
//   node scripts/fill-grammar-note.mjs              # full run

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY in .env.");
const MODEL = "gpt-5.4-mini";

const args = process.argv.slice(2);
function flagValue(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}
const LIMIT = Number(flagValue("limit", "0")) || Infinity;
const CONCURRENCY = Number(flagValue("concurrency", "10"));
const INPUT_PATH = new URL("../Reviews/名词grammar_note缺口清单.json", import.meta.url);
const OUTPUT_PATH = new URL("../Reviews/名词grammar_note结果.json", import.meta.url);

const client = new OpenAI({ apiKey: OPENAI_API_KEY });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const RESPONSE_SCHEMA = {
  type: "object",
  properties: { grammar_note: { type: "string" } },
  required: ["grammar_note"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `你是瑞典语母语级别的词典编辑。给定一个瑞典语名词及其词形变化，用一句中文正向说明总结这个词的变化规律（例如属于第几变格组、複数如何构成），不要举反例或错误示范，一句话即可，简洁清楚。`;

function buildUserPrompt(word) {
  const formsLine = word.forms && word.forms.length ? word.forms.map((f) => `${f.form_type}: ${f.form_value}`).join(", ") : "(无已知变化形式)";
  return `瑞典语名词：${word.swedish}
中文释义：${word.chinese || "(无)"}
已知词形变化：${formsLine}

请给出这个词的 Grammar Note。`;
}

async function main() {
  const missing = JSON.parse(readFileSync(INPUT_PATH, "utf8"));
  const words = missing.slice(0, LIMIT);
  console.log(`Processing ${words.length} nouns.`);

  const ids = words.map((w) => w.id);
  const formsRows = [];
  for (let i = 0; i < ids.length; i += 200) {
    const batchIds = ids.slice(i, i + 200);
    const { data, error } = await supabase.from("word_forms").select("learning_object_id, form_type, form_value").in("learning_object_id", batchIds);
    if (error) throw error;
    formsRows.push(...data);
  }
  const formsByWord = new Map();
  formsRows.forEach((f) => {
    if (!formsByWord.has(f.learning_object_id)) formsByWord.set(f.learning_object_id, []);
    formsByWord.get(f.learning_object_id).push(f);
  });
  words.forEach((w) => (w.forms = formsByWord.get(w.id) || []));

  const existing = existsSync(OUTPUT_PATH) ? JSON.parse(readFileSync(OUTPUT_PATH, "utf8")) : [];
  const doneIds = new Set(existing.map((e) => e.id));
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
        const completion = await client.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(word) },
          ],
          response_format: { type: "json_schema", json_schema: { name: "grammar_note", strict: true, schema: RESPONSE_SCHEMA } },
        });
        const usage = completion.usage;
        inputTokens += usage.prompt_tokens || 0;
        outputTokens += usage.completion_tokens || 0;
        const parsed = JSON.parse(completion.choices[0].message.content);
        results.push({ id: word.id, swedish: word.swedish, grammar_note: parsed.grammar_note });
        console.log(`OK  ${word.swedish} (${results.length}/${words.length})`);
      } catch (error) {
        failed++;
        console.log(`FAIL ${word.swedish}: ${error.message}`);
      }
      writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
    }
  }

  const queue = [...remaining];
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker(queue)));

  const inputCost = (inputTokens / 1_000_000) * 0.75;
  const outputCost = (outputTokens / 1_000_000) * 4.5;
  console.log(`\nDone. ${results.length} total entries written to ${OUTPUT_PATH.pathname}`);
  console.log(`This run: input tokens ${inputTokens}, output tokens ${outputTokens}, failed ${failed}`);
  console.log(`Estimated cost for this run: ~$${(inputCost + outputCost).toFixed(3)}`);
}

main();
