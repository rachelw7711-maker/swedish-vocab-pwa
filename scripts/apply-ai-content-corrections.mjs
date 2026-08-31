import "dotenv/config";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// AI-content-review Option A, second pass (2026-08-31): the first pass
// (review-ai-generated-words.mjs) found problems but only as free-text
// descriptions/suggestions — not safe to write to the database directly.
// This pass re-asks specifically for clean, directly-writable corrections
// on the fields Rachel approved for auto-apply: chinese (翻译),
// example_sv/example_zh (例句, corrected as a pair so they stay in sync),
// swedish_explanation (瑞典语解释). part_of_speech/word_forms/collocations/
// related_words are NOT touched here — those cascade into other tables
// (word_forms) or multi-item structures, higher risk, stay flagged-only
// per Rachel's explicit decision. Only applies a correction when
// confidence is "high", same threshold as the CEFR pass.
//
// Usage:
//   node scripts/apply-ai-content-corrections.mjs --limit 25   # pilot
//   node scripts/apply-ai-content-corrections.mjs              # full run

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
const REVIEW_INPUT_PATH = new URL("../scripts/output/ai-word-review-results.json", import.meta.url);
const OUTPUT_PATH = new URL(`../scripts/output/${flagValue("output", "content-corrections-results.json")}`, import.meta.url);
const AUDIT_PATH = new URL(`../scripts/output/${flagValue("audit", "content-corrections-audit.json")}`, import.meta.url);

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const client = new OpenAI({ apiKey: OPENAI_API_KEY });

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    chinese_correction: {
      type: "object",
      properties: {
        needs_correction: { type: "boolean" },
        corrected_value: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["needs_correction", "corrected_value", "confidence"],
      additionalProperties: false,
    },
    swedish_explanation_correction: {
      type: "object",
      properties: {
        needs_correction: { type: "boolean" },
        corrected_value: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["needs_correction", "corrected_value", "confidence"],
      additionalProperties: false,
    },
    example_correction: {
      type: "object",
      description: "example_sv and example_zh must stay a matched pair — if either needs fixing, provide both together.",
      properties: {
        needs_correction: { type: "boolean" },
        corrected_example_sv: { type: "string" },
        corrected_example_zh: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["needs_correction", "corrected_example_sv", "corrected_example_zh", "confidence"],
      additionalProperties: false,
    },
  },
  required: ["chinese_correction", "swedish_explanation_correction", "example_correction"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `你是瑞典语母语级别的词典编辑。给你一个SpråkLab词条的当前内容，以及上一轮审核已经发现的具体问题描述。你的任务是：只针对"中文释义"“瑞典语解释”“例句（含中文翻译）”这三处，给出干净、可以直接替换进数据库的修正值。

规则：
- 只在你确实有把握、知道正确答案时才给修正，把needs_correction设为true并把confidence设为high。
- 不确定、或者原内容其实没问题，needs_correction设为false，corrected_value/corrected_example_sv/corrected_example_zh留空字符串，confidence可以是low。
- 例句和例句中文翻译必须作为一对一起给，不能只改一边。
- corrected_value等字段要直接就是最终替换值本身，不要包含"建议改为"之类的说明文字，不要带引号包裹。
- 不要修改词性、词形变化、搭配、相关词——这些不归你管，即使你在上一轮问题描述里看到这类问题，也不要在这里给出修正。`;

function buildUserPrompt(word, priorIssues) {
  const issuesText = priorIssues
    .filter((i) => /chinese|中文|释义|explanation|解释|example|例句|translation|翻译/i.test(`${i.field} ${i.problem}`))
    .map((i) => `- [${i.field}] ${i.problem}${i.suggested_fix ? `（上一轮建议：${i.suggested_fix}）` : ""}`)
    .join("\n") || "(上一轮没有明确指出这三个字段的问题，但请你仍然自行判断是否需要修正)";
  return `瑞典语词：${word.swedish}
词性：${word.part_of_speech || "(空)"}
中文释义：${word.chinese || "(空)"}
瑞典语解释：${word.swedish_explanation || "(空)"}
例句：${word.example_sv || "(空)"}
例句中文翻译：${word.example_zh || "(空)"}

上一轮审核发现的相关问题：
${issuesText}`;
}

async function loadFlaggedWords() {
  const reviewResults = JSON.parse(readFileSync(REVIEW_INPUT_PATH, "utf8"));
  const flaggedIds = reviewResults.filter((r) => r.has_issues).map((r) => r.id);
  const issuesById = new Map(reviewResults.map((r) => [r.id, r.issues || []]));
  console.log(`${flaggedIds.length} words flagged with issues in the first pass.`);

  const rows = [];
  const chunkSize = 200; // Postgres `.in()` filter, keep chunks reasonable
  for (let i = 0; i < flaggedIds.length; i += chunkSize) {
    const chunk = flaggedIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("learning_objects")
      .select("id, swedish, part_of_speech, chinese, swedish_explanation, example_sv, example_zh")
      .in("id", chunk);
    if (error) throw error;
    rows.push(...data);
  }
  return rows.map((row) => ({ ...row, priorIssues: issuesById.get(row.id) || [] }));
}

async function main() {
  const all = await loadFlaggedWords();
  const words = all.slice(0, LIMIT);
  console.log(`Processing ${words.length} this run.`);

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

  async function applyIfHighConfidence(word, correction, dbUpdateWithMeta, label) {
    if (!correction?.needs_correction || correction.confidence !== "high") return null;
    const { _before: before, ...dbUpdate } = dbUpdateWithMeta;
    const { error } = await supabase.from("learning_objects").update(dbUpdate).eq("id", word.id);
    if (error) {
      console.log(`  write FAILED (${label}) for ${word.swedish}: ${error.message}`);
      return null;
    }
    applied += 1;
    audit.push({ id: word.id, swedish: word.swedish, field: label, before, after: dbUpdate, applied_at: new Date().toISOString() });
    writeFileSync(AUDIT_PATH, JSON.stringify(audit, null, 2));
    return label;
  }

  async function worker(queue) {
    while (queue.length) {
      const word = queue.shift();
      try {
        const completion = await client.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(word, word.priorIssues) },
          ],
          response_format: { type: "json_schema", json_schema: { name: "content_correction", strict: true, schema: RESPONSE_SCHEMA } },
        });
        const usage = completion.usage;
        inputTokens += usage.prompt_tokens || 0;
        outputTokens += usage.completion_tokens || 0;
        const parsed = JSON.parse(completion.choices[0].message.content);
        results.push({ id: word.id, swedish: word.swedish, ...parsed });

        const appliedLabels = (
          await Promise.all([
            applyIfHighConfidence(
              word,
              parsed.chinese_correction,
              { chinese: parsed.chinese_correction.corrected_value, _before: { chinese: word.chinese } },
              "chinese",
            ),
            applyIfHighConfidence(
              word,
              parsed.swedish_explanation_correction,
              { swedish_explanation: parsed.swedish_explanation_correction.corrected_value, _before: { swedish_explanation: word.swedish_explanation } },
              "swedish_explanation",
            ),
            applyIfHighConfidence(
              word,
              parsed.example_correction,
              {
                example_sv: parsed.example_correction.corrected_example_sv,
                example_zh: parsed.example_correction.corrected_example_zh,
                _before: { example_sv: word.example_sv, example_zh: word.example_zh },
              },
              "example",
            ),
          ])
        ).filter(Boolean);
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
  }
  console.log(`Corrections applied this run: ${applied} (audit: ${AUDIT_PATH.pathname})`);
}

main();
