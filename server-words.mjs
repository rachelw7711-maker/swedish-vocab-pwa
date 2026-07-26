// Shared by server.mjs (local `npm run dev`) and api/generate-word.js,
// api/promote-collocation.js, api/words.js (real Vercel functions — see
// api/reading/analyze.js for why production needs actual files under api/
// rather than routes inside server.mjs's own router).
import { randomUUID } from "node:crypto";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const WORD_PAGE_SIZE = 1000;

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function formatTags(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return String(value || "").trim();
}

function extractOutputText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .join("")
    .trim();
}

const wordSchema = {
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
    tags: { type: "array", items: { type: "string" } },
  },
  required: ["swedish", "pos", "pos_detail", "chinese", "english", "forms", "example", "collocations", "related_words", "tags"],
};

export async function generateWord(word, source = null) {
  if (!OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY saknas på servern.");
    error.status = 500;
    throw error;
  }

  const sourceContext =
    source && typeof source === "object"
      ? [
          `Swedish: ${source.swedish || word}`,
          `Part of speech: ${source.pos || ""} ${firstDefined(source.pos_detail, source.posDetail, "")}`.trim(),
          `Existing Swedish explanation: ${source.english || ""}`,
          `Existing Chinese meaning: ${source.chinese || ""}`,
          `Existing forms: ${source.forms || ""}`,
          `Existing example: ${source.example || ""}`,
          `Existing collocations: ${source.collocations || ""}`,
          `Existing related words: ${firstDefined(source.related_words, source.relatedWords, "")}`,
          `Notebook/tags: ${source.notebook || ""} ${formatTags(firstDefined(source.tags, source.tag, ""))}`.trim(),
        ]
          .filter((line) => !line.endsWith(": "))
          .join("\n")
      : `Swedish: ${word}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      reasoning: { effort: "low" },
      tools: [{ type: "web_search" }],
      tool_choice: "auto",
      text: { format: { type: "json_schema", name: "swedish_word_card", strict: true, schema: wordSchema } },
      input: [
        {
          role: "system",
          content:
            "You are a Swedish teacher for Chinese-speaking learners. Return exactly one Swedish dictionary entry. The UI is Swedish. The chinese field must be Simplified Chinese and explain the core meaning, common usage context, and one or two important nuance notes. The legacy field named english must contain a concise Swedish explanation, not English. The tags field must be an array of short notebook/category labels. The example field must include two natural Swedish sentences only, without Chinese translations. The forms field must use one item per line. For verbs include imperativ, infinitiv, presens, preteritum, supinum. For nouns include en/ett, singular indefinite, singular definite, plural indefinite, plural definite. For adjectives include en, ett, plural. The collocations field must use 4-6 common phrases, one per line, in the format: phrase | Simplified Chinese meaning | Swedish example sentence. Prefer everyday fixed expressions, verb particles, preposition patterns, and high-frequency collocations suitable for SFI/SVA learners. The related_words field must contain 3-6 useful related Swedish words, one per line, in the format: Swedish word | Simplified Chinese meaning and short note, for example: förbättra | 改善、提高（动词）. Include word family members, common derivations, synonyms, or high-frequency contrast words. If uncertain, say so briefly in chinese while still returning the best likely entry.",
        },
        {
          role: "user",
          content: `Complete and improve this Swedish word card. Preserve the intended meaning from the existing Swedish explanation and forms when present.\n\n${sourceContext}`,
        },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error?.message || "OpenAI API request failed.");
    error.status = response.status;
    throw error;
  }
  return JSON.parse(extractOutputText(data));
}

export async function promoteCollocationToPhrase({ supabaseAdmin, sourceWordId, phrase, meaning, exampleSv, cefrLevel }) {
  if (!supabaseAdmin) {
    const error = new Error("Supabase service role is not configured on the server.");
    error.status = 500;
    throw error;
  }
  if (!sourceWordId || !phrase) {
    const error = new Error("sourceWordId and phrase are required.");
    error.status = 400;
    throw error;
  }
  const id = randomUUID();
  const now = new Date().toISOString();
  const row = {
    id,
    swedish: String(phrase).trim(),
    part_of_speech: "other",
    pos_detail: "",
    object_type: "phrase",
    category: "common_collocation",
    cefr_level: cefrLevel ? String(cefrLevel).trim() : null,
    ipa: "",
    chinese: String(meaning || "").trim(),
    swedish_explanation: "",
    example_sv: String(exampleSv || "").trim(),
    forms: "",
    collocations: "",
    related_words: "",
    tags: [],
    notebook: "Fraser",
    source: "promoted from word card",
    status: "human_reviewed",
    updated_at: now,
  };
  const { error: insertError } = await supabaseAdmin.from("learning_objects").insert(row);
  if (insertError) throw insertError;
  const { error: translationError } = await supabaseAdmin.from("learning_object_translations").insert({
    learning_object_id: id,
    native_language: "zh",
    meaning: row.chinese,
    updated_at: now,
  });
  if (translationError) throw translationError;
  return row;
}

export async function readPublicWords({ supabaseAdmin }) {
  if (!supabaseAdmin) {
    const error = new Error("Supabase service role is not configured on the server.");
    error.status = 500;
    throw error;
  }
  const words = [];
  for (let from = 0; ; from += WORD_PAGE_SIZE) {
    const to = from + WORD_PAGE_SIZE - 1;
    const { data, error } = await supabaseAdmin
      .from("learning_objects")
      .select("*")
      .eq("object_type", "word")
      .order("swedish", { ascending: true })
      .range(from, to);
    if (error) throw error;
    words.push(...(data || []));
    if (!data || data.length < WORD_PAGE_SIZE) break;
  }
  return words;
}
