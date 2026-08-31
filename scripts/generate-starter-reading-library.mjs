import "dotenv/config";
import { writeFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { cleanText, countWords, analyzeReadingResourceFast, analyzeReadingResourceDeep } from "../server-reading.mjs";

// Starter reading library — 12 original, AI-written Swedish texts spanning
// A1-B2, generated once and shared by every user forever (Reviews/起步阅读
// 素材库-评审与实施方案-2026-08-31.md, decisions 1-3 approved 2026-08-31:
// AI-original content — not real UHR/"Sverige i fokus" text, which stays
// unused here for copyright reasons — using its samhällskunskap themes only
// as topic inspiration for the B1/B2 informational pieces).
//
// Each item: generate original text (this script, gpt-5.4) -> run through
// the EXACT SAME analysis pipeline real user submissions use
// (analyzeReadingResourceFast/Deep from server-reading.mjs, gpt-5.4-mini)
// -> mark text_resources.is_starter_library + text_analysis.visibility
// public. Owned by Rachel's account (only user_id that exists) — no schema
// change needed for ownership, matches the FK constraint as-is.
//
// Usage:
//   node scripts/generate-starter-reading-library.mjs --pilot   # first 2 items only, for quality check
//   node scripts/generate-starter-reading-library.mjs           # full 12

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY in .env.");
const GEN_MODEL = "gpt-5.4";
const ADMIN_USER_ID = "62ca06f8-f4fc-4c52-aa3a-97dea4b63249"; // rachelw7711@gmail.com

const args = process.argv.slice(2);
const PILOT = args.includes("--pilot");
const OUTPUT_DIR = new URL("../scripts/output/", import.meta.url);
mkdirSync(OUTPUT_DIR, { recursive: true });
const OUTPUT_PATH = new URL("starter-reading-library-results.json", OUTPUT_DIR);

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const client = new OpenAI({ apiKey: OPENAI_API_KEY });

// Genre mix per level (三类混合, decision 3): dialogue/narrative (贴近日常),
// informational (说明文), practical (实用文体). B1/B2 informational items
// draw on samhällskunskap/citizenship-exam themes as topic inspiration only
// (决策, 2026-08-31) — general factual content about Swedish society, never
// text derived from the actual UHR material.
const MANIFEST = [
  { level: "A1", genre: "dialogue", topic: "Two friends meet at a café and order coffee and pastries, talking about their day in very simple present tense.", words: "110-150" },
  { level: "A1", genre: "practical", topic: "A short text message exchange between roommates about who buys milk, bread, and other everyday groceries this week.", words: "90-130" },
  { level: "A1", genre: "informational", topic: "A very simple description of the four seasons in Sweden and what the weather is like in each one.", words: "110-150" },

  { level: "A2", genre: "narrative", topic: "A short first-person story about someone's typical weekday: waking up, commuting to work or school, and a small pleasant surprise in the evening.", words: "170-230" },
  { level: "A2", genre: "informational", topic: "A friendly explanation of common Swedish holidays and traditions across the year (midsommar, jul, påsk) and what people usually do to celebrate.", words: "180-240" },
  { level: "A2", genre: "practical", topic: "A simple email booking a doctor's appointment (vårdcentral) at a health center, explaining the symptoms and asking for an available time.", words: "150-200" },

  { level: "B1", genre: "narrative", topic: "A short story about someone who just moved to a new city in Sweden for work, feeling a mix of loneliness and hope while settling in, with a small moment of connection with a neighbor.", words: "280-360" },
  { level: "B1", genre: "informational", topic: "A general, factual explanation of how Swedish democracy works day to day: elections every four years, the main levels of government (kommun, region, riksdag), and why voting matters. Keep it neutral and educational, not opinionated.", words: "300-380" },
  { level: "B1", genre: "practical", topic: "Practical advice-style text about writing a Swedish CV (CV) and personal letter (personligt brev) when applying for a job, explaining what to include and common mistakes to avoid.", words: "280-360" },

  { level: "B2", genre: "narrative", topic: "A more literary short story about a person reflecting on balancing work and family life in Sweden, told with some emotional nuance and a few subordinate-clause-heavy sentences, similar in tone to a quiet slice-of-life piece.", words: "380-480" },
  { level: "B2", genre: "informational", topic: "A factual overview of the Swedish welfare model: how healthcare, parental leave (föräldraledighet), and unemployment support generally work, funded through taxes. Keep it neutral, educational, and clearly structured.", words: "380-480" },
  { level: "B2", genre: "opinion", topic: "A mild, balanced opinion piece weighing the pros and cons of remote work versus working in an office, written the way a thoughtful newspaper column might, presenting both sides fairly.", words: "350-450" },
];

const TEXT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Short Swedish title for the text, 2-6 words." },
    text: { type: "string", description: "The full original Swedish text body, plain paragraphs, no markdown." },
  },
  required: ["title", "text"],
  additionalProperties: false,
};

function systemPromptFor(item) {
  return `You are writing ORIGINAL Swedish reading material for language learners, for a CEFR ${item.level} reader. This must be entirely original writing — never quote, paraphrase closely, or reuse structure from any real published article, book, exam, or website. No real named public figures, no real current events, no real company names.

Genre: ${item.genre}. Target length: ${item.words} words.

CEFR ${item.level} calibration:
- A1: only the most common ~500-750 words, present tense dominant, very short simple sentences, no subordinate clauses.
- A2: common everyday vocabulary, simple past and present, short sentences with basic connectors (och, men, för att, sedan).
- B1: broader vocabulary, past/present/future, some subordinate clauses, can express opinions and simple reasoning.
- B2: more nuanced vocabulary, complex sentence structure with subordinate clauses, abstract topics handled clearly.

Write natural, idiomatic Swedish appropriate for an adult learner living in or moving to Sweden. Return strict JSON matching the schema: a short title and the full text body.`;
}

async function generateOriginalText(item) {
  const completion = await client.chat.completions.create({
    model: GEN_MODEL,
    messages: [
      { role: "system", content: systemPromptFor(item) },
      { role: "user", content: `Write the text now. Topic: ${item.topic}` },
    ],
    response_format: { type: "json_schema", json_schema: { name: "starter_reading_text", strict: true, schema: TEXT_SCHEMA } },
  });
  const usage = completion.usage;
  const parsed = JSON.parse(completion.choices[0].message.content);
  return { title: parsed.title, text: parsed.text, usage };
}

async function main() {
  const items = PILOT ? MANIFEST.slice(0, 2) : MANIFEST;
  console.log(`Generating ${items.length} starter reading text(s)${PILOT ? " (pilot)" : ""}...`);

  const existing = existsSync(OUTPUT_PATH) ? JSON.parse(readFileSync(OUTPUT_PATH, "utf8")) : [];
  const doneTopics = new Set(existing.map((e) => e.topic));
  const results = [...existing];

  let genInputTokens = 0;
  let genOutputTokens = 0;

  for (const item of items) {
    if (doneTopics.has(item.topic)) {
      console.log(`Skipping already-done: [${item.level}/${item.genre}] ${item.topic.slice(0, 50)}...`);
      continue;
    }
    console.log(`Generating [${item.level}/${item.genre}]: ${item.topic.slice(0, 60)}...`);
    const generated = await generateOriginalText(item);
    genInputTokens += generated.usage?.prompt_tokens || 0;
    genOutputTokens += generated.usage?.completion_tokens || 0;

    const cleaned = cleanText(generated.text);
    const wordCount = countWords(cleaned);
    console.log(`  -> "${generated.title}" (${wordCount} words)`);

    const fast = await analyzeReadingResourceFast({
      supabaseAdmin,
      userId: ADMIN_USER_ID,
      text: generated.text,
      sourceType: "curated",
    });
    const deep = await analyzeReadingResourceDeep({
      supabaseAdmin,
      userId: ADMIN_USER_ID,
      textResourceId: fast.textResource.id,
    });

    await supabaseAdmin.from("text_resources").update({ is_starter_library: true, title: generated.title }).eq("id", fast.textResource.id);
    await supabaseAdmin.from("text_analysis").update({ visibility: "public" }).eq("id", deep.analysis.id);

    results.push({
      level: item.level,
      genre: item.genre,
      topic: item.topic,
      title: generated.title,
      textResourceId: fast.textResource.id,
      analysisId: deep.analysis.id,
      wordCount,
    });
    writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
  }

  const genCost = (genInputTokens / 1_000_000) * 2.5 + (genOutputTokens / 1_000_000) * 15;
  console.log(`\nDone. ${results.length} starter text(s) total.`);
  console.log(`Text-generation cost this run: $${genCost.toFixed(4)} (${genInputTokens} in / ${genOutputTokens} out tokens, ${GEN_MODEL}).`);
  console.log(`Analysis cost logged separately in ai_usage_logs (same pipeline real user submissions use).`);
  console.log(`Results written to ${OUTPUT_PATH.pathname}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
