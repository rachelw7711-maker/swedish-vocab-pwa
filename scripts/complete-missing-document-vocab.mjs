import "dotenv/config";
import { writeFileSync } from "node:fs";
import { documentWordPacks } from "../document-vocab-data.js";

const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const PLACEHOLDER_CHINESE = "待补中文释义。";
const BATCH_SIZE = Number(process.env.COMPLETE_BATCH_SIZE || 30);
const CONCURRENCY = Number(process.env.COMPLETE_CONCURRENCY || 4);
const LIMIT = Number(process.env.COMPLETE_LIMIT || process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || 0);

const entrySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    swedish: { type: "string" },
    pos: {
      type: "string",
      enum: ["verb", "noun", "adjective", "adverb", "pronoun", "preposition", "phrase", "abbreviation", "other"],
    },
    pos_detail: { type: "string" },
    chinese: { type: "string" },
    english: { type: "string" },
    forms: { type: "string" },
    example: { type: "string" },
    collocations: { type: "string" },
    related_words: { type: "string" },
    tags: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["swedish", "pos", "pos_detail", "chinese", "english", "forms", "example", "collocations", "related_words", "tags"],
};

const batchSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    entries: {
      type: "array",
      items: entrySchema,
    },
  },
  required: ["entries"],
};

function clean(value) {
  return String(value || "").trim();
}

function normalizeTags(value) {
  const rawTags = Array.isArray(value) ? value : clean(value).split(",");
  return rawTags.map((item) => clean(item)).filter(Boolean);
}

function needsCompletion(word) {
  return (
    clean(word.chinese) === PLACEHOLDER_CHINESE ||
    !clean(word.example) ||
    !clean(word.collocations) ||
    !clean(word.related_words)
  );
}

function pickExisting(base, completed) {
  return {
    ...base,
    ...completed,
    swedish: base.swedish,
    pos: completed.pos || base.pos || "other",
    pos_detail: clean(completed.pos_detail) || clean(base.pos_detail),
    chinese: clean(completed.chinese) && clean(completed.chinese) !== PLACEHOLDER_CHINESE ? completed.chinese : base.chinese,
    english: clean(completed.english) || clean(base.english),
    forms: clean(completed.forms) || clean(base.forms) || clean(base.swedish),
    example: clean(completed.example) || clean(base.example),
    collocations: clean(completed.collocations) || clean(base.collocations),
    related_words: clean(completed.related_words) || clean(base.related_words),
    tags: normalizeTags(base.tags).length ? normalizeTags(base.tags) : normalizeTags(completed.tags),
  };
}

function extractOutputText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .join("")
    .trim();
}

async function completeBatch(batch) {
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
          name: "swedish_word_card_batch",
          strict: true,
          schema: batchSchema,
        },
      },
      input: [
        {
          role: "system",
          content:
            "You are a Swedish teacher for Chinese-speaking SFI/SVA learners. Complete every Swedish word card. Keep the Swedish headword unchanged. The chinese field must be Simplified Chinese with detailed but concise meaning, usage context, and important nuance. The legacy field named english must contain a concise Swedish explanation, not English. The tags field must be an array of short notebook/category labels. The example field must contain two natural Swedish sentences only. The collocations field must contain 4 common phrases, one per line, each formatted as: phrase | Simplified Chinese meaning | Swedish example sentence. The related_words field must contain 4 useful related Swedish words, one per line, each formatted as: Swedish word | Simplified Chinese meaning and short note. Preserve existing reliable forms when present, but correct clearly broken verb forms.",
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

function toBatch(slice) {
  return slice.map(({ word }) => ({
    swedish: word.swedish || "",
    pos: word.pos || "other",
    pos_detail: word.pos_detail || "",
    chinese: word.chinese || "",
    english: word.english || "",
    forms: word.forms || "",
    example: word.example || "",
    collocations: word.collocations || "",
    related_words: word.related_words || "",
    tags: normalizeTags(word.tags || word.tag),
  }));
}

function writeOutput() {
  const output = `export const documentWordPacks = ${JSON.stringify(documentWordPacks, null, 2)};\n`;
  writeFileSync(new URL("../document-vocab-data.js", import.meta.url), output);
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is missing. Put it in .env before running this script.");
}

const targets = [];
for (const pack of documentWordPacks) {
  for (const word of pack.words) {
    if (!needsCompletion(word)) continue;
    targets.push({ pack, word });
  }
}

const selected = LIMIT > 0 ? targets.slice(0, LIMIT) : targets;
let completedCount = 0;

for (let index = 0; index < selected.length; index += BATCH_SIZE * CONCURRENCY) {
  const slices = [];
  for (let offset = 0; offset < CONCURRENCY; offset += 1) {
    const start = index + offset * BATCH_SIZE;
    const slice = selected.slice(start, start + BATCH_SIZE);
    if (slice.length) slices.push(slice);
  }

  const results = await Promise.allSettled(slices.map((slice) => completeBatch(toBatch(slice))));
  const failures = [];
  results.forEach((result, resultIndex) => {
    if (result.status === "rejected") {
      failures.push(result.reason?.message || String(result.reason));
      return;
    }
    result.value.forEach((entry, entryIndex) => {
      const source = slices[resultIndex]?.[entryIndex]?.word;
      if (!source) return;
      Object.assign(source, pickExisting(source, entry));
      completedCount += 1;
    });
  });
  writeOutput();
  console.log(`Completed ${completedCount}/${selected.length}`);
  if (failures.length) {
    throw new Error(`Stopped after saving successful batches. Failed batches: ${failures.join(" | ")}`);
  }
}

console.log(`Done. Completed ${completedCount} entries. ${targets.length - completedCount} entries still need completion.`);
