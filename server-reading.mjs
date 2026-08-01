// Läsning analysis pipeline per SprakLab_AI成本控制与阅读模块实施规范_V1.1
// (Reviews/AI成本控制与阅读模块-实施计划-2026-07-26.md, Phase A). Called from
// server.mjs's /api/reading/analyze. Order is load-bearing (规范§3):
// cache -> user word state -> main dictionary -> AI, AI always last, and
// only for words genuinely missing from the dictionary.
import { createHash, randomUUID } from "node:crypto";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";

// 规范§5 — thresholds are config, not hardcoded in the frontend.
// keyCollocations (Fraser candidates) / keyIdioms (Uttryck candidates) are
// split per 阅读模块设计想法-专业review-2026-07-27.md §5 — they have
// different selection criteria (Fraser: combinable, meaning derivable from
// parts; Uttryck: idiomatic/holistic, register/cultural) and were
// previously lumped into one "expressions" list.
export const LENGTH_TIERS = {
  standard: { maxWords: 500, keyVocabulary: [5, 8], keyCollocations: [2, 3], keyIdioms: [0, 2], keySentences: [0, 2], summarySentences: [2, 3] },
  long: { maxWords: 1000, keyVocabulary: [8, 12], keyCollocations: [3, 5], keyIdioms: [1, 3], keySentences: [1, 3], summarySentences: [3, 5] },
  overlong: { maxWords: 2000, keyVocabulary: [12, 15], keyCollocations: [4, 6], keyIdioms: [2, 4], keySentences: [2, 5], summarySentences: [3, 5] },
};
export const MAX_AUTO_ANALYSIS_WORDS = LENGTH_TIERS.long.maxWords;
export const MAX_SAVE_WORDS = LENGTH_TIERS.overlong.maxWords;
const MAX_KEY_VOCABULARY = 15;
const MAX_KEY_COLLOCATIONS = 6;
const MAX_KEY_IDIOMS = 4;
const MAX_KEY_SENTENCES = 5;
const MAX_LANGUAGE_PATTERNS = 4;
const MAX_BATCH_GENERATE = 15;

// 规范§14.3 point table. Credits are a user-facing abstraction over real
// token cost (规范§14: "平台对用户展示 AI Learning Credits，不直接展示
// Token") — recorded on every call regardless of whether limits are
// enforced (they aren't yet, 规范§14.1 decision 2026-07-26: record now,
// enforce later once there's real multi-user traffic).
export function calculateCredits(feature, wordCount = 0) {
  switch (feature) {
    case "ocr":
      return 10;
    case "analysis":
      if (wordCount <= 250) return 10;
      if (wordCount <= 500) return 20;
      return 35;
    case "summary":
      return 5;
    default:
      return 0;
  }
}

const STOPWORDS = new Set(
  ("och att det som en av är för den på med han inte har jag detta men ett om hade de så var till "
    + "vi kan man här ut vid honom nu över man skulle mycket vara sig sin dig ni din där ju hur nog "
    + "sedan innan mer andra vore något dessa vid mellan samma mina mig alla när ska sitt")
    .split(/\s+/)
    .filter(Boolean),
);

function extractOutputText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .join("")
    .trim();
}

async function callOpenAI({ schemaName, schema, systemPrompt, userPrompt, maxOutputTokens }) {
  if (!OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY saknas på servern.");
    error.status = 500;
    throw error;
  }
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      reasoning: { effort: "low" },
      max_output_tokens: maxOutputTokens,
      text: { format: { type: "json_schema", name: schemaName, strict: true, schema } },
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error?.message || "OpenAI API request failed.");
    error.status = response.status;
    throw error;
  }
  const usage = data.usage || {};
  return { result: JSON.parse(extractOutputText(data)), usage };
}

// 规范§12 — photo/camera import. Uses gpt-5.4-mini's vision input (the
// "低成本 OCR" the spec asks for — cheap per-image, no separate OCR vendor
// to integrate) rather than a dedicated OCR service. Cleans obvious
// line-break/hyphenation OCR artifacts per §12's "断行、连字符和明显乱码做
// 规则清理" — done here with plain string rules, not another AI call.
//
// 2026-07-30 addition (Reviews/阅读模块理念升级与ChatGPT实验-综合review与执行
// 计划-2026-07-30.md, 缺口2, approved by Rachel same day): many textbook
// pages (e.g. Rösten i natten) already print a margin glossary — word +
// the book's own Swedish definition — next to the main text. Photo/camera
// import is the only path where that structure is still visible (once OCR
// flattens everything to plain text the left/right layout is lost, so this
// can never be recovered from pasted text). Same single vision call now
// also returns that glossary as structured JSON, so the AI vocabulary
// selection step can skip words the book already explained instead of
// spending one of its 5-15 key-vocabulary slots re-selecting them —
// Rachel explicitly declined widening that 5-15 cap itself (缺口1), so the
// only lever here is not wasting slots on words that don't need one.
export async function extractTextFromImage({ imageDataUrl }) {
  if (!OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY saknas på servern.");
    error.status = 500;
    throw error;
  }
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      body_text: { type: "string" },
      glossary: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            word: { type: "string" },
            definition: { type: "string" },
          },
          required: ["word", "definition"],
        },
      },
    },
    required: ["body_text", "glossary"],
  };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      reasoning: { effort: "low" },
      max_output_tokens: 4000,
      text: { format: { type: "json_schema", name: "photo_text_extraction", strict: true, schema } },
      input: [
        {
          role: "system",
          content:
            "You extract text from a photo of a Swedish-language page (book, worksheet, screen). Transcribe exactly what's printed — don't translate, summarize, or correct grammar. Join lines that were only broken by the page's line wrapping into full sentences (undo hyphenation at line breaks — e.g. 'känne-\\nteck-\\nen' becomes 'kännetecken'), but keep real paragraph breaks. If part of the image is unreadable, skip it rather than guessing. If the image contains no readable Swedish text at all, return an empty body_text.\n\nSeparately: many textbook pages print a margin/sidebar glossary next to the main text — a list of individual words each with the book's own short definition (in Swedish or another language), clearly distinct from the flowing body paragraphs. If (and only if) the image genuinely contains such a glossary list, extract each entry as {word, definition} into the glossary array, and do NOT include that glossary column's text inside body_text (body_text should be just the main article/story text). If there is no such glossary — most photos won't have one — return an empty glossary array. Never invent glossary entries that aren't actually printed as a word+definition list.",
        },
        {
          role: "user",
          content: [
            { type: "input_text", text: "Extract the Swedish text from this image." },
            { type: "input_image", image_url: imageDataUrl },
          ],
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
  const parsed = JSON.parse(extractOutputText(data));
  const text = String(parsed.body_text || "")
    .replace(/-\n\s*/g, "") // undo any leftover hyphenated line-break the model didn't already join
    .replace(new RegExp(String.fromCharCode(0), "g"), "");
  const glossary = (Array.isArray(parsed.glossary) ? parsed.glossary : [])
    .map((entry) => ({ word: String(entry.word || "").trim(), definition: String(entry.definition || "").trim() }))
    .filter((entry) => entry.word && entry.definition);
  return { text: text.trim(), glossary, usage: data.usage || {} };
}

export function cleanText(raw) {
  return String(raw || "")
    .replace(new RegExp(String.fromCharCode(0), "g"), "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function textHash(cleaned, language = "sv") {
  return createHash("sha256").update(`${language}:${cleaned}`).digest("hex");
}

export function countWords(text) {
  return (text.match(/[a-zA-ZåäöÅÄÖ]+/g) || []).length;
}

export function classifyLength(wordCount) {
  if (wordCount <= LENGTH_TIERS.standard.maxWords) return "standard";
  if (wordCount <= LENGTH_TIERS.long.maxWords) return "long";
  if (wordCount <= LENGTH_TIERS.overlong.maxWords) return "overlong";
  return "oversized";
}

// 规范§7.3 — crude lemmatization: strip common inflectional endings so
// "arbetar/arbetade/arbetat" collapse toward "arbeta" before we even hit the
// database. Real lemmatization happens via the word_forms lookup below；
// this only reduces the candidate list and helps frequency counting treat
// inflected forms of the same word as one occurrence.
function normalizeToken(token) {
  return token.toLowerCase();
}

function extractCandidateTokens(cleanedText) {
  const rawTokens = cleanedText.match(/[a-zA-ZåäöÅÄÖ]+(?:-[a-zA-ZåäöÅÄÖ]+)?/g) || [];
  const freq = new Map();
  const firstSeenCapitalized = new Map();
  rawTokens.forEach((raw) => {
    const token = normalizeToken(raw);
    if (token.length < 3) return;
    if (STOPWORDS.has(token)) return;
    freq.set(token, (freq.get(token) || 0) + 1);
    if (!firstSeenCapitalized.has(token)) firstSeenCapitalized.set(token, /^[A-ZÅÄÖ]/.test(raw));
  });
  return { freq, firstSeenCapitalized };
}

// 规范§3/§8: check user's own word state, then the main dictionary, before
// ever considering AI. Batches the lookup instead of one query per token.
async function matchAgainstCorpus(supabaseAdmin, tokens) {
  const found = new Map(); // token -> { id, swedish, pos, cefr_level, frequency_rank }
  if (!tokens.length) return found;

  const { data: exact } = await supabaseAdmin
    .from("learning_objects")
    .select("id, swedish, part_of_speech, cefr_level, frequency_rank")
    .eq("object_type", "word")
    .in("swedish", tokens);
  (exact || []).forEach((row) => found.set(row.swedish.toLowerCase(), { id: row.id, swedish: row.swedish, pos: row.part_of_speech, cefr_level: row.cefr_level, frequency_rank: row.frequency_rank }));

  const remaining = tokens.filter((t) => !found.has(t));
  if (remaining.length) {
    const { data: forms } = await supabaseAdmin.from("word_forms").select("learning_object_id, form_value").in("form_value", remaining);
    const stillMissingIds = [...new Set((forms || []).map((f) => f.learning_object_id))];
    if (stillMissingIds.length) {
      const { data: baseWords } = await supabaseAdmin
        .from("learning_objects")
        .select("id, swedish, part_of_speech, cefr_level, frequency_rank")
        .in("id", stillMissingIds);
      const byId = new Map((baseWords || []).map((w) => [w.id, w]));
      (forms || []).forEach((f) => {
        const base = byId.get(f.learning_object_id);
        if (!base) return;
        const token = f.form_value.toLowerCase();
        if (!found.has(token)) found.set(token, { id: base.id, swedish: base.swedish, pos: base.part_of_speech, cefr_level: base.cefr_level, frequency_rank: base.frequency_rank });
      });
    }
  }
  return found;
}

async function fetchUserWordState(supabaseAdmin, userId, wordIds) {
  if (!userId || !wordIds.length) return new Map();
  const { data } = await supabaseAdmin.from("user_words").select("word_id, mastered, review_stage").eq("user_id", userId).in("word_id", wordIds);
  return new Map((data || []).map((row) => [row.word_id, row]));
}

// 规范§7.1/§7.2 ranking: value to the reader over raw frequency. Proper
// nouns/short function words were already filtered in extractCandidateTokens
// (stopwords) — this layer scores what's left.
// 规范§7.1/§7.2 — value to the reader, not raw frequency-in-text. A word
// occurring 3 times in this article but ranked in Swedish's own top ~250
// most common words (frequency_rank, from Kelly) is almost certainly
// already known — flagging it as "worth learning" wastes the slot a truly
// useful word could have had.
const VERY_COMMON_FREQUENCY_RANK = 250;

// 2026-08-01 (Rachel's live-testing feedback + 关于阅读模块的调整.pages "Layer
// 2" — "words that are simple but determine the article's meaning", e.g.
// instead/although/despite/while/until/unless): these discourse connectives
// were getting silently excluded before the AI Worth Learning layer ever
// saw them, purely because they're POS-tagged preposition/conjunction (the
// generic excludedPos filter below) — exactly backwards, since a
// connective's comprehension-importance has nothing to do with its part of
// speech or how common it is. Confirmed live against the real corpus:
// "trots" is tagged preposition, "fastän"/"medan" are tagged conjunction,
// all three were being discarded before ranking ever started. This curated
// set bypasses both the POS and frequency exclusion below — it does NOT
// bypass AI judgment, the Worth Learning scorer still decides whether each
// one actually earns a slot in this specific article.
const HIGH_VALUE_CONNECTIVES = new Set([
  "däremot", "dessutom", "samtidigt", "trots", "fastän", "eftersom", "medan",
  "tvärtom", "ändå", "likväl", "följaktligen", "alltså", "nämligen", "dock",
  "emellertid", "istället", "snarare", "oavsett", "visserligen", "ändock",
  "sålunda", "härav", "ehuru", "huruvida", "beträffande", "således",
]);

function rankFoundWords(found, freq, firstSeenCapitalized, userWordState, limit) {
  const excludedPos = new Set(["preposition", "conjunction", "pronoun", "numeral", "interjection"]);
  const candidates = [...found.entries()]
    .filter(([token, word]) => HIGH_VALUE_CONNECTIVES.has(token) || !excludedPos.has(word.pos))
    // Sentence-initial connectives ("Trots att...", "Däremot är...") are
    // capitalized+singleton just as often as real proper nouns are — this
    // heuristic can't tell them apart, so the curated set bypasses it too.
    .filter(([token]) => HIGH_VALUE_CONNECTIVES.has(token) || !firstSeenCapitalized.get(token) || freq.get(token) > 1)
    .filter(([token, word]) => HIGH_VALUE_CONNECTIVES.has(token) || !word.frequency_rank || word.frequency_rank > VERY_COMMON_FREQUENCY_RANK)
    .map(([token, word]) => {
      const state = userWordState.get(word.id);
      const alreadyMastered = state?.mastered || (state?.review_stage ?? 0) >= 5;
      return { token, word, occurrences: freq.get(token) || 1, alreadyMastered };
    })
    .filter((c) => !c.alreadyMastered);

  // Dedupe by underlying word id: two surface forms of the same base word
  // (e.g. "ledighet" and "ledigheten" both resolving via word_forms to the
  // same learning_object) would otherwise both survive as separate
  // candidates and waste two of the final slots on one word.
  const byWordId = new Map();
  for (const c of candidates) {
    const existing = byWordId.get(c.word.id);
    if (!existing || c.occurrences > existing.occurrences) byWordId.set(c.word.id, c);
  }
  const deduped = [...byWordId.values()];

  deduped.sort((a, b) => {
    // Connectives are common by definition (that's why calibration scores
    // them 80-100 despite low rarity) — if they had to compete with rare
    // content words on occurrence/rarity here, they'd always lose and get
    // truncated away before the AI Worth Learning step ever saw them. So
    // they're bucketed first, guaranteeing they reach the AI; genuine
    // worth-learning judgment still happens there, this only protects their
    // spot in the candidate pool.
    const aConn = HIGH_VALUE_CONNECTIVES.has(a.token);
    const bConn = HIGH_VALUE_CONNECTIVES.has(b.token);
    if (aConn !== bConn) return aConn ? -1 : 1;
    if (a.occurrences !== b.occurrences) return b.occurrences - a.occurrences;
    // Rarer words (higher frequency_rank) sort first among ties — more
    // specifically worth learning than a merely-somewhat-common word.
    return (b.word.frequency_rank || 0) - (a.word.frequency_rank || 0);
  });
  return deduped.slice(0, limit);
}

// AI Worth Learning scoring (2026-07-30, 桌面AI语义评分.pages, approved by
// Rachel same day) — the DB-mechanical filter above already does the "90%"
// (POS/proper-noun/frequency/dedup/already-mastered exclusion); this is the
// final "10%" AI layer on top. AI never decides how many words survive
// (targetCount stays DB/config-controlled) — it only ranks a candidate pool
// larger than the target by how genuinely worth learning each word is IN
// THIS ARTICLE specifically, not how "important" it is in the abstract.
// Skipped entirely (no AI call) when there's no real surplus to rank.
const WORTH_LEARNING_DIMENSIONS = `1. Does it genuinely help understand THIS article — a word central to this article's specific meaning/topic scores higher than one that's merely present?
2. Transfer value — will this word likely reappear across many other articles (connective/discourse words like "däremot", "dessutom", "samtidigt" score very high here)?
3. Is it a genuine native-speaker expression or collocation-forming word, not just a plain dictionary entry?
4. Is it a common "reading obstacle" word — one learners typically recognize on sight but keep forgetting (often abstract nouns, adverbs) — these should be prioritized?
5. Does it easily expand into a useful word family (e.g. a verb with common related noun/adjective/participle forms)?

Calibration — score by how much a word actually determines whether the reader understands the article, NOT by how common, short, or grammatically "simple" it looks:
- "och", "väldigt" → very low (1-20). Generic, replaceable, contributes almost nothing specific.
- "regering" → moderate (40-60) if the article is genuinely about government/policy; otherwise low.
- "däremot", "trots", "dessutom" → very high (80-100), even though they're short, frequent, and CEFR A2-B1. A connective word that flips or qualifies the meaning of a sentence can single-handedly determine whether the reader understands the article correctly — never downgrade a word just because it "looks too simple" or "too common" to be worth learning.
- A phrasal/idiomatic verb sense (e.g. "lägga ner", "komma fram till") → very high (80-100) — these carry far more meaning than any single component word.
Do not let surface simplicity or high frequency pull a score down — score purely on how much understanding of THIS article depends on this specific word.`;

async function scoreVocabularyWorthLearning(candidates, cleanedText, targetCount) {
  if (candidates.length <= targetCount) {
    return { scored: candidates, usage: null };
  }
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      scores: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { word: { type: "string" }, score: { type: "integer" } },
          required: ["word", "score"],
        },
      },
    },
    required: ["scores"],
  };
  const wordList = candidates.map((c) => c.word.swedish).join(", ");
  const { result, usage } = await callOpenAI({
    schemaName: "vocabulary_worth_learning",
    schema,
    maxOutputTokens: 1500,
    systemPrompt: `You score how "worth learning" each candidate Swedish word is for a learner, specifically in the context of the article given — not how important the word is in general. Score every word 0-100 using these five dimensions together:\n${WORTH_LEARNING_DIMENSIONS}\nScore every candidate word given, even low-scoring ones — never omit one. Return integer scores only, matching each word exactly as given.`,
    userPrompt: `Article:\n${cleanedText}\n\nCandidate words: ${wordList}`,
  });
  const scoreByWord = new Map((result.scores || []).map((s) => [String(s.word || "").toLowerCase(), s.score]));
  const scored = candidates
    .map((c) => ({ ...c, worthLearningScore: scoreByWord.get(c.word.swedish.toLowerCase()) ?? 0 }))
    .sort((a, b) => b.worthLearningScore - a.worthLearningScore);
  return { scored, usage };
}

// 规范§8 — batched generation for genuinely missing words, one AI call for
// up to MAX_BATCH_GENERATE words at once, never one call per word.
async function batchGenerateMissingWords(missingTokens) {
  if (!missingTokens.length) return [];
  const batch = missingTokens.slice(0, MAX_BATCH_GENERATE);
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      words: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            swedish: { type: "string" },
            pos: { type: "string", enum: ["verb", "noun", "adjective", "adverb", "pronoun", "preposition", "other"] },
            chinese: { type: "string" },
            swedish_explanation: { type: "string" },
            forms: { type: "string" },
            example: { type: "string" },
            is_real_word: { type: "boolean" },
          },
          required: ["swedish", "pos", "chinese", "swedish_explanation", "forms", "example", "is_real_word"],
        },
      },
    },
    required: ["words"],
  };
  const { result, usage } = await callOpenAI({
    schemaName: "batch_missing_words",
    schema,
    maxOutputTokens: 4000,
    systemPrompt:
      "You are a Swedish dictionary editor for Chinese-speaking learners. For each token given, determine its dictionary base form (lemma) and return a minimal but correct entry: swedish (the lemma, not the inflected form as it appeared), pos, chinese (Simplified Chinese meaning), swedish_explanation (simple Swedish definition), forms (one 'form_type: value' per line — for verbs: infinitiv/presens/preteritum/supinum; for nouns: genus/singular_indefinite/singular_definite/plural_indefinite/plural_definite; for adjectives: base_form/neuter_form/plural_form), example (one natural Swedish sentence). If a token is not a real Swedish word (OCR noise, a name, a typo), set is_real_word to false and leave other fields minimal.",
    userPrompt: `Tokens (may be inflected forms — return each as its dictionary lemma):\n${batch.join(", ")}`,
  });
  return { words: (result.words || []).filter((w) => w.is_real_word), usage };
}

// 规范§9.2 + 阅读模块设计想法-专业review-2026-07-27.md §5/§6 — one bundled
// call (not one per concept) returns collocations, idioms, AND key
// sentences together. Fraser (collocations) and Uttryck (idioms) get
// separate criteria since they're genuinely different things — lumping
// them into one "expressions" list (the old behavior) let the model pick
// either without really distinguishing "combinable phrase" from "idiomatic,
// possibly non-literal expression". Key sentences are a third, independent
// output (not just the source_sentence attached to a word/phrase) — the
// most Shadowing-worthy sentences in the article.
async function extractKeyExpressions(cleanedText, tier, glossary = []) {
  const tierConfig = LENGTH_TIERS[tier === "oversized" ? "overlong" : tier];
  const [collocMin, collocMax] = tierConfig.keyCollocations;
  const [idiomMin, idiomMax] = tierConfig.keyIdioms;
  const [sentMin, sentMax] = tierConfig.keySentences;
  const expressionSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      expression_text: { type: "string" },
      meaning_zh: { type: "string" },
      source_sentence: { type: "string" },
      source_sentence_zh: { type: "string" },
    },
    required: ["expression_text", "meaning_zh", "source_sentence", "source_sentence_zh"],
  };
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      collocations: { type: "array", items: expressionSchema },
      idioms: { type: "array", items: expressionSchema },
      key_sentences: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            sentence: { type: "string" },
            translation_zh: { type: "string" },
            reason: { type: "string" },
            shadowing_suitable: { type: "boolean" },
          },
          required: ["sentence", "translation_zh", "reason", "shadowing_suitable"],
        },
      },
      language_patterns: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            pattern: { type: "string" },
            meaning_zh: { type: "string" },
            source_sentence: { type: "string" },
          },
          required: ["pattern", "meaning_zh", "source_sentence"],
        },
      },
    },
    required: ["collocations", "idioms", "key_sentences", "language_patterns"],
  };
  const glossaryNote = glossary.length
    ? `\n\nThe text's own printed margin glossary already explains these words/phrases: ${glossary.map((g) => g.word).join(", ")}. Do not select any of these as a collocation or idiom — the book already did that job. Spend the collocation/idiom slots on other things the glossary didn't cover.`
    : "";
  const { result, usage } = await callOpenAI({
    schemaName: "key_expressions_and_sentences",
    schema,
    maxOutputTokens: 3000,
    systemPrompt: `You extract four things from a Swedish text for a Chinese-speaking learner, each with its own criteria — never invent content, everything must actually appear in the text.

1. collocations (${collocMin}-${collocMax}, max ${MAX_KEY_COLLOCATIONS}): fixed multi-word combinations (verb+preposition, adjective+preposition, verb+noun, etc.) whose meaning is still mostly derivable from the component words — the point is learning HOW they combine and are used, not that they're mysterious.

2. idioms (${idiomMin}-${idiomMax}, max ${MAX_KEY_IDIOMS}): genuinely idiomatic or holistic expressions — possibly non-literal meaning, used for attitude, spoken register, emphasis, or cultural context. Do NOT include something here just because it "looks like a phrase" — it must have real idiomatic character. It's fine to return 0 if the text has no genuine idioms.

3. key_sentences (${sentMin}-${sentMax}, max ${MAX_KEY_SENTENCES}): sentences worth reading aloud and repeating — chosen because they showcase a grammatical structure worth noticing (a tense, a subordinate clause, a passive construction, a notable word order) or because they're excellent standalone material for spoken practice (natural rhythm, self-contained meaning, not overly long or dependent on surrounding context). Do NOT pick a sentence just because it is an important plot point or states a key fact — a sentence that only restates something the reader already understood from following the story (e.g. "this is where the twist happens") has no language-learning value by itself and must not be included. Every sentence returned here must genuinely be worth practicing aloud, so mark shadowing_suitable=true for all of them; return fewer (even zero) rather than padding with plot-important-but-linguistically-plain sentences. "reason" is shown directly to the learner in the app UI, so it must be written in Chinese (like meaning_zh/translation_zh elsewhere), one short clause naming what's worth noticing — never an English rationale.

4. language_patterns (0-4, never more than 4): notable SENTENCE-LEVEL constructions worth noticing — a subordinating conjunction + clause type, a word-order phenomenon, a tense used in a distinctive way (e.g. "trots att + bisats" meaning "even though..."). This is NOT a grammar lesson (don't explain verb conjugation tables or general tense rules — any generic AI chatbot already does that) and it must NOT overlap with collocations/idioms above (those are word/phrase-level; this is sentence-construction-level). Give the pattern name, its meaning in Chinese, and quote one example sentence from the text verbatim. Return fewer (even zero) rather than padding — most short/simple texts genuinely have 0-2 of these, not 4.

Every source_sentence/sentence must be quoted exactly from the text. Return empty arrays for any category with nothing genuinely worth flagging — do not pad to hit a target count.${glossaryNote}`,
    userPrompt: cleanedText,
  });
  return {
    collocations: (result.collocations || []).slice(0, MAX_KEY_COLLOCATIONS),
    idioms: (result.idioms || []).slice(0, MAX_KEY_IDIOMS),
    keySentences: (result.key_sentences || []).slice(0, MAX_KEY_SENTENCES),
    languagePatterns: (result.language_patterns || []).slice(0, MAX_LANGUAGE_PATTERNS),
    usage,
  };
}

// 阅读模块设计想法-专业review-2026-07-27.md §5/§10.2 — mirrors what
// batchGenerateMissingWords already does for words: when a discovered
// collocation/idiom doesn't exist in Fraser/Uttryck yet, create it rather
// than just leaving the link empty. Unlike missing words, no second AI
// call is needed — extractKeyExpressions already generated the phrase text/
// meaning/example in the same call, this just persists it. New entries get
// status "ai_generated" (same convention as auto-generated words — see
// spraklab-ai-review-gate-reminder memory: this review gate isn't enforced
// yet, so these are immediately visible like everything else).
async function resolveExpressionEntries(supabaseAdmin, items, { objectType, category }) {
  if (!items.length) return items;
  const texts = items.map((item) => item.expression_text);
  const { data: existing } = await supabaseAdmin.from("learning_objects").select("id, swedish").in("object_type", ["phrase", "expression"]).in("swedish", texts);
  const byText = new Map((existing || []).map((row) => [row.swedish.toLowerCase(), row.id]));

  const toCreate = items.filter((item) => !byText.has(item.expression_text.toLowerCase()));
  if (toCreate.length) {
    const now = new Date().toISOString();
    const rows = toCreate.map((item) => ({
      id: randomUUID(),
      swedish: item.expression_text,
      part_of_speech: "other",
      pos_detail: "",
      object_type: objectType,
      category,
      chinese: item.meaning_zh,
      swedish_explanation: "",
      example_sv: item.source_sentence,
      forms: "",
      collocations: "",
      related_words: "",
      tags: [],
      notebook: "Fraser",
      source: "discovered from reading",
      status: "ai_generated",
      updated_at: now,
    }));
    const { data: inserted, error: insertError } = await supabaseAdmin.from("learning_objects").upsert(rows, { onConflict: "swedish,part_of_speech", ignoreDuplicates: true }).select("id, swedish");
    if (!insertError && inserted) {
      const translationRows = inserted.map((row) => {
        const source = toCreate.find((item) => item.expression_text.toLowerCase() === row.swedish.toLowerCase());
        return { learning_object_id: row.id, native_language: "zh", meaning: source?.meaning_zh || "", updated_at: now };
      });
      if (translationRows.length) await supabaseAdmin.from("learning_object_translations").insert(translationRows);
      inserted.forEach((row) => byText.set(row.swedish.toLowerCase(), row.id));
    }
  }

  return items.map((item) => ({ ...item, expression_id: byText.get(item.expression_text.toLowerCase()) || null }));
}

// Cross-user by design (service-role bypasses RLS) — only ever reads
// text_analysis (structured knowledge), never another user's
// text_resources.original_text/cleaned_text.
async function findPublicAnalysisByHash(supabaseAdmin, hash) {
  const { data: resources } = await supabaseAdmin.from("text_resources").select("id").eq("text_hash", hash);
  const resourceIds = (resources || []).map((r) => r.id);
  if (!resourceIds.length) return null;
  const { data: analysis } = await supabaseAdmin
    .from("text_analysis")
    .select("*")
    .in("text_resource_id", resourceIds)
    .eq("visibility", "public")
    .order("analysis_version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return analysis || null;
}

function logUsage(entries, { userId, textResourceId, feature, model, usage, cacheHit, credits = 0 }) {
  entries.push({
    user_id: userId || null,
    text_resource_id: textResourceId || null,
    feature,
    model,
    input_tokens: usage?.input_tokens || 0,
    output_tokens: usage?.output_tokens || 0,
    credits_used: credits,
    actual_cost: ((usage?.input_tokens || 0) / 1_000_000) * 0.75 + ((usage?.output_tokens || 0) / 1_000_000) * 4.5,
    cache_hit: Boolean(cacheHit),
  });
}

// Per-item discovery-state tracking (2026-07-30 decision, Reviews/阅读模块
//理念升级与ChatGPT实验-综合review与执行计划-2026-07-30.md 决策3). Materializes
// one reading_analysis_items row per surfaced vocabulary/expression/
// sentence, scoped to THIS user — called on every path that resolves to a
// text_analysis (fresh generation, the user's own cache hit, or reusing
// someone else's public analysis), since a shared analysis still needs
// independent per-user status. Upsert with ignoreDuplicates so re-opening
// the same analysis never resets an already-set status back to "new".
async function materializeReadingAnalysisItems(supabaseAdmin, { userId, analysis }) {
  if (!userId || !analysis?.id) return;
  const rows = [
    ...(analysis.selected_vocabulary || []).map((item) => ({ item_type: "vocabulary", ref_id: item.word_id || null, item })),
    ...(analysis.selected_expressions || []).map((item) => ({ item_type: "expression", ref_id: item.expression_id || null, item })),
    ...(analysis.key_sentences || []).map((item) => ({ item_type: "sentence", ref_id: null, item })),
    ...(analysis.language_patterns || []).map((item) => ({ item_type: "pattern", ref_id: null, item })),
  ].map(({ item_type, ref_id, item }) => ({
    text_analysis_id: analysis.id,
    user_id: userId,
    item_type,
    ref_id,
    item_data: item,
    sort_order: item.sort_order ?? 0,
  }));
  if (!rows.length) return;
  const { error } = await supabaseAdmin
    .from("reading_analysis_items")
    .upsert(rows, { onConflict: "text_analysis_id,user_id,item_type,sort_order", ignoreDuplicates: true });
  if (error) console.warn("[Reading] Failed to materialize reading_analysis_items.", error);
}

// Main entry point. Returns { textResource, analysis, tier, cached }.
export async function analyzeReadingResource({ supabaseAdmin, userId, text, sourceType = "paste", glossary = [] }) {
  const cleaned = cleanText(text);
  const wordCount = countWords(cleaned);
  const hash = textHash(cleaned);
  const tier = classifyLength(wordCount);
  const usageLogEntries = [];

  if (tier === "oversized" && wordCount > MAX_SAVE_WORDS) {
    const error = new Error(`Texten är för lång (${wordCount} ord). Max ${MAX_SAVE_WORDS} ord per artikel just nu.`);
    error.status = 400;
    throw error;
  }

  // 规范§3/§15 — cache check first, before anything else.
  const { data: existingResource } = await supabaseAdmin
    .from("text_resources")
    .select("id, word_count, analysis_status, textbook_glossary")
    .eq("user_id", userId)
    .eq("text_hash", hash)
    .maybeSingle();

  let textResource = existingResource;
  if (!textResource) {
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("text_resources")
      .insert({ user_id: userId, source_type: sourceType, original_text: text, cleaned_text: cleaned, text_hash: hash, language: "sv", word_count: wordCount, analysis_status: "pending", textbook_glossary: glossary })
      .select()
      .single();
    if (insertError) throw insertError;
    textResource = inserted;
  }

  const { data: existingAnalysis } = await supabaseAdmin
    .from("text_analysis")
    .select("*")
    .eq("text_resource_id", textResource.id)
    .order("analysis_version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingAnalysis) {
    await materializeReadingAnalysisItems(supabaseAdmin, { userId, analysis: existingAnalysis });
    return { textResource, analysis: existingAnalysis, tier, cached: true };
  }

  // SPK-ADR-001/SPK-SPEC-003 upgrade (2026-07-27): "Generate Once, Reuse
  // Forever" — the reusable long-term asset is the structured knowledge
  // (this analysis), never the article text itself. text_resources.
  // original_text/cleaned_text of whoever first submitted this text stays
  // private to them forever; only the analysis (vocabulary/expressions/
  // summary, all already just references + short generated text, no raw
  // article content) can be marked public, and only by an admin action —
  // there is no user-facing "share" button in V1. Look for a public
  // analysis derived from the same text_hash by ANY user before ever
  // calling AI. The current user still gets their own private
  // text_resource row for their own reading history above; nothing about
  // another user's submission is exposed here beyond the shared analysis.
  const publicAnalysis = await findPublicAnalysisByHash(supabaseAdmin, hash);
  if (publicAnalysis) {
    await materializeReadingAnalysisItems(supabaseAdmin, { userId, analysis: publicAnalysis });
    return { textResource, analysis: publicAnalysis, tier, cached: true, reusedFromPublic: true };
  }

  if (tier === "oversized") {
    const error = new Error("Texten är för lång för automatisk analys. Välj ett stycke eller markera text att analysera.");
    error.status = 400;
    throw error;
  }

  const tierConfig = LENGTH_TIERS[tier];
  const vocabularyLimit = Math.min(tierConfig.keyVocabulary[1], MAX_KEY_VOCABULARY);

  const { freq, firstSeenCapitalized } = extractCandidateTokens(cleaned);
  // 缺口2 (2026-07-30): words the textbook's own margin glossary already
  // explains never compete for the 5-15 key-vocabulary slots or trigger a
  // missing-word generation call — the book already did that job for free.
  const glossaryWords = new Set((glossary || []).map((g) => String(g.word || "").toLowerCase()).filter(Boolean));
  const tokens = [...freq.keys()].filter((t) => !glossaryWords.has(t));
  const found = await matchAgainstCorpus(supabaseAdmin, tokens);
  const userWordState = await fetchUserWordState(supabaseAdmin, userId, [...found.values()].map((w) => w.id));

  let ranked = rankFoundWords(found, freq, firstSeenCapitalized, userWordState, vocabularyLimit * 2);

  // Only tokens genuinely absent from the dictionary are gap candidates —
  // 规范§8 "仅收集数据库中完全不存在的词".
  const missingTokens = tokens
    .filter((t) => !found.has(t) && !firstSeenCapitalized.get(t))
    .sort((a, b) => (freq.get(b) || 0) - (freq.get(a) || 0))
    .slice(0, MAX_BATCH_GENERATE);

  let generatedWords = [];
  if (missingTokens.length && ranked.length < vocabularyLimit) {
    const { words, usage } = await batchGenerateMissingWords(missingTokens);
    logUsage(usageLogEntries, { userId, textResourceId: textResource.id, feature: "missing_word_batch", model: MODEL, usage, cacheHit: false });
    if (words.length) {
      const rows = words.map((w) => ({
        swedish: w.swedish,
        part_of_speech: w.pos,
        object_type: "word",
        chinese: w.chinese,
        swedish_explanation: w.swedish_explanation,
        forms: w.forms,
        example: w.example,
        status: "ai_generated",
      }));
      const { data: inserted, error: insertErr } = await supabaseAdmin.from("learning_objects").upsert(rows, { onConflict: "swedish,part_of_speech", ignoreDuplicates: true }).select("id, swedish, part_of_speech, cefr_level, frequency_rank");
      if (!insertErr && inserted) {
        generatedWords = inserted;
        inserted.forEach((row) => found.set(row.swedish.toLowerCase(), { id: row.id, swedish: row.swedish, pos: row.part_of_speech, cefr_level: row.cefr_level, frequency_rank: row.frequency_rank }));
      }
    }
    // Keep a real surplus pool (still 2x) here too — the AI Worth Learning
    // step right below needs candidates beyond vocabularyLimit to actually
    // rank; capping to vocabularyLimit here would leave it nothing to do.
    ranked = rankFoundWords(found, freq, firstSeenCapitalized, userWordState, vocabularyLimit * 2);
  }

  const { scored: scoredVocabulary, usage: worthLearningUsage } = await scoreVocabularyWorthLearning(ranked, cleaned, vocabularyLimit);
  if (worthLearningUsage) {
    logUsage(usageLogEntries, { userId, textResourceId: textResource.id, feature: "vocab_worth_learning", model: MODEL, usage: worthLearningUsage, cacheHit: false });
  }
  ranked = scoredVocabulary.slice(0, vocabularyLimit);

  const selectedVocabulary = ranked.map((c, index) => ({
    word_id: c.word.id,
    swedish: c.word.swedish,
    occurrences: c.occurrences,
    worth_learning_score: c.worthLearningScore ?? null,
    sort_order: index,
  }));

  const { collocations, idioms, keySentences, languagePatterns, usage: exprUsage } = await extractKeyExpressions(cleaned, tier, glossary);
  logUsage(usageLogEntries, { userId, textResourceId: textResource.id, feature: "key_expressions", model: MODEL, usage: exprUsage, cacheHit: false });
  const resolvedCollocations = await resolveExpressionEntries(supabaseAdmin, collocations, { objectType: "phrase", category: "common_collocation" });
  const resolvedIdioms = await resolveExpressionEntries(supabaseAdmin, idioms, { objectType: "expression", category: "everyday_expression" });
  const selectedExpressions = [
    ...resolvedCollocations.map((e) => ({ ...e, category: "collocation" })),
    ...resolvedIdioms.map((e) => ({ ...e, category: "idiom" })),
  ].map((e, index) => ({ ...e, sort_order: index }));
  const selectedSentences = keySentences.map((s, index) => ({ ...s, sort_order: index }));
  const selectedPatterns = languagePatterns.map((p, index) => ({ ...p, sort_order: index }));

  const { data: analysisRow, error: analysisError } = await supabaseAdmin
    .from("text_analysis")
    .insert({
      text_resource_id: textResource.id,
      analysis_version: 1,
      selected_vocabulary: selectedVocabulary,
      selected_expressions: selectedExpressions,
      key_sentences: selectedSentences,
      language_patterns: selectedPatterns,
    })
    .select()
    .single();
  if (analysisError) throw analysisError;

  await supabaseAdmin.from("text_resources").update({ analysis_status: "ready" }).eq("id", textResource.id);
  // One "analysis" credit charge for the whole user-facing action (规范
  // §14.3 counts vocabulary+phrases+summary as a single tiered charge), kept
  // separate from the granular per-call actual_cost entries above so real
  // dollar cost never gets double-counted.
  usageLogEntries.push({
    user_id: userId || null,
    text_resource_id: textResource.id,
    feature: "analysis",
    model: MODEL,
    input_tokens: 0,
    output_tokens: 0,
    credits_used: calculateCredits("analysis", wordCount),
    actual_cost: 0,
    cache_hit: false,
  });
  if (usageLogEntries.length) await supabaseAdmin.from("ai_usage_logs").insert(usageLogEntries);

  await materializeReadingAnalysisItems(supabaseAdmin, { userId, analysis: analysisRow });
  return { textResource, analysis: analysisRow, tier, cached: false };
}

// 规范§9.3/§10 — summary is on-demand only, never generated at import time.
export async function generateReadingSummary({ supabaseAdmin, userId, textResourceId }) {
  const { data: resource, error: resourceError } = await supabaseAdmin.from("text_resources").select("id, cleaned_text, word_count, user_id").eq("id", textResourceId).eq("user_id", userId).single();
  if (resourceError || !resource) {
    const error = new Error("Texten hittades inte.");
    error.status = 404;
    throw error;
  }
  const { data: analysis } = await supabaseAdmin.from("text_analysis").select("*").eq("text_resource_id", textResourceId).order("analysis_version", { ascending: false }).limit(1).maybeSingle();
  if (analysis?.summary_sv) return { summary_sv: analysis.summary_sv, summary_zh: analysis.summary_zh, cached: true };

  const tier = classifyLength(resource.word_count);
  const [minSentences, maxSentences] = LENGTH_TIERS[tier === "oversized" ? "overlong" : tier].summarySentences;
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: { summary_sv: { type: "string" }, summary_zh: { type: "string" } },
    required: ["summary_sv", "summary_zh"],
  };
  const { result, usage } = await callOpenAI({
    schemaName: "reading_summary",
    schema,
    maxOutputTokens: 800,
    systemPrompt: `Summarize the given Swedish text in ${minSentences}-${maxSentences} sentences, maximum 5. Cover only the main topic, core content, and key conclusion — no background info, no grammar explanation. Provide both a Swedish summary and a Simplified Chinese summary of equivalent length.`,
    userPrompt: resource.cleaned_text,
  });

  const usageLogEntries = [];
  logUsage(usageLogEntries, { userId, textResourceId, feature: "summary", model: MODEL, usage, cacheHit: false, credits: calculateCredits("summary") });
  await supabaseAdmin.from("ai_usage_logs").insert(usageLogEntries);

  if (analysis) {
    await supabaseAdmin.from("text_analysis").update({ summary_sv: result.summary_sv, summary_zh: result.summary_zh, summary_generated_at: new Date().toISOString() }).eq("id", analysis.id);
  } else {
    await supabaseAdmin.from("text_analysis").insert({ text_resource_id: textResourceId, analysis_version: 1, summary_sv: result.summary_sv, summary_zh: result.summary_zh, summary_generated_at: new Date().toISOString() });
  }

  return { summary_sv: result.summary_sv, summary_zh: result.summary_zh, cached: false };
}
