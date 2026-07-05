import "dotenv/config";
import { writeFileSync } from "node:fs";
import { educationWordPacks } from "../vocab-data.js";
import { documentWordPacks } from "../document-vocab-data.js";

const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const BATCH_SIZE = Number(process.env.EXPLANATION_BATCH_SIZE || 40);
const CONCURRENCY = Number(process.env.EXPLANATION_CONCURRENCY || 3);

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
          explanation: { type: "string" },
        },
        required: ["swedish", "explanation"],
      },
    },
  },
  required: ["entries"],
};

function clean(value) {
  return String(value || "").trim();
}

function isLikelyEnglishExplanation(value) {
  const text = clean(value);
  if (!text) return false;
  const hasCjk = /[\u3400-\u9fff]/.test(text);
  const hasSwedish =
    /[åäöÅÄÖ]|\b(att|som|och|eller|med|till|från|för|på|inte|någon|något|några|man|en|ett|den|det|är|kan|har|vara|bli|används|betyder|person|sak|plats)\b/i.test(
      text,
    );
  const hasEnglish =
    /\b(the|to|of|and|or|with|for|in|on|a|an|be|is|are|that|this|from|social|studies|civics|work|thing|place|time|use|used|common|someone|something)\b/i.test(
      text,
    );
  return !hasCjk && !hasSwedish && (hasEnglish || /^[A-Za-z ,;:()/-]+$/.test(text));
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

async function convertBatch(batch) {
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
          name: "swedish_explanation_batch",
          strict: true,
          schema: resultSchema,
        },
      },
      input: [
        {
          role: "system",
          content:
            "You are a Swedish teacher. Convert each English dictionary explanation into a concise Swedish explanation suitable for SFI/SVA learners. Keep the Swedish headword unchanged. Return only Swedish in the explanation field, no English and no Chinese. Use plain everyday Swedish.",
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
    if (isLikelyEnglishExplanation(word.english)) targets.push({ word });
  }
}
for (const pack of documentWordPacks) {
  for (const word of pack.words) {
    if (isLikelyEnglishExplanation(word.english)) targets.push({ word });
  }
}

let completedCount = 0;
for (let index = 0; index < targets.length; index += BATCH_SIZE * CONCURRENCY) {
  const slices = [];
  for (let offset = 0; offset < CONCURRENCY; offset += 1) {
    const start = index + offset * BATCH_SIZE;
    const slice = targets.slice(start, start + BATCH_SIZE);
    if (slice.length) slices.push(slice);
  }

  const payloads = slices.map((slice) =>
    slice.map(({ word }) => ({
      swedish: word.swedish || "",
      pos: word.pos || "",
      chinese: word.chinese || "",
      englishExplanation: word.english || "",
    })),
  );

  const results = await Promise.allSettled(payloads.map((payload) => convertBatch(payload)));
  const failures = [];
  results.forEach((result, resultIndex) => {
    if (result.status === "rejected") {
      failures.push(result.reason?.message || String(result.reason));
      return;
    }
    result.value.forEach((entry, entryIndex) => {
      const source = slices[resultIndex]?.[entryIndex]?.word;
      if (!source || !clean(entry.explanation)) return;
      source.english = entry.explanation;
      completedCount += 1;
    });
  });

  writeVocabData();
  writeDocumentData();
  console.log(`Completed ${completedCount}/${targets.length}`);
  if (failures.length) {
    throw new Error(`Stopped after saving successful batches. Failed batches: ${failures.join(" | ")}`);
  }
}

console.log(`Done. Converted ${completedCount} English explanations to Swedish.`);
