import "dotenv/config";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import OpenAI from "openai";

// Reads find-corpus-gaps.mjs's per-word gap list (Reviews/词库缺口清单.json)
// and fills in, for each word, exactly the SPK-DIC-001 fields it's missing —
// one AI call per word covering everything that word needs, never one call
// per field (see Reviews/SPK-DIC-001-完整标准核对与任务清单-2026-07-26.md).
// The JSON schema is a fixed superset; the prompt tells the model which
// subset to actually fill for this word, others stay empty.
//
// Usage:
//   node scripts/fill-corpus-gaps.mjs --limit 25   # pilot
//   node scripts/fill-corpus-gaps.mjs              # full run

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY in .env.");
const MODEL = "gpt-5.4";

const args = process.argv.slice(2);
function flagValue(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}
const LIMIT = Number(flagValue("limit", "0")) || Infinity;
const CONCURRENCY = Number(flagValue("concurrency", "10"));
const INPUT_NAME = flagValue("input", "词库缺口清单.json");
const OUTPUT_NAME = flagValue("output", "词库补全结果.json");
const INPUT_PATH = new URL(`../Reviews/${INPUT_NAME}`, import.meta.url);
const OUTPUT_PATH = new URL(`../Reviews/${OUTPUT_NAME}`, import.meta.url);

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

const FIELD_INSTRUCTIONS = {
  cefr_level: "cefr_level: 判断该词的CEFR等级（A1/A2/B1/B2/C1/C2）",
  second_example: "second_example_sv + second_example_zh: 第二个自然例句（与常见的第一个例句不同角度或语法点），附中文翻译",
  collocations: "collocations: 3-5个常见固定搭配，每个包含 phrase（瑞典语搭配）、meaning_zh（中文释义）、example_sv（简短例句）",
  relationships: "relationships: 最多5个语义相关词，每个包含 word（瑞典语）、type（从 synonym/antonym/word_family/related/particle_verb/reflexive 中选择最贴切的一个）、meaning_zh（中文释义）。没有自然反义词或同义词时可以少给或不给，不要硬凑",
  countability: "countability: 名词可数性，从 countable/uncountable/both 中选择",
  transitivity: "transitivity: 动词及物性，从 transitive/intransitive/both 中选择",
  adverb_form: "adverb_form: 该形容词对应的常见副词形式（如 snabb→snabbt），没有自然副词形式时留空",
  comparison_type: "comparison_type: 从 regular/irregular/non-comparable 中选择",
  passiv_s: "passiv_s: 该动词常见的被动-s形式或简要规则说明，没有自然被动用法时留空",
  memory_tip: "memory_tip: 记忆提示——构词拆解、联想、同源词或简洁记忆方法，不得编造词源，没有可靠提示时留空",
  usage_registers: "usage_registers: 使用场景标签，从 spoken/written/formal/informal/everyday 中选择适用的（可多选），只在确有依据时标注",
};

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    cefr_level: { type: "string" },
    second_example_sv: { type: "string" },
    second_example_zh: { type: "string" },
    collocations: {
      type: "array",
      items: {
        type: "object",
        properties: { phrase: { type: "string" }, meaning_zh: { type: "string" }, example_sv: { type: "string" } },
        required: ["phrase", "meaning_zh", "example_sv"],
        additionalProperties: false,
      },
    },
    relationships: {
      type: "array",
      items: {
        type: "object",
        properties: { word: { type: "string" }, type: { type: "string" }, meaning_zh: { type: "string" } },
        required: ["word", "type", "meaning_zh"],
        additionalProperties: false,
      },
    },
    countability: { type: "string" },
    transitivity: { type: "string" },
    adverb_form: { type: "string" },
    comparison_type: { type: "string" },
    passiv_s: { type: "string" },
    memory_tip: { type: "string" },
    usage_registers: { type: "array", items: { type: "string" } },
  },
  required: [
    "cefr_level", "second_example_sv", "second_example_zh", "collocations", "relationships",
    "countability", "transitivity", "adverb_form", "comparison_type", "passiv_s", "memory_tip", "usage_registers",
  ],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `你是瑞典语母语级别的词典编辑，为 SpråkLab 词典补充内容。给定一个已有中文释义的瑞典语词条，只需要按要求补充列出的字段，不要重新生成释义。字段要求见用户消息里的具体列表——只填写列出的字段，其余字段一律留空字符串或空数组，不要编造列表之外的内容。

例句和搭配必须自然、现代、语义明确。不得编造词源。没有自然反义词/副词形式/被动用法时，对应字段可以留空，不要硬凑。`;

function buildUserPrompt(word) {
  const fieldList = word.needs.map((n) => `- ${FIELD_INSTRUCTIONS[n]}`).join("\n");
  return `瑞典语词条：${word.swedish}
词性：${word.part_of_speech}
中文释义：${word.chinese || "(无)"}
瑞典语解释：${word.swedish_explanation || "(无)"}

请只补充以下字段：
${fieldList}`;
}

async function main() {
  const all = JSON.parse(readFileSync(INPUT_PATH, "utf8"));
  const words = all.slice(0, LIMIT);
  console.log(`Processing ${words.length} words.`);

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
          response_format: { type: "json_schema", json_schema: { name: "corpus_gap_fill", strict: true, schema: RESPONSE_SCHEMA } },
        });
        const usage = completion.usage;
        inputTokens += usage.prompt_tokens || 0;
        outputTokens += usage.completion_tokens || 0;
        const parsed = JSON.parse(completion.choices[0].message.content);
        results.push({ id: word.id, swedish: word.swedish, part_of_speech: word.part_of_speech, needs: word.needs, ...parsed });
        console.log(`OK  ${word.swedish} [${word.needs.join(",")}] (${results.length}/${words.length})`);
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
    console.log(`Projected full-corpus cost (10097 words, similar mix): ~$${(((inputCost + outputCost) / (remaining.length - failed)) * 10097).toFixed(2)}`);
  }
}

main();
