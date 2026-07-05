import "dotenv/config";
import { writeFileSync } from "node:fs";
import { educationWordPacks } from "../vocab-data.js";
import { documentWordPacks } from "../document-vocab-data.js";

const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const BATCH_SIZE = Number(process.env.COLLOCATION_BATCH_SIZE || 35);
const CONCURRENCY = Number(process.env.COLLOCATION_CONCURRENCY || 4);
const LIMIT = Number(process.env.COLLOCATION_LIMIT || process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || 0);

const resultSchema = {
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
          collocations: { type: "string" },
        },
        required: ["swedish", "collocations"],
      },
    },
  },
  required: ["entries"],
};

function clean(value) {
  return String(value || "").trim();
}

function splitCollocations(value) {
  return clean(value)
    .split(/[\n;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasChineseMeaningFormat(value) {
  const items = splitCollocations(value);
  return (
    items.length > 0 &&
    items.every((item) => {
      const parts = item.split(/\s+\|\s+/);
      return parts.length >= 3 && /[\u3400-\u9fff]/.test(parts[1] || "");
    })
  );
}

function needsCollocationMeaning(word) {
  return clean(word.collocations) && !hasChineseMeaningFormat(word.collocations);
}

function extractOutputText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .join("")
    .trim();
}

function writeVocabData() {
  const output = `export const educationWordPacks = ${JSON.stringify(educationWordPacks, null, 2)};\n`;
  writeFileSync(new URL("../vocab-data.js", import.meta.url), output);
}

function writeDocumentData() {
  const output = `export const documentWordPacks = ${JSON.stringify(documentWordPacks, null, 2)};\n`;
  writeFileSync(new URL("../document-vocab-data.js", import.meta.url), output);
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
          name: "collocation_meaning_batch",
          strict: true,
          schema: resultSchema,
        },
      },
      input: [
        {
          role: "system",
          content:
            "You are a Swedish teacher for Chinese-speaking SFI/SVA learners. For each entry, rewrite the collocations field only. Preserve the Swedish headword and the intended phrases. Return 3-6 useful collocations, one per line. Every line must use exactly this format: Swedish phrase | Simplified Chinese meaning | Natural Swedish example sentence. The second field MUST be Simplified Chinese and MUST contain Chinese Han characters. Do not put Swedish, English, pinyin, or romanized text in the second field. The Chinese meaning should explain the phrase itself, not translate the whole sentence. Keep Swedish examples short, natural, and relevant to the headword. Do not add Chinese translations to the Swedish example sentence.",
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

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is missing. Put it in .env before running this script.");
}

const targets = [];
for (const pack of educationWordPacks) {
  for (const word of pack.words) {
    if (needsCollocationMeaning(word)) targets.push({ file: "vocab", word });
  }
}
for (const pack of documentWordPacks) {
  for (const word of pack.words) {
    if (needsCollocationMeaning(word)) targets.push({ file: "document", word });
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

  const payloads = slices.map((slice) =>
    slice.map(({ word }) => ({
      swedish: word.swedish || "",
      pos: word.pos || "",
      chinese: word.chinese || "",
      english: word.english || "",
      example: word.example || "",
      existingCollocations: word.collocations || "",
      tags: word.tags || word.tag || [],
    })),
  );

  const results = await Promise.allSettled(payloads.map((payload) => completeBatch(payload)));
  const failures = [];
  results.forEach((result, resultIndex) => {
    if (result.status === "rejected") {
      failures.push(result.reason?.message || String(result.reason));
      return;
    }
    result.value.forEach((entry, entryIndex) => {
      const source = slices[resultIndex]?.[entryIndex]?.word;
      if (!source || !clean(entry.collocations)) return;
      source.collocations = entry.collocations;
      completedCount += 1;
    });
  });

  writeVocabData();
  writeDocumentData();
  console.log(`Completed ${completedCount}/${selected.length}`);
  if (failures.length) {
    throw new Error(`Stopped after saving successful batches. Failed batches: ${failures.join(" | ")}`);
  }
}

console.log(`Done. Completed ${completedCount} entries. ${targets.length - completedCount} entries still need collocation meanings.`);
