import "dotenv/config";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// AI-content-review Option A, fifth and final pass (2026-08-31): the
// remaining fields no prior pass ever looked at — ipa, countability,
// transitivity, adverb_form, comparison_type, passiv_s. Pass 1's review
// never included these in its prompt at all, so there's no "flagged"
// subset to draw from here (unlike passes 2-4) — this checks the full
// ai_generated cohort fresh, once, closing out content review entirely.
// Each field only applies to certain parts of speech; the prompt tells
// the model which ones are relevant per word rather than branching the
// schema, and it's expected to leave inapplicable fields as
// needs_correction:false.
//
// Usage:
//   node scripts/apply-ai-grammar-fields-corrections.mjs --limit 25   # pilot
//   node scripts/apply-ai-grammar-fields-corrections.mjs              # full run

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
const OUTPUT_PATH = new URL(`../scripts/output/${flagValue("output", "grammar-fields-corrections-results.json")}`, import.meta.url);
const AUDIT_PATH = new URL(`../scripts/output/${flagValue("audit", "grammar-fields-corrections-audit.json")}`, import.meta.url);

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const client = new OpenAI({ apiKey: OPENAI_API_KEY });

function fieldSchema(valueSchema) {
  return {
    type: "object",
    properties: {
      needs_correction: { type: "boolean" },
      corrected_value: valueSchema,
      confidence: { type: "string", enum: ["high", "medium", "low"] },
    },
    required: ["needs_correction", "corrected_value", "confidence"],
    additionalProperties: false,
  };
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    ipa_correction: fieldSchema({ type: "string" }),
    countability_correction: fieldSchema({ type: "string", enum: ["countable", "uncountable", "both", ""] }),
    transitivity_correction: fieldSchema({ type: "string", enum: ["transitive", "intransitive", "both", ""] }),
    adverb_form_correction: fieldSchema({ type: "string" }),
    comparison_type_correction: fieldSchema({ type: "string", enum: ["regular", "irregular", "non-comparable", ""] }),
    passiv_s_correction: fieldSchema({ type: "string" }),
    pos_detail_correction: fieldSchema({ type: "string" }),
  },
  required: [
    "ipa_correction", "countability_correction", "transitivity_correction",
    "adverb_form_correction", "comparison_type_correction", "passiv_s_correction", "pos_detail_correction",
  ],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `你是瑞典语母语级别的词典编辑，核查一个SpråkLab词条的七个语法相关字段，只在确实需要修正时给出修正。

字段说明与适用范围：
- ipa: 国际音标注音，适用于所有词。核查是否符合瑞典语实际发音。
- countability（可数性，countable/uncountable/both）：只适用于名词。非名词该字段留空、needs_correction设为false。
- transitivity（及物性，transitive/intransitive/both）：只适用于动词。非动词留空。
- adverb_form（对应副词形式）：只适用于形容词。没有自然副词形式或非形容词，留空。
- comparison_type（比较级类型，regular/irregular/non-comparable）：只适用于形容词。非形容词留空。
- passiv_s（被动-s形式）：只适用于动词。没有自然被动用法或非动词，留空。
- pos_detail（词性补充分类）：名词标"en-ord"/"ett-ord"，数词标"grundtal"（基数词）/"ordningstal"（序数词），其余词性通常留空。

规则：
- 只在你确实有把握当前值错误或缺失（且能确定正确答案）时，needs_correction设为true、confidence设为high。
- 字段不适用于当前词性时，needs_correction设为false，corrected_value留空字符串。
- 不确定就保守，不要瞎猜。`;

function buildUserPrompt(word) {
  return `瑞典语词：${word.swedish}
词性：${word.part_of_speech || "(空)"}
中文释义：${word.chinese || "(空)"}
当前IPA：${word.ipa || "(空)"}
当前可数性：${word.countability || "(空)"}
当前及物性：${word.transitivity || "(空)"}
当前副词形式：${word.adverb_form || "(空)"}
当前比较级类型：${word.comparison_type || "(空)"}
当前被动-s形式：${word.passiv_s || "(空)"}
当前词性补充分类：${word.pos_detail || "(空)"}`;
}

async function loadWords() {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  while (true) {
    const { data, error } = await supabase
      .from("learning_objects")
      .select("id, swedish, part_of_speech, chinese, ipa, countability, transitivity, adverb_form, comparison_type, passiv_s, pos_detail")
      .eq("object_type", "word")
      .eq("status", "ai_generated")
      .order("id")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data.length) break;
    rows.push(...data);
    from += pageSize;
  }
  return rows;
}

const FIELD_MAP = {
  ipa_correction: "ipa",
  countability_correction: "countability",
  transitivity_correction: "transitivity",
  adverb_form_correction: "adverb_form",
  comparison_type_correction: "comparison_type",
  passiv_s_correction: "passiv_s",
  pos_detail_correction: "pos_detail",
};

async function main() {
  const all = await loadWords();
  const words = all.slice(0, LIMIT);
  console.log(`Loaded ${all.length} ai_generated words, processing ${words.length} this run.`);

  const existing = existsSync(OUTPUT_PATH) ? JSON.parse(readFileSync(OUTPUT_PATH, "utf8")) : [];
  const doneIds = new Set(existing.map((e) => e.id));
  const remaining = words.filter((w) => !doneIds.has(w.id));
  console.log(`Already done: ${existing.length}. Remaining: ${remaining.length}.`);

  const results = [...existing];
  const audit = existsSync(AUDIT_PATH) ? JSON.parse(readFileSync(AUDIT_PATH, "utf8")) : [];
  let inputTokens = 0;
  let outputTokens = 0;
  let failed = 0;
  let applied = 0;

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
          response_format: { type: "json_schema", json_schema: { name: "grammar_fields_correction", strict: true, schema: RESPONSE_SCHEMA } },
        });
        const usage = completion.usage;
        inputTokens += usage.prompt_tokens || 0;
        outputTokens += usage.completion_tokens || 0;
        const parsed = JSON.parse(completion.choices[0].message.content);
        results.push({ id: word.id, swedish: word.swedish, ...parsed });

        const dbUpdate = {};
        const appliedLabels = [];
        for (const [key, column] of Object.entries(FIELD_MAP)) {
          const correction = parsed[key];
          if (correction?.needs_correction && correction.confidence === "high" && correction.corrected_value) {
            dbUpdate[column] = correction.corrected_value;
            appliedLabels.push(column);
          }
        }
        if (appliedLabels.length) {
          const { error } = await supabase.from("learning_objects").update(dbUpdate).eq("id", word.id);
          if (error) {
            console.log(`  write FAILED for ${word.swedish}: ${error.message}`);
          } else {
            applied += 1;
            audit.push({ id: word.id, swedish: word.swedish, fields: appliedLabels, values: dbUpdate, applied_at: new Date().toISOString() });
            writeFileSync(AUDIT_PATH, JSON.stringify(audit, null, 2));
          }
        }

        console.log(`${appliedLabels.length ? "APPLIED:" + appliedLabels.join(",") : "no-op"}  ${word.swedish} (${results.length}/${words.length})`);
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
  const runCount = remaining.length - failed;
  console.log(`\nDone. ${results.length} total entries written to ${OUTPUT_PATH.pathname}`);
  console.log(`This run: input tokens ${inputTokens}, output tokens ${outputTokens}, failed ${failed}`);
  console.log(`Estimated cost for this run: ~$${(inputCost + outputCost).toFixed(3)}`);
  if (runCount > 0) {
    const perWord = (inputCost + outputCost) / runCount;
    console.log(`Per-word cost: ~$${perWord.toFixed(4)}`);
    console.log(`Projected full-cohort cost (4646 words): ~$${(perWord * 4646).toFixed(2)}`);
  }
  console.log(`Words with at least one correction applied: ${applied}`);
}

main();
