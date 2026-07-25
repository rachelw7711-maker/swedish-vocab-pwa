import "dotenv/config";
import { writeFileSync, existsSync } from "node:fs";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// Bundled enrichment pass for words that already have full content (the
// ~4,644 words from the 6 CEFR generation batches, which already carry
// collocations + related_words). One AI call per word produces THREE
// things at once, instead of three separate full-corpus passes:
//   1. a second example sentence (idiomatic usage preferred if the word
//      has one — this doubles as Fraser/Uttryck sourcing, see #2)
//   2. an optional Uttryck (idiom/set expression) candidate for the new
//      Fraser/Uttryck module, when the word genuinely has one
//   3. reclassification of this word's existing learning_object_relationships
//      rows (currently all generic "related") into synonym/antonym/derived_from/related
//
// Per Rachel's 2026-07-25 instruction to consolidate AI spend instead of
// running separate passes per feature.
//
// Usage:
//   node scripts/enrich-vocab-content.mjs --limit 20        # pilot
//   node scripts/enrich-vocab-content.mjs                   # full run

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY in .env.");
const MODEL = "gpt-5.4";

const args = process.argv.slice(2);
function flagValue(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}
const LIMIT = Number(flagValue("limit", "0")) || Infinity;
const CONCURRENCY = Number(flagValue("concurrency", "5"));
const OUTPUT_PATH = new URL("../Reviews/词条批量增强结果.json", import.meta.url);

const client = new OpenAI({ apiKey: OPENAI_API_KEY });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const UTTRYCK_CATEGORIES = ["idiom", "everyday_expression", "colloquial_expression", "sentence_pattern", "native_expression"];
const REL_TYPES = ["synonym", "antonym", "derived_from", "related"];

const SYSTEM_PROMPT = `你是瑞典语母语级别的词典编辑，为中文母语的瑞典语学习者补充已有词条的内容。这次不是从零生成词条，只是三项增量补充，请严格只输出 schema 要求的字段。

1. 第二个例句：与已有例句不同语境的自然真实例句。如果这个词有一个地道、常用的固定表达/惯用语（不是随便的搭配，而是真正值得作为"Uttryck"收录的表达），优先让第二个例句自然地用上这个表达；如果没有合适的地道表达，就是一个普通但真实自然的第二个例句，不要为了凑数编造生僻用法。
2. Uttryck 候选：只有这个词确实关联一个真正值得收录的瑞典语惯用语/固定表达时才给出（宁缺毋滥，大多数词应该是 null）；不是每个词都要有。
3. 关系分类：给定这个词现有的"相关词"列表，把每一个重新分类成 synonym（近义词）/antonym（反义词）/derived_from（同根词/词族）/related（都不是，只是泛泛相关）之一。`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    second_example_sv: { type: "string" },
    second_example_zh: { type: "string" },
    uttryck: {
      type: ["object", "null"],
      properties: {
        swedish: { type: "string" },
        category: { type: "string", enum: UTTRYCK_CATEGORIES },
        meaning_zh: { type: "string" },
        example_sv: { type: "string" },
        example_zh: { type: "string" },
      },
      required: ["swedish", "category", "meaning_zh", "example_sv", "example_zh"],
      additionalProperties: false,
    },
    relationship_classifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          target_swedish: { type: "string" },
          type: { type: "string", enum: REL_TYPES },
        },
        required: ["target_swedish", "type"],
        additionalProperties: false,
      },
    },
  },
  required: ["second_example_sv", "second_example_zh", "uttryck", "relationship_classifications"],
  additionalProperties: false,
};

function buildUserPrompt(word, existingRelated) {
  const relatedList = existingRelated.length
    ? existingRelated.map((r) => `- ${r.swedish}`).join("\n")
    : "（无）";
  return `瑞典语单词：${word.swedish}（${word.part_of_speech}，CEFR ${word.cefr_level || "未知"}）
中文释义：${word.chinese}
已有例句：${word.example_sv}
已有固定搭配：${word.collocations || "（无）"}

现有"相关词"列表（需要你逐个分类）：
${relatedList}

请按 schema 输出第二例句、Uttryck 候选（没有就是 null）、以及对上面每一个相关词的分类。`;
}

async function callOpenAI(word, existingRelated) {
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(word, existingRelated) },
    ],
    response_format: { type: "json_schema", json_schema: { name: "vocab_enrichment", strict: true, schema: RESPONSE_SCHEMA } },
  });
  const usage = completion.usage;
  const parsed = JSON.parse(completion.choices[0].message.content);
  return { parsed, usage };
}

async function main() {
  console.log("Loading words with full content (collocations present)...");
  const PAGE = 1000;
  let offset = 0;
  let words = [];
  for (;;) {
    const { data, error } = await supabase
      .from("learning_objects")
      .select("id, swedish, chinese, part_of_speech, cefr_level, example_sv, collocations")
      .not("collocations", "is", null)
      .neq("collocations", "")
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    if (!data.length) break;
    words.push(...data);
    offset += PAGE;
    if (data.length < PAGE) break;
  }
  words = words.slice(0, LIMIT);
  console.log(`Processing ${words.length} words.`);

  const existing = existsSync(OUTPUT_PATH) ? JSON.parse(require("node:fs").readFileSync(OUTPUT_PATH, "utf8")) : [];
  const doneIds = new Set(existing.map((e) => e.id));
  const remaining = words.filter((w) => !doneIds.has(w.id));
  console.log(`Already done (from a previous run): ${existing.length}. Remaining: ${remaining.length}.`);

  const results = [...existing];
  let inputTokens = 0;
  let outputTokens = 0;
  let failed = 0;

  async function worker(queue) {
    while (queue.length) {
      const word = queue.shift();
      try {
        const { data: rels } = await supabase
          .from("learning_object_relationships")
          .select("to_object_id, learning_objects!to_object_id(swedish)")
          .eq("from_object_id", word.id);
        const existingRelated = (rels || []).map((r) => ({ swedish: r.learning_objects?.swedish })).filter((r) => r.swedish);

        const { parsed, usage } = await callOpenAI(word, existingRelated);
        inputTokens += usage.prompt_tokens || 0;
        outputTokens += usage.completion_tokens || 0;
        results.push({ id: word.id, swedish: word.swedish, ...parsed });
        console.log(`OK  ${word.swedish} (${results.length}/${words.length})${parsed.uttryck ? " [+uttryck]" : ""}`);
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
  if (remaining.length) {
    const perWord = (inputCost + outputCost) / (remaining.length - failed || 1);
    console.log(`Per-word cost: ~$${perWord.toFixed(4)}`);
  }
}

main();
