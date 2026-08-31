import "dotenv/config";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// AI-content-review Option A (2026-08-31): self-critique pass over the
// 4,646 status=ai_generated words. Scope confirmed by Rachel: only the
// unreviewed cohort, not the full 10,096-word corpus. Bundles several
// checks into one call per word (grammar/word-forms, translation
// accuracy, example-sentence correctness, internal field consistency,
// and a foreign-language-leak check) rather than paying for input
// tokens multiple times per word — same "consolidate AI spend" discipline
// as fill-corpus-gaps.mjs/enrich-vocab-content.mjs. Produces a flagged
// report only; never writes to the database.
//
// Usage:
//   node scripts/review-ai-generated-words.mjs --limit 25   # pilot
//   node scripts/review-ai-generated-words.mjs              # full run

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
const OUTPUT_PATH = new URL(`../scripts/output/${flagValue("output", "ai-word-review-results.json")}`, import.meta.url);
const CEFR_AUDIT_PATH = new URL(`../scripts/output/${flagValue("cefr-audit", "cefr-corrections-audit.json")}`, import.meta.url);
const VALID_CEFR = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const client = new OpenAI({ apiKey: OPENAI_API_KEY });

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    overall_confidence: { type: "string", enum: ["high", "medium", "low"] },
    has_issues: { type: "boolean" },
    foreign_language_leak: { type: "boolean" },
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string" },
          problem: { type: "string" },
          severity: { type: "string", enum: ["high", "medium", "low"] },
          suggested_fix: { type: "string" },
        },
        required: ["field", "problem", "severity", "suggested_fix"],
        additionalProperties: false,
      },
    },
    // Separate, machine-actionable field (distinct from the free-text
    // issues[] list) — this is the only correction this script writes to
    // the database automatically, and only when confidence is "high"
    // (Rachel's explicit 2026-08-31 decision). Everything else in issues[]
    // stays flag-only; CEFR level is lower-stakes (a difficulty tag, not
    // core word content) and the pilot showed well-calibrated judgment on
    // it specifically.
    cefr_correction: {
      type: "object",
      properties: {
        needs_correction: { type: "boolean" },
        suggested_level: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2", ""] },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        reason: { type: "string" },
      },
      required: ["needs_correction", "suggested_level", "confidence", "reason"],
      additionalProperties: false,
    },
  },
  required: ["overall_confidence", "has_issues", "foreign_language_leak", "issues", "cefr_correction"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `你是瑞典语母语级别的词典审校员，任务是核查一条SpråkLab词典条目——这条内容已经由AI生成好了，你不是要重新生成，是要像专业审校一样挑错。

需要核查的方面：
1. 中文释义是否准确对应瑞典语词/瑞典语解释
2. 词形变化（forms）是否符合该词性的正确变格/变位规则
3. 例句是否语法正确、自然、确实展示了这个词的用法
4. 搭配（collocations）和相关词（related_words）是否真实自然，不是编造的
5. 词性、CEFR等级是否合理
6. 整条内容内部是否一致（比如词性和词形变化是否匹配）
7. 是否有不该出现的英文文本混入瑞典语或中文字段（foreign_language_leak）

只报告你有实际把握的问题，不要为了凑数量而挑无关紧要的小毛病。如果整条内容看起来没问题，has_issues设为false，issues给空数组。suggested_fix只在你确实知道正确答案时给，不确定就留空字符串。

另外单独判断CEFR等级是否需要纠正（cefr_correction字段，这个和issues列表分开）：基于这个词在真实瑞典语学习者（而不是母语者）眼中的常见程度和难度来判断，不是看词本身"专业"与否——很多基础的日常词（职业名词、常见物品、交通工具等）即使听起来"正式"，对学习者来说也可能是初级词。只有当你确实有把握当前等级明显不合理时才把confidence设为high；只是觉得"或许该调一级"这种不确定情况用medium或low，并把needs_correction的判断放宽松一些（宁可标记为需要人看，也不要因为不确定就说不需要纠正）。`;

function buildUserPrompt(word) {
  const lines = [
    `瑞典语词：${word.swedish}`,
    `词性：${word.part_of_speech || "(空)"}`,
    `CEFR等级：${word.cefr_level || "(空)"}`,
    `中文释义：${word.chinese || "(空)"}`,
    `瑞典语解释：${word.swedish_explanation || "(空)"}`,
    `词形变化：${word.forms || "(空)"}`,
    `例句：${word.example_sv || "(空)"}`,
    `例句中文翻译：${word.example_zh || "(空)"}`,
    `搭配：${word.collocations || "(空)"}`,
    `相关词：${word.related_words || "(空)"}`,
  ];
  if (word.countability) lines.push(`可数性：${word.countability}`);
  if (word.transitivity) lines.push(`及物性：${word.transitivity}`);
  if (word.comparison_type) lines.push(`比较级类型：${word.comparison_type}`);
  if (word.adverb_form) lines.push(`副词形式：${word.adverb_form}`);
  if (word.passiv_s) lines.push(`被动-s形式：${word.passiv_s}`);
  return lines.join("\n");
}

async function loadWords() {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  while (true) {
    const { data, error } = await supabase
      .from("learning_objects")
      .select(
        "id, swedish, chinese, part_of_speech, cefr_level, example_sv, example_zh, swedish_explanation, forms, collocations, related_words, countability, transitivity, comparison_type, adverb_form, passiv_s",
      )
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

async function main() {
  const all = await loadWords();
  const words = all.slice(0, LIMIT);
  console.log(`Loaded ${all.length} ai_generated words, processing ${words.length} this run.`);

  const existing = existsSync(OUTPUT_PATH) ? JSON.parse(readFileSync(OUTPUT_PATH, "utf8")) : [];
  const doneIds = new Set(existing.map((e) => e.id));
  const remaining = words.filter((w) => !doneIds.has(w.id));
  console.log(`Already done: ${existing.length}. Remaining: ${remaining.length}.`);

  const results = [...existing];
  const cefrAudit = existsSync(CEFR_AUDIT_PATH) ? JSON.parse(readFileSync(CEFR_AUDIT_PATH, "utf8")) : [];
  let inputTokens = 0;
  let outputTokens = 0;
  let failed = 0;
  let cefrApplied = 0;

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
          response_format: { type: "json_schema", json_schema: { name: "word_review", strict: true, schema: RESPONSE_SCHEMA } },
        });
        const usage = completion.usage;
        inputTokens += usage.prompt_tokens || 0;
        outputTokens += usage.completion_tokens || 0;
        const parsed = JSON.parse(completion.choices[0].message.content);
        results.push({ id: word.id, swedish: word.swedish, part_of_speech: word.part_of_speech, ...parsed });

        // Only auto-write: high-confidence CEFR corrections. Everything
        // else in `parsed.issues` is flag-only, per Rachel's 2026-08-31
        // decision. Logged before AND after applying, so it's fully
        // auditable/reversible regardless.
        const correction = parsed.cefr_correction;
        if (
          correction?.needs_correction &&
          correction.confidence === "high" &&
          VALID_CEFR.has(correction.suggested_level) &&
          correction.suggested_level !== word.cefr_level
        ) {
          const { error: updateError } = await supabase
            .from("learning_objects")
            .update({ cefr_level: correction.suggested_level })
            .eq("id", word.id);
          if (updateError) {
            console.log(`CEFR write FAILED for ${word.swedish}: ${updateError.message}`);
          } else {
            cefrApplied += 1;
            cefrAudit.push({
              id: word.id,
              swedish: word.swedish,
              previous_cefr_level: word.cefr_level,
              new_cefr_level: correction.suggested_level,
              reason: correction.reason,
              applied_at: new Date().toISOString(),
            });
            writeFileSync(CEFR_AUDIT_PATH, JSON.stringify(cefrAudit, null, 2));
          }
        }

        const tag = parsed.has_issues ? `ISSUES(${parsed.overall_confidence})` : "OK";
        const cefrTag = correction?.needs_correction ? ` CEFR:${word.cefr_level}->${correction.suggested_level}(${correction.confidence})` : "";
        console.log(`${tag}${cefrTag}  ${word.swedish} (${results.length}/${words.length})`);
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
  const flagged = results.filter((r) => r.has_issues);
  console.log(`Flagged with issues: ${flagged.length}/${results.length}`);
  console.log(`CEFR corrections auto-applied this run: ${cefrApplied} (full audit log: ${CEFR_AUDIT_PATH.pathname})`);
}

main();
