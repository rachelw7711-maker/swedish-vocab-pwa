import "dotenv/config";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// Backfills structured word_forms for the ~5,436 legacy words (noun/verb/
// adjective/adverb/pronoun) that predate this project's Kelly-generation
// pipeline and have zero word_forms rows — plus adds the two fields
// flagged as missing entirely in SPK-DIC-001 (countability for nouns,
// transitivity for verbs). One AI call per word produces both, per
// Rachel's cost-consolidation instruction.
//
// Usage:
//   node scripts/backfill-legacy-word-forms.mjs --limit 20   # pilot
//   node scripts/backfill-legacy-word-forms.mjs              # full run

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY in .env.");
const MODEL = "gpt-5.4";

const args = process.argv.slice(2);
function flagValue(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}
const LIMIT = Number(flagValue("limit", "0")) || Infinity;
const CONCURRENCY = Number(flagValue("concurrency", "6"));
const OUTPUT_PATH = new URL("../Reviews/老词条语法补全结果.json", import.meta.url);

const client = new OpenAI({ apiKey: OPENAI_API_KEY });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FORM_TYPES_BY_POS = {
  noun: ["genus", "singular_indefinite", "singular_definite", "plural_indefinite", "plural_definite", "declension_group"],
  verb: ["infinitive", "present", "preteritum", "supinum", "imperative", "verb_group"],
  adjective: ["base_form", "neuter_form", "plural_form", "definite_form", "comparative", "superlative_indefinite", "superlative_definite"],
  adverb: ["base_form", "comparative", "superlative"],
  pronoun: ["subject_form", "object_form", "possessive_en", "possessive_ett", "possessive_plural"],
};

const SYSTEM_PROMPT = `你是瑞典语母语级别的词典编辑。给定一个已经有中文释义的瑞典语词条，只需要补充它的语法变化形式，不要重新生成释义。

**动词变位规则（务必核对，历史上出过错）：**
- 第一变位组（-a结尾，如 fatta, tala）：presens=词干+ar；preteritum=词干+ade；supinum=词干+at。
- 第二变位组a（浊辅音结尾，如 ringa）：presens=词干+er；preteritum=词干+de；supinum=词干+t。
- 第二变位组b（清辅音结尾，如 läsa）：presens=词干+er；preteritum=词干+te；supinum=词干+t。
- 第三变位组（元音结尾，如 bo）：presens=词干+r；preteritum=词干+dde；supinum=词干+tt。
- 不规则动词（vara, ta, ge等）：用你确实掌握的真实变位，不要套用规则硬造。

同时输出：
- 名词：可数性（countable/uncountable/both）
- 动词：及物性（transitive/intransitive/both）
其他词性这两个字段留空字符串。`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    forms: {
      type: "array",
      items: {
        type: "object",
        properties: { form_type: { type: "string" }, form_value: { type: "string" } },
        required: ["form_type", "form_value"],
        additionalProperties: false,
      },
    },
    countability: { type: "string", enum: ["countable", "uncountable", "both", ""] },
    transitivity: { type: "string", enum: ["transitive", "intransitive", "both", ""] },
  },
  required: ["forms", "countability", "transitivity"],
  additionalProperties: false,
};

function buildUserPrompt(word) {
  const formTypes = FORM_TYPES_BY_POS[word.part_of_speech] || [];
  return `瑞典语单词：${word.swedish}
词性：${word.part_of_speech}
中文释义：${word.chinese || "(无)"}
瑞典语解释：${word.swedish_explanation || "(无)"}
需要填写的 word_forms 字段（只从此列表选，不要发明新的）：${formTypes.join(", ")}

请输出这个词的语法变化形式，以及适用的可数性/及物性。`;
}

async function main() {
  const missing = JSON.parse(readFileSync("/tmp/relevant-missing.json", "utf8"));
  const words = missing.slice(0, LIMIT);
  console.log(`Processing ${words.length} words.`);

  // fetch chinese/swedish_explanation for these ids
  const ids = words.map((w) => w.id);
  const enriched = [];
  for (let i = 0; i < ids.length; i += 200) {
    const batchIds = ids.slice(i, i + 200);
    const { data, error } = await supabase.from("learning_objects").select("id, swedish, part_of_speech, chinese, swedish_explanation").in("id", batchIds);
    if (error) throw error;
    enriched.push(...data);
  }

  const existing = existsSync(OUTPUT_PATH) ? JSON.parse(readFileSync(OUTPUT_PATH, "utf8")) : [];
  const doneIds = new Set(existing.map((e) => e.id));
  const remaining = enriched.filter((w) => !doneIds.has(w.id));
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
          response_format: { type: "json_schema", json_schema: { name: "legacy_word_forms", strict: true, schema: RESPONSE_SCHEMA } },
        });
        const usage = completion.usage;
        inputTokens += usage.prompt_tokens || 0;
        outputTokens += usage.completion_tokens || 0;
        const parsed = JSON.parse(completion.choices[0].message.content);
        results.push({ id: word.id, swedish: word.swedish, part_of_speech: word.part_of_speech, ...parsed });
        console.log(`OK  ${word.swedish} (${results.length}/${enriched.length})`);
      } catch (error) {
        failed++;
        console.log(`FAIL ${word.swedish}: ${error.message}`);
      }
      writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
    }
  }

  const queue = [...remaining];
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker(queue)));

  const inputCost = (inputTokens / 1_000_000) * 2.5;
  const outputCost = (outputTokens / 1_000_000) * 15;
  console.log(`\nDone. ${results.length} total entries written to ${OUTPUT_PATH.pathname}`);
  console.log(`This run: input tokens ${inputTokens}, output tokens ${outputTokens}, failed ${failed}`);
  console.log(`Estimated cost for this run: ~$${(inputCost + outputCost).toFixed(3)}`);
  if (remaining.length - failed > 0) {
    console.log(`Per-word cost: ~$${((inputCost + outputCost) / (remaining.length - failed)).toFixed(4)}`);
  }
}

main();
