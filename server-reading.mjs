// Läsning analysis pipeline per SprakLab_AI成本控制与阅读模块实施规范_V1.1
// (Reviews/AI成本控制与阅读模块-实施计划-2026-07-26.md, Phase A). Called from
// server.mjs's /api/reading/analyze. Order is load-bearing (规范§3):
// cache -> user word state -> main dictionary -> AI, AI always last, and
// only for words genuinely missing from the dictionary.
import { createHash, randomUUID } from "node:crypto";
import { generateWordEntry, noteReuse } from "./server-native.mjs";
import { openaiCost, usageSource, PRICE_VERSION } from "./server-prices.mjs";
import { findExistingExpression, expressionMatchKey, addModule, setMatchKey, moduleOf, recordEntryStatus } from "./server-resources.mjs";
import { multiwordEvidence, classifyMultiword, recordEvidence } from "./server-evidence.mjs";
import { glossaryPartsOfSpeech, referencePartsOfSpeech, checkKeywordPos, textReadings, aiSenseCheck, recordCheck, wiktionaryEvidence, fillExpressionLanguage, latinLookalikes } from "./server-language-checks.mjs";
import { lookupWiktionary } from "./server-wiktionary.mjs";
import { formReadings } from "./server-lexicon.mjs";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";

// Reviews/阅读模块多母语支持-架构方案-2026-09-01.md — every AI-facing prompt
// below still names its output fields *_zh (legacy, kept to avoid a large
// unrelated rename across db.js/app.js) but the actual content is generated
// directly in whichever language this maps to, e.g. English content lands
// in the same "summary_zh"/"meaning_zh" fields when nativeLanguage is "en".
const NATIVE_LANGUAGE_NAMES = { zh: "Simplified Chinese", en: "English" };
function languageName(nativeLanguage) {
  return NATIVE_LANGUAGE_NAMES[nativeLanguage] || NATIVE_LANGUAGE_NAMES.zh;
}

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

// The selection rules an analysis was made with (text_analysis.analysis_version). An
// analysis made with older rules is made again with the current ones the next time a
// reader opens it — its summary is kept, only the selection runs again (2026-11-07:
// SALDO occurrences, A1 rule, reserves, expression overlap). Nothing else is versioned.
// 3 (2026-11-07): the accepted V4 keyword prompt, expression base forms and recovery, a
// 60-word pool, adverbs kept as their own headwords.
export const ANALYSIS_VERSION = 3;

/**
 * How many keywords a text may have at most (2026-11-02): about one per 40 words (at least
 * 3), one or two more for a dense text (many B2–C2 dictionary words per 100 words), never
 * above the tier's ceiling — a 60-word text isn't padded to 8, a hard 300-word one isn't cut
 * at 8. A ceiling, not a target: the selection returns fewer when the text has fewer. The
 * reader's own level orders and swaps them later (ReadingSelection on iOS).
 */
export function keywordLimit(wordCount, tier, pool = []) {
  const words = Number(wordCount) || 0;
  const ceiling = Math.min(LENGTH_TIERS[tier === "oversized" ? "overlong" : tier].keyVocabulary[1], MAX_KEY_VOCABULARY);
  const hard = pool.filter((c) => /^(B2|C1|C2)$/.test(c.word?.cefr_level || "")).length;
  const density = words ? (hard / words) * 100 : 0;
  const extra = density >= 6 ? 2 : density >= 3 ? 1 : 0;
  return Math.max(3, Math.min(ceiling, Math.ceil(words / 40) + extra));
}
const MAX_KEY_COLLOCATIONS = 6;
const MAX_KEY_IDIOMS = 4;
const MAX_KEY_SENTENCES = 5;
const MAX_LANGUAGE_PATTERNS = 4;

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

// Native iOS photo / camera import (2026-11-01): the phone reads the page itself (Vision
// OCR, free) and sends its numbered lines with their positions plus a small copy of the
// photo. The model only sorts those lines — article body (in reading order), the
// textbook's own word list, or other page content (page numbers, headers, exercises,
// captions) — and never returns text of its own, so the body is exactly what the phone
// read. Glossary entries are checked to be verbatim pieces of the lines they cite.
const LAYOUT_SYSTEM = `You sort the OCR lines of a photographed Swedish page. You get the photo and its lines, numbered, with their position (x, y, w, h as fractions of the page, origin top left).

Return:
- title: the line numbers of the article's own title (usually one line, large or bold above the text); empty if it has none.
- body: the line numbers of the main article or story text (its headings inside the text included, the title not), in reading order (follow the columns of the page).
- glossary: only if the page prints its own word list next to or below the text (each entry a word or phrase with the book's short explanation, often in a margin column, a box or a footnote list). One item per entry: lines = the line numbers it uses, word = the word or phrase exactly as printed, definition = the explanation exactly as printed. Every entry starts on a new line with its own word (usually bold, often "en"/"ett" + noun or a verb with its forms, e.g. "en öken, öknar", "drabba, drabbas"): a line that starts with a new word is a new entry even when there is no gap before it — never put two words and their explanations in one entry. Copy both character for character from those lines; leave out only separators between them (a dash, colon, equals sign or the gap between columns). Never write, correct, translate or complete anything. The word list's own heading (Ordlista, Ord, Glosor, Ordförklaringar …) is not part of an entry: put it in other.
- other: line numbers of everything else (page numbers, running headers, chapter and text labels such as "Kapitel 3" or "Text 5A", captions, exercises and questions, notes, advertising, text from a facing page).

Every line number goes in exactly one of the four. Most pages have no word list: then glossary is empty.`;

export function sanitizeOcrLines(lines) {
  return (Array.isArray(lines) ? lines : []).slice(0, 400).map((l) => ({
    text: String(l?.text || "").replace(/\s+/g, " ").trim().slice(0, 300),
    x: Number(l?.x) || 0, y: Number(l?.y) || 0, w: Number(l?.w) || 0, h: Number(l?.h) || 0,
  }));
}

const squash = (s) => String(s || "").replace(/\s+/g, " ").trim();

// Spelling key that ignores diacritics: the phone's OCR sometimes reads å / ä as ả, á, ã,
// which the model, looking at the photo, writes correctly.
const fold = (s) => squash(s).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// Turns the model's answer into { title, body: [line numbers], glossary: [{word, definition}] }.
// Lines the answer leaves out are kept in the body (nothing read is silently lost); a
// glossary item whose word or definition is not in its lines (diacritics aside) keeps the
// lines' own text as the word, with no definition.
// A word list entry the model ran into the next one ("en brist, -er för lite en vattenbrist
// när det inte finns …"): a later line of the entry that starts like a headword starts a
// new entry. A headword start is an article/verb with its own inflection ("en öken, öknar",
// "drabba, drabbas", "en yta, -or"), or "en"/"ett" + a word the article itself uses that is
// not already in the entry's first line ("en vattenbrist" — but not "en skatt" under "en
// trängselskatt"). Returns the headword, or "".
export function glossaryHeadwordAt(line, firstLine, bodyText) {
  const text = squash(line);
  const inflected = text.match(/^((?:(?:en|ett)\s+)?(\p{L}+)),\s*(-\p{L}+|\p{L}+)(?:,\s*\p{L}+)*/u);
  if (inflected) {
    const [whole, , stem, form] = inflected;
    // "öken, öknar": the inflected form shares the start of the word (two letters: a vowel can drop).
    if (form.startsWith("-") || (form.length >= 3 && fold(form).startsWith(fold(stem).slice(0, 2)))) return whole;
  }
  const noun = text.match(/^(?:en|ett)\s+(\p{L}{4,})/u);
  if (noun) {
    const word = fold(noun[1]);
    const stem = word.slice(0, Math.max(4, word.length - 2));
    if (!fold(firstLine).includes(word) && (fold(bodyText).match(/\p{L}+/gu) || []).some((t) => t.startsWith(stem))) return `${text.split(/\s+/).slice(0, 2).join(" ")}`;
  }
  return "";
}

// "överkon- sumerar": a word broken over two lines is read as one again.
const unbreak = (text) => text.replace(/(\p{Ll})- (\p{Ll})/gu, "$1$2");

export function assemblePageLayout(lines, parsed) {
  const n = lines.length;
  const valid = (i) => Number.isInteger(i) && i >= 0 && i < n;
  const used = new Set();
  const glossary = [];
  const titleIds = [...new Set((parsed?.title || []).filter(valid))].sort((a, b) => a - b);
  titleIds.forEach((i) => used.add(i));
  const title = squash(titleIds.map((i) => lines[i].text).join(" "));
  const bodyIds = new Set((parsed?.body || []).filter(valid));
  const bodyText = lines.filter((_, i) => bodyIds.has(i)).map((l) => l.text).join(" ");
  const entries = [];
  for (const g of Array.isArray(parsed?.glossary) ? parsed.glossary : []) {
    const ids = [...new Set((g.lines || []).filter(valid))].filter((i) => !used.has(i)).sort((a, b) => a - b);
    if (!ids.length) continue;
    ids.forEach((i) => used.add(i));
    let start = 0;
    for (let k = 1; k <= ids.length; k++) {
      let headword = k < ids.length ? glossaryHeadwordAt(lines[ids[k]].text, lines[ids[start]].text, bodyText) : "";
      // The model's own explanation already ended on the line before ("uppfatta, uppfattar
      // förstå" + "obekväm inte bekväm"): a next line whose first word is in the article is a new entry.
      if (k < ids.length && !headword && start === 0 && g.definition) {
        const sofar = fold(ids.slice(0, k).map((i) => lines[i].text).join(" "));
        const first = fold(lines[ids[k]].text).match(/^\p{L}{4,}/u)?.[0];
        const stem = first?.slice(0, Math.max(4, first.length - 2));
        if (first && sofar.endsWith(fold(g.definition)) && (fold(bodyText).match(/\p{L}+/gu) || []).some((t) => t.startsWith(stem))) headword = squash(lines[ids[k]].text).split(" ")[0];
      }
      if (k < ids.length && !headword) continue;
      // The first piece keeps the model's own word and definition; a split-off one starts
      // with the headword found in its first line.
      entries.push(start === 0 ? { ids: ids.slice(0, k), word: g.word, definition: k === ids.length ? g.definition : "" } : { ids: ids.slice(start, k), word: entries.at(-1).nextWord, definition: "" });
      if (headword) entries.at(-1).nextWord = headword;
      start = k;
    }
  }
  for (const g of entries) {
    const ids = g.ids;
    // A footnote marker (¹, read as ' or *) in front of the entry is not part of it.
    const marker = /^[’'`*¹²³⁴⁵⁶⁷⁸⁹⁰]+\s*/;
    let joined = unbreak(squash(ids.map((i) => lines[i].text).join(" ")).replace(marker, ""));
    const word = unbreak(squash(g.word).replace(marker, ""));
    let definition = unbreak(squash(g.definition));
    const at0 = fold(joined).indexOf(fold(word));
    // A piece without the model's definition: the explanation is what follows the word.
    if (!definition && word && at0 >= 0 && fold(joined).length === joined.length) definition = squash(joined.slice(at0 + word.length));
    // An entry starts with its word: text cited before it (a list heading) is dropped.
    const at = fold(joined).indexOf(fold(word));
    if (word && at > 0 && fold(joined).length === joined.length) joined = joined.slice(at);
    const f = fold(joined);
    if (word && definition && f.startsWith(fold(word)) && f.endsWith(fold(definition)) && word.length + definition.length <= joined.length) {
      glossary.push({ word, definition });
    } else if (joined) {
      // The model gave the whole entry as its word ("överkonsumera, överkonsumerar äta och
      // köpa för mycket"): the headword is the printed word with its forms, the rest explains it.
      const head = glossaryHeadwordAt(joined, "", bodyText);
      if (head && joined.length > head.length + 1 && fold(joined).startsWith(fold(head))) glossary.push({ word: head, definition: squash(joined.slice(head.length)).replace(/^[–—:=-]\s*/, "") });
      else glossary.push({ word: joined, definition: "" });
    }
  }
  const other = new Set((parsed?.other || []).filter(valid));
  const body = [];
  for (const i of parsed?.body || []) if (valid(i) && !used.has(i) && !other.has(i)) { used.add(i); body.push(i); }
  for (let i = 0; i < n; i++) if (!used.has(i) && !other.has(i) && lines[i].text) { used.add(i); body.push(i); }
  return { title, body, glossary };
}

export async function classifyPageLines({ imageDataUrl, lines }) {
  if (!OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY saknas på servern.");
    error.status = 500;
    throw error;
  }
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "array", items: { type: "integer" } },
      body: { type: "array", items: { type: "integer" } },
      glossary: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { lines: { type: "array", items: { type: "integer" } }, word: { type: "string" }, definition: { type: "string" } },
          required: ["lines", "word", "definition"],
        },
      },
      other: { type: "array", items: { type: "integer" } },
    },
    required: ["title", "body", "glossary", "other"],
  };
  const numbered = lines.map((l, i) => `${i}\t[${[l.x, l.y, l.w, l.h].map((v) => v.toFixed(3)).join(", ")}]\t${l.text}`).join("\n");
  const content = [{ type: "input_text", text: `OCR lines (number, [x, y, w, h], text):\n${numbered}` }];
  if (imageDataUrl) content.push({ type: "input_image", image_url: imageDataUrl });
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      reasoning: { effort: "low" },
      max_output_tokens: 6000,
      text: { format: { type: "json_schema", name: "page_layout", strict: true, schema } },
      input: [{ role: "system", content: LAYOUT_SYSTEM }, { role: "user", content }],
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error?.message || "OpenAI API request failed.");
    error.status = response.status;
    throw error;
  }
  return { ...assemblePageLayout(lines, JSON.parse(extractOutputText(data))), usage: data.usage || {} };
}

// Textbook word list as sent by a client: [{word, definition}] strings only, verbatim.
// Letters Swedish doesn't use that OCR reads for å / ö ("văt" for "våt", "mănga" for "många").
const OCR_LETTERS = { "ă": "å", "ắ": "å", "ằ": "å", "ẵ": "å", "ā": "å", "Ă": "Å", "õ": "ö", "ơ": "ö", "ỗ": "ö", "ố": "ö", "ồ": "ö", "Õ": "Ö" };
const OCR_LETTER_RE = new RegExp(`[${Object.keys(OCR_LETTERS).join("")}]`, "u");

/**
 * The word list with OCR letter slips put right — only where the corrected word is a
 * form SALDO knows and the misread one isn't, so nothing is changed on a guess.
 */
export async function repairGlossaryLetters(supabaseAdmin, glossary) {
  const suspicious = new Set();
  for (const g of glossary) for (const t of `${g.word} ${g.definition}`.match(/\p{L}+/gu) || []) if (OCR_LETTER_RE.test(t)) suspicious.add(t);
  if (!suspicious.size) return glossary;
  const fix = (t) => [...t].map((c) => OCR_LETTERS[c] || c).join("");
  const readings = await formReadings(supabaseAdmin, [...suspicious].flatMap((t) => [t, fix(t)]));
  const known = (t) => (readings.get(t.toLowerCase()) || []).length > 0;
  const repairs = new Map([...suspicious].filter((t) => !known(t) && known(fix(t))).map((t) => [t, fix(t)]));
  const apply = (text) => String(text || "").replace(/\p{L}+/gu, (t) => repairs.get(t) || t);
  return glossary.map((g) => ({ word: apply(g.word), definition: apply(g.definition) }));
}

export function sanitizeGlossary(glossary) {
  return (Array.isArray(glossary) ? glossary : [])
    .filter((g) => g && typeof g === "object")
    .map((g) => ({ word: squash(g.word).slice(0, 200), definition: squash(g.definition).slice(0, 500) }))
    .filter((g) => g.word)
    .slice(0, 80);
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

export function extractCandidateTokens(cleanedText) {
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
  return { freq, firstSeenCapitalized, properNouns: properNouns(cleanedText) };
}

// Names: words the text only ever writes with a capital, at least once inside a sentence
// ("i Malmö", "Anna och Erik"). A capital at the start of a sentence says nothing — the
// old rule (capital the first time + once in the text) left out every word that happened
// to open a sentence ("Arbetslösheten ökar …").
export function properNouns(text) {
  const lower = new Set();
  const inside = new Set();
  for (const t of textTokens(text)) {
    if (!/^\p{Lu}/u.test(t.raw)) lower.add(t.form);
    else if (t.i > 0) inside.add(t.form);
  }
  return new Set([...inside].filter((form) => !lower.has(form)));
}

// Every word of the text where it stands: sentence number s, place i in the sentence, the
// form in lower case, and k, its place among all the words of the text. Occurrences and
// overlaps with expressions are counted on these. cleanText changes only spaces, so k is the
// same word in the text the app shows (the app counts the same letter runs: its marks).
export function textTokens(text) {
  return splitSentences(text).flatMap((sentence, s) =>
    (sentence.match(/\p{L}+(?:-\p{L}+)?/gu) || []).map((raw, i) => ({ s, i, form: raw.toLowerCase(), raw })))
    .map((t, k) => ({ ...t, k }));
}

/**
 * Where an item stands in the text, for the app's marks (2026-11-09): for each place, the
 * words (k) that are the item's own — a particle verb's particle and an expression's words
 * however far apart, never the words between them. Each of `words` (lower case, placeholders
 * left out) is the form or a SALDO reading of one token of the sentence; the tokens are taken
 * in the expression's order when the sentence has them so ("ta … upp"), else wherever they are.
 */
export function itemSpots(words, sentenceTokens, readings, first = null) {
  const lemmas = (t) => [t.form, ...(readings.get(t.form) || []).map((r) => r.lemma.toLowerCase())];
  const pick = (ordered) => {
    const used = [];
    let from = 0;
    for (const w of words) {
      const pool = ordered ? sentenceTokens.slice(from) : sentenceTokens;
      const t = (first && w === words[0] ? [first] : []).concat(pool).find((x) => !used.includes(x) && lemmas(x).includes(w));
      if (!t) return null;
      used.push(t);
      from = sentenceTokens.indexOf(t) + 1;
    }
    return used.map((t) => t.k).sort((a, b) => a - b);
  };
  return pick(true) || pick(false);
}

// SALDO gives participles as adjectives, and an adjective's -t form is also the adverb.
const POS_READINGS = { presens_particip: ["adjective", "verb"], perfekt_particip: ["adjective", "verb"], adverb: ["adjective"], noun: ["adjective"] };
const fitsPos = (reading, pos) => !pos || reading === pos || (POS_READINGS[pos] || []).includes(reading);
// Endings a word SALDO doesn't know can have in the text (klimatkris → klimatkrisen).
const INFLECTION_ENDING = /^(?:|e|n|en|er|et|r|ar|or|na|ns|s|t|de|te|da|ta|des|tes|ade|at|are|arna|erna|orna|ens|ets|ena|ets)$/;

/**
 * Where a word occurs in the text (2026-11-07), by SALDO's readings of each form — "skrev"
 * is skriva, "gick" gå, "bröt" bryta — never by how a form begins, so "planet" counts
 * for plan only because SALDO reads it so. { at: tokens, posFits }: posFits is false when
 * SALDO reads every occurrence as another part of speech than `pos` (the text has the
 * verb, not the noun). A word no form of the text is a SALDO reading of (a compound or new
 * word SALDO lacks) is found as a form SALDO doesn't know either: the word itself, or it
 * with an inflectional ending.
 */
export function occurrences(lemma, pos, tokens, readings) {
  const word = String(lemma || "").trim().toLowerCase();
  if (!word) return { at: [], posFits: false };
  const readingsOf = (t) => readings.get(t.form) || [];
  const parts = word.split(/\s+/);
  if (parts.length > 1) {
    // A particle verb or other multi-word lemma: all its words in one sentence.
    const per = parts.map((w) => occurrences(w, null, tokens, readings).at);
    const sentences = per.map((list) => new Set(list.map((t) => t.s)));
    const at = per[0].filter((t) => sentences.every((set) => set.has(t.s)));
    return { at, posFits: true };
  }
  const withLemma = tokens.filter((t) => t.form === word || readingsOf(t).some((r) => r.lemma.toLowerCase() === word));
  if (withLemma.length) {
    const fitting = withLemma.filter((t) => t.form === word || !readingsOf(t).length
      || readingsOf(t).some((r) => r.lemma.toLowerCase() === word && fitsPos(r.pos, pos)));
    return fitting.length ? { at: fitting, posFits: true } : { at: withLemma, posFits: false };
  }
  const stem = word.length > 3 && /[aeo]$/.test(word) ? word.slice(0, -1) : word;
  const at = tokens.filter((t) => !readingsOf(t).length && t.form.startsWith(stem) && INFLECTION_ENDING.test(t.form.slice(stem.length)));
  return { at, posFits: true };
}

// 规范§3/§8: check user's own word state, then the main dictionary, before
// ever considering AI. Batches the lookup instead of one query per token.
// Every entry a form of the text can be (2026-11-07): token → [entries]. "var" is the
// adverb, the noun, the pronoun and a form of vara — the first one found used to stand for
// all of them. With SALDO's readings of the form, an entry the form can't be (a stray
// word_forms row) is left out; the AI picks among the rest by the sentence.
export async function matchAgainstCorpus(supabaseAdmin, tokens, nativeLanguage = "zh", readings = new Map()) {
  const found = new Map();
  if (!tokens.length) return found;
  const add = (token, row) => {
    const list = found.get(token) || found.set(token, []).get(token);
    if (list.some((w) => w.id === row.id)) return;
    const own = row.swedish.toLowerCase() === token;
    const r = readings.get(token) || [];
    if (!own && r.length && !r.some((x) => x.lemma.toLowerCase() === row.swedish.toLowerCase() && fitsPos(x.pos, row.part_of_speech))) return;
    list.push({ id: row.id, swedish: row.swedish, pos: row.part_of_speech, chinese: pickMeaning(row), cefr_level: row.cefr_level, frequency_rank: row.frequency_rank });
  };

  // chinese here is really "native-language meaning" (legacy field name) —
  // the learning_objects.chinese column stays zh-only, so a non-zh request
  // overrides it with the matching learning_object_translations row when one
  // exists (same override-else-fallback pattern as db.js's normalizeWord).
  const pickMeaning = (row) => {
    if (nativeLanguage === "zh") return row.chinese;
    const translated = (row.learning_object_translations || []).find((t) => t.native_language === nativeLanguage);
    // The chinese column is Chinese only: never a fallback for another language (2026-11-01).
    return translated?.meaning || "";
  };
  const selectCols = "id, swedish, part_of_speech, chinese, cefr_level, frequency_rank, learning_object_translations(meaning, native_language)";

  const chunks = (list, n = 150) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));
  for (const part of chunks(tokens)) {
    const { data: exact } = await supabaseAdmin
      .from("learning_objects")
      .select(selectCols)
      .eq("object_type", "word")
      .neq("status", "retired")
      .in("swedish", part);
    (exact || []).forEach((row) => add(row.swedish.toLowerCase(), row));
  }
  // Every token's forms too, also when a headword has its spelling ("var" is also vara's).
  for (const part of chunks(tokens)) {
    const { data: forms } = await supabaseAdmin.from("word_forms").select("learning_object_id, form_value").in("form_value", part);
    const ids = [...new Set((forms || []).map((f) => f.learning_object_id))];
    if (!ids.length) continue;
    const { data: baseWords } = await supabaseAdmin
      .from("learning_objects")
      .select(selectCols)
      .eq("object_type", "word")
      .neq("status", "retired")
      .in("id", ids);
    const byId = new Map((baseWords || []).map((w) => [w.id, w]));
    (forms || []).forEach((f) => {
      const base = byId.get(f.learning_object_id);
      if (base) add(f.form_value.toLowerCase(), base);
    });
  }
  // A form the entry's word_forms don't list ("exponerades", "ifrågasatts"): the headwords
  // SALDO reads it as (2026-11-07 test run: exponera and ifrågasätta never reached the list).
  const byLemma = new Map();
  for (const token of tokens) for (const r of readings.get(token) || []) {
    const lemma = r.lemma.toLowerCase();
    if (lemma !== token) (byLemma.get(lemma) || byLemma.set(lemma, new Set()).get(lemma)).add(token);
  }
  for (const part of chunks([...byLemma.keys()])) {
    const { data: rows } = await supabaseAdmin
      .from("learning_objects")
      .select(selectCols)
      .eq("object_type", "word")
      .neq("status", "retired")
      .in("swedish", part);
    (rows || []).forEach((row) => byLemma.get(row.swedish.toLowerCase())?.forEach((token) => add(token, row)));
  }
  for (const [token, list] of found) if (!list.length) found.delete(token);
  return found;
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

// V2.1 阅读AI提取规则 §四 (2026-08-11): months/weekdays and very common
// deictic time words are excluded even though they pass the POS/frequency
// filters below — Swedish month names are lowercase so the proper-noun
// capitalization heuristic can't catch them, and words like "idag"/"nu" are
// far too basic to earn a vocabulary slot on their own. If one of these is
// genuinely doing something idiomatic in the text, selectReadingContent
// (which reads the whole text independently, not this candidate list) still
// catches it as a phrase — this only stops the bare word from competing for
// a Viktiga ord slot.
const LOW_VALUE_TIME_WORDS = new Set([
  "januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti",
  "september", "oktober", "november", "december",
  "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag", "söndag",
  "idag", "igår", "imorgon", "nu", "sedan", "snart", "nyss", "strax",
]);

// The pool is shared by everyone who reads this text, so it is never filtered by
// one reader's mastered words — each reader's own mastered words are swapped for
// other candidates on their device (2026-10-30).
// How many dictionary words found in a text are offered to the AI (most texts have
// fewer): more for a longer text, so a word there isn't cut before the AI sees it.
// The AI also adds words from the text that aren't offered, but seldom (4 % of its picks).
// A B2–C1 text of standard length has over 100 such words, and at 40 the common abstract
// ones were cut first ("utveckling", "förutsättning", "insats", "omständighet": frequent,
// so worth little in the pool's order); at 60, 96 % of the reference words reach the AI
// instead of 90 % (2026-11-07, 36 texts).
export const POOL_SIZE = { standard: 60, long: 60, overlong: 80 };

// The candidates in the order their words first occur in the text (freq keeps that order).
export function inTextOrder(pool, freq) {
  const position = new Map([...freq.keys()].map((token, i) => [token, i]));
  return [...pool].sort((a, b) => (position.get(a.token) ?? 0) - (position.get(b.token) ?? 0));
}

// How likely a dictionary word found in the text is worth a learner's attention, for
// cutting the pool before the AI sees it: rarer (Kelly rank) and harder (CEFR) first, a
// word used more than once a little higher. Occurring once never removes a word — the
// old order (occurrences first) cut a key term the text names once.
const CEFR_WEIGHT = { A1: 0, A2: 0.1, B1: 0.2, B2: 0.35, C1: 0.45, C2: 0.5 };
// An entry without a frequency rank counted as the rarest (2026-11-07 test): "ta", "vara"
// and "ge" took places in most pools (77 places over 30 texts). Without a rank the level
// stands in: A1–A2 count as common, others as fairly rare.
export function poolValue(c) {
  const f = c.word.frequency_rank;
  const rank = f ? Math.min(f, 20000) / 20000 : ({ A1: 0, A2: 0.3 }[c.word.cefr_level] ?? 0.8);
  return rank + (CEFR_WEIGHT[c.word.cefr_level] ?? 0.3) + 0.1 * Math.min(c.occurrences, 4);
}

export function rankFoundWords(found, freq, properNounSet, limit) {
  const excludedPos = new Set(["preposition", "conjunction", "pronoun", "numeral", "interjection"]);
  const pairs = [...found.entries()].flatMap(([token, words]) => (Array.isArray(words) ? words : [words]).map((word) => [token, word]));
  const candidates = pairs
    .filter(([token, word]) => HIGH_VALUE_CONNECTIVES.has(token) || !excludedPos.has(word.pos))
    // Names (only ever capitalised, also inside a sentence); a capital at the start of a
    // sentence doesn't make a word a name ("Trots att …", "Arbetslösheten …").
    .filter(([token]) => HIGH_VALUE_CONNECTIVES.has(token) || !properNounSet.has(token))
    .filter(([token, word]) => HIGH_VALUE_CONNECTIVES.has(token) || !word.frequency_rank || word.frequency_rank > VERY_COMMON_FREQUENCY_RANK)
    .filter(([token]) => !LOW_VALUE_TIME_WORDS.has(token))
    .map(([token, word]) => ({ token, word, occurrences: freq.get(token) || 1 }));

  // One candidate per entry: its forms in the text together ("ledighet", "ledigheten").
  const byWordId = new Map();
  for (const c of candidates) {
    const existing = byWordId.get(c.word.id);
    if (!existing) byWordId.set(c.word.id, { ...c });
    else existing.occurrences += c.occurrences;
  }
  const deduped = [...byWordId.values()];

  deduped.sort((a, b) => {
    // Connectives are common by definition: bucketed first so they reach the AI (the
    // AI still decides whether one earns a place in this text).
    const aConn = HIGH_VALUE_CONNECTIVES.has(a.token);
    const bConn = HIGH_VALUE_CONNECTIVES.has(b.token);
    if (aConn !== bConn) return aConn ? -1 : 1;
    return poolValue(b) - poolValue(a);
  });
  return deduped.slice(0, limit);
}

// AI Worth Learning ranking (2026-07-30, 桌面AI语义评分.pages, approved by
// Rachel same day) — the DB-mechanical filter above does the "90%"
// (POS/proper-noun/frequency/dedup exclusion); the AI orders what's left by how
// genuinely worth learning each word is IN THIS ARTICLE. Since 2026-10-30 this
// runs inside selectReadingContent's single call and the AI may also add words the
// dictionary doesn't have; since 2026-10-31 it is a relative order, not a 0-100 score.
// Reading selection (2026-11-07): ranked by what a learner gains from saving a word and
// meeting it again; being on the text's topic is no reason by itself. The earlier ranking put
// the text's subject terms first, and they took most places (17 of 49 shown words were narrow
// subject terms, against 9 with this one, on the 12 test texts).
const WORTH_LEARNING_DIMENSIONS = `1. Transfer value — will the learner meet and use this word again across many other texts, in speaking and in writing?
2. Does it help understand THIS text — does a sentence's meaning or a main point depend on it?
3. Is it a word learners need actively, to say or write things themselves (verbs, adjectives, adverbs, connectives that express a stance or relation), not only to recognise?
4. Is it a common "reading obstacle" word — one learners recognize on sight but keep forgetting (often abstract nouns, adverbs)?
5. Does it easily expand into a useful word family?

Calibration:
- "och", "väldigt" → left out. Generic, contributes nothing specific.
- "tvärtom", "trots", "emellertid" → near the top: a connective that flips or qualifies a sentence's meaning is used in every kind of text. A connective that only adds, orders or sums up ("också", "alltså", "först") steers far less; take it only when the text has little else.
- A verb, adjective or adverb that carries a main point or the writer's stance ("avgöra", "hindra", "sårbar", "omfattande") → near the top.
- The term naming what the text is about ("blodtryck" in a health text, "koldioxid" in a climate text) → among the shown words, but one or two, not every term of the subject.
- A word that only names everyday things in the subject area, or a transparent compound of known parts → left out.
- A phrasal verb sense ("lägga ner", "komma fram till") → near the top.
- A basic everyday word used in its ordinary sense ("barn", "hus", "dag", "ofta", "göra", "gå", "bra", "stor") → left out: a reader who can read this text already knows it.
How often a word occurs in the text is never a reason to include it.

Category exclusions — leave the word out if it is:
- A person name, place name, or country/nationality name.
- A month or weekday name, a specific date, or a plain number used as a quantity.
- A very common deictic time word ("idag", "nu", "sedan") doing nothing unusual here.`;

// One bundled call per article (2026-10-30): keywords (ordered dictionary
// candidates + words the AI adds itself), collocations, idioms, key sentences,
// language patterns, each list best first (the text's CEFR level comes from the
// fast layer). Fraser (collocations) and Uttryck
// (idioms) keep separate criteria since they're genuinely different things. The
// learner's own level is NOT sent: the result is shared by every reader of the
// text and each reader's device orders it for their level.
// The textbook prints its own word list as dictionary-style entries ("turnera, turnerar",
// "en succé, -er", "uthållig"); the base forms in them, lowercased, so a keyword or
// expression the book already explains is not offered again. (Matching the printed
// entry as a whole, as before, never matched "uppmuntra, uppmuntrar" to "uppmuntra".)
export function glossaryForms(glossary = []) {
  const forms = new Set();
  for (const g of glossary || []) {
    for (const part of String(g?.word || "").split(",")) {
      const form = part.trim().toLowerCase().replace(/^(en|ett|att)\s+/, "");
      if (form && !form.startsWith("-")) forms.add(form);
    }
  }
  return forms;
}

const expressionKey = (text) => String(text || "").toLowerCase().replace(/[^\p{L}\s]/gu, " ").replace(/\s+/g, " ").trim();

// One expression is one knowledge point: shown once, in the first list that has it
// (Fasta fraser before Idiomatiska uttryck), and not when the book's word list has it.
// An expression inside another one is the same knowledge point too (2026-11-07 test: "ha
// svårt att" and "ha svårt att andas", "vara med om" and "vara med om något"): the one
// earlier in the lists stays, the other is left out.
export function distinctExpressions(collocations = [], idioms = [], glossary = []) {
  const seen = new Set([...glossaryForms(glossary)].map(expressionKey));
  const kept = [];
  const words = (key) => key.split(" ").filter((w) => !EXPRESSION_PLACEHOLDERS.has(w));
  const inside = (a, b) => a.length > 0 && a.length <= b.length && b.some((_, i) => a.every((w, j) => b[i + j] === w));
  const keep = (list) => list.filter((e) => {
    const key = expressionKey(e.expression_text);
    if (!key || seen.has(key)) return false;
    const w = words(key);
    if (kept.some((k) => inside(w, k) || inside(k, w))) return false;
    seen.add(key);
    kept.push(w);
    return true;
  });
  return { collocations: keep(collocations), idioms: keep(idioms) };
}

/**
 * An expression in the form a learner saves it (2026-11-07 test: "ifrågasatts av", "återgår
 * till", "Oavsett utgång" came back as the text has them): a first word
 * SALDO reads only as a form of one verb becomes its infinitive — an s-form the s-infinitive
 * ("ifrågasatts av" → "ifrågasättas av"), a supine or participle excepted — and a capital first letter a small one, unless the
 * word is a name or an abbreviation (no lower-case reading).
 */
export function expressionBaseForm(text, readings) {
  const words = String(text || "").trim().split(/\s+/);
  if (!words[0] || !readings) return String(text || "").trim();
  const lower = words[0].toLowerCase();
  const own = readings.get(lower) || [];
  if (words[0] !== lower && words[0].slice(1) === lower.slice(1) && own.length) words[0] = lower;
  const verbs = [...new Set(own.filter((r) => r.pos === "verb").map((r) => r.lemma.toLowerCase()))];
  // A supine or participle stays: as the first word it is mostly a preposition of its own
  // ("jämfört med", "beroende på"), which an infinitive would turn into another expression.
  const participle = /(?:t|nde)$/.test(lower);
  if (words[0] === lower && !participle && own.length && verbs.length === 1 && own.every((r) => r.pos === "verb") && verbs[0] !== lower && !verbs[0].includes(" ")) {
    const lemma = verbs[0];
    words[0] = lower.endsWith("s") && !lemma.endsWith("s") ? `${lemma}s` : lemma;
  }
  return words.join(" ");
}

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
// Why a keyword earns its place (the AI labels each one).
const VALUE_ORDER = `Order the list by what a learner gains from saving the word and meeting it again — in other texts and in their own speaking and writing — together with how much this text depends on it; being related to the topic is not by itself a reason to take a word:
  (a) Words of transferable value come first: they help to understand this text AND are used across many other texts and situations — verbs, adjectives, adverbs and connectives that carry a main point, a relation or the writer's stance ("kräva", "hota", "hindra", "tveksam", "tvärtom"), and general nouns of wide use ("förutsättning", "anledning"). The part of speech is never a quota: a widely used noun beats a narrow verb.
  (b) The subject term(s) the text cannot be understood without — the word naming what it is about ("elpris" in a text about electricity prices, "vaccin" in one about a vaccination programme) — belong among the shown words too, even though they are seldom used outside the subject: usually one or two, as many as the text really needs, never every term of the subject.
  (c) A word earns nothing for being on the topic: a word that merely names something in the subject area, a word a reader around this text's level almost certainly knows already ("hjälpa", "kostnad" for a B1 reader), or one they can read off from parts they know (a transparent compound such as "skolgård" or "sommarlov") is left out.
Fewer is better than weaker: the number is a maximum, never a target.`;

const VOCABULARY_REASONS = ["topic", "specific_use", "connective", "new_word"];

/**
 * The AI's reasons, held to what they mean (2026-11-07 test, 18 new texts): "topic" — which
 * keeps a word in an advanced reader's list whatever its level — was given to 44 of 93 words,
 * "berätta", "öka" and "kontakta" among them, and "connective" to verbs ("kombinera"). Only
 * the first three "topic" words in the AI's order keep it, and a noun, verb or adjective is
 * never a connective; both become "new_word".
 */
export function tidyReasons(vocabulary = []) {
  let topics = 0;
  return vocabulary.map((v) => {
    if (v.reason === "topic" && ++topics > 3) return { ...v, reason: "new_word" };
    if (v.reason === "connective" && ["noun", "verb", "adjective"].includes(v.pos)) return { ...v, reason: "new_word" };
    return v;
  });
}

/**
 * A word the dictionary rates A1 (2026-11-07): left out in its plain everyday use, kept
 * when it does something a learner must notice — one of the connectives that steer a
 * sentence (trots, däremot …), a connective use of a function word, or a use the AI
 * contrasts with the everyday sense (everyday_sense false: "gå" in "det gick bra", "hålla"
 * in "hålla med"). The bare "specific use" label let "alltid", "igen" and "lära" through
 * (2026-11-01); asking whether the use is the everyday one doesn't.
 */
export function keepsA1Word(v, entry, textCefr = null) {
  if (HIGH_VALUE_CONNECTIVES.has(String(entry?.swedish || v.swedish || "").toLowerCase())) return true;
  // A connective of any function-word class ("vilket" in "vilket i sin tur" is a pronoun).
  if (v.reason === "connective" && !["noun", "verb", "adjective"].includes(v.pos)) return true;
  // A use other than the everyday one, whatever the AI's reason: "gick" in "det gick bra",
  // "det" as a formal subject, "man" as the generic pronoun.
  if (v.everyday_sense === false) return true;
  // The term a beginners' text (A1–A2) is about, whose readers may not know it yet ("får" the
  // sheep in a text about a farm); "topic" is only given to the text's key terms.
  return v.reason === "topic" && /^A[12]/.test(String(textCefr || ""));
}
const READING_POS = ["verb", "noun", "adjective", "adverb", "pronoun", "preposition", "conjunction", "numeral", "interjection", "other"];

// Reserves beyond what is shown (2026-11-07): each reader's device swaps out words the
// reader has mastered or that are far below their level for these, in order. Half as many
// again plus two, at least four (a short text's two reserves ran out at the first swap,
// 2026-11-07 test run) — not so many that weak words come in (asking for more invited
// padding, 2026-11-01); they meet the same bar as the rest.
export const reserveFor = (shown) => Math.max(4, Math.ceil(shown / 2) + 2);

export async function selectReadingContent(cleanedText, tier, glossary = [], vocabularyPool = [], nativeLanguage = "zh", textCefr = null) {
  const langName = languageName(nativeLanguage);
  const tierConfig = LENGTH_TIERS[tier === "oversized" ? "overlong" : tier];
  const vocabMax = keywordLimit(countWords(cleanedText), tier, vocabularyPool);
  const vocabCandidates = vocabMax + reserveFor(vocabMax);
  const [, sentMax] = tierConfig.keySentences;
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      article: {
        type: "object",
        additionalProperties: false,
        properties: {
          topic: { type: "string" },
          core_points: { type: "array", items: { type: "string" } },
          key_terms: { type: "array", items: { type: "string" } },
        },
        required: ["topic", "core_points", "key_terms"],
      },
      vocabulary: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            swedish: { type: "string" },
            pos: { type: "string", enum: READING_POS },
            meaning: { type: "string" },
            reason: { type: "string", enum: VOCABULARY_REASONS },
            everyday_sense: { type: "boolean" },
            sentence: { type: "string" },
          },
          required: ["swedish", "pos", "meaning", "reason", "everyday_sense", "sentence"],
        },
      },
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
    required: ["article", "vocabulary", "key_sentences", "language_patterns"],
  };
  // The book's own word list is a hint about what matters in the text, not a list to keep
  // out (2026-11-02): leaving its words out took "koldioxid", "nederbörd", "översvämning"
  // away from a climate text and left "problem" and "rik" in their place.
  const glossaryNote = glossary.length
    ? `\n\nThe textbook prints its own word list for this text: ${[...glossaryForms(glossary)].join(", ")}. These words are judged like every other word in the text — being in the book's list neither excludes a word nor qualifies it on its own (the book often explains exactly the text's key terms, and they belong among the keywords then).`
    : "";
  const candidateList = vocabularyPool.length
    ? vocabularyPool.map((c) => `${c.word.swedish} (${(c.posOptions?.length ? c.posOptions : [c.word.pos || "?"]).join("/")}${c.word.cefr_level ? `, ${c.word.cefr_level}` : ""})`).join(", ")
    : "(none)";
  const { result, usage } = await callOpenAI({
    schemaName: "reading_selection",
    schema,
    maxOutputTokens: 6000,
    systemPrompt: `You select what is worth learning in a Swedish text for a ${langName}-speaking learner — never invent content, everything must actually appear in the text. Every field named *_zh below (meaning_zh, source_sentence_zh, translation_zh) and every "meaning" must be written entirely in ${langName} regardless of its name — never in Chinese unless ${langName} is Chinese, and never let a stray Swedish or ${langName} word drift into a field written in the other language.

Every list below is ordered from most to least worth learning IN THIS TEXT — the vocabulary as its own paragraph says, the other lists by how much understanding the text depends on the item. Difficulty is only a secondary hint (the dictionary level is given for listed candidates). There is no target number for any list — the text decides: a plain text may have only a few items, a dense one more. Never add an item to reach a number.${textCefr ? `

The text as a whole is about ${textCefr} level, so its readers are learners around that level. Use that for the words of middling importance: a word well below ${textCefr} used in its everyday sense is one such a reader already knows and teaches nothing here; a word around or above ${textCefr} that the text needs is worth a place. Never leave out the subject term(s) the text cannot be understood without because of their level, and never pick a word only because it is rare.` : ""}

0. article: first read the whole text and work out what it is about — topic (one line), core_points (its main points, a few short lines) and key_terms (the words and terms in the text that carry those points, as they appear in it). Everything below is chosen with this in mind.

1. vocabulary: the single words in this text genuinely worth a learner's attention, best first, at most ${vocabCandidates}. The first ${vocabMax} are shown; the ones after are reserves, taken only for a reader who already knows some of the first — they must meet exactly the same bar, so stop as soon as no further word does. ${VALUE_ORDER} Words may come from the candidate list or from anywhere else in the text, in the book's word list or not. A word earns a place only if it does at least one of these: is a subject term the text cannot be understood without (b above); is used here in a specific sense, register or construction the reader must notice (not its everyday basic sense); is a connective/discourse word that steers a sentence's meaning; or is a less common word a reader of this text is unlikely to know yet and will meet again. The user message lists the dictionary words found in the text as "lemma (parts of speech, CEFR)", in the order they occur — it is not a ranking, and many of the text's most important words are not in it: compounds and rarer terms, but just as often verbs, adjectives and abstract nouns of wide use that the dictionary lacks. Read the text itself for those before ranking — a word's absence from the list says nothing about its value. Take a listed word with its lemma exactly as given, and add any other word from the text that deserves a place just as readily — give its dictionary lemma (infinitive for verbs, singular indefinite for nouns), not the inflected form in the text. pos = the part of speech the word has in ITS sentence in this text — a spelling can have several ("torka (noun/verb)": "svår torka" is the noun, "torka håret" the verb); decide from the sentence, never from the list order. sentence = that sentence, quoted exactly from the text. meaning = a short ${langName} meaning (a few words) as used in that sentence, for that part of speech, not every sense the word has. reason = which of the four it does: "topic", "specific_use", "connective" or "new_word" — if none honestly fits, the word does not belong in the list. "topic" only for the subject term(s) of (b) — usually one or two, never more than three; any other word, however central to the subject, is "new_word" if it is worth learning at all. "connective" only for a word that links sentences or clauses (a conjunction, an adverb such as "alltså" or "däremot"), never for a noun, verb or adjective. everyday_sense = true when the word is used here in its most ordinary dictionary sense, false when this sentence uses it in another sense or a construction that differs from it ("gick" in "det gick bra", "hålla" in "hålla med"); a word chosen as "specific_use" in its everyday sense is not a specific use. Most listed candidates are simply words that occur in the text; expect to leave most of them out. How difficult a word is only helps choose between words of similar value; it never removes a subject term the text depends on, and a simple-looking word is not left out when this sentence uses it in a sense of its own — what counts is what it does in this text. A word that is only there as part of a fixed phrase ("exempel" in "till exempel", "eget" in "på mitt eget sätt") is not a keyword — fixed phrases are chosen in a separate step. A general word that only frames the subject ("undersöka", "påverka", "visa", "problem" in a research or news text) is not a "topic" word — the terms of the subject itself are. A basic function word every learner knows (a modal or auxiliary verb such as "måste", "kan", "ska"; a personal pronoun; an everyday preposition) is never a keyword unless this sentence uses it in a sense of its own. Use these dimensions together:
${WORTH_LEARNING_DIMENSIONS}

Fixed phrases and idioms are chosen in a separate step (selectExpressions), not here.

4. key_sentences (at most ${Math.min(sentMax, MAX_KEY_SENTENCES)}, as many as truly qualify — often none): sentences with real comprehension/language-learning value — NOT sentences that matter to the plot. Select a sentence only when at least one of these applies, in priority order:
   a. (highest priority) The words are individually simple, but the sentence as a whole is hard to understand — e.g. a non-literal phrase, an idiom, or a combination whose meaning isn't the sum of its parts.
   b. Complex structure: multiple clauses, embedded subordinate clauses, unusual word order, or long-distance dependencies between sentence parts.
   c. Ellipsis: a meaningful chunk of the sentence is grammatically omitted and must be inferred.
   d. A tense relationship worth explaining — e.g. past perfect marking an "earlier past" within past narration — but only when the tense actually affects comprehension, not for routine tense usage.
   e. Unclear reference or implied meaning — a pronoun or demonstrative (det/sådant/allt det där) that's genuinely hard to resolve without context.
   f. Tone, attitude, or a rhetorical question that changes the sentence's real meaning beyond its literal words.
   g. The sentence models a high-value, directly-reusable expression structure.
   Do NOT select a sentence merely because: it's plot-important, it's the article's first sentence, it contains exactly one unfamiliar word (that word belongs in the vocabulary, not here), its word order is perfectly ordinary, its structure is very basic, or it's a simple factual statement with no extra comprehension difficulty. Every sentence returned here must genuinely be worth practicing aloud, so mark shadowing_suitable=true for all of them; return fewer (even zero) rather than padding with plot-important-but-linguistically-plain sentences. "reason" is shown directly to the learner in the app UI, written in ${langName} (like meaning_zh/translation_zh elsewhere) — it must explain the ACTUAL comprehension mechanism, never a generic label alone like "clause structure" or "rhetorical question". Required depth — for the Swedish sentence "Trots att det inte var december än hade affärerna redan börjat julskylta.", a reason at this level of specific detail (written in ${langName}, this is just illustrating the depth/specificity expected): "trots att introduces a concessive clause; än here means 'yet/still'; hade börjat is past perfect, marking that this had already started before the story's current point in time" — not a bare label like "past perfect". Don't select one only to re-teach a point already fully covered by a keyword you're returning or by a fixed phrase or idiom in it.

5. language_patterns (0-4, never more than 4): notable SENTENCE-LEVEL constructions worth noticing — a subordinating conjunction + clause type, a word-order phenomenon, a tense used in a distinctive way (e.g. "trots att + bisats" meaning "even though..."). This is NOT a grammar lesson (don't explain verb conjugation tables or general tense rules — any generic AI chatbot already does that) and it must NOT be a fixed phrase or idiom (those are word/phrase-level, chosen separately; this is sentence-construction-level). The test: can the learner directly substitute their own words into this pattern and reuse it in a new spoken or written sentence? If not, don't extract it — e.g. "när + bisats", "subjekt + verb", or "adjektiv + substantiv" are all far too basic/broad to have real learning value as a "pattern", even though they're technically patterns. Give the pattern name, its meaning in ${langName}, and quote one example sentence from the text verbatim. Return fewer (even zero) rather than padding — most short/simple texts genuinely have 0-2 of these, not 4.

Every source_sentence/sentence must be quoted exactly from the text. Return empty arrays for any category with nothing genuinely worth flagging — do not pad to hit a target count.${glossaryNote}`,
    userPrompt: `Text:\n${cleanedText}\n\nDictionary candidates: ${candidateList}`,
  });
  return {
    article: result.article,
    // A look-alike Cyrillic letter in a chosen word ("gällа", 2026-11-07) made it "not in the text".
    vocabulary: (result.vocabulary || []).slice(0, vocabCandidates).map((v) => ({ ...v, swedish: latinLookalikes(v.swedish), sentence: latinLookalikes(v.sentence) })),
    keySentences: (result.key_sentences || []).slice(0, MAX_KEY_SENTENCES),
    languagePatterns: (result.language_patterns || []).slice(0, MAX_LANGUAGE_PATTERNS),
    usage,
  };
}

// Fasta fraser and Idiomatiska uttryck in a call of their own (2026-11-01, "plan C"):
// bundled with the keywords, the model skipped most expressions ("spela roll", "när det
// gäller" 0 of 5 runs); on its own, going through the numbered sentences one by one and
// judging every candidate, it found them in 4-5 of 5 runs at about the same speed (the
// two calls run side by side). Every candidate gets the same three-step decision, so the
// two lists follow one rule rather than a list of special cases.
const EXPRESSION_PLACEHOLDERS = new Set(["någon", "något", "några", "någons", "sig", "sin", "sitt", "sina", "en", "ett"]);
const normalizeSpace = (text) => String(text || "").replace(/\s+/g, " ").trim().toLowerCase();

export function splitSentences(text) {
  return String(text || "").replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[-–A-ZÅÄÖ])/).map((s) => s.trim()).filter(Boolean);
}

// Strong verbs change their stem when inflected ("ta" → "tog", "göra" → "gjorde"), so their
// infinitive can't be found in the sentence by its start.
const STRONG_VERBS = new Set(["vara", "ha", "göra", "ta", "gå", "få", "se", "ge", "komma", "bli", "hålla", "sätta", "lägga", "ligga", "stå", "sitta", "dra", "slå", "säga", "veta", "finnas", "bära", "falla", "låta", "välja", "sälja", "vinna", "äta", "dricka", "skriva", "stiga", "bryta", "gripa", "sticka", "springa", "binda", "finna", "hinna", "försvinna", "be", "dö", "le", "kunna", "vilja", "skola", "böra", "måste"]);

// An expression is kept only if it is written in Swedish letters (one came back with a
// Cyrillic "а"; look-alikes are now put back first, latinLookalikes), its sentence is quoted
// from the text, and each of its words (but a "någon"/"sig" placeholder or a strong verb's
// infinitive) is in that sentence — so nothing is taken that the text doesn't have ("äga sig åt" for a text with "ägnar sig åt").
export function expressionInText(e, text, readings = null) {
  const expression = String(e?.expression_text || "").trim();
  if (!/^[\p{Script=Latin}\s'’\-\/]+$/u.test(expression) || expression.split(/\s+/).length < 2) return false;
  const sentence = normalizeSpace(e.source_sentence);
  if (!sentence || !normalizeSpace(text).includes(sentence)) return false;
  const tokens = sentence.match(/\p{L}+/gu) || [];
  const words = expression.toLowerCase().split(/[\s\/]+/).filter((w) => w.length > 1 && !EXPRESSION_PLACEHOLDERS.has(w));
  // A form SALDO reads as the word counts too ("kändes" for "kännas", 2026-11-07 test).
  const lemmaOf = (t) => (readings?.get(t.toLowerCase()) || []).map((r) => r.lemma.toLowerCase());
  const found = (w) => tokens.some((t) => t.startsWith(w.length <= 4 ? w : w.slice(0, -2)) || lemmaOf(t).some((l) => l === w || `${l}s` === w));
  return words.some(found) && words.every((w) => found(w) || STRONG_VERBS.has(w));
}

// The scan's verdict decides the list (one rule for every expression: not what the words
// say → Idiomatiska uttryck; what they say, but fixed words → Fasta fraser), whichever
// list the model put it in. One the scan didn't judge, judged "neither", or not in the
// text is left out — so an expression can't land in both lists or in the wrong one.
// The sentence of the text the quote comes from, exactly as the text has it.
export function textSentence(quote, text) {
  const wanted = normalizeSpace(quote);
  if (!wanted) return "";
  return splitSentences(text).find((s) => normalizeSpace(s).includes(wanted)) || "";
}

export function expressionCategory(c) {
  if (c?.verdict === "idiom") return "idiom";
  if (c?.verdict === "fast_fras") return "collocation";
  return null;
}

export function sortExpressions(result, text, readings = null) {
  const judged = new Map();
  for (const s of result?.scan || []) {
    for (const c of s.candidates || []) {
      const key = expressionKey(c.expression);
      if (key && !judged.has(key)) judged.set(key, { ...c, sentence: s.sentence });
    }
  }
  const sentences = splitSentences(text);
  const collocations = [];
  const idioms = [];
  const placed = new Set();
  // Why each chosen expression was left out: an empty list after a choice is then told
  // apart from a text with nothing to choose.
  const dropped = { not_in_text: 0, not_judged: 0, neither: 0, repeated: 0 };
  let recovered = 0;
  for (const quoted of [...(result?.collocations || []), ...(result?.idioms || [])]) {
    // The model sometimes keeps the sentence's number from the prompt ("[4] …", "4] …",
    // "4. …"): every quote then failed the check and the whole list came back empty
    // (2026-11-07 test, about 1 call in 8).
    let quote = { ...quoted, expression_text: latinLookalikes(quoted.expression_text), source_sentence: latinLookalikes(String(quoted.source_sentence || "").replace(/^\s*[\[(]?\d+(?:[\]).:]\s*|\s+)/, "")) };
    const verdict = judged.get(expressionKey(quote.expression_text));
    // A quote in some other shape (2026-11-07: all six of a text's chosen expressions, each
    // judged in the scan, were left out once): the sentence the scan found it in, when the
    // expression is in that sentence.
    if (!expressionInText(quote, text, readings) && verdict && sentences[verdict.sentence - 1]) {
      const own = { ...quote, source_sentence: sentences[verdict.sentence - 1] };
      if (expressionInText(own, text, readings)) { quote = own; recovered++; }
    }
    if (!expressionInText(quote, text, readings)) { dropped.not_in_text++; continue; }
    const e = { ...quote, expression_text: expressionBaseForm(quote.expression_text, readings) };
    const key = expressionKey(e.expression_text);
    if (placed.has(key)) { dropped.repeated++; continue; }
    placed.add(key);
    const category = expressionCategory(verdict);
    if (!category) { dropped[verdict ? "neither" : "not_judged"]++; continue; }
    // Shown as the text's own sentence, never the model's copy of it (a copy that only
    // differs in case or spacing passes the check above).
    const own = textSentence(e.source_sentence, text);
    const kept = own ? { ...e, source_sentence: own } : e;
    if (category === "idiom") idioms.push(kept);
    else collocations.push(kept);
  }
  return { collocations, idioms, dropped, recovered };
}

export async function selectExpressions(cleanedText, tier, glossary = [], nativeLanguage = "zh", readings = null) {
  const langName = languageName(nativeLanguage);
  const tierConfig = LENGTH_TIERS[tier === "oversized" ? "overlong" : tier];
  const collocMax = tierConfig.keyCollocations[1];
  const idiomMax = tierConfig.keyIdioms[1];
  // Reserves for a reader who already knows some of the shown ones (2026-11-07), asked for
  // in lists of their own: allowed more in the same lists, the model let weaker expressions
  // ("handla om", "bo kvar") into the shown places (12-text test, 29 → 25 of 46).
  const collocReserve = 2;
  const idiomReserve = 1;
  const sentences = splitSentences(cleanedText);
  const candidate = {
    type: "object",
    additionalProperties: false,
    properties: {
      expression: { type: "string" },
      word_for_word: { type: "string" },
      meaning_here: { type: "string" },
      verdict: { type: "string", enum: ["idiom", "fast_fras", "neither"] },
    },
    required: ["expression", "word_for_word", "meaning_here", "verdict"],
  };
  const pick = {
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
      scan: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { sentence: { type: "integer" }, candidates: { type: "array", items: candidate } },
          required: ["sentence", "candidates"],
        },
      },
      collocations: { type: "array", items: pick },
      idioms: { type: "array", items: pick },
      reserve_collocations: { type: "array", items: pick },
      reserve_idioms: { type: "array", items: pick },
    },
    required: ["scan", "collocations", "idioms", "reserve_collocations", "reserve_idioms"],
  };
  const glossaryList = [...glossaryForms(glossary)].join(", ");
  const { result, usage } = await callOpenAI({
    schemaName: "reading_expressions",
    schema,
    maxOutputTokens: 8000,
    systemPrompt: `You find the multi-word expressions in a Swedish text that a ${langName}-speaking learner should learn as units. Never invent anything: every expression must occur in the text. meaning_zh, source_sentence_zh and word_for_word are written entirely in ${langName} regardless of their names.

Step 1 — scan: go through the numbered sentences in order, one entry per sentence (a sentence with no candidates gets an empty list). For each sentence list every multi-word combination in it that might be a fixed unit, in its learnable form: verbs in the infinitive, "någon"/"något" for an open slot ("hade skänkt bort huset" → "skänka bort något"), and without words that only belong to this sentence — numbers, quantifiers and descriptive words around the fixed part ("tog flera viktiga beslut" → "ta beslut"). Check especially: a light verb with a noun (göra/ta/ha/få/spela/sätta/komma/hålla + noun), verb + particle or preposition, adjective + preposition, set linking phrases, fixed "x och y" pairs. An expression is a few words (usually 2-5), never a whole clause.

For every candidate, the same steps in this order:
1. word_for_word: each word on its own, as "word=gloss" pairs in order, the gloss being that word's most ordinary dictionary sense in ${langName} — never a smooth translation of the whole ("i första hand" → "i=在 första=第一 hand=手", not a translation such as "primarily").
2. meaning_here: what it actually means in this sentence, in ${langName}.
3. verdict — compare the two (read only the glosses, as if you didn't know the expression):
   - "idiom" (Idiomatiska uttryck) when word_for_word does NOT say what meaning_here says: figurative expressions ("gå i taket" = get furious), set phrases with a discourse, attitude or emphasis function ("för all del", "rättare sagt", "med andra ord"), fixed pairs ("hit och dit"), and a light verb + noun whose pair means something neither word says ("ta illa upp" = be offended, "slå igenom" = become known).
   - "fast_fras" (Fasta fraser) when word_for_word already gives the meaning, but the word choice is fixed — a learner writing it would likely pick the wrong verb, preposition or particle ("ta hand om", "vara beroende av", "fatta ett beslut", "stolt över", "i samband med", "när det gäller").
     Also "fast_fras", whatever the glosses say: a group of words that works as one preposition or conjunction in front of a noun or clause ("på grund av", "i stället för", "i samband med", "trots att"), and a light verb + noun that means the same as a verb made from that noun ("ta beslut" = besluta, "ta ansvar" = ansvara, "göra ett försök" = försöka).
   - "neither" for a literal free combination (a verb with its ordinary object or adverb: "försöka igen", "köra bil", "lära sig något"), a phrase so basic every reader knows it ("till exempel", "varje år"), a combination only about this text's own content (a place, event, name or subject: "åka till Berlin", "vinna VM"), or something the textbook's own word list already explains on its own${glossaryList ? `: ${glossaryList}` : ""} (a longer expression around such a word is judged on its own).

Step 2 — choose: collocations = "fast_fras" candidates, idioms = "idiom" candidates, each expression once and in exactly one list, best first (most useful to learn for this text first), at most ${collocMax} collocations and ${idiomMax} idioms. Return fewer, even none, if fewer pass — never add one to reach a number. expression_text as in the scan, after checking it once more: the verb in the infinitive ("breder ut sig" → "breda ut sig"), a reflexive pronoun as "sig" ("skynda dig" → "skynda sig"), no word that could be left out or replaced while the expression stays the same ("ta flera beslut" → "ta beslut"), and nothing after the fixed part: the object or att-clause this sentence fills it with becomes "någon"/"något" or is left out ("lade märke till hennes nya frisyr" → "lägga märke till något"); meaning_zh = its meaning as used here; source_sentence = the sentence quoted exactly from the text, without its [number]; source_sentence_zh = its translation.

Step 3 — reserves, only after step 2 is settled: reserve_collocations (at most ${collocReserve}) and reserve_idioms (at most ${idiomReserve}) = the next "fast_fras" and "idiom" candidates that pass exactly the same test, for a reader who already knows some of the chosen ones, written exactly as step 2 says (the verb in the infinitive, nothing that belongs only to this sentence); never one already chosen, and empty when no further one passes.`,
    userPrompt: sentences.map((sentence, index) => `[${index + 1}] ${sentence}`).join("\n"),
  });
  // The chosen ones first, then the reserves (the scan's verdict still decides each list).
  const merged = { scan: result?.scan, collocations: [...(result?.collocations || []), ...(result?.reserve_collocations || [])],
    idioms: [...(result?.idioms || []), ...(result?.reserve_idioms || [])] };
  const sorted = sortExpressions(merged, cleanedText, readings);
  const { collocations, idioms } = distinctExpressions(sorted.collocations, sorted.idioms, glossary);
  // Chosen, yet every one left out: not a text without expressions, a fault to look into.
  if (merged.collocations.length + merged.idioms.length > 0 && !sorted.collocations.length && !sorted.idioms.length) {
    console.warn("[Reading] every chosen expression was left out", JSON.stringify(sorted.dropped));
  }
  return {
    collocations: collocations.slice(0, collocMax + collocReserve), idioms: idioms.slice(0, idiomMax + idiomReserve), usage,
    // How many the model judged and chose, and how many passed the checks: an empty list shows where it emptied.
    counts: { judged: (result?.scan || []).reduce((n, x) => n + (x.candidates || []).length, 0), chosen: merged.collocations.length + merged.idioms.length,
      passed: sorted.collocations.length + sorted.idioms.length, dropped: sorted.dropped, recovered: sorted.recovered },
  };
}

// A keyword's part of speech is checked before it is matched to an entry (2026-11-02):
// the textbook's word list decides when it names one ("en torka" → noun), otherwise it
// must be one SALDO (or, for a word SALDO lacks, Wiktionary) gives the word. One the
// references contradict is left out rather than shown with a wrong part of speech; one no
// reference knows stays, marked unconfirmed.
export async function checkKeywordPartsOfSpeech(supabaseAdmin, vocabulary, glossary = []) {
  const fromBook = glossaryPartsOfSpeech(glossary);
  const checked = await Promise.all((vocabulary || []).map(async (v) => {
    const lemma = String(v.swedish || "").trim().toLowerCase();
    let references = await referencePartsOfSpeech(supabaseAdmin, lemma);
    // SALDO without this part of speech: Wiktionary is asked before anything is rejected.
    if (!references.all.includes(v.pos) && references.wiktionaryStatus === "skipped") references = await referencePartsOfSpeech(supabaseAdmin, lemma, { askWiktionary: true });
    const result = checkKeywordPos({ pos: v.pos, glossaryPos: fromBook.get(lemma) || null, referencePos: references.all, wiktionaryStatus: references.wiktionaryStatus });
    return { ...v, pos: result.pos, pos_check: result.status, pos_reason: result.reason };
  }));
  return checked.filter((v) => v.pos_check !== "rejected");
}

// A keyword matched to an existing entry is shown with that entry's word card, so the
// entry has to fit the sense the text uses (2026-11-02): "torka" in "svår torka" must not
// lead to a verb entry that only says "干旱" because a noun sense was mixed into it. One
// AI call checks all the linked keywords of a text against their entries and the
// references; an entry that doesn't fit is flagged for review and the keyword is shown
// without it (its meaning for this text is still shown).
export async function checkLinkedKeywordSenses(supabaseAdmin, keywords, { userId, textResourceId }) {
  const linked = keywords.filter((k) => k.word_id);
  if (!linked.length) return keywords;
  try {
    const ids = linked.map((k) => k.word_id);
    const [{ data: entries }, { data: translations }, { data: examples }] = await Promise.all([
      supabaseAdmin.from("learning_objects").select("id, swedish, part_of_speech, swedish_explanation").in("id", ids),
      supabaseAdmin.from("learning_object_translations").select("learning_object_id, native_language, meaning").in("learning_object_id", ids),
      supabaseAdmin.from("learning_object_examples").select("learning_object_id, example_swedish, sort_order").in("learning_object_id", ids).order("sort_order"),
    ]);
    const items = await Promise.all(linked.map(async (k) => {
      const entry = (entries || []).find((e) => e.id === k.word_id) || {};
      const meaning = (lang) => (translations || []).find((t) => t.learning_object_id === k.word_id && t.native_language === lang)?.meaning || "";
      const page = await lookupWiktionary(supabaseAdmin, entry.swedish || k.swedish);
      return {
        id: k.word_id, lemma: entry.swedish || k.swedish, pos: entry.part_of_speech || k.pos,
        // The entry's examples go along as evidence of its sense, not as items to judge: this
        // check uses only whether the context fits, and a batch answer that left out the
        // example verdicts was asked again item by item (2026-11-07: 7 calls for 6 keywords).
        entry: { meaning_zh: meaning("zh"), meaning_en: meaning("en"), swedish_explanation: entry.swedish_explanation || "",
          example_sentences: (examples || []).filter((x) => x.learning_object_id === k.word_id).slice(0, 2).map((x) => x.example_swedish) },
        context: { sentence: k.sentence || "", meaning_here: k.chinese || "" },
        references: { wiktionary: wiktionaryEvidence(page) },
      };
    }));
    const { checks } = await aiSenseCheck(supabaseAdmin, items, { userId, textResourceId, feature: "reading_sense_check" });
    return await Promise.all(keywords.map(async (k) => {
      const c = k.word_id && checks.get(k.word_id);
      if (!c) return k;
      const misfit = c.context_matches_entry === "no" || c.other_pos_senses.length > 0 || !c.pos_supported;
      if (!misfit) return k;
      await recordCheck(supabaseAdmin, k.word_id, "sense", "mismatch", "reading_check",
        { other_pos_senses: c.other_pos_senses, context: k.sentence, context_matches_entry: c.context_matches_entry, note: c.note });
      return { ...k, word_id: null, entry_conflict: true };
    }));
  } catch (error) {
    console.warn("[Reading] sense check skipped", error.message);
    return keywords;
  }
}

// The AI's ordered keywords, matched to dictionary entries by exact lemma AND part
// of speech (a same-spelling word of another class is a different entry). Words
// the dictionary doesn't have keep word_id null here (the shown ones get a full
// entry in ensureKeywordEntries). The meaning is always the one for THIS text; the
// CEFR level is the dictionary's own (none for words it doesn't have).
// A keyword must occur in the text by SALDO's reading of its forms (2026-11-07: "skrev"
// is skriva, the stem test lost every strong verb), as the part of speech the AI gives
// it when SALDO reads the forms at all. `dropped` collects what was left out and why.
export async function resolveVocabularyCandidates(supabaseAdmin, scored, pool, { tokens, readings, textCefr = null, sentences = null }, dropped = []) {
  const key = (swedish, pos) => `${String(swedish || "").toLowerCase()}|${pos || ""}`;
  scored = await toBaseForms(supabaseAdmin, scored, readings);
  const known = new Map();
  pool.forEach((c) => known.set(key(c.word.swedish, c.word.pos), c.word));
  const unknownLemmas = [...new Set(scored.filter((v) => !known.has(key(v.swedish, v.pos))).map((v) => v.swedish))];
  if (unknownLemmas.length) {
    const { data: rows } = await supabaseAdmin
      .from("learning_objects")
      .select("id, swedish, part_of_speech, cefr_level")
      .eq("object_type", "word")
      .neq("status", "retired")
      .in("swedish", unknownLemmas);
    (rows || []).forEach((row) => {
      const k = key(row.swedish, row.part_of_speech);
      if (!known.has(k)) known.set(k, { id: row.id, swedish: row.swedish, pos: row.part_of_speech, cefr_level: row.cefr_level });
    });
  }
  const seen = new Set();
  const candidates = [];
  for (const v of scored) {
    if (!String(v.swedish || "").trim()) continue;
    const match = known.get(key(v.swedish, v.pos));
    const dedupeKey = match ? match.id : key(v.swedish, v.pos);
    if (seen.has(dedupeKey)) continue;
    const found = occurrences(v.swedish, v.pos, tokens, readings);
    const why = !found.at.length ? "not_in_text" : !found.posFits ? "other_pos_in_text"
      : match?.cefr_level === "A1" && !keepsA1Word(v, match, textCefr) ? "a1_everyday" : null;
    if (why) { dropped.push({ swedish: v.swedish, pos: v.pos, reason: v.reason, why }); continue; }
    seen.add(dedupeKey);
    // The sentence is the text's own where the word first stands (the model's quote is not
    // always the text's), and each place's words for the app's marks.
    const own = sentences?.[found.at[0].s];
    const parts = String(v.swedish).toLowerCase().split(/\s+/);
    const spots = found.at.map((t) => (parts.length > 1 ? itemSpots(parts, tokens.filter((x) => x.s === t.s), readings, t) : [t.k])).filter(Boolean);
    candidates.push({
      word_id: match?.id || null,
      swedish: match?.swedish || v.swedish,
      pos: match?.pos || v.pos,
      chinese: v.meaning || match?.chinese || "",
      cefr_level: match?.cefr_level || null,
      ...(own || v.sentence ? { sentence: own || v.sentence } : {}),
      ...(v.pos_check ? { pos_check: v.pos_check } : {}),
      ...(v.reason ? { reason: v.reason } : {}),
      occurrences: found.at.length,
      at: found.at.map((t) => [t.s, t.i]),
      ...(spots.length ? { spots } : {}),
    });
  }
  return candidates;
}

/**
 * A keyword the AI gave as it stands in the text rather than as its dictionary form
 * ("bostadsbristen") is put in its base form (2026-11-07): by SALDO's reading of the form,
 * or for a compound SALDO doesn't know, of its last part ("bristen" → brist, so
 * bostadsbrist). A word already in its base form, or one nothing reads, stays as given.
 */
export async function toBaseForms(supabaseAdmin, scored, readings) {
  const base = (word, pos, list) => {
    // Read as this part of speech ("skrev" the verb is skriva; skrev the noun is another word).
    // An adverb is its own headword: SALDO reads "samtidigt" only as a form of the adjective
    // samtidig, and that base form, kept as an adverb, matched no entry (2026-11-07).
    const lemmas = [...new Set((list || []).filter((r) => (pos === "adverb" ? r.pos === pos : fitsPos(r.pos, pos))).map((r) => r.lemma.toLowerCase()))];
    return lemmas.length === 1 && lemmas[0] !== word ? lemmas[0] : null;
  };
  const words = (scored || []).map((v) => String(v.swedish || "").trim().toLowerCase());
  const tails = new Set();
  words.forEach((w) => { if (!readings.get(w)?.length && !w.includes(" ")) for (let i = 3; i <= w.length - 3; i++) tails.add(w.slice(i)); });
  const tailReadings = tails.size ? await formReadings(supabaseAdmin, [...tails]) : new Map();
  return (scored || []).map((v, index) => {
    const word = words[index];
    let lemma = base(word, v.pos, readings.get(word));
    if (!lemma && !readings.get(word)?.length) {
      // The longest last part SALDO knows decides: an inflected part gives the compound's base form.
      for (let i = 3; i <= word.length - 3; i++) {
        const list = tailReadings.get(word.slice(i));
        if (!list?.length) continue;
        const tailBase = base(word.slice(i), v.pos, list);
        if (tailBase) lemma = word.slice(0, i) + tailBase;
        break;
      }
    }
    return lemma && lemma !== word ? { ...v, swedish: lemma, given_as: v.swedish } : v;
  });
}

/**
 * The places of the text each expression takes up (2026-11-07): in its own sentence, the
 * forms that are its words (by SALDO's readings: "tog" is ta in "ta beslut"). Map
 * "sentence:place" → [expression_text].
 */
export function expressionPlaces(expressions, tokens, readings, text) {
  const sentences = splitSentences(text);
  const places = new Map();
  for (const e of expressions) {
    const s = sentences.indexOf(textSentence(e.source_sentence, text));
    if (s < 0) continue;
    const words = String(e.expression_text || "").toLowerCase().split(/[\s/]+/).filter((w) => w && !EXPRESSION_PLACEHOLDERS.has(w));
    for (const t of tokens) {
      if (t.s !== s) continue;
      const lemmas = [t.form, ...(readings.get(t.form) || []).map((r) => r.lemma.toLowerCase())];
      if (!words.some((w) => lemmas.includes(w))) continue;
      const k = `${t.s}:${t.i}`;
      (places.get(k) || places.set(k, []).get(k)).push(e.expression_text);
    }
  }
  return places;
}

/**
 * For each place a keyword occurs, the expressions that place belongs to ([] when none):
 * keyword.in_expressions. A keyword is taught by the expressions shown only when every one
 * of its places is in one of them — "beslut" in "fatta beslut" goes, "beslut" used on its
 * own elsewhere in the text stays (spelling alone decided before).
 */
export function expressionSpots(e, tokens, readings, text) {
  const s = splitSentences(text).indexOf(textSentence(e.source_sentence, text));
  if (s < 0) return [];
  const words = String(e.expression_text || "").toLowerCase().split(/[\s/]+/).filter((w) => w && !EXPRESSION_PLACEHOLDERS.has(w));
  const spot = words.length ? itemSpots(words, tokens.filter((t) => t.s === s), readings) : null;
  return spot ? [spot] : [];
}

export function inExpressions(at, places) {
  return (at || []).map(([s, i]) => places.get(`${s}:${i}`) || []);
}

export function taughtByExpressions(keyword, shownTexts) {
  const lists = keyword.in_expressions || [];
  return lists.length > 0 && lists.every((list) => list.some((text) => shownTexts.has(text)));
}

// 阅读模块设计想法-专业review-2026-07-27.md §5/§10.2 — when a discovered
// collocation/idiom doesn't exist in Fraser/Uttryck yet, create it rather
// than just leaving the link empty (reading keeps enriching the library;
// confirmed 2026-10-30). No second AI
// call is needed — selectReadingContent already generated the phrase text/
// meaning/example in the same call, this just persists it.
// New entries are drafts (2026-11-07): what the analysis wrote is the short
// explanation for this text (meaning + this sentence), not a finished entry. The
// missing fields are recorded (resource_field_status) and filled by the regular AI
// completion (scripts/ai-complete.mjs), which makes a completed draft "ai_generated".
// A draft opens and can be studied from the reading that found it; the app keeps it
// out of the shared Fasta fraser / Idiomatiska uttryck lists and Dagens uttryck.
// Every shown keyword gets a full dictionary entry (2026-10-31): reused when the
// shared dictionary has one with this lemma + part of speech in this language,
// otherwise generated once with the regular word-card generation and saved for
// everyone. Only the shown keywords — the other candidates get one only when a
// reader asks. A failure leaves that keyword without an entry rather than failing
// the analysis.
async function ensureKeywordEntries(supabaseAdmin, keywords, { userId, textResourceId, nativeLanguage }) {
  const ids = keywords.map((k) => k.word_id).filter(Boolean);
  const translated = new Set();
  if (ids.length) {
    const { data } = await supabaseAdmin.from("learning_object_translations").select("learning_object_id, meaning")
      .in("learning_object_id", ids).eq("native_language", nativeLanguage);
    (data || []).filter((r) => r.meaning).forEach((r) => translated.add(r.learning_object_id));
  }
  return Promise.all(keywords.map(async (k) => {
    if (k.word_id && translated.has(k.word_id)) { await noteReuse(supabaseAdmin, k.word_id); return k; }
    if (k.entry_conflict) return k;
    try {
      const { entryId } = await generateWordEntry({
        supabaseAdmin, userId, word: k.swedish, nativeLanguage, pos: k.pos, sense: k.chinese,
        source: "ai reading", chargeQuota: false, textResourceId,
      });
      return { ...k, word_id: entryId };
    } catch (error) {
      console.warn("[Reading] keyword entry not created", k.swedish, error.message);
      return k;
    }
  }));
}

// Whether a combination the scan found gets a shared entry (knowledge v2, R3, 2026-11-09): the
// dictionaries and Korp are asked (free) and the three questions answered apart (server-evidence.mjs
// classifyMultiword). Only a fixed phrase (F2) or an idiom (F3) becomes a shared entry; a typical
// combination (F1) belongs to its head word's usage, a free one (F0) to this reading only — both
// still shown in the reading with their meaning and sentence, nothing about them called wrong. When
// the evidence can't be had (Korp down), nothing is created now and the item says so (retry).
// MULTIWORD_CLASSIFY=off restores the old behaviour (every scanned expression a draft).
export async function classifyExpression(supabaseAdmin, item, objectType) {
  const verdict = objectType === "expression" ? "idiom" : "fast_fras";
  const ev = await multiwordEvidence(supabaseAdmin, item.expression_text, { timeout: Number(process.env.MULTIWORD_KORP_TIMEOUT_MS) || 15000, need: "for", verdict });
  return { ...classifyMultiword({ ...ev, ai: { verdict } }), content: ev.content || [] };
}

// The head word a typical combination (F1) belongs to: its noun, otherwise its first content word —
// an existing public word entry of that lemma and part of speech, or none. The reading links the
// item there, so a tap opens the head word, where the combination is one of its uses (decision 1).
const LEMGRAM_POS = { nn: "noun", vb: "verb", av: "adjective", ab: "adverb" };
async function headwordOf(supabaseAdmin, content) {
  const units = content.map((lg) => { const [lemma, rest = ""] = String(lg).split(".."); return { lemma: lemma.replace(/_/g, " "), pos: LEMGRAM_POS[rest.split(".")[0]] }; }).filter((u) => u.pos && !u.lemma.includes(" "));
  const head = units.find((u) => u.pos === "noun") || units[0];
  if (!head) return null;
  const { data } = await supabaseAdmin.from("learning_objects").select("id, swedish").eq("object_type", "word").eq("status", "published").eq("swedish", head.lemma).eq("part_of_speech", head.pos).limit(1);
  return data?.[0] ? { id: data[0].id, swedish: data[0].swedish } : null;
}
const ENTRY_KIND = { F2: { objectType: "phrase", category: "common_collocation" }, F3: { objectType: "expression", category: "everyday_expression" } };

export async function resolveExpressionEntries(supabaseAdmin, items, { objectType, category, nativeLanguage = "zh", classify = classifyExpression }) {
  if (!items.length) return items;
  // Dedup across both modules on the normalised key (inflected first verb,
  // någon/ngn, mig/sig …): a collocation already stored as an expression (or the
  // other way round) is reused and also listed in this module.
  const module = moduleOf(objectType);
  const classifying = process.env.MULTIWORD_CLASSIFY !== "off";
  const resolved = await Promise.all(items.map(async (item) => {
    const matchKey = await expressionMatchKey(supabaseAdmin, item.expression_text);
    const existing = await findExistingExpression(supabaseAdmin, item.expression_text, matchKey);
    if (existing && existing.object_type !== objectType) await addModule(supabaseAdmin, existing.id, module);
    if (existing) await noteReuse(supabaseAdmin, existing.id);
    let classification = null;
    if (!existing && classifying) {
      try { classification = await classify(supabaseAdmin, item, objectType); }
      catch (error) { classification = { cls: null, placement: "reading_only", review: false, reasons: [`classify_failed:${error.message}`] }; }
    }
    return { item, matchKey, id: existing?.id || null, classification };
  }));

  const byKey = new Map(resolved.filter((r) => r.id).map((r) => [r.matchKey, r.id]));
  const toCreate = [];
  for (const r of resolved) if (!r.id && (!r.classification || ENTRY_KIND[r.classification.cls]) && !toCreate.some((c) => c.matchKey === r.matchKey)) toCreate.push(r);
  if (toCreate.length) {
    const now = new Date().toISOString();
    const rows = toCreate.map(({ item, classification }) => ({
      id: randomUUID(),
      swedish: item.expression_text,
      part_of_speech: "other",
      pos_detail: "",
      // A dictionary idiom the scan listed as a collocation is an expression (and the other way round).
      object_type: ENTRY_KIND[classification?.cls]?.objectType || objectType,
      category: ENTRY_KIND[classification?.cls]?.category || category,
      // learning_objects.chinese must stay actually-Chinese (it's the
      // always-present legacy fallback every zh read path still uses) — a
      // phrase first discovered while reading in a non-zh language only
      // gets its translation-row meaning below, same as every other
      // per-language content gap in this app.
      chinese: nativeLanguage === "zh" ? item.meaning_zh : "",
      swedish_explanation: "",
      // The reader's own sentence stays with their reading (text_analysis, shown in the app as
      // "I din text"), never in the shared entry every reader sees (2026-11-09): the entry's
      // examples are written by the completion like any other missing field.
      example_sv: "",
      forms: "",
      collocations: "",
      related_words: "",
      tags: [],
      notebook: "Fraser",
      source: "discovered from reading",
      status: "draft",
      updated_at: now,
    }));
    const { data: inserted, error: insertError } = await supabaseAdmin.from("learning_objects").upsert(rows, { onConflict: "swedish,part_of_speech,lexeme_key_nn", ignoreDuplicates: true }).select("id, swedish");
    const newRows = [];
    if (!insertError && inserted) {
      for (const row of inserted) {
        const created = toCreate.find((c) => c.item.expression_text.toLowerCase() === row.swedish.toLowerCase());
        if (!created) continue;
        byKey.set(created.matchKey, row.id);
        await setMatchKey(supabaseAdmin, row.id, created.matchKey);
        // The example's translation too (it was left out, so the app showed the sentence untranslated).
        await supabaseAdmin.from("learning_object_translations").insert({ learning_object_id: row.id, native_language: nativeLanguage, meaning: created.item.meaning_zh || "",
          example_translation: null, updated_at: now });
        newRows.push({ id: row.id, expression: row.swedish, meaning: created.item.meaning_zh || "", meaningLanguage: nativeLanguage, sentence: "" });
        // Why it is an entry of its own (the classification's evidence), with KNOWLEDGE_EVIDENCE_WRITE=on.
        if (created.classification?.evidence) await recordEvidence(supabaseAdmin, row.id, "classification", created.classification.cls || "", created.classification.evidence);
        // Collected from a text: the meaning only — the rest, the example too, is recorded as missing.
        await recordEntryStatus(supabaseAdmin, row.id, { type: module, pos: "other", [`meaning_${nativeLanguage}`]: Boolean(created.item.meaning_zh), example: false });
      }
    }
    // The other explanation language right away, so every reader sees a meaning and a
    // translated example (a failure leaves that row missing, recorded in the logs).
    if (newRows.length) {
      try {
        const { failed } = await fillExpressionLanguage(supabaseAdmin, newRows);
        if (failed.size) console.warn("[Reading] other-language row not filled", [...failed]);
      } catch (error) {
        console.warn("[Reading] other-language row skipped", error.message);
      }
    }
    // Lost a race (same spelling inserted meanwhile): re-check before linking.
    for (const c of toCreate.filter((c) => !byKey.has(c.matchKey))) {
      const raced = await findExistingExpression(supabaseAdmin, c.item.expression_text, c.matchKey);
      if (raced) byKey.set(c.matchKey, raced.id);
    }
  }

  // What the evidence said, kept with the reading (an F1 / F0 / undecided item has no shared entry;
  // scripts collect F1 items for their head words and retry the undecided ones).
  const note = (c) => (c ? { classification: { cls: c.cls, placement: c.placement, fixedness: c.fixedness, authenticity: c.authenticity, review: c.review, reasons: c.reasons } } : {});
  return Promise.all(resolved.map(async ({ item, matchKey, classification }) => {
    const id = byKey.get(matchKey) || null;
    const head = !id && classification?.cls === "F1" && classification.content?.length ? await headwordOf(supabaseAdmin, classification.content).catch(() => null) : null;
    return { ...item, expression_id: id, ...(head ? { headword_id: head.id, headword: head.swedish } : {}), ...note(classification) };
  }));
}

// 2026-08-03, Rachel's decision: reading-analysis phrases already get
// auto-filed into Fraser (collocation) or Uttryck (idiom) by the AI at
// analysis time — this lets the user override that classification
// themselves, since "fixed collocation" vs. "genuinely idiomatic
// expression" is a judgment call the AI doesn't always get right, and she
// wants to be able to file a phrase into whichever catalog she thinks it
// belongs in rather than only ever seeing where the AI put it.
const EXPRESSION_CLASSIFICATIONS = {
  collocation: { objectType: "phrase", category: "common_collocation" },
  idiom: { objectType: "expression", category: "everyday_expression" },
};

export async function classifyReadingExpression({ supabaseAdmin, expressionId, classification }) {
  const target = EXPRESSION_CLASSIFICATIONS[classification];
  if (!target) {
    const error = new Error("Ogiltig kategori.");
    error.status = 400;
    throw error;
  }
  const id = String(expressionId || "").trim();
  if (!id) {
    const error = new Error("expressionId saknas.");
    error.status = 400;
    throw error;
  }
  const { data, error } = await supabaseAdmin
    .from("learning_objects")
    .update({ object_type: target.objectType, category: target.category, status: "human_reviewed", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, object_type, category")
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const notFound = new Error("Frasen hittades inte.");
    notFound.status = 404;
    throw notFound;
  }
  return data;
}

// Cross-user by design (service-role bypasses RLS) — only ever reads
// text_analysis (structured knowledge), never another user's
// text_resources.original_text/cleaned_text.
async function findPublicAnalysisByHash(supabaseAdmin, hash, nativeLanguage = "zh") {
  const { data: resources } = await supabaseAdmin.from("text_resources").select("id").eq("text_hash", hash);
  const resourceIds = (resources || []).map((r) => r.id);
  if (!resourceIds.length) return null;
  const { data: analysis } = await supabaseAdmin
    .from("text_analysis")
    .select("*")
    .in("text_resource_id", resourceIds)
    .eq("visibility", "public")
    .eq("native_language", nativeLanguage)
    .eq("status", "ready")
    .gte("analysis_version", ANALYSIS_VERSION)
    .order("analysis_version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return analysis || null;
}

function logUsage(entries, { userId, textResourceId, feature, model, usage, cacheHit, credits = 0 }) {
  const tokens = openaiCost(usage || {}, model);
  entries.push({
    user_id: userId || null,
    text_resource_id: textResourceId || null,
    feature,
    model,
    input_tokens: tokens.input,
    output_tokens: tokens.output,
    credits_used: credits,
    actual_cost: tokens.cost,
    cache_hit: Boolean(cacheHit),
    details: { price_version: PRICE_VERSION, source: usageSource(userId), ...(tokens.cached ? { cached_input_tokens: tokens.cached } : {}) },
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
// 2026-08-02, two-layer generation (Rachel's confirmed decision from 关于
// 阅读模块的调整.pages 两层生成方案): analysis used to be one long
// sequential call chain (missing-word batch gen -> Worth Learning scoring
// -> key-expressions extraction) before the user saw anything. Now split
// into a fast layer (this function — one small AI call, headline + summary
// + 3 content-highlight key points, enough to start reading in seconds) and
// a deep layer (analyzeReadingResourceDeep below — the original heavy
// vocabulary/expressions/sentences/patterns work), which the client calls
// right after this one returns. Both write into the SAME text_analysis row
// (insert here, update there) so cache-hit/public-reuse logic still keys
// off one row per text_hash exactly as before.
async function generateFastLayer(cleanedText, tier, nativeLanguage = "zh") {
  const langName = languageName(nativeLanguage);
  const [minSentences, maxSentences] = LENGTH_TIERS[tier === "oversized" ? "overlong" : tier].summarySentences;
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      headline_zh: { type: "string" },
      summary_sv: { type: "string" },
      summary_zh: { type: "string" },
      key_points: { type: "array", items: { type: "string" } },
      text_cefr: { type: "string", enum: CEFR_LEVELS },
    },
    required: ["headline_zh", "summary_sv", "summary_zh", "key_points", "text_cefr"],
  };
  return callOpenAI({
    schemaName: "reading_fast_layer",
    schema,
    maxOutputTokens: 900,
    systemPrompt: `You orient a ${langName}-speaking learner to a Swedish text before they start reading — this must be fast to read and fast to generate, it is NOT the full analysis (vocabulary/expressions/grammar come later from a separate step). Fields named *_zh below (headline_zh, summary_zh) must be written in ${langName} regardless of their name.

1. headline_zh: one short ${langName} sentence naming what the article is about.
2. summary_sv/summary_zh: ${minSentences}-${maxSentences} sentences (max 5) each, covering only the main topic, core content, and key conclusion — no background info, no grammar explanation. summary_sv stays 100% in Swedish; summary_zh is 100% in ${langName}. These are two independent texts, not one text shown twice — never let a word or phrase from one leak into the other (e.g. summary_sv must never contain a stray ${langName} word or vice versa), even where they express the same idea.
3. key_points: exactly 3 short ${langName} bullet points (fewer only if the text is too short/simple to genuinely support 3 distinct ones) naming the most important pieces of CONTENT in the article — what a reader should watch for or take away. These are about content, never about grammar or language structure (that's a separate feature elsewhere in the app) — do not describe a grammatical construction here.
4. text_cefr: the text's overall CEFR difficulty (A1-C2), judged from its vocabulary, sentence structure and content.`,
    userPrompt: cleanedText,
  });
}

// A row for the current selection rules with an older analysis' summary. Two readers
// opening the text at once: the second insert fails on the unique key and reads the first.
// It stays as visible as the old one (a shared library text's analysis is always public).
export async function upgradeAnalysisRow(supabaseAdmin, old, { shared = false } = {}) {
  const row = {
    text_resource_id: old.text_resource_id, analysis_version: ANALYSIS_VERSION, native_language: old.native_language,
    visibility: shared || old.visibility === "public" ? "public" : "private",
    status: "summary_ready", headline_zh: old.headline_zh, summary_sv: old.summary_sv, summary_zh: old.summary_zh,
    key_points: old.key_points || [], text_cefr: old.text_cefr ?? null, summary_generated_at: old.summary_generated_at || new Date().toISOString(),
  };
  const { data, error } = await supabaseAdmin.from("text_analysis").insert(row).select().single();
  if (!error && data) return data;
  const { data: existing } = await supabaseAdmin.from("text_analysis").select("*")
    .eq("text_resource_id", old.text_resource_id).eq("native_language", old.native_language).eq("analysis_version", ANALYSIS_VERSION).maybeSingle();
  if (existing) return existing;
  throw error || new Error("Analysen kunde inte uppdateras.");
}

async function starterResource(supabaseAdmin, hash) {
  const { data } = await supabaseAdmin.from("text_resources")
    .select("id, word_count, analysis_status, textbook_glossary, is_starter_library")
    .eq("text_hash", hash).eq("is_starter_library", true).limit(1);
  return data?.[0] || null;
}

export async function analyzeReadingResourceFast({ supabaseAdmin, userId, text, sourceType = "paste", glossary = [], nativeLanguage = "zh" }) {
  if (glossary.length) glossary = await repairGlossaryLetters(supabaseAdmin, glossary);
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
    .select("id, word_count, analysis_status, textbook_glossary, is_starter_library")
    .eq("user_id", userId)
    .eq("text_hash", hash)
    .maybeSingle();

  // A text of the shared reading library (Läsmaterial) is analysed on the library's own
  // row, once per language for every reader (2026-11-07): each reader used to get a private
  // copy, and each copy paid for the whole analysis again. The text is public already.
  let textResource = existingResource || await starterResource(supabaseAdmin, hash);
  const shared = Boolean(textResource?.is_starter_library);
  if (textResource && !shared && glossary.length && !(textResource.textbook_glossary || []).length) {
    await supabaseAdmin.from("text_resources").update({ textbook_glossary: glossary }).eq("id", textResource.id);
    textResource = { ...textResource, textbook_glossary: glossary };
  }
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
    .eq("native_language", nativeLanguage)
    .order("analysis_version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingAnalysis && (existingAnalysis.analysis_version || 1) < ANALYSIS_VERSION) {
    // Made with older selection rules: a row for the current rules, with the same summary
    // (no AI call); the client then asks for the deep layer, which selects again. The old
    // row stays as it was. Entries are found again by lemma / match key, so nothing is
    // created twice, and the reader's word states are not touched.
    const upgraded = await upgradeAnalysisRow(supabaseAdmin, existingAnalysis, { shared });
    return { textResource, analysis: upgraded, tier, cached: true, deepReady: upgraded.status === "ready" };
  }

  if (existingAnalysis) {
    // Either fully cached (deep layer already ran a previous time, in this
    // language) or a fast-only row left over from an interrupted previous
    // attempt (e.g. the user closed the app before the deep call finished)
    // — either way, no new AI call needed here; the client decides whether
    // to also call the deep endpoint based on deepReady.
    const deepReady = existingAnalysis.status === "ready";
    if (deepReady) await materializeReadingAnalysisItems(supabaseAdmin, { userId, analysis: existingAnalysis });
    return { textResource, analysis: existingAnalysis, tier, cached: true, deepReady };
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
  const publicAnalysis = await findPublicAnalysisByHash(supabaseAdmin, hash, nativeLanguage);
  if (publicAnalysis) {
    await materializeReadingAnalysisItems(supabaseAdmin, { userId, analysis: publicAnalysis });
    await supabaseAdmin.from("text_resources").update({ analysis_status: "ready" }).eq("id", textResource.id);
    return { textResource, analysis: publicAnalysis, tier, cached: true, deepReady: true, reusedFromPublic: true };
  }

  if (tier === "oversized") {
    const error = new Error("Texten är för lång för automatisk analys. Välj ett stycke eller markera text att analysera.");
    error.status = 400;
    throw error;
  }

  const { result, usage } = await generateFastLayer(cleaned, tier, nativeLanguage);
  logUsage(usageLogEntries, { userId, textResourceId: textResource.id, feature: "reading_fast_layer", model: MODEL, usage, cacheHit: false });
  if (usageLogEntries.length) await supabaseAdmin.from("ai_usage_logs").insert(usageLogEntries);

  const { data: analysisRow, error: analysisError } = await supabaseAdmin
    .from("text_analysis")
    .insert({
      text_resource_id: textResource.id,
      analysis_version: ANALYSIS_VERSION,
      native_language: nativeLanguage,
      visibility: shared ? "public" : "private",
      status: "summary_ready",
      headline_zh: result.headline_zh,
      summary_sv: result.summary_sv,
      summary_zh: result.summary_zh,
      key_points: result.key_points || [],
      text_cefr: CEFR_LEVELS.includes(result.text_cefr) ? result.text_cefr : null,
      summary_generated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (analysisError) throw analysisError;

  await supabaseAdmin.from("text_resources").update({ analysis_status: "summary_ready" }).eq("id", textResource.id);
  return { textResource, analysis: analysisRow, tier, cached: false, deepReady: false };
}

// Reviews/阅读模块多母语支持-架构方案-2026-09-01.md §三: when a SECOND
// language is requested for an article whose deep layer already ran in a
// different language, don't repeat the expensive part (candidate token
// extraction, missing-word generation, Worth Learning scoring, key-
// expression extraction from the whole article) — the "what to select" is
// language-independent and already decided. Just ask for a target-language
// explanation of that same fixed list, one cheap bundled call, and refresh
// the vocabulary meaning fallback from the corpus (no AI, it's just a
// lookup). Returns the updated (current-language) text_analysis row.
async function explainExistingSelectionInLanguage({ supabaseAdmin, userId, textResource, existingAnalysis, sourceAnalysis, nativeLanguage }) {
  const langName = languageName(nativeLanguage);
  // Analyses since 2026-10-30 carry scored candidates: explain all of them (the
  // shown ones are a subset), keywords included — their meanings are per text, so
  // a dictionary lookup isn't enough. Older analyses only have the shown items.
  const hasCandidates = Array.isArray(sourceAnalysis.candidate_vocabulary);
  const expressions = (hasCandidates ? sourceAnalysis.candidate_expressions : sourceAnalysis.selected_expressions) || [];
  const vocabulary = hasCandidates ? sourceAnalysis.candidate_vocabulary : [];
  const sentences = sourceAnalysis.key_sentences || [];
  const patterns = sourceAnalysis.language_patterns || [];
  const usageLogEntries = [];

  let explained = { vocabulary: [], expressions: [], sentences: [], patterns: [] };
  if (vocabulary.length || expressions.length || sentences.length || patterns.length) {
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        vocabulary: {
          type: "array",
          items: { type: "object", additionalProperties: false, properties: { meaning: { type: "string" } }, required: ["meaning"] },
        },
        expressions: {
          type: "array",
          items: { type: "object", additionalProperties: false, properties: { meaning: { type: "string" }, source_sentence_translation: { type: "string" } }, required: ["meaning", "source_sentence_translation"] },
        },
        sentences: {
          type: "array",
          items: { type: "object", additionalProperties: false, properties: { translation: { type: "string" }, reason: { type: "string" } }, required: ["translation", "reason"] },
        },
        patterns: {
          type: "array",
          items: { type: "object", additionalProperties: false, properties: { meaning: { type: "string" } }, required: ["meaning"] },
        },
      },
      required: ["vocabulary", "expressions", "sentences", "patterns"],
    };
    const userPrompt = JSON.stringify({
      vocabulary: vocabulary.map((v) => ({ swedish: v.swedish, pos: v.pos, meaning_in_other_language: v.chinese })),
      expressions: expressions.map((e) => ({ expression_text: e.expression_text, source_sentence: e.source_sentence })),
      sentences: sentences.map((s) => ({ sentence: s.sentence })),
      patterns: patterns.map((p) => ({ pattern: p.pattern, source_sentence: p.source_sentence })),
    });
    const { result, usage } = await callOpenAI({
      schemaName: "explain_existing_selection",
      schema,
      maxOutputTokens: 2000,
      systemPrompt: `A Swedish text has already been analyzed and these words/expressions/sentences/patterns were already selected as worth learning by a previous pass — you are NOT selecting or filtering anything here, only explaining each one for a ${langName}-speaking learner, one output entry per input entry, same order, same count.

For each entry in "vocabulary": meaning = a short ${langName} meaning of the word in the same sense as meaning_in_other_language (that is the sense this text uses).
For each entry in "expressions": meaning = a concise ${langName} translation/explanation of the expression; source_sentence_translation = a ${langName} translation of its source_sentence.
For each entry in "sentences": translation = a ${langName} translation of the sentence; reason = a ${langName} explanation of why this sentence is worth studying — the actual comprehension mechanism (grammar point, idiom, ambiguity, tense relationship, etc.), never a generic label alone.
For each entry in "patterns": meaning = a concise ${langName} explanation of the pattern.`,
      userPrompt,
    });
    explained = result;
    logUsage(usageLogEntries, { userId, textResourceId: textResource.id, feature: "reading_translate_selection", model: MODEL, usage, cacheHit: false });
  }

  // Vocabulary meaning fallback: a plain corpus lookup, no AI needed — the
  // word_id references are reused as-is (language-independent facts).
  const wordIds = hasCandidates ? [] : (sourceAnalysis.selected_vocabulary || []).map((v) => v.word_id).filter(Boolean);
  const meaningByWordId = new Map();
  if (wordIds.length) {
    const { data: rows } = await supabaseAdmin
      .from("learning_objects")
      .select("id, chinese, learning_object_translations(meaning, native_language)")
      .in("id", wordIds);
    (rows || []).forEach((row) => {
      const translated = (row.learning_object_translations || []).find((t) => t.native_language === nativeLanguage);
      meaningByWordId.set(row.id, nativeLanguage === "zh" ? row.chinese : (translated?.meaning || ""));
    });
  }

  const vocabularyMeaning = new Map(vocabulary.map((v, index) => [`${v.swedish}|${v.pos}`, explained.vocabulary?.[index]?.meaning]));
  // v.chinese is the source analysis' meaning (another language): kept only for Chinese.
  const translateWord = (v) => ({ ...v, chinese: vocabularyMeaning.get(`${v.swedish}|${v.pos}`) || meaningByWordId.get(v.word_id) || (nativeLanguage === "zh" ? v.chinese : "") });
  const explainedByText = new Map(expressions.map((e, index) => [e.expression_text, explained.expressions[index]]));
  const translateExpression = (e) => ({
    ...e,
    meaning_zh: explainedByText.get(e.expression_text)?.meaning || "",
    source_sentence_zh: explainedByText.get(e.expression_text)?.source_sentence_translation || "",
  });
  const selectedVocabulary = await ensureKeywordEntries(supabaseAdmin, (sourceAnalysis.selected_vocabulary || []).map(translateWord),
    { userId, textResourceId: textResource.id, nativeLanguage });
  const selectedExpressions = (sourceAnalysis.selected_expressions || []).map(translateExpression);
  const selectedSentences = sentences.map((s, index) => ({
    ...s,
    translation_zh: explained.sentences[index]?.translation || "",
    reason: explained.sentences[index]?.reason || s.reason,
  }));
  const selectedPatterns = patterns.map((p, index) => ({ ...p, meaning_zh: explained.patterns[index]?.meaning || "" }));

  const { data: analysisRow, error } = await supabaseAdmin
    .from("text_analysis")
    .update({
      selected_vocabulary: selectedVocabulary,
      selected_expressions: selectedExpressions,
      candidate_vocabulary: hasCandidates ? vocabulary.map(translateWord) : null,
      candidate_expressions: hasCandidates ? expressions.map(translateExpression) : null,
      text_cefr: sourceAnalysis.text_cefr ?? null,
      key_sentences: selectedSentences,
      language_patterns: selectedPatterns,
      status: "ready",
    })
    .eq("id", existingAnalysis.id)
    .select()
    .single();
  if (error) throw error;

  usageLogEntries.push({
    user_id: userId || null,
    text_resource_id: textResource.id,
    feature: "analysis",
    model: MODEL,
    input_tokens: 0,
    output_tokens: 0,
    credits_used: calculateCredits("analysis", textResource.word_count),
    actual_cost: 0,
    cache_hit: true,
    details: { price_version: PRICE_VERSION, source: usageSource(userId), step: "credit_charge" },
  });
  if (usageLogEntries.length) await supabaseAdmin.from("ai_usage_logs").insert(usageLogEntries);

  return analysisRow;
}

/**
 * The deep layer's selection for one text (2026-11-07), in order:
 * 1. every form of the text with SALDO's readings, and the dictionary entries each form
 *    can be (all of them: homographs, forms shared by several entries);
 * 2. the dictionary pool, cut by likely value (not by occurrences), for the AI to choose
 *    from — it also adds words of the text the pool doesn't have;
 * 3. two AI calls side by side: keywords (+ reserves, with the text's level as context)
 *    and expressions (+ reserves), each best first;
 * 4. keywords: part of speech against the references, then matched to entries by lemma +
 *    part of speech, kept only when SALDO finds them in the text as that part of speech,
 *    A1 words only for a use that isn't the everyday one;
 * 5. expressions: matched to existing entries by match key, else created as drafts;
 * 6. a keyword all of whose places in the text are inside shown expressions is left out;
 * 7. linked entries checked against the sense the text uses (one AI call), shown keywords
 *    without an entry get a full one; a keyword that can't get one gives its place to the
 *    next reserve that has an entry.
 * `ensureEntries: false` (evaluation) skips creating keyword entries; with a read-only
 * client nothing is written at all.
 */
export async function runDeepSelection(supabaseAdmin, { cleaned, wordCount, tier, glossary = [], nativeLanguage = "zh", textCefr = null, userId = null, textResourceId = null, ensureEntries = true }) {
  const tierConfig = LENGTH_TIERS[tier === "oversized" ? "overlong" : tier];
  const collocationLimit = Math.min(tierConfig.keyCollocations[1], MAX_KEY_COLLOCATIONS);
  const idiomLimit = Math.min(tierConfig.keyIdioms[1], MAX_KEY_IDIOMS);

  const { freq, properNouns: names } = extractCandidateTokens(cleaned);
  const tokens = textTokens(cleaned);
  const readings = await textReadings(supabaseAdmin, [...new Set(tokens.map((t) => t.form))]);
  // Every word of the text competes, the ones the textbook's own word list explains too
  // (2026-11-02): keeping those out removed most of a text's key terms.
  const found = await matchAgainstCorpus(supabaseAdmin, [...freq.keys()], nativeLanguage, readings);
  // In text order for the AI (not by how often they occur: that put "problem" and "rik" in front).
  const pool = inTextOrder(rankFoundWords(found, freq, names, POOL_SIZE[tier === "oversized" ? "overlong" : tier] || POOL_SIZE.standard), freq);
  // Every part of speech SALDO gives the word as it stands in the text ("torka" → noun/verb).
  pool.forEach((c) => {
    const options = (readings.get(c.token) || []).filter((r) => r.lemma.toLowerCase() === c.word.swedish.toLowerCase()).map((r) => r.pos);
    c.posOptions = [...new Set([c.word.pos, ...options].filter(Boolean))];
  });
  const vocabularyLimit = keywordLimit(wordCount, tier, pool);

  const [selection, expressions] = await Promise.all([
    selectReadingContent(cleaned, tier, glossary, pool, nativeLanguage, textCefr),
    selectExpressions(cleaned, tier, glossary, nativeLanguage, readings),
  ]);

  const dropped = [];
  const checkedVocabulary = await checkKeywordPartsOfSpeech(supabaseAdmin, tidyReasons(selection.vocabulary), glossary);
  for (const v of selection.vocabulary) if (!checkedVocabulary.some((c) => c.swedish === v.swedish && c.sentence === v.sentence)) dropped.push({ swedish: v.swedish, pos: v.pos, reason: v.reason, why: "pos_rejected" });
  const scoredVocabulary = await resolveVocabularyCandidates(supabaseAdmin, checkedVocabulary, pool, { tokens, readings, textCefr, sentences: splitSentences(cleaned) }, dropped);
  const resolvedCollocations = await resolveExpressionEntries(supabaseAdmin, expressions.collocations, { objectType: "phrase", category: "common_collocation", nativeLanguage });
  const resolvedIdioms = await resolveExpressionEntries(supabaseAdmin, expressions.idioms, { objectType: "expression", category: "everyday_expression", nativeLanguage });
  const asExpression = (category) => (e) => {
    const spots = expressionSpots(e, tokens, readings, cleaned);
    return { ...e, category, ...(spots.length ? { spots } : {}) };
  };
  const collocationCandidates = resolvedCollocations.map(asExpression("collocation"));
  const idiomCandidates = resolvedIdioms.map(asExpression("idiom"));
  // Shown by default: the best ones, as many as the length tier shows; the rest are
  // reserves for each reader's own list.
  const selectedExpressions = [...collocationCandidates.slice(0, collocationLimit), ...idiomCandidates.slice(0, idiomLimit)]
    .map((e, index) => ({ ...e, sort_order: index }));
  const candidateExpressions = [...collocationCandidates, ...idiomCandidates];

  // V2.1 §六/§十七 "完整表达优先于孤立单词", by place (2026-11-07): a keyword is left out
  // only when each of its places in the text is inside a shown expression.
  const places = expressionPlaces(candidateExpressions, tokens, readings, cleaned);
  const located = scoredVocabulary.map(({ at, ...v }) => ({ ...v, in_expressions: inExpressions(at, places) }));
  const shownTexts = new Set(selectedExpressions.map((e) => e.expression_text));
  for (const v of located) if (taughtByExpressions(v, shownTexts)) dropped.push({ swedish: v.swedish, pos: v.pos, reason: v.reason, why: "inside_shown_expression" });
  const openVocabulary = located.filter((v) => !taughtByExpressions(v, shownTexts));

  // The shown keywords and the reserves that have an entry are checked against the
  // sense the text uses (one call); only the shown ones get a new entry.
  const head = openVocabulary.slice(0, vocabularyLimit);
  const reserves = openVocabulary.slice(vocabularyLimit);
  const checkedLinks = await checkLinkedKeywordSenses(supabaseAdmin, [...head, ...reserves.filter((v) => v.word_id)], { userId, textResourceId });
  const checkedHead = checkedLinks.slice(0, head.length);
  const checkedReserves = [...checkedLinks.slice(head.length), ...reserves.filter((v) => !v.word_id)];
  const withEntries = ensureEntries
    ? await ensureKeywordEntries(supabaseAdmin, checkedHead, { userId, textResourceId, nativeLanguage })
    : checkedHead.map((k) => (k.word_id || k.entry_conflict ? k : { ...k, would_create_entry: true }));
  const hasEntry = (v) => v.word_id || v.would_create_entry;
  // A shown keyword always has a full entry: one that couldn't get one gives its place to
  // the next reserve that has an entry, or the list is just shorter.
  const shownVocabulary = withEntries.filter(hasEntry);
  shownVocabulary.push(...checkedReserves.filter((v) => v.word_id).slice(0, Math.max(0, vocabularyLimit - shownVocabulary.length)));
  const candidateVocabulary = [
    ...shownVocabulary,
    ...checkedReserves.filter((v) => v.word_id && !shownVocabulary.includes(v)),
    ...withEntries.filter((v) => !hasEntry(v)),
    ...checkedReserves.filter((v) => !v.word_id),
  ];
  return {
    selectedVocabulary: shownVocabulary.map((v, index) => ({ ...v, sort_order: index })),
    selectedExpressions,
    candidateVocabulary,
    candidateExpressions,
    selectedSentences: selection.keySentences.map((s, index) => ({ ...s, sort_order: index })),
    selectedPatterns: selection.languagePatterns.map((p, index) => ({ ...p, sort_order: index })),
    usage: { selection: selection.usage, expressions: expressions.usage },
    diagnostics: { pool: pool.map((c) => `${c.word.swedish}|${c.word.pos}`), aiVocabulary: selection.vocabulary, article: selection.article, expressionCounts: expressions.counts, dropped, vocabularyLimit },
  };
}

// One deep analysis per row (2026-11-07): two requests for the same row (a double tap, a
// retry while the first still runs) each paid for the whole selection. The first claims the
// row with one conditional update (text_analysis.deep_started_at, migration
// 20261107120000); another one waits for its result instead of running the AI again, and
// runs itself only when the first failed (the claim is released) or went stale (a function
// that died keeps no one out for longer than the platform's 5-minute limit).
export const DEEP_CLAIM_STALE_MS = 5 * 60 * 1000;
export const DEEP_UNCLAIMED = "1970-01-01T00:00:00.000Z";

export async function claimDeepAnalysis(supabaseAdmin, analysisId, now = Date.now()) {
  const { data, error } = await supabaseAdmin.from("text_analysis")
    .update({ deep_started_at: new Date(now).toISOString() })
    .eq("id", analysisId).neq("status", "ready").lt("deep_started_at", new Date(now - DEEP_CLAIM_STALE_MS).toISOString())
    .select("id");
  // Before the migration (no such column), or any failure of the claim itself: the analysis
  // runs unclaimed, as it always did, rather than not at all.
  if (error) return "unclaimed";
  return data?.length ? "claimed" : "busy";
}

export async function releaseDeepClaim(supabaseAdmin, analysisId) {
  try {
    await supabaseAdmin.from("text_analysis").update({ deep_started_at: DEEP_UNCLAIMED }).eq("id", analysisId);
  } catch (error) {
    console.warn("[Reading] deep claim not released (it goes stale)", error.message);
  }
}

/** Runs `work` (which returns the finished row) once per row; { row, waited }. */
export async function deepOnce(supabaseAdmin, analysisId, work, { waitMs = 90000, pollMs = 2000, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  let claim = await claimDeepAnalysis(supabaseAdmin, analysisId);
  if (claim === "busy") {
    for (let waited = 0; waited < waitMs; waited += pollMs) {
      await sleep(pollMs);
      const { data: row } = await supabaseAdmin.from("text_analysis").select("*").eq("id", analysisId).maybeSingle();
      if (row?.status === "ready") return { row, waited: true };
      if (!row || row.deep_started_at === DEEP_UNCLAIMED) break;   // the other request failed
    }
    claim = await claimDeepAnalysis(supabaseAdmin, analysisId);
    if (claim === "busy") {
      const error = new Error("Analysen pågår redan. Försök igen om en stund.");
      error.status = 409;
      throw error;
    }
  }
  try {
    return { row: await work(), waited: false };
  } catch (error) {
    if (claim === "claimed") await releaseDeepClaim(supabaseAdmin, analysisId);
    throw error;
  }
}

// Deep layer — the original heavy vocabulary/expressions/sentences/patterns
// work, unchanged in substance, now operating on a text_resource +
// text_analysis row the fast layer already created, UPDATING that same row
// instead of inserting a new one. Idempotent: if this language's own row is
// already "ready" (e.g. a duplicate client call), just returns the existing
// row rather than re-spending AI calls. If a DIFFERENT language's row for
// the same article already reached "ready", takes the cheap
// explainExistingSelectionInLanguage path instead of the full pipeline below.
export async function analyzeReadingResourceDeep({ supabaseAdmin, userId, textResourceId, nativeLanguage = "zh" }) {
  const { data: textResource, error: resourceError } = await supabaseAdmin
    .from("text_resources")
    .select("id, cleaned_text, word_count, textbook_glossary, user_id, is_starter_library")
    .eq("id", textResourceId)
    .maybeSingle();
  // The reader's own text, or one of the shared reading library.
  if (resourceError || !textResource || (textResource.user_id !== userId && !textResource.is_starter_library)) {
    const error = new Error("Texten hittades inte.");
    error.status = 404;
    throw error;
  }

  let { data: existingAnalysis } = await supabaseAdmin
    .from("text_analysis")
    .select("*")
    .eq("text_resource_id", textResource.id)
    .eq("native_language", nativeLanguage)
    .order("analysis_version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!existingAnalysis) {
    const error = new Error("Ingen snabbanalys hittades att bygga vidare på.");
    error.status = 409;
    throw error;
  }
  if ((existingAnalysis.analysis_version || 1) < ANALYSIS_VERSION) existingAnalysis = await upgradeAnalysisRow(supabaseAdmin, existingAnalysis, { shared: textResource.is_starter_library });

  const tier = classifyLength(textResource.word_count);

  if (existingAnalysis.status === "ready") {
    await materializeReadingAnalysisItems(supabaseAdmin, { userId, analysis: existingAnalysis });
    return { analysis: existingAnalysis, tier };
  }

  const { row: analysisRow } = await deepOnce(supabaseAdmin, existingAnalysis.id, () => completeDeepAnalysis({ supabaseAdmin, userId, textResource, existingAnalysis, nativeLanguage, tier }));
  await materializeReadingAnalysisItems(supabaseAdmin, { userId, analysis: analysisRow });
  return { analysis: analysisRow, tier };
}

// The AI part of the deep layer: the other language's selection explained, or a selection
// of its own. Returns the finished row.
async function completeDeepAnalysis({ supabaseAdmin, userId, textResource, existingAnalysis, nativeLanguage, tier }) {
  const { data: readyOtherLanguage } = await supabaseAdmin
    .from("text_analysis")
    .select("*")
    .eq("text_resource_id", textResource.id)
    .eq("status", "ready")
    .neq("native_language", nativeLanguage)
    .eq("analysis_version", existingAnalysis.analysis_version || 1)
    .order("analysis_version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readyOtherLanguage) {
    const analysisRow = await explainExistingSelectionInLanguage({ supabaseAdmin, userId, textResource, existingAnalysis, sourceAnalysis: readyOtherLanguage, nativeLanguage });
    await supabaseAdmin.from("text_resources").update({ analysis_status: "ready" }).eq("id", textResource.id);
    return analysisRow;
  }

  const cleaned = textResource.cleaned_text;
  const wordCount = textResource.word_count;
  const glossary = textResource.textbook_glossary || [];
  const usageLogEntries = [];

  const result = await runDeepSelection(supabaseAdmin, {
    cleaned, wordCount, tier, glossary, nativeLanguage, textCefr: existingAnalysis.text_cefr, userId, textResourceId: textResource.id,
  });
  logUsage(usageLogEntries, { userId, textResourceId: textResource.id, feature: "reading_selection", model: MODEL, usage: result.usage.selection, cacheHit: false });
  logUsage(usageLogEntries, { userId, textResourceId: textResource.id, feature: "reading_expressions", model: MODEL, usage: result.usage.expressions, cacheHit: false });
  const { selectedVocabulary, selectedExpressions, candidateVocabulary, candidateExpressions, selectedSentences, selectedPatterns } = result;

  const { data: analysisRow, error: analysisError } = await supabaseAdmin
    .from("text_analysis")
    .update({
      selected_vocabulary: selectedVocabulary,
      selected_expressions: selectedExpressions,
      candidate_vocabulary: candidateVocabulary,
      candidate_expressions: candidateExpressions,
      key_sentences: selectedSentences,
      language_patterns: selectedPatterns,
      status: "ready",
    })
    .eq("id", existingAnalysis.id)
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
    details: { price_version: PRICE_VERSION, source: usageSource(userId), step: "credit_charge" },
  });
  if (usageLogEntries.length) await supabaseAdmin.from("ai_usage_logs").insert(usageLogEntries);
  return analysisRow;
}

// 规范§9.3/§10 — summary is on-demand only, never generated at import time.
export async function generateReadingSummary({ supabaseAdmin, userId, textResourceId, nativeLanguage = "zh" }) {
  const { data: resource, error: resourceError } = await supabaseAdmin.from("text_resources").select("id, cleaned_text, word_count, user_id").eq("id", textResourceId).eq("user_id", userId).single();
  if (resourceError || !resource) {
    const error = new Error("Texten hittades inte.");
    error.status = 404;
    throw error;
  }
  const { data: analysis } = await supabaseAdmin.from("text_analysis").select("*").eq("text_resource_id", textResourceId).eq("native_language", nativeLanguage).order("analysis_version", { ascending: false }).limit(1).maybeSingle();
  if (analysis?.summary_sv) return { summary_sv: analysis.summary_sv, summary_zh: analysis.summary_zh, cached: true };

  const tier = classifyLength(resource.word_count);
  const langName = languageName(nativeLanguage);
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
    systemPrompt: `Summarize the given Swedish text in ${minSentences}-${maxSentences} sentences, maximum 5. Cover only the main topic, core content, and key conclusion — no background info, no grammar explanation. Provide both a Swedish summary (summary_sv) and a ${langName} summary (summary_zh, written in ${langName} regardless of its field name) of equivalent length. These are two independent texts, not one text shown twice — never let a word or phrase from one leak into the other, even where they express the same idea.`,
    userPrompt: resource.cleaned_text,
  });

  const usageLogEntries = [];
  logUsage(usageLogEntries, { userId, textResourceId, feature: "summary", model: MODEL, usage, cacheHit: false, credits: calculateCredits("summary") });
  await supabaseAdmin.from("ai_usage_logs").insert(usageLogEntries);

  if (analysis) {
    await supabaseAdmin.from("text_analysis").update({ summary_sv: result.summary_sv, summary_zh: result.summary_zh, summary_generated_at: new Date().toISOString() }).eq("id", analysis.id);
  } else {
    await supabaseAdmin.from("text_analysis").insert({ text_resource_id: textResourceId, analysis_version: ANALYSIS_VERSION, native_language: nativeLanguage, status: "summary_ready", summary_sv: result.summary_sv, summary_zh: result.summary_zh, summary_generated_at: new Date().toISOString() });
  }

  return { summary_sv: result.summary_sv, summary_zh: result.summary_zh, cached: false };
}
