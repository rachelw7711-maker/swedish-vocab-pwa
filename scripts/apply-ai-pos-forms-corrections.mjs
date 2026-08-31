import "dotenv/config";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// AI-content-review Option A, third pass (2026-08-31): part_of_speech and
// word_forms corrections — deliberately excluded from the first two
// auto-apply passes because changing POS can cascade into the separate
// word_forms table. Rachel confirmed she wants this closed out too, not
// left flagged indefinitely. Same high-confidence-only + audit-log
// discipline as the CEFR and content-field passes.
//
// When a word's POS is corrected, its word_forms rows are replaced
// wholesale (delete + insert) rather than patched — a word's forms are a
// cohesive set tied to its POS, partial edits don't make sense here.
//
// Usage:
//   node scripts/apply-ai-pos-forms-corrections.mjs --limit 25   # pilot
//   node scripts/apply-ai-pos-forms-corrections.mjs              # full run

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
const OUTPUT_PATH = new URL(`../scripts/output/${flagValue("output", "pos-forms-corrections-results.json")}`, import.meta.url);
const AUDIT_PATH = new URL(`../scripts/output/${flagValue("audit", "pos-forms-corrections-audit.json")}`, import.meta.url);

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const client = new OpenAI({ apiKey: OPENAI_API_KEY });

const VALID_POS = ["verb", "noun", "adjective", "adverb", "pronoun", "preposition", "conjunction", "presens_particip", "perfekt_particip", "numeral", "interjection", "other"];
const VALID_FORM_TYPES = new Set([
  "base_form", "base_verb", "comparative", "declension_group", "definite_form", "en_form", "ett_form", "genus",
  "imperative", "infinitive", "neuter_form", "object_form", "participle_form", "perfect_auxiliary", "plural_definite",
  "plural_form", "plural_indefinite", "possessive_en", "possessive_ett", "possessive_plural", "present", "preteritum",
  "singular_definite", "singular_indefinite", "subject_form", "superlative", "superlative_definite", "superlative_indefinite",
  "supinum", "verb_group",
]);

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    pos_correction: {
      type: "object",
      properties: {
        needs_correction: { type: "boolean" },
        corrected_pos: { type: "string", enum: VALID_POS },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        reason: { type: "string" },
      },
      required: ["needs_correction", "corrected_pos", "confidence", "reason"],
      additionalProperties: false,
    },
    forms_correction: {
      type: "object",
      description: "Only fill this in if the word's forms need to be regenerated (either because POS is being corrected, or the existing forms are simply wrong for the current POS). Use only form_type values from the allowed list appropriate to the (corrected) part of speech.",
      properties: {
        needs_correction: { type: "boolean" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        forms: {
          type: "array",
          items: {
            type: "object",
            properties: {
              form_type: { type: "string", enum: [...VALID_FORM_TYPES] },
              form_value: { type: "string" },
            },
            required: ["form_type", "form_value"],
            additionalProperties: false,
          },
        },
      },
      required: ["needs_correction", "confidence", "forms"],
      additionalProperties: false,
    },
  },
  required: ["pos_correction", "forms_correction"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `你是瑞典语母语级别的词典编辑，专门核查并在必要时纠正一个SpråkLab词条的"词性"和"词形变化"这两项。

允许的词性取值：${VALID_POS.join(", ")}
允许的词形变化类型（form_type）：${[...VALID_FORM_TYPES].join(", ")}

规则：
- pos_correction: 只在你确实有把握当前词性标错时，needs_correction设为true、confidence设为high。不确定就false/low，不要瞎猜。
- forms_correction: 只在确实需要重新生成这个词的词形变化时才给（比如词性改了、或者现有词形变化本身有语法错误）。给出的form_type必须从上面允许的列表里选，且要符合（纠正后的）词性——动词类给infinitive/present/preteritum/supinum/imperative/verb_group等；名词类给genus/singular_indefinite/singular_definite/plural_indefinite/plural_definite/declension_group等；形容词类给base_form/comparative/superlative/en_form/ett_form/neuter_form/plural_form等，具体按词性常见搭配选择，不要给不适用的类型。
- 如果现有词性和词形变化本身就是对的，两个needs_correction都设为false，forms数组给空。
- 不确定就保守，宁可needs_correction设为false或confidence设为medium/low，不要在没把握时强行给出修正。`;

function buildUserPrompt(word, priorIssues, existingForms) {
  const issuesText = priorIssues
    .filter((i) => /pos|词性|form|词形|part_of_speech/i.test(`${i.field} ${i.problem}`))
    .map((i) => `- [${i.field}] ${i.problem}`)
    .join("\n") || "(上一轮没有明确指出词性/词形问题，但请你仍自行判断)";
  const formsText = existingForms.length ? existingForms.map((f) => `${f.form_type}: ${f.form_value}`).join("; ") : "(无)";
  return `瑞典语词：${word.swedish}
当前词性：${word.part_of_speech || "(空)"}
中文释义：${word.chinese || "(空)"}
当前词形变化：${formsText}

上一轮审核发现的相关问题：
${issuesText}`;
}

async function loadFlaggedWords() {
  const reviewResults = JSON.parse(readFileSync(REVIEW_INPUT_PATH, "utf8"));
  const flaggedIds = reviewResults
    .filter((r) => r.has_issues && r.issues.some((i) => /pos|词性|form|词形|part_of_speech/i.test(`${i.field} ${i.problem}`)))
    .map((r) => r.id);
  const issuesById = new Map(reviewResults.map((r) => [r.id, r.issues || []]));
  console.log(`${flaggedIds.length} words flagged with a POS/word-forms issue in the first pass.`);

  const rows = [];
  const chunkSize = 200;
  for (let i = 0; i < flaggedIds.length; i += chunkSize) {
    const chunk = flaggedIds.slice(i, i + chunkSize);
    const { data, error } = await supabase.from("learning_objects").select("id, swedish, part_of_speech, chinese").in("id", chunk);
    if (error) throw error;
    rows.push(...data);
  }

  const formsRows = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize).map((r) => r.id);
    const { data, error } = await supabase.from("word_forms").select("learning_object_id, form_type, form_value").in("learning_object_id", chunk);
    if (error) throw error;
    formsRows.push(...data);
  }
  const formsByWord = new Map();
  for (const f of formsRows) {
    if (!formsByWord.has(f.learning_object_id)) formsByWord.set(f.learning_object_id, []);
    formsByWord.get(f.learning_object_id).push(f);
  }

  return rows.map((row) => ({ ...row, priorIssues: issuesById.get(row.id) || [], existingForms: formsByWord.get(row.id) || [] }));
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
  let posApplied = 0;
  let formsApplied = 0;

  async function worker(queue) {
    while (queue.length) {
      const word = queue.shift();
      try {
        const completion = await client.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(word, word.priorIssues, word.existingForms) },
          ],
          response_format: { type: "json_schema", json_schema: { name: "pos_forms_correction", strict: true, schema: RESPONSE_SCHEMA } },
        });
        const usage = completion.usage;
        inputTokens += usage.prompt_tokens || 0;
        outputTokens += usage.completion_tokens || 0;
        const parsed = JSON.parse(completion.choices[0].message.content);
        results.push({ id: word.id, swedish: word.swedish, ...parsed });

        const applied = [];
        const posC = parsed.pos_correction;
        let finalPos = word.part_of_speech;
        if (posC?.needs_correction && posC.confidence === "high" && VALID_POS.includes(posC.corrected_pos) && posC.corrected_pos !== word.part_of_speech) {
          const { error } = await supabase.from("learning_objects").update({ part_of_speech: posC.corrected_pos }).eq("id", word.id);
          if (error) {
            console.log(`  POS write FAILED for ${word.swedish}: ${error.message}`);
          } else {
            posApplied += 1;
            finalPos = posC.corrected_pos;
            applied.push("pos");
            audit.push({ id: word.id, swedish: word.swedish, field: "part_of_speech", before: word.part_of_speech, after: posC.corrected_pos, reason: posC.reason, applied_at: new Date().toISOString() });
          }
        }

        const formsC = parsed.forms_correction;
        if (formsC?.needs_correction && formsC.confidence === "high" && Array.isArray(formsC.forms) && formsC.forms.length > 0) {
          const validForms = formsC.forms.filter((f) => VALID_FORM_TYPES.has(f.form_type) && f.form_value);
          if (validForms.length > 0) {
            const { error: delError } = await supabase.from("word_forms").delete().eq("learning_object_id", word.id);
            if (delError) {
              console.log(`  word_forms delete FAILED for ${word.swedish}: ${delError.message}`);
            } else {
              const rowsToInsert = validForms.map((f, idx) => ({ learning_object_id: word.id, form_type: f.form_type, form_value: f.form_value, sort_order: idx }));
              const { error: insError } = await supabase.from("word_forms").insert(rowsToInsert);
              if (insError) {
                console.log(`  word_forms insert FAILED for ${word.swedish}: ${insError.message}`);
              } else {
                formsApplied += 1;
                applied.push("forms");
                audit.push({
                  id: word.id,
                  swedish: word.swedish,
                  field: "word_forms",
                  before: word.existingForms.map((f) => `${f.form_type}:${f.form_value}`).join("; "),
                  after: validForms.map((f) => `${f.form_type}:${f.form_value}`).join("; "),
                  final_pos: finalPos,
                  applied_at: new Date().toISOString(),
                });
              }
            }
          }
        }
        if (applied.length) writeFileSync(AUDIT_PATH, JSON.stringify(audit, null, 2));

        console.log(`${applied.length ? "APPLIED:" + applied.join(",") : "no-op"}  ${word.swedish} (${results.length}/${words.length})`);
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
  console.log(`POS corrections applied: ${posApplied}. Word-forms corrections applied: ${formsApplied}.`);
}

main();
