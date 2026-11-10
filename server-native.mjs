// Server logic for the native iOS app (2026-10-16, SprakLab_Native_iOS_Readiness_Review_v3
// + product-owner decisions). Shared by the api/* Vercel functions:
//   api/native.js action "generate-entry" — AI word card: dedupe → auth/quota → generate → validate → save → id
//   api/native.js action "delete-account" — App Store account deletion (personal data only)
//   api/native.js action "assess" — Azure pronunciation assessment (Talanalys)
// plus the shared TTS cache used by api/shadowing/tts.js.
//
// Every paid call goes through enforceQuota() first (server-side limits, Q3/N7).
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { synthesizeSwedishSpeech } from "./server-shadowing.mjs";
import { openaiCost, ttsCost, assessmentCost, usageSource, PRICE_VERSION } from "./server-prices.mjs";

import { checkNewWordCard, recordCheck, cleanCollocations, nounGrammar, latinLookalikes, foreignLetters, CHECK_VERSION } from "./server-language-checks.mjs";
import { resolveWord, findExistingExpression, expressionMatchKey, saldoPromptLine, saldoCardFields, recordEntryStatus, setMatchKey, completeNounForms } from "./server-resources.mjs";
import { lemmatize, saldoEntries, pickSaldoRow, perfectParticipleDeclension, compoundRows, multiWordVerbForms, cardFieldsFromSaldo } from "./server-lexicon.mjs";
import { multiwordEvidence, classifyMultiword } from "./server-evidence.mjs";
import { referenceEntries, referencePos, lexinPromptLine, expressionReferenceLine, lexinCountability, compareWithLexin, lexinForms, LEXIN_SV_SOURCE_ID } from "./server-references.mjs";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY || process.env.SPEECH_KEY;
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || process.env.SPEECH_REGION;

export const LANGUAGES = new Set(["zh", "en"]);
export const DEFAULT_DAILY_CREDITS = 100;
// Credit points per action (same scale as server-reading.mjs calculateCredits).
export const CREDITS = { word_generate: 5, pronunciation_assessment: 2, tts: 0 };

export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

export function normalizeLanguage(value) {
  const lang = String(value || "").trim().toLowerCase();
  return LANGUAGES.has(lang) ? lang : "zh";
}

export function adminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw httpError(500, "Supabase är inte konfigurerat på servern.");
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Verifies the bearer token; returns the user id or throws 401. */
export async function requireUser(req, message = "Logga in för att fortsätta.") {
  const header = String(req.headers.authorization || req.headers.Authorization || "").trim();
  if (!header.toLowerCase().startsWith("bearer ")) throw httpError(401, message);
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: header } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(header.slice(7).trim());
  if (error || !data?.user?.id) throw httpError(401, message);
  return data.user.id;
}

/** Optional auth: returns the user id, or null for anonymous callers. */
export async function optionalUser(req) {
  const header = String(req.headers.authorization || req.headers.Authorization || "").trim();
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  try {
    return await requireUser(req);
  } catch {
    return null;
  }
}

export async function isAdmin(supabaseAdmin, userId) {
  if (!userId) return false;
  const { data } = await supabaseAdmin.from("app_admins").select("user_id").eq("user_id", userId).maybeSingle();
  return Boolean(data);
}

/**
 * Server-side AI quota: today's credits_used (UTC day) + this action must stay under
 * the user's daily limit (user_preferences.daily_ai_credit_limit, which clients can no
 * longer write). Admins are unlimited. Throws 429 when exceeded.
 */
export async function enforceQuota(supabaseAdmin, userId, credits) {
  if (!credits || (await isAdmin(supabaseAdmin, userId))) return;
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const [{ data: prefs }, { data: logs }] = await Promise.all([
    supabaseAdmin.from("user_preferences").select("daily_ai_credit_limit").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("ai_usage_logs").select("credits_used").eq("user_id", userId).gte("created_at", start.toISOString()),
  ]);
  const limit = Number(prefs?.daily_ai_credit_limit) || DEFAULT_DAILY_CREDITS;
  const used = (logs || []).reduce((sum, row) => sum + (Number(row.credits_used) || 0), 0);
  if (used + credits > limit) throw httpError(429, "Du har använt dagens AI-kvot. Försök igen i morgon.");
}

// entry.usage (an OpenAI usage object) gives the tokens and the cost, cached input at its own price;
// otherwise inputTokens/outputTokens/cost as given. details (jsonb) always gets the price version and
// who caused the call; callers add the billed unit, a retry, a cache hit — never user text.
export async function logUsage(supabaseAdmin, entry) {
  const tokens = entry.usage ? openaiCost(entry.usage, entry.model) : null;
  const { error } = await supabaseAdmin.from("ai_usage_logs").insert({
    user_id: entry.userId || null,
    text_resource_id: entry.textResourceId || null,
    feature: entry.feature,
    model: entry.model || "",
    input_tokens: tokens ? tokens.input : entry.inputTokens || 0,
    output_tokens: tokens ? tokens.output : entry.outputTokens || 0,
    credits_used: entry.credits || 0,
    actual_cost: tokens ? tokens.cost : entry.cost || 0,
    cache_hit: Boolean(entry.cacheHit),
    details: { price_version: PRICE_VERSION, source: usageSource(entry.userId), ...(tokens?.cached ? { cached_input_tokens: tokens.cached } : {}), ...(entry.details || {}) },
  });
  if (error) console.warn("[native] usage log failed", error);
}

// ---------------------------------------------------------------------------
// AI word card generation
// ---------------------------------------------------------------------------

const FORM_TYPES = {
  verb: ["infinitive", "present", "preteritum", "supinum", "imperative", "verb_group", "present_participle", "perfect_participle"],
  noun: ["singular_indefinite", "singular_definite", "plural_indefinite", "plural_definite", "declension_group"],
  adjective: ["base_form", "neuter_form", "plural_form", "definite_form", "comparative", "superlative_indefinite", "superlative_definite"],
  adverb: ["base_form", "comparative", "superlative"],
  pronoun: ["subject_form", "object_form", "possessive_en", "possessive_ett", "possessive_plural"],
};
const ALL_FORM_TYPES = [...new Set(Object.values(FORM_TYPES).flat())];
const POS_VALUES = ["verb", "noun", "adjective", "adverb", "pronoun", "preposition", "conjunction", "numeral", "interjection", "presens_particip", "perfekt_particip", "other"];

function languageName(lang) {
  return lang === "en" ? "English" : "Simplified Chinese";
}

function wordCardSchema() {
  const pair = (props) => ({ type: "object", additionalProperties: false, properties: props, required: Object.keys(props) });
  return pair({
    is_real_word: { type: "boolean" },
    lemma: { type: "string" },
    pos: { type: "string", enum: POS_VALUES },
    pos_detail: { type: "string" },
    cefr_level: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    // Both explanation languages in one call (2026-11-01): a card made in one language
    // used to leave the other language's examples, tip, collocations and related words empty.
    meaning_zh: { type: "string" },
    meaning_en: { type: "string" },
    swedish_explanation: { type: "string" },
    forms: { type: "array", items: pair({ type: { type: "string", enum: ALL_FORM_TYPES }, value: { type: "string" } }) },
    transitivity: { type: "string", enum: ["transitive", "intransitive", "both", ""] },
    countability: { type: "string", enum: ["countable", "uncountable", "both", ""] },
    passive: { type: "string" },
    // Collocations first (2026-11-09): with them written, the examples show only the uses they
    // don't — written before, a fifth of the examples repeated a collocation's sentence.
    collocations: { type: "array", items: pair({ phrase: { type: "string" }, zh: { type: "string" }, en: { type: "string" }, example: { type: "string" } }) },
    // minItems 1: every card has an example (without it the model returned none, 2026-10-31).
    // How many is the word's own (2026-11-09: two were always written, the second often a padded
    // copy); maxItems only stops a runaway list, it is not a number to reach.
    examples: { type: "array", minItems: 1, maxItems: 5, items: pair({ swedish: { type: "string" }, zh: { type: "string" }, en: { type: "string" } }) },
    related: { type: "array", items: pair({ word: { type: "string" }, zh: { type: "string" }, en: { type: "string" }, pos: { type: "string", enum: RELATED_POS } }) },
    memory_tip_zh: { type: "string" },
    memory_tip_en: { type: "string" },
  });
}

// Part of speech of a related word, kept as the trailing note the apps already read:
// "gräddig | 奶油般的（形容词）", "gräddig | creamy (adjective)" — always the last
// bracket, from this fixed list (2026-11-07): a remark the meaning ends with ("（复数）")
// used to take its place, and the app then showed the remark as the part of speech.
// Participles used as words of their own are named as such, as in Fördjupning.
const RELATED_POS = ["noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction", "numeral", "interjection", "present_participle", "perfect_participle", "other"];
const POS_NOTE = {
  zh: { noun: "名词", verb: "动词", adjective: "形容词", adverb: "副词", pronoun: "代词", preposition: "介词", conjunction: "连词", numeral: "数词", interjection: "感叹词", present_participle: "现在分词", perfect_participle: "过去分词" },
  en: { noun: "noun", verb: "verb", adjective: "adjective", adverb: "adverb", pronoun: "pronoun", preposition: "preposition", conjunction: "conjunction", numeral: "numeral", interjection: "interjection", present_participle: "present participle", perfect_participle: "past participle" },
};
export function relatedMeaning(r, lang) {
  const meaning = String(r[lang] || "").trim();
  const note = (POS_NOTE[lang] || POS_NOTE.en)[r.pos];
  if (!note) return meaning;
  const notes = Object.values(POS_NOTE[lang] || POS_NOTE.en);
  const last = meaning.match(/[（(]([^（()）]*)[）)]\s*$/)?.[1]?.trim();
  if (last && notes.includes(last)) return meaning;
  return lang === "zh" ? `${meaning}（${note}）` : `${meaning} (${note})`;
}

/**
 * The related_words lines of a new card (2026-11-07): never the headword itself or one of
 * its own inflected forms ("lampor" on lampa, "rättvist" on rättvis) — those are its
 * grammar, not its family. Its participles stay when the model lists them: they are
 * words of their own (uppmuntrande, bokförd) and say so in their part of speech.
 */
/**
 * Related words a dictionary has as words of their own though they are forms of the headword:
 * an adjective's neuter as an adverb (säkert, eventuellt — Lexin's headwords; SALDO keeps them
 * as forms), and a homograph of another part of speech that SALDO has as a headword (svek, the
 * noun, is svika's past; frys, tomt, rätta — 2026-11-09). A comparative of the same part of
 * speech (äldre, bättre) stays a form.
 */
export async function ownWordFormsOf(supabaseAdmin, related, pos) {
  const words = [];
  for (const r of related || []) {
    const w = String(r.word || "").trim();
    if (!w) continue;
    if (r.pos === "adverb" && ((await saldoEntries(supabaseAdmin, w, "adverb")).length
      || ((await referenceEntries(supabaseAdmin, w)).lexin_sv || []).some((e) => e.pos === "adverb"))) words.push(w);
    else if (["noun", "verb", "adjective"].includes(r.pos) && r.pos !== pos && (await saldoEntries(supabaseAdmin, w, r.pos)).length) words.push(w);
  }
  return words;
}

export function relatedLines(related, { lemma, forms = [], words = [] }, lang) {
  // `words`: forms that are words of their own too, kept (säkert, eventuellt: SALDO's adverbs,
  // not only the adjective's neuter — dropped as its inflection before, 2026-11-09).
  const keep = new Set(words.map((w) => String(w).trim().toLowerCase()));
  const own = new Set([lemma, ...forms.filter((f) => !/participle/.test(f.type)).flatMap((f) => String(f.value || "").split("/"))]
    .map((w) => String(w || "").trim().toLowerCase()).filter((w) => w && !keep.has(w)));
  return (related || []).filter((r) => r.word && !own.has(String(r.word).trim().toLowerCase()))
    .map((r) => `${r.word} | ${relatedMeaning(r, lang)}`).join("\n");
}

/**
 * Examples asked for once more when the checks left a card none (2026-11-09): the senses and the
 * collocations it shows are given, and the sentences that were refused, so that the new ones show
 * a use no collocation shows and repeat none of them. Checked like the first ones by the caller.
 */
export async function retryExamples(supabaseAdmin, { lemma, pos, result, rejected = [], userId = null, textResourceId = null, chargeQuota = false }) {
  const pair = (props) => ({ type: "object", additionalProperties: false, properties: props, required: Object.keys(props) });
  const schema = pair({ examples: { type: "array", minItems: 1, maxItems: 2, items: pair({ swedish: { type: "string" }, zh: { type: "string" }, en: { type: "string" } }) } });
  try {
    const { result: out, usage } = await callOpenAIJson({
      schemaName: "word_card_examples", schema, maxOutputTokens: 800,
      system: "You write example sentences for a Swedish learner's dictionary entry: natural, everyday Swedish that a native speaker would write, each showing the headword in one of its given senses, with a Chinese (zh) and an English (en) translation of the whole sentence. The most common sense first; one sentence is often right. Never a sentence like a refused one, and none that repeats a collocation's example.",
      user: JSON.stringify({ headword: lemma, part_of_speech: pos, meaning_zh: result.meaning_zh, meaning_en: result.meaning_en, swedish_explanation: result.swedish_explanation,
        collocations: (result.collocations || []).map((c) => ({ phrase: c.phrase, example: c.example })), refused: rejected.slice(0, 6) }),
    });
    await logUsage(supabaseAdmin, { userId, textResourceId, feature: chargeQuota ? "word_generate" : "reading_word_card", model: MODEL,
      usage, credits: 0, details: { step: "example_retry" } });
    return (out.examples || []).filter((e) => String(e.swedish || "").trim());
  } catch (error) {
    console.warn("[native] example retry failed", lemma, error.message);
    return [];
  }
}

export async function callOpenAIJson({ schemaName, schema, system, user, maxOutputTokens = 2500 }) {
  if (!OPENAI_API_KEY) throw httpError(500, "OPENAI_API_KEY saknas på servern.");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      reasoning: { effort: "low" },
      max_output_tokens: maxOutputTokens,
      text: { format: { type: "json_schema", name: schemaName, strict: true, schema } },
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  const data = await response.json();
  if (!response.ok) throw httpError(502, data.error?.message || "AI-tjänsten svarade inte.");
  const text = typeof data.output_text === "string"
    ? data.output_text
    : (data.output || []).flatMap((o) => o.content || []).map((c) => c.text || "").join("");
  return { result: JSON.parse(text), usage: data.usage || {} };
}

const normalizeKey = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

// With a part of speech, only that headword + part of speech counts: a same-spelling
// word of another class is a different entry (2026-10-31). Without one (free-text
// search), any headword or inflected form does.
async function entryPartOfSpeech(supabaseAdmin, entryId) {
  const { data } = await supabaseAdmin.from("learning_objects").select("part_of_speech").eq("id", entryId).neq("status", "retired").maybeSingle();
  return data?.part_of_speech || null;
}

async function findExistingEntry(supabaseAdmin, text, pos = null) {
  const key = normalizeKey(text);
  let direct = supabaseAdmin.from("learning_objects").select("id, status").ilike("swedish", key).neq("status", "retired");
  if (pos) direct = direct.eq("part_of_speech", pos);
  const { data } = await direct.limit(1);
  if (data?.length) return data[0].id;
  if (pos) return null;
  const { data: form } = await supabaseAdmin.from("word_forms").select("learning_object_id").ilike("form_value", key).limit(1);
  return form?.[0]?.learning_object_id || null;
}

// Fills one explanation-language row; a field that already has content is kept.
async function fillTranslation(supabaseAdmin, entryId, lang, fields) {
  const { data: row } = await supabaseAdmin.from("learning_object_translations").select("id, meaning, learning_tip, collocations, related_words")
    .eq("learning_object_id", entryId).eq("native_language", lang).maybeSingle();
  const missing = Object.fromEntries(Object.entries(fields).filter(([k, v]) => String(v || "").trim() && !String(row?.[k] || "").trim()));
  if (!Object.keys(missing).length) return;
  const now = new Date().toISOString();
  if (row) await supabaseAdmin.from("learning_object_translations").update({ ...missing, updated_at: now }).eq("id", row.id);
  else await supabaseAdmin.from("learning_object_translations").insert({ learning_object_id: entryId, native_language: lang, ...missing, updated_at: now });
}

async function ensureTranslation(supabaseAdmin, entryId, nativeLanguage) {
  const { data } = await supabaseAdmin.from("learning_object_translations").select("id, meaning")
    .eq("learning_object_id", entryId).eq("native_language", nativeLanguage).maybeSingle();
  return Boolean(data?.meaning);
}

/**
 * Returns { entryId, created } — reuses an existing public entry whenever one
 * exists (headword or inflected form), so a word is only ever paid for once.
 * Reading analysis (2026-10-31) also calls this for its chosen keywords that have
 * no entry yet: it passes the part of speech and the sense the text uses, its own
 * source label, and no quota charge (the analysis itself is the charged action).
 */
const PLACEHOLDER_WORD = /^(någon|något|någons|ngn|ngt|ngns)(\/(någon|något|ngn|ngt))?$/;
const PARTICLES = new Set(["upp", "ut", "in", "av", "på", "till", "med", "om", "fram", "över", "igenom", "bort", "ner", "ned", "hem", "iväg", "tillbaka", "undan", "efter", "vid", "för", "åt", "sig", "emot", "mot", "ihop", "isär", "förbi", "runt", "kvar", "fast", "an", "loss", "överens", "ifrån", "från"]);
/** "gå ut på", "komma fram till": a SALDO verb followed only by particles, prepositions or sig. */
async function particleVerb(supabaseAdmin, phrase) {
  const [verb, ...rest] = normalizeKey(phrase).split(/\s+/);
  if (!rest.length || rest.length > 3 || !rest.every((w) => PARTICLES.has(w))) return false;
  return (await saldoEntries(supabaseAdmin, verb, "verb")).some((r) => normalizeKey(r.baseform) === verb);
}

/**
 * An existing entry reused for a search or a reading (2026-11-09, G6) is shown as it is — never
 * generated again. Unless its sense check is "verified" or was made by the current check
 * version, it is marked for that check (resource_field_status "reuse_check", one row per entry,
 * no AI call here); scripts/check-entries.mjs --reused checks each marked entry once and records
 * the result with the version, so the same check is never paid for twice and nothing loops.
 */
export async function noteReuse(supabaseAdmin, entryId) {
  try {
    const { data } = await supabaseAdmin.from("resource_field_status").select("field, status, detail").eq("learning_object_id", entryId).in("field", ["sense", "reuse_check"]);
    const sense = data?.find((r) => r.field === "sense");
    if (sense?.status === "verified" || sense?.detail?.check_version === CHECK_VERSION) return "checked";
    if (data?.some((r) => r.field === "reuse_check" && r.detail?.check_version === CHECK_VERSION)) return "marked";
    await supabaseAdmin.from("resource_field_status").upsert(
      { learning_object_id: entryId, field: "reuse_check", status: "present", source: "reuse", detail: { check_version: CHECK_VERSION, requested_at: new Date().toISOString() }, updated_at: new Date().toISOString() },
      { onConflict: "learning_object_id,field" },
    );
    return "marked";
  } catch (error) {
    console.warn("[native] reuse not marked", entryId, error.message);
    return "failed";
  }
}

export async function generateWordEntry({ supabaseAdmin, userId, word, nativeLanguage, pos = null, sense = "", source = "ai search", chargeQuota = true, textResourceId = null }) {
  // Look-alike Cyrillic or Greek letters put back ("gällа"); any other letter of another script is not Swedish.
  const text = latinLookalikes(String(word || "").trim());
  if (!text || text.length > 60 || !/^[\p{L}\s-]+$/u.test(text) || foreignLetters(text, "sv").length) throw httpError(400, "Skriv ett svenskt ord eller uttryck.");
  const lang = normalizeLanguage(nativeLanguage);
  const wantedPos = POS_VALUES.includes(pos) && pos !== "other" ? pos : null;

  // Shared resources first (basic and extended alike), then SALDO for the lemma:
  // an inflected form or a pronoun/placeholder variant is never a new entry.
  const isMultiWord = /\s/.test(text);
  const resolved = isMultiWord ? null : await resolveWord(supabaseAdmin, text, wantedPos);
  const existing = isMultiWord
    ? (await findExistingExpression(supabaseAdmin, text))?.id || null
    : resolved.entryId || (wantedPos ? null : await findExistingEntry(supabaseAdmin, text));
  if (existing && (await ensureTranslation(supabaseAdmin, existing, lang))) {
    await noteReuse(supabaseAdmin, existing);
    return { entryId: existing, created: false };
  }
  const reference = resolved?.saldo || null;
  const headword = reference ? reference.baseform : text;
  const headwordPos = reference ? resolved.pos : wantedPos;
  // Typed in search, a headword of several parts of speech ("man": pronoun and noun) is not
  // decided by SALDO's listing order: the prompt names them all and the model writes the one
  // meant, its forms then taken from SALDO for that part of speech (2026-11-08).
  const posChoice = !wantedPos && reference && resolved.alsoPos?.length ? [resolved.pos, ...resolved.alsoPos] : null;
  // Lexin's senses of the headword go into the prompt (one part of speech: the asked one, or Lexin's only one).
  const headwordRefs = isMultiWord ? null : await referenceEntries(supabaseAdmin, headword);
  const lexinOnly = headwordRefs ? [...new Set(referencePos(headwordRefs).lexin_sv)] : [];
  const promptPos = posChoice ? null : headwordPos || (lexinOnly.length === 1 ? lexinOnly[0] : null);
  // SALDO homographs of that part of speech, which can inflect differently by sense (fot: fötter / fot).
  const homographs = reference && !posChoice ? await saldoEntries(supabaseAdmin, headword, headwordPos) : [];
  // Which of Lexin's separate words of this spelling the card is (G1, 2026-11-09): the one the
  // request's own form belongs to ("laget": ett lag), else, without a sense from a text to pick
  // by, the one of SALDO's forms — unless SALDO's own homographs inflect differently, when the
  // model picks and returns that word's forms.
  const ownForm = (headwordRefs?.lexin_sv || []).find((e) => normalizeKey(text) !== normalizeKey(headword) && Object.values(e.forms || {}).some((f) => normalizeKey(f) === normalizeKey(text)));
  const lexinWord = ownForm ? { singular_definite: ownForm.forms.singular_definite }
    : !sense && reference && headwordPos === "noun" && !(homographs.length > 1) ? cardFieldsFromSaldo(reference, "noun").forms : null;
  // A multi-word expression's own Lexin entry, its particle verb's or its head word's idiom (G3).
  const expressionLine = isMultiWord ? await expressionReferenceLine(supabaseAdmin, text, (await saldoEntries(supabaseAdmin, text.trim().split(/\s+/)[0], "verb")).flatMap((r) => Object.values(r.forms || {}).flat())) : "";

  // Concurrency guard: one in-flight generation per (lemma, part of speech, language). With a
  // choice of parts of speech the model decides which word it writes, so the key names none:
  // a key naming one must only ever lead to an entry of that part of speech (2026-11-08).
  const lockPos = wantedPos || (posChoice ? null : headwordPos);
  const key = lockPos ? `${normalizeKey(headword)}|${lockPos}|${lang}` : `${normalizeKey(headword)}|${lang}`;
  const { data: lock } = await supabaseAdmin.from("generation_requests").select("*").eq("key", key).maybeSingle();
  if (lock?.status === "done" && lock.entry_id && (!lockPos || (await entryPartOfSpeech(supabaseAdmin, lock.entry_id)) === lockPos)) return { entryId: lock.entry_id, created: false };
  if (lock?.status === "pending" && Date.now() - Date.parse(lock.updated_at) < 120_000) {
    throw httpError(409, "Ordkortet skapas just nu. Försök igen om en stund.");
  }
  const now = new Date().toISOString();
  const { error: lockError } = await supabaseAdmin.from("generation_requests")
    .upsert({ key, status: "pending", requested_by: userId, error: "", updated_at: now }, { onConflict: "key" });
  if (lockError) throw lockError;

  try {
    if (chargeQuota) await enforceQuota(supabaseAdmin, userId, CREDITS.word_generate);
    const { result, usage } = await callOpenAIJson({
      schemaName: "swedish_word_card_v2",
      schema: wordCardSchema(),
      system: `You are a careful Swedish lexicographer writing a learner's dictionary entry for Chinese- and English-speaking learners (the requested explanation language is ${languageName(lang)}). The UI is Swedish. Return exactly one entry for the Swedish input.
- is_real_word: false if the input is not real Swedish (typo, name, other language). Then leave other fields minimal.
- lemma: the dictionary base form (an inflected input like "förändrade" becomes "förändra"). For multi-word expressions keep the canonical learnable form (infinitive, "någon/något" placeholders).
- cefr_level: the CEFR level at which learners typically meet this word or expression (A1–C2).
- meaning_zh: concise core meaning in Simplified Chinese. meaning_en: the same meaning, concise, in English. swedish_explanation: one simple Swedish definition.
- forms: full inflection for the part of speech using only the allowed form types (verbs include present_participle and perfect_participle when they exist; verb_group / declension_group as "1"–"5" when applicable). Empty for expressions.
- passive: the s-passive for verbs when natural (e.g. "påverkas"), else "".
- pos_detail: for nouns exactly "en-ord" or "ett-ord" (or "plural" for a plural-only noun); "" otherwise.
- countability (nouns only, else ""): "countable" (räknebart), "uncountable" (oräknebart: a mass or abstract noun normally without plural, e.g. koldioxid, nederbörd) or "both" (one sense countable and another a mass sense, e.g. kaffe: the drink / "två kaffe"). Don't call a noun uncountable just because its plural is rare, and don't give an uncountable noun plural forms.
- collocations: up to 5 combinations a learner must learn as units — a fixed verb, preposition or particle choice, or a typical strong partner word — with Chinese (zh) and English (en) meanings and a Swedish example that contains it. Not free combinations any noun or adjective would allow ("en stor bil"), never two that differ only in inflection or in någon/något, and fewer (even none) rather than weak ones.
- examples: natural Swedish sentences, each with a Chinese (zh) and an English (en) translation of the whole sentence. Together with the collocations they show the word's important senses and typical uses, each once: a use a collocation already shows with its example needs no example here. Always at least one — the most common use, in a sentence of its own — and one more for each important sense or use no collocation shows, most common first; as many as the word really needs (often one or two), never to reach a number. Never two that show the same thing, never a sentence that repeats or rephrases a collocation's example, and never a rare or bookish sense just to have another sentence. Where the reference gives a phrase for a sense no collocation shows, build that sense's sentence around it.
- related: up to 6 word-family members or related words — those a learner really needs (the verb's noun, the adjective's adverb when it is a word of its own), as many as there are; fewer (even none) rather than rare, made-up or loosely related ones — with Chinese (zh) and English (en) meanings and each word's part of speech (pos; "other" for multi-word expressions). pos is that word's own part of speech, never the headword's. Never the headword itself or one of its own inflected forms (plural, definite, neuter, tense forms, comparative): those are its grammar. A participle only when it is used as a word of its own, with pos present_participle or perfect_participle. A meaning gives the sense only — no part of speech or grammar remark in it.
- memory_tip_zh / memory_tip_en: the same short mnemonic in Chinese and in English, or "" for both.
Every zh field is Chinese only and every en field English only. If uncertain about a sense, prefer the most common one.
If the input names a part of speech and the sense a text uses, write the entry for exactly that part of speech and give that sense first.`,
      user: [
        text,
        wantedPos && `Part of speech: ${wantedPos}`,
        wantedPos && sense && `Sense used in the text: ${sense}`,
        posChoice ? `Reference (SALDO): "${headword}" is ${posChoice.join(", ")} — words of their own with the same spelling. Write the entry for the one a learner looking up "${text}" most likely means, with only that word's senses (the other gets an entry of its own); its forms are filled in from SALDO, so return forms: [].`
          : saldoPromptLine(reference, headwordPos, homographs),
        headwordRefs && promptPos ? lexinPromptLine(headwordRefs, promptPos, { forms: lexinWord }) : "",
        expressionLine,
      ].filter(Boolean).join("\n"),
    });
    await logUsage(supabaseAdmin, {
      userId, textResourceId, feature: chargeQuota ? "word_generate" : "reading_word_card", model: MODEL,
      usage, credits: chargeQuota ? CREDITS.word_generate : 0,
    });

    if (!result.is_real_word || !String(result.lemma || "").trim() || !String(result[`meaning_${lang}`] || "").trim()) {
      throw httpError(422, "Det verkar inte vara ett svenskt ord. Kontrollera stavningen.");
    }
    let pos = POS_VALUES.includes(result.pos) ? result.pos : "other";
    // "other" for one word SALDO has with one part of speech is that part of speech (2026-11-09:
    // liten and säker came back "other" once each, and the references then refused the card).
    if (pos === "other" && headwordPos && !posChoice && !/\s/.test(String(result.lemma || "").trim())) pos = headwordPos;
    // SALDO's lemma wins over the model's spelling when the part of speech agrees.
    let lemma = reference && pos === headwordPos ? reference.baseform : latinLookalikes(String(result.lemma).trim());
    // A multi-word request keeps its own words (2026-11-09): of six cards of "gå ut på" the model
    // headed two "gå ut på", two "gå ut på något", one "gå ut på någon/något" (wrong: never a
    // person) and called three "other" — the same expression under three headwords. Placeholders
    // the request didn't have are left out, and a verb with only particles after it is a verb.
    if (isMultiWord) {
      const asked = normalizeKey(text), got = normalizeKey(lemma);
      const extra = got.startsWith(`${asked} `) ? got.slice(asked.length + 1).split(/\s+/) : [];
      // Also its valency written out ("hålla med (någon) om något", g3 2026-11-09): placeholders,
      // optional parts in brackets and the prepositions before them are the frame, not the
      // headword — and kept, they made every right example fail the headword test.
      const frame = extra.map((w) => w.replace(/[()]/g, "")).filter(Boolean);
      if (frame.length && frame.every((w) => PLACEHOLDER_WORD.test(w) || PARTICLES.has(w)) && PLACEHOLDER_WORD.test(frame.at(-1))) lemma = String(text).trim();
      if (pos === "other" && await particleVerb(supabaseAdmin, lemma)) pos = "verb";
    }
    if (foreignLetters(lemma, "sv").length) throw httpError(422, "Det verkar inte vara ett svenskt ord. Kontrollera stavningen.");
    const isPhrase = /\s/.test(lemma);
    // Forms, s-passive and countability come from SALDO whenever it has the word.
    const saldoRows = isPhrase ? [] : await saldoEntries(supabaseAdmin, lemma, pos);
    // Homographs inflecting differently by sense: the row of the sense written (pickSaldoRow).
    const fromSaldo = saldoCardFields(pickSaldoRow(saldoRows, pos, result.forms), pos);
    // A multi-word verb ("gifta sig", "ge upp") takes SALDO's forms too, or at least loses the
    // model's impossible ones (group 1 for gifta sig, "lärd sig", "tagande upp"), 2026-11-08.
    const modelForms = (result.forms || []).filter((f) => f.value && ALL_FORM_TYPES.includes(f.type));
    const phraseVerb = isPhrase && pos === "verb" ? await multiWordVerbForms(supabaseAdmin, lemma, modelForms) : null;
    const forms = fromSaldo?.forms.length ? fromSaldo.forms : phraseVerb ? phraseVerb.forms : modelForms;
    // Without SALDO: Lexin's forms of this very word replace the model's where they differ, and a
    // compound SALDO doesn't list is checked against its last part (chokladask → ask).
    const refs = isPhrase ? null : normalizeKey(lemma) === normalizeKey(headword) && headwordRefs ? headwordRefs : await referenceEntries(supabaseAdmin, lemma);
    let lexinFields = {};
    if (!fromSaldo && refs) {
      lexinFields = compareWithLexin({ pos, forms: Object.fromEntries(forms.map((f) => [f.type, f.value])) }, refs).fields;
      for (const f of forms) {
        const r = lexinFields[`form:${f.type}`];
        if (r?.status === "mismatch") { f.value = r.reference; lexinFields[`form:${f.type}`] = { status: "verified", stored: r.reference, reference: r.reference }; }
      }
    }
    // An ambiguous split (a homograph head) could call a right form wrong: not used then.
    const compound = !isPhrase && !saldoRows.length ? (await compoundRows(supabaseAdmin, lemma, pos)).filter((r) => !r.compound.ambiguous) : [];
    // The card shows the perfect participle as en / ett / plural; the other two only from SALDO.
    const participle = pos === "verb" && forms.find((f) => f.type === "perfect_participle")?.value;
    const declined = participle && await perfectParticipleDeclension(supabaseAdmin, lemma, participle);
    if (declined) forms.push({ type: "perfect_participle_ett", value: declined.ett }, { type: "perfect_participle_plural", value: declined.plural });
    const passive = fromSaldo ? fromSaldo.passive : result.passive || "";
    // Nouns: gender label from the genus form, countability from SALDO (zero plural) or the model.
    const grammar = pos === "noun" ? nounGrammar({ saldoCountability: fromSaldo?.countability, lexinCountability: refs ? lexinCountability(refs) : null, aiCountability: result.countability, forms, aiPosDetail: result.pos_detail }) : null;
    if (grammar?.countability === "uncountable") {
      for (let i = forms.length - 1; i >= 0; i--) if (/^plural_/.test(forms[i].type) && grammar.countabilitySource === "ai" && !fromSaldo) forms.splice(i, 1);
    }
    // A countable noun is shown with all four forms: what the model left out comes from the
    // compound analysis or Lexin (completeNounForms), or stays missing — never made up.
    if (pos === "noun" && !fromSaldo) {
      const lexinNoun = (refs?.lexin_sv || []).map((e) => lexinForms(e, "noun")).find((x) => x.forms.singular_definite || x.forms.plural_indefinite);
      const added = completeNounForms(forms, { countability: grammar?.countability, compoundRow: compound[0] || null, lexinNounForms: lexinNoun && !lexinNoun.noPlural ? lexinNoun.forms : lexinNoun ? { singular_definite: lexinNoun.forms.singular_definite } : null });
      if (added.length) console.warn("[native] noun forms completed", lemma, added);
    }
    // One learning point once, each complete (meaning in both languages and an example).
    const { kept: collocationList, dropped: droppedCollocations } = cleanCollocations(result.collocations, [...LANGUAGES]);
    if (droppedCollocations.length) console.warn("[native] collocations dropped", lemma, droppedCollocations);
    result.collocations = collocationList;
    const matchKey = isPhrase ? await expressionMatchKey(supabaseAdmin, lemma) : null;

    // Checked before saving (2026-11-02): part of speech against the request and the
    // references, examples against the word's forms, meanings and translations by one AI
    // check. A card the references contradict is not saved.
    const checked = await checkNewWordCard(supabaseAdmin, { lemma, pos, wantedPos, sense, result, forms, isPhrase, userId, textResourceId });
    if (!checked.ok) {
      console.warn("[native] word card rejected", lemma, pos, checked.reason);
      throw httpError(422, "Ordkortet kunde inte bekräftas. Försök igen senare.");
    }
    Object.assign(result, checked.result);
    // A function word's class the references give alone (R5: oavsett is a preposition, not the
    // adverb the model wrote): the card is saved as that class, without the other class's forms.
    if (checked.pos.corrected) {
      pos = checked.pos.corrected.to;
      for (let i = forms.length - 1; i >= 0; i--) if (!(FORM_TYPES[pos] || []).includes(forms[i].type)) forms.splice(i, 1);
    }
    // Every card has an example (2026-11-09). When the checks left none, examples are asked for
    // once more and the card checked again; still none and it is saved as a draft — the one who
    // asked sees it, never as a finished entry.
    if (!(result.examples || []).length) {
      const retry = await retryExamples(supabaseAdmin, { lemma, pos, result, rejected: checked.sense?.detail?.dropped || [], userId, textResourceId, chargeQuota });
      if (retry.length) {
        const again = await checkNewWordCard(supabaseAdmin, { lemma, pos, wantedPos, sense, result: { ...result, examples: retry }, forms, isPhrase, userId, textResourceId });
        if (again.ok && (again.result.examples || []).length) { Object.assign(result, again.result); checked.sense = again.sense; }
      }
    }
    const noExample = !(result.examples || []).length;

    // Re-check before saving: the lemma may exist even if the input didn't match —
    // as the same part of speech (a same-spelling word of another class gets its own
    // entry), or as a phrase / expression in either module.
    let entryId = isPhrase
      ? (await findExistingExpression(supabaseAdmin, lemma, matchKey))?.id || null
      : (await resolveWord(supabaseAdmin, lemma, pos)).entryId;
    // A new multi-word card from search (knowledge v2, decision 1): with MULTIWORD_SEARCH_CLASSIFY=on
    // it is public only when a dictionary lists the combination (a fixed phrase or idiom); any other
    // — a typical or free combination, or one nothing decides — is written for the reader who asked
    // but kept a draft (pending), out of the shared library. Off (default): as before.
    const classified = isPhrase && !entryId && process.env.MULTIWORD_SEARCH_CLASSIFY === "on"
      ? classifyMultiword({ ...(await multiwordEvidence(supabaseAdmin, lemma, { timeout: Number(process.env.MULTIWORD_KORP_TIMEOUT_MS) || 15000 }).catch(() => ({}))), ai: {} })
      : null;
    if (!entryId) {
      entryId = randomUUID();
      const { error: insertError } = await supabaseAdmin.from("learning_objects").insert({
        id: entryId,
        swedish: lemma,
        part_of_speech: isPhrase ? "other" : pos,
        pos_detail: grammar ? grammar.posDetail : (pos === "noun" ? "" : result.pos_detail || ""),
        object_type: isPhrase ? (classified?.cls === "F3" ? "expression" : "phrase") : "word",
        category: isPhrase ? (classified?.cls === "F3" ? "everyday_expression" : "common_phrase") : null,
        cefr_level: result.cefr_level || null,
        chinese: String(result.meaning_zh || "").trim(),
        swedish_explanation: result.swedish_explanation || "",
        example_sv: (result.examples || []).map((e) => String(e.swedish || "").trim()).filter(Boolean).join("\n"),
        transitivity: result.transitivity || null,
        passiv_s: passive,
        countability: grammar?.countability || null,
        source,
        status: noExample || (classified && classified.placement !== "own_entry") ? "draft" : "ai_generated",
      });
      if (insertError) {
        // Lost a race with another insert of the same (swedish, pos): reuse it.
        const raced = isPhrase ? (await findExistingExpression(supabaseAdmin, lemma, matchKey))?.id : await findExistingEntry(supabaseAdmin, lemma, pos);
        if (!raced) throw insertError;
        entryId = raced;
      } else {
        if (matchKey) await setMatchKey(supabaseAdmin, entryId, matchKey);
        if (forms.length) {
          await supabaseAdmin.from("word_forms").upsert(
            forms.map((f, i) => ({ learning_object_id: entryId, form_type: f.type, form_value: f.value, sort_order: i })),
            { onConflict: "learning_object_id,form_type" },
          );
        }
        for (const [i, ex] of (result.examples || []).filter((e) => String(e.swedish || "").trim()).entries()) {
          const { data: exRow } = await supabaseAdmin.from("learning_object_examples")
            .insert({ learning_object_id: entryId, example_swedish: ex.swedish, sort_order: i }).select("id").single();
          const translations = [...LANGUAGES].filter((l) => String(ex[l] || "").trim()).map((l) => ({ example_id: exRow?.id, native_language: l, translation: ex[l].trim() }));
          if (exRow && translations.length) await supabaseAdmin.from("learning_object_example_translations").insert(translations);
        }
        const collocations = (result.collocations || []).filter((c) => c.phrase);
        if (collocations.length) {
          await supabaseAdmin.from("learning_object_collocations").insert(
            collocations.map((c, i) => ({ learning_object_id: entryId, phrase_text: c.phrase, sort_order: i })),
          );
        }
        const examples = (result.examples || []).filter((e) => String(e.swedish || "").trim());
        await recordEntryStatus(supabaseAdmin, entryId, {
          type: isPhrase ? "phrase" : "word", pos, forms: Object.fromEntries(forms.map((f) => [f.type, f.value])),
          passiv_s: passive, countability: grammar?.countability || null,
          meaning_zh: Boolean(String(result.meaning_zh || "").trim()), meaning_en: Boolean(String(result.meaning_en || "").trim()),
          example: examples.length > 0, swedish_explanation: Boolean(result.swedish_explanation), cefr_level: Boolean(result.cefr_level),
        }, saldoRows.length ? { saldoRows }
          : compound.length ? { saldoRows: compound, formSource: "saldo-compound" }
          : { referenceFields: lexinFields, formSource: LEXIN_SV_SOURCE_ID });
        if (!isPhrase) await recordCheck(supabaseAdmin, entryId, "pos", checked.pos.status, checked.pos.source, checked.pos.detail || null);
        await recordCheck(supabaseAdmin, entryId, "sense", checked.sense.status, checked.sense.source, checked.sense.detail, { grade: checked.sense.grade });
      }
    }

    const ownWordForms = await ownWordFormsOf(supabaseAdmin, result.related, pos);
    // Both explanation-language rows; for an existing entry only its empty fields are filled.
    for (const l of LANGUAGES) {
      await fillTranslation(supabaseAdmin, entryId, l, {
        meaning: String(result[`meaning_${l}`] || "").trim(),
        learning_tip: String(result[`memory_tip_${l}`] || "").trim(),
        collocations: (result.collocations || []).filter((c) => c.phrase).map((c) => [c.phrase, c[l], c.example].filter(Boolean).join(" | ")).join("\n"),
        related_words: relatedLines(result.related, { lemma, forms, words: ownWordForms }, l),
      });
    }

    await supabaseAdmin.from("generation_requests").update({ status: "done", entry_id: entryId, updated_at: new Date().toISOString() }).eq("key", key);
    return { entryId, created: true };
  } catch (error) {
    await supabaseAdmin.from("generation_requests").update({ status: "failed", error: String(error.message || "").slice(0, 500), updated_at: new Date().toISOString() }).eq("key", key);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Account deletion (App Store 5.1.1(v)) — personal data only
// ---------------------------------------------------------------------------

async function listAllObjects(supabaseAdmin, bucket, prefix) {
  const paths = [];
  const queue = [prefix];
  while (queue.length) {
    const folder = queue.shift();
    const { data, error } = await supabaseAdmin.storage.from(bucket).list(folder, { limit: 1000 });
    if (error) throw error;
    for (const item of data || []) {
      const path = `${folder}/${item.name}`;
      if (item.id === null || item.metadata === null) queue.push(path); else paths.push(path);
    }
  }
  return paths;
}

/**
 * Which word a search without a part of speech can mean (knowledge v2, R6, decision 5): the
 * plausible (lemma, part of speech) readings, each with the dictionary's first definitions and the
 * existing entry when there is one. Plausible: Lexin has the word as that part of speech, or an
 * entry exists — SALDO's rarer readings of a common spelling are left out ("fast" has no adverb
 * in Lexin). The text's own reading as a headword comes first; an inflected form only reaches
 * its lemmas ("laget": lag). One candidate means no choice to make: the app goes straight on.
 * [{ lemma, pos, gloss, entryId }]; empty for a multi-word text (expressions are found by match key).
 */
export async function identityCandidates(supabaseAdmin, word) {
  const text = latinLookalikes(String(word || "").trim());
  if (!text || /\s/.test(text)) return [];
  const all = await lemmatize(supabaseAdmin, text);
  const own = all.filter((c) => normalizeKey(c.lemma) === normalizeKey(text));
  const readings = own.length ? own : all;
  const out = [];
  for (const { lemma, pos } of readings) {
    if (out.some((c) => c.lemma === lemma && c.pos === pos)) continue;
    const refs = await referenceEntries(supabaseAdmin, lemma);
    const lexin = (refs.lexin_sv || []).filter((e) => e.pos === pos);
    // An inflected form names its own word among homographs ("laget" is ett lag, not en lag).
    const byForm = normalizeKey(text) !== normalizeKey(lemma) ? lexin.filter((e) => Object.values(e.forms || {}).some((f) => normalizeKey(f) === normalizeKey(text))) : [];
    const words = byForm.length ? byForm : lexin;
    const { data } = await supabaseAdmin.from("learning_objects").select("id").eq("object_type", "word").neq("status", "retired").ilike("swedish", lemma).eq("part_of_speech", pos).limit(1);
    const entryId = data?.[0]?.id || null;
    const lexinHasWord = (refs.lexin_sv || []).length > 0;
    if (lexinHasWord && !words.length && !entryId) continue;
    out.push({ lemma, pos, gloss: words.map((e) => e.lexemes?.[0]?.definition).filter(Boolean).join("; "), entryId });
  }
  return out;
}

export async function deleteAccount({ supabaseAdmin, userId }) {
  if (await isAdmin(supabaseAdmin, userId)) {
    throw httpError(403, "Ägarkontot kan inte raderas från appen.");
  }
  for (const bucket of ["shadowing-recordings", "shadowing-standard-audio"]) {
    const paths = await listAllObjects(supabaseAdmin, bucket, userId);
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await supabaseAdmin.storage.from(bucket).remove(paths.slice(i, i + 100));
      if (error) throw error;
    }
  }
  // Every personal table references auth.users / profiles ON DELETE CASCADE; public
  // catalog rows only keep created_by (SET NULL) and are never deleted.
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw error;
  return { deleted: true };
}

// ---------------------------------------------------------------------------
// Pronunciation assessment (Talanalys) — Azure, sv-SE
// Validated 2026-10-16: sv-SE returns Accuracy / Fluency / Completeness / PronScore
// (phoneme granularity) but no ProsodyScore (prosody is en-US only), so rhythm is
// derived from word timing below and intonation is not scored for Swedish.
// ---------------------------------------------------------------------------

const MAX_ASSESS_BYTES = 60 * 32_000 + 1_000; // 60 s of 16 kHz 16-bit mono PCM

export async function assessPronunciation({ supabaseAdmin, userId, referenceText, audioBase64 }) {
  if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) throw httpError(500, "Talanalys är inte konfigurerad.");
  const text = String(referenceText || "").trim();
  if (!text || text.length > 1500) throw httpError(400, "Referenstexten saknas eller är för lång.");
  const audio = Buffer.from(String(audioBase64 || ""), "base64");
  if (audio.length < 8_000) throw httpError(400, "Inspelningen är för kort.");
  if (audio.length > MAX_ASSESS_BYTES) throw httpError(400, "Talanalys stöder inspelningar upp till 60 sekunder i taget.");

  await enforceQuota(supabaseAdmin, userId, CREDITS.pronunciation_assessment);
  const config = Buffer.from(JSON.stringify({
    ReferenceText: text,
    GradingSystem: "HundredMark",
    Granularity: "Phoneme",
    Dimension: "Comprehensive",
    EnableMiscue: true,
  })).toString("base64");
  const response = await fetch(
    `https://${AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=sv-SE&format=detailed`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        "Pronunciation-Assessment": config,
      },
      body: audio,
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw httpError(502, "Talanalysen misslyckades. Försök igen.");
  if (data.RecognitionStatus !== "Success" || !data.NBest?.length) {
    throw httpError(422, "Ingen tydlig svensk röst hördes i inspelningen. Försök igen närmare mikrofonen.");
  }
  const best = data.NBest[0];
  const seconds = audio.length / 32_000;
  await logUsage(supabaseAdmin, { userId, feature: "pronunciation_assessment", model: "azure-pronunciation-sv-SE", credits: CREDITS.pronunciation_assessment, cost: assessmentCost(seconds),
    details: { unit: "audio_seconds", units: Math.round(seconds * 10) / 10 } });

  return {
    overall: best.PronScore ?? best.AccuracyScore ?? 0,
    accuracy: best.AccuracyScore ?? null,
    fluency: best.FluencyScore ?? null,
    completeness: best.CompletenessScore ?? null,
    prosody: rhythmScore(best.Words || [], text),
    feedback: [],
  };
}

/**
 * Heuristic rhythm score from word timing: penalises long pauses inside a sentence
 * and an articulation rate far from natural Swedish read speech (~2.4 words/s).
 */
export function rhythmScore(words, referenceText) {
  const timed = words.filter((w) => typeof w.Offset === "number" && typeof w.Duration === "number" && w.ErrorType !== "Omission");
  if (timed.length < 3) return null;
  const ticks = 10_000_000;
  const start = timed[0].Offset / ticks;
  const end = (timed.at(-1).Offset + timed.at(-1).Duration) / ticks;
  const sentenceEnds = new Set();
  String(referenceText).split(/\s+/).forEach((token, i) => { if (/[.!?;:]$/.test(token)) sentenceEnds.add(i); });
  let pausePenalty = 0;
  for (let i = 1; i < timed.length; i++) {
    const gap = timed[i].Offset / ticks - (timed[i - 1].Offset + timed[i - 1].Duration) / ticks;
    const boundary = sentenceEnds.has(i - 1) || /[,]$/.test(timed[i - 1].Word || "");
    if (!boundary && gap > 0.45) pausePenalty += Math.min(10, (gap - 0.45) * 12);
  }
  const rate = timed.length / Math.max(0.5, end - start);
  const ratePenalty = Math.min(35, Math.abs(Math.log2(rate / 2.4)) * 40);
  return Math.max(0, Math.min(100, Math.round(100 - pausePenalty - ratePenalty)));
}

// ---------------------------------------------------------------------------
// Shared pronunciation cache (generate once, reuse) — public bucket "tts-cache"
// ---------------------------------------------------------------------------

// Every request is logged (feature tts_word): a cache hit costs nothing, a miss the characters
// synthesized. No text is logged.
export async function cachedSpeech({ supabaseAdmin, text, voiceId, userId = null }) {
  const clean = String(text || "").trim();
  if (!clean) throw httpError(400, "Svensk text saknas.");
  const voice = String(voiceId || "sv-SE-SofieNeural");
  const hash = createHash("sha256").update(`${voice}|${clean}`).digest("hex");
  const path = `${voice}/${hash.slice(0, 2)}/${hash}.mp3`;
  const bucket = supabaseAdmin.storage.from("tts-cache");
  const publicUrl = bucket.getPublicUrl(path).data.publicUrl;

  const head = await fetch(publicUrl, { method: "HEAD" }).catch(() => null);
  if (head?.ok) {
    await logUsage(supabaseAdmin, { userId, feature: "tts_word", model: voice, cacheHit: true, details: { unit: "characters", units: 0 } });
    return { url: publicUrl, cached: true };
  }

  const speech = await synthesizeSwedishSpeech(clean, voice);
  await logUsage(supabaseAdmin, { userId, feature: "tts_word", model: `${speech.provider}:${speech.voiceId}`, cost: ttsCost(speech.provider, speech.characters),
    details: { unit: "characters", units: speech.characters, provider: speech.provider } });
  const { error } = await bucket.upload(path, speech.audioBuffer, { contentType: "audio/mpeg", upsert: true });
  if (error) {
    // Cache write failed — still serve this request.
    return { url: null, dataUrl: `data:audio/mpeg;base64,${speech.audioBuffer.toString("base64")}`, cached: false };
  }
  return { url: publicUrl, cached: false };
}
