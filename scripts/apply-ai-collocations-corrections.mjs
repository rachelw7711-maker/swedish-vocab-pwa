import "dotenv/config";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// AI-content-review Option A, fourth (and closing) pass (2026-08-31):
// collocations and related_words — the last two fields the first review
// pass flagged that hadn't been auto-corrected yet (pass 2 handled
// chinese/example/explanation, pass 3 handled part_of_speech/word_forms).
// Closes the loop: everything the first pass flagged now either has a
// high-confidence auto-applied fix, or was left flagged because the AI
// itself wasn't confident — nothing is silently left "flagged but
// unowned." Same discipline as the previous three passes.
//
// Both fields are stored as flat pipe-delimited text on learning_objects
// (not separate tables), so a correction replaces the whole field's text
// wholesale rather than patching one item — matches the word_forms
// wholesale-replace pattern in pass 3, for the same reason (the set is a
// cohesive whole, partial edits don't compose cleanly).
//
// Usage:
//   node scripts/apply-ai-collocations-corrections.mjs --limit 25   # pilot
//   node scripts/apply-ai-collocations-corrections.mjs              # full run

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
const OUTPUT_PATH = new URL(`../scripts/output/${flagValue("output", "collocations-corrections-results.json")}`, import.meta.url);
const AUDIT_PATH = new URL(`../scripts/output/${flagValue("audit", "collocations-corrections-audit.json")}`, import.meta.url);

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const client = new OpenAI({ apiKey: OPENAI_API_KEY });

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    collocations_correction: {
      type: "object",
      properties: {
        needs_correction: { type: "boolean" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: { phrase: { type: "string" }, meaning_zh: { type: "string" }, example_sv: { type: "string" } },
            required: ["phrase", "meaning_zh", "example_sv"],
            additionalProperties: false,
          },
        },
      },
      required: ["needs_correction", "confidence", "items"],
      additionalProperties: false,
    },
    related_words_correction: {
      type: "object",
      properties: {
        needs_correction: { type: "boolean" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: { word: { type: "string" }, meaning_zh: { type: "string" } },
            required: ["word", "meaning_zh"],
            additionalProperties: false,
          },
        },
      },
      required: ["needs_correction", "confidence", "items"],
      additionalProperties: false,
    },
  },
  required: ["collocations_correction", "related_words_correction"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `你是瑞典语母语级别的词典编辑，专门核查并在必要时重新给出一个SpråkLab词条的"搭配（collocations）"和"相关词（related_words）"这两项。

规则：
- 只在你确实有把握当前内容有问题（编造的、不自然的、或明显不准确）时才给修正，needs_correction设为true、confidence设为high。
- 给修正时要给出完整的替换列表（3-5个搭配、最多5个相关词），不是只改有问题的那一项——因为会整体替换。
- 搭配要是真实自然、现代常用的固定搭配，每个包含phrase（瑞典语搭配）、meaning_zh（中文释义）、example_sv（简短例句）。
- 相关词要是真实存在语义关联的词（同义词/反义词/词族/常见关联词），不要为了凑数硬拉不相关的词。没有自然相关词时可以给少于5个甚至空列表。
- 不确定就保守，needs_correction设为false，items给空数组。`;

function buildUserPrompt(word, priorIssues) {
  const issuesText = priorIssues
    .filter((i) => /collocation|搭配|related|相关词/i.test(`${i.field} ${i.problem}`))
    .map((i) => `- [${i.field}] ${i.problem}`)
    .join("\n") || "(上一轮没有明确指出这两个字段的问题，但请你仍自行判断)";
  return `瑞典语词：${word.swedish}
词性：${word.part_of_speech || "(空)"}
中文释义：${word.chinese || "(空)"}
当前搭配：${word.collocations || "(空)"}
当前相关词：${word.related_words || "(空)"}

上一轮审核发现的相关问题：
${issuesText}`;
}

async function loadFlaggedWords() {
  const reviewResults = JSON.parse(readFileSync(REVIEW_INPUT_PATH, "utf8"));
  const flaggedIds = reviewResults
    .filter((r) => r.has_issues && r.issues.some((i) => /collocation|搭配|related|相关词/i.test(`${i.field} ${i.problem}`)))
    .map((r) => r.id);
  const issuesById = new Map(reviewResults.map((r) => [r.id, r.issues || []]));
  console.log(`${flaggedIds.length} words flagged with a collocations/related_words issue in the first pass.`);

  const rows = [];
  const chunkSize = 200;
  for (let i = 0; i < flaggedIds.length; i += chunkSize) {
    const chunk = flaggedIds.slice(i, i + chunkSize);
    const { data, error } = await supabase.from("learning_objects").select("id, swedish, part_of_speech, chinese, collocations, related_words").in("id", chunk);
    if (error) throw error;
    rows.push(...data);
  }
  return rows.map((row) => ({ ...row, priorIssues: issuesById.get(row.id) || [] }));
}

function formatCollocations(items) {
  return items.map((i) => `${i.phrase} | ${i.meaning_zh} | ${i.example_sv}`).join("\n");
}
function formatRelatedWords(items) {
  return items.map((i) => `${i.word} | ${i.meaning_zh}`).join("\n");
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
          response_format: { type: "json_schema", json_schema: { name: "collocations_correction", strict: true, schema: RESPONSE_SCHEMA } },
        });
        const usage = completion.usage;
        inputTokens += usage.prompt_tokens || 0;
        outputTokens += usage.completion_tokens || 0;
        const parsed = JSON.parse(completion.choices[0].message.content);
        results.push({ id: word.id, swedish: word.swedish, ...parsed });

        const appliedLabels = [];
        const cc = parsed.collocations_correction;
        if (cc?.needs_correction && cc.confidence === "high") {
          const newValue = formatCollocations(cc.items);
          const { error } = await supabase.from("learning_objects").update({ collocations: newValue }).eq("id", word.id);
          if (error) {
            console.log(`  collocations write FAILED for ${word.swedish}: ${error.message}`);
          } else {
            applied += 1;
            appliedLabels.push("collocations");
            audit.push({ id: word.id, swedish: word.swedish, field: "collocations", before: word.collocations, after: newValue, applied_at: new Date().toISOString() });
          }
        }
        const rc = parsed.related_words_correction;
        if (rc?.needs_correction && rc.confidence === "high") {
          const newValue = formatRelatedWords(rc.items);
          const { error } = await supabase.from("learning_objects").update({ related_words: newValue }).eq("id", word.id);
          if (error) {
            console.log(`  related_words write FAILED for ${word.swedish}: ${error.message}`);
          } else {
            applied += 1;
            appliedLabels.push("related_words");
            audit.push({ id: word.id, swedish: word.swedish, field: "related_words", before: word.related_words, after: newValue, applied_at: new Date().toISOString() });
          }
        }
        if (appliedLabels.length) writeFileSync(AUDIT_PATH, JSON.stringify(audit, null, 2));

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
  if (runCount > 0) console.log(`Per-word cost: ~$${((inputCost + outputCost) / runCount).toFixed(4)}`);
  console.log(`Corrections applied (field-level): ${applied}`);
}

main();
