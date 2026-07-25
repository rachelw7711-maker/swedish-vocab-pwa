import "dotenv/config";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import OpenAI from "openai";

// Generates full dictionary-entry content for one CEFR level's candidates in
// Reviews/词库扩充候选清单.json (produced by build-vocab-expansion-candidates.mjs),
// via OpenAI, in the exact input shape scripts/upsert-learning-objects.mjs
// expects. Writes incrementally to a per-level output JSON file as each word
// completes, so a crash/interrupt partway through doesn't lose finished
// work — rerunning the same --cefr skips words already present in that
// level's output file. Originally A1-only (scripts/generate-a1-vocab-content.mjs,
// 493 words, $3.90, 2026-07-26); generalized the same day to run the
// remaining A2/B1/B2/C1/C2 levels in batches.
//
// Usage:
//   node scripts/generate-vocab-content.mjs --cefr A2 --limit 5   # pilot
//   node scripts/generate-vocab-content.mjs --cefr A2             # full level
//   node scripts/generate-vocab-content.mjs --cefr B1 --concurrency 8

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
const CEFR = flagValue("cefr", "A1").toUpperCase();
if (!["A1", "A2", "B1", "B2", "C1", "C2"].includes(CEFR)) {
  throw new Error(`Invalid --cefr "${CEFR}". Must be one of A1/A2/B1/B2/C1/C2.`);
}

const CANDIDATES_PATH = new URL("../Reviews/词库扩充候选清单.json", import.meta.url);
const OUTPUT_DIR = new URL("../Reviews/", import.meta.url);
const OUTPUT_PATH = new URL(`../Reviews/${CEFR}生成结果.json`, import.meta.url);

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

// Same POS taxonomy and form_type vocabulary as app.js's
// WORD_FORM_GROUPS_BY_POS / WORD_FORM_LINE_ORDER_BY_POS / WORD_FORM_LABELS,
// so generated word_forms rows render correctly without any frontend changes.
const POS_MAP = {
  numeral: { pos: "numeral", pos_detail: "grundtal" },
  adjective: { pos: "adjective", pos_detail: "" },
  "noun-en": { pos: "noun", pos_detail: "en-ord" },
  "noun-ett": { pos: "noun", pos_detail: "ett-ord" },
  noun: { pos: "noun", pos_detail: "" },
  "proper name": { pos: "other", pos_detail: "egennamn" },
  conj: { pos: "conjunction", pos_detail: "" },
  verb: { pos: "verb", pos_detail: "" },
  prep: { pos: "preposition", pos_detail: "" },
  pronoun: { pos: "pronoun", pos_detail: "" },
  det: { pos: "pronoun", pos_detail: "determinerare" },
  subj: { pos: "conjunction", pos_detail: "subjunktion" },
  adverb: { pos: "adverb", pos_detail: "" },
  particle: { pos: "adverb", pos_detail: "partikel" },
  interj: { pos: "interjection", pos_detail: "" },
  "aux verb": { pos: "verb", pos_detail: "hjälpverb" },
};

const FORM_TYPES_BY_POS = {
  noun: ["genus", "singular_indefinite", "singular_definite", "plural_indefinite", "plural_definite", "declension_group"],
  verb: ["infinitive", "present", "preteritum", "supinum", "imperative", "verb_group"],
  adjective: ["base_form", "neuter_form", "plural_form", "definite_form", "comparative", "superlative_indefinite", "superlative_definite"],
  adverb: ["base_form", "comparative", "superlative"],
  pronoun: ["subject_form", "object_form", "possessive_en", "possessive_ett", "possessive_plural"],
};

const SYSTEM_PROMPT = `你是瑞典语母语级别的词典编辑，为中文母语的瑞典语学习者（SpråkLab App）撰写词典条目。

**最高优先级：语法准确性。** 你上一批生成的内容里，第一变位组动词（不定式以 -a 结尾）的变位曾经系统性出错（比如把 "fattar/fattade/fattat" 错写成 "fattr/fattde/fattt"，把该加的 -a 弄丢了）。这次生成动词变位前，请在心里默念一遍瑞典语动词变位规则再落笔：
- 第一变位组（词干+a，如 fatta, tala, arbeta）：presens = 词干+ar；preteritum = 词干+ade；supinum = 词干+at。
- 第二变位组a（词干以浊辅音结尾，如 ringa, böja）：presens = 词干+er；preteritum = 词干+de；supinum = 词干+t。
- 第二变位组b（词干以清辅音结尾，如 läsa, köpa）：presens = 词干+er；preteritum = 词干+te；supinum = 词干+t。
- 第三变位组（词干以元音结尾，如 bo, tro）：presens = 词干+r；preteritum = 词干+dde；supinum = 词干+tt。
- 第四变位组/不规则动词（如 vara, ta, ge, skriva）：查你确实掌握的真实变位，不要套用规则硬造。
生成完之后自我核对一遍：presens 是否真的是一个存在的瑞典语单词？如果不确定某个动词的变位，宁可保守使用你有把握的常见词。

**其他要求：**
- 中文释义简明准确，不要机械直译；多义词选最常用、最适合 A1 学习者的义项。
- Svensk förklaring 用简单瑞典语（不超过该词 CEFR 等级太多）。
- 每个词至少给 1 个自然、地道、符合 A1 难度的例句，配中文翻译。
- 固定搭配给 2-4 个，都要是真实存在、常用的搭配，不要编造；每条给出中文释义和一个简短例句。
- Related words 给 2-3 个语义相关或主题相关的词，附中文释义（不用严格区分同义/反义，就当泛泛的"相关词"处理）。
- Memory tip（学习提示）要具体有用（构词联想、同源词、易混淆点等），没有可靠依据就留空，不要编造词源。
- 不要生成"常见错误"或错误示范内容。
- 只输出符合 schema 的 JSON，不要输出任何多余文字。`;

function buildUserPrompt(word) {
  const { pos, pos_detail } = POS_MAP[word.wordClass] || { pos: "other", pos_detail: "" };
  const formTypes = FORM_TYPES_BY_POS[pos] || [];
  return `瑞典语单词：${word.lemma}
词性（已确定，请直接使用）：${pos}${pos_detail ? `，pos_detail: ${pos_detail}` : ""}
CEFR 等级：${CEFR}
${formTypes.length ? `这个词性需要填写的 word_forms 字段（form_type 只能从这个列表里选，不要发明新的）：${formTypes.join(", ")}` : "这个词性不需要 word_forms（不发生规则性词形变化，比如介词/连词/感叹词/数词）。"}
例句和释义的难度请控制在 ${CEFR} 等级，不要明显超纲。

请生成这个词的完整词典条目。`;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    meaning_zh: { type: "string", description: "简明中文释义" },
    swedish_explanation: { type: "string", description: "简单瑞典语解释" },
    example_sv: { type: "string" },
    example_zh: { type: "string", description: "例句的中文翻译" },
    explanation_zh: { type: "string", description: "比 meaning_zh 更详细一点的中文说明，可选" },
    learning_tip_zh: { type: "string", description: "中文学习提示，没有可靠依据就给空字符串" },
    forms: {
      type: "array",
      items: {
        type: "object",
        properties: {
          form_type: { type: "string" },
          form_value: { type: "string" },
        },
        required: ["form_type", "form_value"],
        additionalProperties: false,
      },
    },
    collocations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          phrase: { type: "string" },
          meaning_zh: { type: "string" },
          example_sv: { type: "string" },
        },
        required: ["phrase", "meaning_zh", "example_sv"],
        additionalProperties: false,
      },
    },
    related_words: {
      type: "array",
      items: {
        type: "object",
        properties: {
          word: { type: "string" },
          meaning_zh: { type: "string" },
        },
        required: ["word", "meaning_zh"],
        additionalProperties: false,
      },
    },
  },
  required: ["meaning_zh", "swedish_explanation", "example_sv", "example_zh", "explanation_zh", "learning_tip_zh", "forms", "collocations", "related_words"],
  additionalProperties: false,
};

function toEntry(word, generated) {
  const { pos, pos_detail } = POS_MAP[word.wordClass] || { pos: "other", pos_detail: "" };
  const collocationsText = generated.collocations
    .map((c) => `${c.phrase} | ${c.meaning_zh} | ${c.example_sv}`)
    .join("\n");
  const relatedWordsText = generated.related_words.map((r) => `${r.word} | ${r.meaning_zh}`).join("\n");
  const formsText = generated.forms.map((f) => `${f.form_type}: ${f.form_value}`).join("; ");
  return {
    swedish: word.lemma,
    pos,
    pos_detail,
    cefr_level: CEFR,
    meaning_zh: generated.meaning_zh,
    swedish_explanation: generated.swedish_explanation,
    example_sv: generated.example_sv,
    example_zh: generated.example_zh,
    explanation_zh: generated.explanation_zh,
    learning_tip_zh: generated.learning_tip_zh,
    forms_text: formsText,
    collocations_text: collocationsText,
    related_words_text: relatedWordsText,
    forms: generated.forms,
    tags: [`Kelly ${CEFR}`, word.wordClass],
    source: `Kelly / gpt-5.4 generated ${new Date().toISOString().slice(0, 10)}`,
    status: "ai_generated",
    notebook: "词库扩充候选",
  };
}

async function generateOne(word) {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(word) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "dictionary_entry", schema: RESPONSE_SCHEMA, strict: true },
    },
  });
  const generated = JSON.parse(response.choices[0].message.content);
  return { entry: toEntry(word, generated), usage: response.usage };
}

// --- main ---
const candidates = JSON.parse(readFileSync(CANDIDATES_PATH, "utf8"));
const levelWords = candidates.newCandidates.filter((w) => w.cefr === CEFR).slice(0, LIMIT);
console.log(`Loaded ${levelWords.length} ${CEFR} candidates (limit=${LIMIT === Infinity ? "none" : LIMIT}).`);

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
let results = existsSync(OUTPUT_PATH) ? JSON.parse(readFileSync(OUTPUT_PATH, "utf8")) : [];
const doneSwedish = new Set(results.map((r) => r.swedish));
const remaining = levelWords.filter((w) => !doneSwedish.has(w.lemma));
console.log(`Already done (from a previous run): ${results.length}. Remaining: ${remaining.length}.`);

let totalInputTokens = 0;
let totalOutputTokens = 0;
let failedCount = 0;

function saveProgress() {
  writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), "utf8");
}

async function worker(queue) {
  while (queue.length) {
    const word = queue.shift();
    try {
      const { entry, usage } = await generateOne(word);
      results.push(entry);
      totalInputTokens += usage.prompt_tokens || 0;
      totalOutputTokens += usage.completion_tokens || 0;
      console.log(`OK  ${word.lemma} (${results.length}/${levelWords.length})`);
      if (results.length % 10 === 0) saveProgress();
    } catch (error) {
      failedCount += 1;
      console.error(`FAIL ${word.lemma}: ${error.message}`);
    }
  }
}

const queue = [...remaining];
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker(queue)));
saveProgress();

// Confirmed 2026-07-26 against developers.openai.com/api/docs/pricing (standard
// tier, short-context): gpt-5.4 is $2.50/1M input, $15.00/1M output.
const costPer1M = { input: 2.5, output: 15.0 };
const estimatedCost = (totalInputTokens / 1e6) * costPer1M.input + (totalOutputTokens / 1e6) * costPer1M.output;

console.log(`\nDone. ${results.length} total entries written to ${decodeURIComponent(OUTPUT_PATH.pathname)}`);
console.log(`This run: input tokens ${totalInputTokens}, output tokens ${totalOutputTokens}, failed ${failedCount}`);
console.log(`Estimated cost for this run: ~$${estimatedCost.toFixed(3)} (gpt-5.4 standard-tier pricing, confirmed live 2026-07-26)`);
