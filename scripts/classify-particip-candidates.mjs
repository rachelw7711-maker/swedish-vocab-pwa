import "dotenv/config";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import OpenAI from "openai";

// Per SPK-DIC-001 §6-7 (Reviews/SPK-DIC-001-完整标准核对与任务清单-2026-07-26.md):
// presens/perfekt particip should be independent word cards, not folded into
// verb/adjective. Regex found 555 candidates (find-particip-candidates.mjs) —
// this script has the AI make the real yes/no call and, for confirmed ones,
// fill the standard's required fields in one call per word.
//
// Usage:
//   node scripts/classify-particip-candidates.mjs --limit 25   # pilot
//   node scripts/classify-particip-candidates.mjs              # full run

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
const INPUT_PATH = new URL("../Reviews/分词候选词清单.json", import.meta.url);
const OUTPUT_PATH = new URL("../Reviews/分词分类结果.json", import.meta.url);

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

const SYSTEM_PROMPT = `你是瑞典语母语级别的词典编辑。给你一个当前被标记为动词或形容词的瑞典语词条，请判断它是否其实是某个动词的现在分词（presens particip，如 skrivande）或完成分词（perfekt particip，如 skriven/skrivet/skrivna），而不是一个独立的普通动词或形容词。

判断标准：
- 如果这个词形态上、意义上明显是"正在...的"（现在分词）或"被...的/已经...的"（完成分词，动作结果状态），且能找到对应的原形动词，判定为分词。
- 如果这个词虽然词尾长得像，但实际是独立词汇（原形动词本身就以这些字母结尾，或者是普通形容词、没有明显对应的动词原形），判定为不是分词，is_participle 填 false，其余字段可留空。
- 不确定、证据不足时，倾向于判定为不是分词（is_participle: false），不要过度归类。

如果判定为分词，还需要填写：
- participle_type: "presens_particip" 或 "perfekt_particip"
- base_verb: 对应的动词原形（infinitiv），如果你不确定原形拼写，尽量给出你确信的答案
- function_tags: 现在分词从 [adjektivisk, substantiverad, adverbiell] 选择适用的（可多选）；完成分词从 [adjektivisk, passiv_betydelse, lexicalized_adjective] 选择适用的（可多选）
- meaning_note: 一句话说明这个分词表达的具体意思（现在分词通常是"正在进行、具有某种持续特征"；完成分词通常是"动作结果状态"或已词汇化的形容词意义），用中文
- 现在分词额外字段：participle_form 就是词条本身
- 完成分词额外字段：en_form（如 skriven）、ett_form（如 skrivet）、plural_form（如 skrivna）——如果词条本身就是其中一种形式，其余形式请你补全
- degree_forms: 仅当完成分词已经形容词化且可以比较时填写 {comparative, superlative_indefinite, superlative_definite}，不确定或不适用时留空对象`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    is_participle: { type: "boolean" },
    participle_type: { type: "string", enum: ["presens_particip", "perfekt_particip", ""] },
    base_verb: { type: "string" },
    function_tags: { type: "array", items: { type: "string" } },
    meaning_note: { type: "string" },
    en_form: { type: "string" },
    ett_form: { type: "string" },
    plural_form: { type: "string" },
    degree_forms: {
      type: "object",
      properties: {
        comparative: { type: "string" },
        superlative_indefinite: { type: "string" },
        superlative_definite: { type: "string" },
      },
      required: ["comparative", "superlative_indefinite", "superlative_definite"],
      additionalProperties: false,
    },
  },
  required: ["is_participle", "participle_type", "base_verb", "function_tags", "meaning_note", "en_form", "ett_form", "plural_form", "degree_forms"],
  additionalProperties: false,
};

function buildUserPrompt(word) {
  return `瑞典语词条：${word.swedish}
当前标记词性：${word.part_of_speech}
中文释义：${word.chinese || "(无)"}
瑞典语解释：${word.swedish_explanation || "(无)"}

请判断这是否是分词，并按要求填写字段。`;
}

async function main() {
  const candidates = JSON.parse(readFileSync(INPUT_PATH, "utf8"));
  const words = candidates.slice(0, LIMIT);
  console.log(`Processing ${words.length} candidates.`);

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
          response_format: { type: "json_schema", json_schema: { name: "particip_classification", strict: true, schema: RESPONSE_SCHEMA } },
        });
        const usage = completion.usage;
        inputTokens += usage.prompt_tokens || 0;
        outputTokens += usage.completion_tokens || 0;
        const parsed = JSON.parse(completion.choices[0].message.content);
        results.push({ id: word.id, swedish: word.swedish, part_of_speech: word.part_of_speech, ...parsed });
        console.log(`OK  ${word.swedish} -> is_participle=${parsed.is_participle} ${parsed.is_participle ? `(${parsed.participle_type}, base=${parsed.base_verb})` : ""} (${results.length}/${words.length})`);
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
  const confirmedCount = results.filter((r) => r.is_participle).length;
  console.log(`\nDone. ${results.length} total entries written to ${OUTPUT_PATH.pathname}`);
  console.log(`Confirmed participles: ${confirmedCount}/${results.length}`);
  console.log(`This run: input tokens ${inputTokens}, output tokens ${outputTokens}, failed ${failed}`);
  console.log(`Estimated cost for this run: ~$${(inputCost + outputCost).toFixed(3)}`);
  if (remaining.length - failed > 0) {
    console.log(`Per-word cost: ~$${((inputCost + outputCost) / (remaining.length - failed)).toFixed(4)}`);
  }
}

main();
