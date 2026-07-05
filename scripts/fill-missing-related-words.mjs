import "dotenv/config";
import { writeFileSync } from "node:fs";
import { educationWordPacks } from "../vocab-data.js";
import { documentWordPacks } from "../document-vocab-data.js";

const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const BATCH_SIZE = Number(process.env.RELATED_BATCH_SIZE || 20);
const fallbackRelatedWords = new Map([
  ["ett betyg@@noun", "bedömning | 评价、评定（名词）\nprov | 考试、测验（名词）\ngodkänd | 及格的、被批准的（形容词）\nunderkänd | 不及格的（形容词）"],
  ["en arbetsgivare@@noun", "arbetsplats | 工作场所（名词）\narbetstagare | 雇员、受雇者（名词）\nchef | 老板、主管（名词）\nanställa | 雇用（动词）"],
  ["en anställning@@noun", "anställa | 雇用（动词）\narbetsgivare | 雇主（名词）\njobb | 工作（名词）\nheltid | 全职（名词/副词）"],
  ["ett schema@@noun", "tidtabell | 时刻表（名词）\nplanering | 计划、安排（名词）\narbetstid | 工作时间（名词）\nlektion | 课、课程（名词）"],
  ["ett intyg@@noun", "bevis | 证明、证据（名词）\nläkarintyg | 医生证明（名词）\nblankett | 表格（名词）\nintyga | 证明、证实（动词）"],
  ["en avgift@@noun", "kostnad | 费用、成本（名词）\nbetalning | 付款（名词）\nräkning | 账单（名词）\nbetala | 支付（动词）"],
  ["en inkomst@@noun", "lön | 工资（名词）\npengar | 钱（名词）\nskatt | 税（名词）\nutgift | 支出、开销（名词）"],
  ["en skuld@@noun", "låna | 借入、贷款（动词）\nlån | 贷款、借款（名词）\nbetala tillbaka | 还钱、偿还（动词短语）\nränta | 利息（名词）"],
  ["snart@@adverb", "strax | 马上、很快（副词）\nsenare | 稍后、以后（副词）\nnu | 现在（副词）\nom en stund | 过一会儿（短语）"],
  ["nästan@@adverb", "ungefär | 大约、差不多（副词）\nknappt | 几乎不、勉强（副词）\nhelt | 完全（副词）\nnära | 接近、靠近（副词/形容词）"],
  ["trots att@@phrase", "även om | 即使、虽然（连词短语）\nfastän | 尽管、虽然（连词）\nmen | 但是（连词）\ntrots | 尽管（介词）"],
  ["på grund av@@phrase", "därför att | 因为（连词短语）\neftersom | 因为、由于（连词）\norsak | 原因（名词）\nbero på | 取决于、由于（动词短语）"],
  ["ta hand om@@verb", "sköta | 照顾、处理（动词）\npassa | 照看、适合（动词）\nhjälpa | 帮助（动词）\nansvara för | 负责（动词短语）"],
  ["komma överens@@verb", "enas | 达成一致（动词）\nhålla med | 同意（动词短语）\nsamförstånd | 共识、相互理解（名词）\nbråka | 吵架、争执（动词）"],
]);

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    entries: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          swedish: { type: "string" },
          pos: { type: "string" },
          related_words: { type: "string" },
        },
        required: ["swedish", "pos", "related_words"],
      },
    },
  },
  required: ["entries"],
};

function clean(value) {
  return String(value || "").trim();
}

function relatedWordsAreComplete(value) {
  const lines = clean(value).split(/\n+/).map(clean).filter(Boolean);
  if (lines.length < 3) return false;
  return lines.every((line) => {
    const parts = line.split(/\s+\|\s+|\s+—\s+|\s+-\s+/).map(clean);
    return parts.length >= 2 && /[\u4e00-\u9fff]/.test(parts.slice(1).join(" "));
  });
}

function wordKey(word) {
  return `${clean(word.swedish).toLowerCase()}@@${clean(word.pos).toLowerCase()}`;
}

function extractOutputText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .join("")
    .trim();
}

async function generateBatch(batch) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      reasoning: { effort: "low" },
      text: {
        format: {
          type: "json_schema",
          name: "missing_related_words",
          strict: true,
          schema: responseSchema,
        },
      },
      input: [
        {
          role: "system",
          content:
            "You are a Swedish teacher for Chinese-speaking SFI/SVA learners. For each Swedish word card, fill only related_words. Return 3-5 useful related Swedish words or phrases, one per line, exactly in this format: Swedish word | Simplified Chinese meaning and short note with part of speech when useful. Prefer word family members, common derivations, synonyms, antonyms, and high-frequency contrast words. Do not include examples.",
        },
        {
          role: "user",
          content: JSON.stringify(batch, null, 2),
        },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI API request failed with ${response.status}`);
  }
  return JSON.parse(extractOutputText(data)).entries;
}

const allWords = [...educationWordPacks, ...documentWordPacks].flatMap((pack) => pack.words);
const completeByKey = new Map();
for (const word of allWords) {
  if (!relatedWordsAreComplete(word.related_words)) continue;
  const key = wordKey(word);
  if (!completeByKey.has(key)) completeByKey.set(key, word.related_words);
}

let copied = 0;
for (const pack of educationWordPacks) {
  for (const word of pack.words) {
    if (relatedWordsAreComplete(word.related_words)) continue;
    const existing = completeByKey.get(wordKey(word));
    if (!existing) continue;
    word.related_words = existing;
    copied += 1;
  }
}

let fallbackFilled = 0;
for (const pack of educationWordPacks) {
  for (const word of pack.words) {
    if (relatedWordsAreComplete(word.related_words)) continue;
    const fallback = fallbackRelatedWords.get(wordKey(word));
    if (!fallback) continue;
    word.related_words = fallback;
    fallbackFilled += 1;
  }
}

const targets = [];
for (const pack of educationWordPacks) {
  for (const word of pack.words) {
    if (relatedWordsAreComplete(word.related_words)) continue;
    targets.push({ pack, word });
  }
}

if (targets.length && !process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is missing. Existing duplicate entries were copied, but remaining related_words need API completion.");
}

let generated = 0;
for (let index = 0; index < targets.length; index += BATCH_SIZE) {
  const slice = targets.slice(index, index + BATCH_SIZE);
  const payload = slice.map(({ word }) => ({
    swedish: word.swedish,
    pos: word.pos,
    chinese: word.chinese,
    english: word.english,
    forms: word.forms,
    example: word.example,
    collocations: word.collocations,
  }));
  const entries = await generateBatch(payload);
  entries.forEach((entry, entryIndex) => {
    const source = slice[entryIndex]?.word;
    if (!source || !relatedWordsAreComplete(entry.related_words)) return;
    source.related_words = entry.related_words;
    generated += 1;
  });
  writeFileSync(new URL("../vocab-data.js", import.meta.url), `export const educationWordPacks = ${JSON.stringify(educationWordPacks, null, 2)};\n`);
  console.log(`Related words: copied ${copied}, generated ${generated}/${targets.length}`);
}

writeFileSync(new URL("../vocab-data.js", import.meta.url), `export const educationWordPacks = ${JSON.stringify(educationWordPacks, null, 2)};\n`);
console.log(`Done. Copied ${copied}, fallback ${fallbackFilled}, generated ${generated}, remaining ${targets.length - generated}.`);
