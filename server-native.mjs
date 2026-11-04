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

import { checkNewWordCard, recordCheck, cleanCollocations, nounGrammar } from "./server-language-checks.mjs";
import { resolveWord, findExistingExpression, expressionMatchKey, saldoPromptLine, saldoCardFields, recordEntryStatus, setMatchKey, completeNounForms } from "./server-resources.mjs";
import { saldoEntries, perfectParticipleDeclension, compoundRows } from "./server-lexicon.mjs";
import { referenceEntries, referencePos, lexinPromptLine, lexinCountability, compareWithLexin, lexinForms, LEXIN_SV_SOURCE_ID } from "./server-references.mjs";

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

export async function logUsage(supabaseAdmin, entry) {
  const { error } = await supabaseAdmin.from("ai_usage_logs").insert({
    user_id: entry.userId || null,
    text_resource_id: entry.textResourceId || null,
    feature: entry.feature,
    model: entry.model || "",
    input_tokens: entry.inputTokens || 0,
    output_tokens: entry.outputTokens || 0,
    credits_used: entry.credits || 0,
    actual_cost: entry.cost || 0,
    cache_hit: Boolean(entry.cacheHit),
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
    // minItems: without it the model returned no examples at all (seen 2026-10-31).
    examples: { type: "array", minItems: 2, maxItems: 2, items: pair({ swedish: { type: "string" }, zh: { type: "string" }, en: { type: "string" } }) },
    collocations: { type: "array", items: pair({ phrase: { type: "string" }, zh: { type: "string" }, en: { type: "string" }, example: { type: "string" } }) },
    related: { type: "array", items: pair({ word: { type: "string" }, zh: { type: "string" }, en: { type: "string" }, pos: { type: "string", enum: RELATED_POS } }) },
    memory_tip_zh: { type: "string" },
    memory_tip_en: { type: "string" },
  });
}

// Part of speech of a related word, kept as the trailing note the apps already read:
// "gräddig | 奶油般的（形容词）", "gräddig | creamy (adjective)".
const RELATED_POS = ["noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction", "numeral", "interjection", "other"];
const POS_NOTE = {
  zh: { noun: "名词", verb: "动词", adjective: "形容词", adverb: "副词", pronoun: "代词", preposition: "介词", conjunction: "连词", numeral: "数词", interjection: "感叹词" },
  en: { noun: "noun", verb: "verb", adjective: "adjective", adverb: "adverb", pronoun: "pronoun", preposition: "preposition", conjunction: "conjunction", numeral: "numeral", interjection: "interjection" },
};
function relatedMeaning(r, lang) {
  const meaning = String(r[lang] || "").trim();
  const note = (POS_NOTE[lang] || POS_NOTE.en)[r.pos];
  if (!note || /[（(][^（(]*[）)]\s*$/.test(meaning)) return meaning;
  return lang === "zh" ? `${meaning}（${note}）` : `${meaning} (${note})`;
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
export async function generateWordEntry({ supabaseAdmin, userId, word, nativeLanguage, pos = null, sense = "", source = "ai search", chargeQuota = true, textResourceId = null }) {
  const text = String(word || "").trim();
  if (!text || text.length > 60 || !/^[\p{L}\s-]+$/u.test(text)) throw httpError(400, "Skriv ett svenskt ord eller uttryck.");
  const lang = normalizeLanguage(nativeLanguage);
  const wantedPos = POS_VALUES.includes(pos) && pos !== "other" ? pos : null;

  // Shared resources first (basic and extended alike), then SALDO for the lemma:
  // an inflected form or a pronoun/placeholder variant is never a new entry.
  const isMultiWord = /\s/.test(text);
  const resolved = isMultiWord ? null : await resolveWord(supabaseAdmin, text, wantedPos);
  const existing = isMultiWord
    ? (await findExistingExpression(supabaseAdmin, text))?.id || null
    : resolved.entryId || (wantedPos ? null : await findExistingEntry(supabaseAdmin, text));
  if (existing && (await ensureTranslation(supabaseAdmin, existing, lang))) return { entryId: existing, created: false };
  const reference = resolved?.saldo || null;
  const headword = reference ? reference.baseform : text;
  const headwordPos = reference ? resolved.pos : wantedPos;
  // Lexin's senses of the headword go into the prompt (one part of speech: the asked one, or Lexin's only one).
  const headwordRefs = isMultiWord ? null : await referenceEntries(supabaseAdmin, headword);
  const lexinOnly = headwordRefs ? [...new Set(referencePos(headwordRefs).lexin_sv)] : [];
  const promptPos = headwordPos || (lexinOnly.length === 1 ? lexinOnly[0] : null);

  // Concurrency guard: one in-flight generation per (lemma, part of speech, language).
  const key = headwordPos ? `${normalizeKey(headword)}|${headwordPos}|${lang}` : `${normalizeKey(headword)}|${lang}`;
  const { data: lock } = await supabaseAdmin.from("generation_requests").select("*").eq("key", key).maybeSingle();
  if (lock?.status === "done" && lock.entry_id) return { entryId: lock.entry_id, created: false };
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
- examples: 2 natural Swedish sentences, each with a Chinese (zh) and an English (en) translation of the whole sentence.
- collocations: up to 5 combinations a learner must learn as units — a fixed verb, preposition or particle choice, or a typical strong partner word — with Chinese (zh) and English (en) meanings and a Swedish example that contains it. Not free combinations any noun or adjective would allow ("en stor bil"), never two that differ only in inflection or in någon/något, and fewer (even none) rather than weak ones.
- related: 3–6 word-family members or related words with Chinese (zh) and English (en) meanings and each word's part of speech (pos; "other" for multi-word expressions).
- memory_tip_zh / memory_tip_en: the same short mnemonic in Chinese and in English, or "" for both.
Every zh field is Chinese only and every en field English only. If uncertain about a sense, prefer the most common one.
If the input names a part of speech and the sense a text uses, write the entry for exactly that part of speech and give that sense first.`,
      user: [
        text,
        wantedPos && `Part of speech: ${wantedPos}`,
        wantedPos && sense && `Sense used in the text: ${sense}`,
        saldoPromptLine(reference, headwordPos),
        headwordRefs && promptPos ? lexinPromptLine(headwordRefs, promptPos) : "",
      ].filter(Boolean).join("\n"),
    });
    const cost = ((usage.input_tokens || 0) / 1e6) * 0.75 + ((usage.output_tokens || 0) / 1e6) * 4.5;
    await logUsage(supabaseAdmin, {
      userId, textResourceId, feature: chargeQuota ? "word_generate" : "reading_word_card", model: MODEL,
      inputTokens: usage.input_tokens, outputTokens: usage.output_tokens, credits: chargeQuota ? CREDITS.word_generate : 0, cost,
    });

    if (!result.is_real_word || !String(result.lemma || "").trim() || !String(result[`meaning_${lang}`] || "").trim()) {
      throw httpError(422, "Det verkar inte vara ett svenskt ord. Kontrollera stavningen.");
    }
    const pos = POS_VALUES.includes(result.pos) ? result.pos : "other";
    // SALDO's lemma wins over the model's spelling when the part of speech agrees.
    const lemma = reference && pos === headwordPos ? reference.baseform : String(result.lemma).trim();
    const isPhrase = /\s/.test(lemma);
    // Forms, s-passive and countability come from SALDO whenever it has the word.
    const saldoRows = isPhrase ? [] : await saldoEntries(supabaseAdmin, lemma, pos);
    const fromSaldo = saldoCardFields(saldoRows[0], pos);
    const forms = fromSaldo?.forms.length ? fromSaldo.forms : (result.forms || []).filter((f) => f.value && ALL_FORM_TYPES.includes(f.type));
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

    // Re-check before saving: the lemma may exist even if the input didn't match —
    // as the same part of speech (a same-spelling word of another class gets its own
    // entry), or as a phrase / expression in either module.
    let entryId = isPhrase
      ? (await findExistingExpression(supabaseAdmin, lemma, matchKey))?.id || null
      : (await resolveWord(supabaseAdmin, lemma, pos)).entryId;
    if (!entryId) {
      entryId = randomUUID();
      const { error: insertError } = await supabaseAdmin.from("learning_objects").insert({
        id: entryId,
        swedish: lemma,
        part_of_speech: isPhrase ? "other" : pos,
        pos_detail: grammar ? grammar.posDetail : (pos === "noun" ? "" : result.pos_detail || ""),
        object_type: isPhrase ? "phrase" : "word",
        category: isPhrase ? "common_phrase" : null,
        cefr_level: result.cefr_level || null,
        chinese: String(result.meaning_zh || "").trim(),
        swedish_explanation: result.swedish_explanation || "",
        example_sv: (result.examples || []).map((e) => String(e.swedish || "").trim()).filter(Boolean).join("\n"),
        transitivity: result.transitivity || null,
        passiv_s: passive,
        countability: grammar?.countability || null,
        source,
        status: "ai_generated",
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
        await recordCheck(supabaseAdmin, entryId, "sense", checked.sense.status, checked.sense.source, checked.sense.detail);
      }
    }

    // Both explanation-language rows; for an existing entry only its empty fields are filled.
    for (const l of LANGUAGES) {
      await fillTranslation(supabaseAdmin, entryId, l, {
        meaning: String(result[`meaning_${l}`] || "").trim(),
        learning_tip: String(result[`memory_tip_${l}`] || "").trim(),
        collocations: (result.collocations || []).filter((c) => c.phrase).map((c) => [c.phrase, c[l], c.example].filter(Boolean).join(" | ")).join("\n"),
        related_words: (result.related || []).filter((r) => r.word).map((r) => `${r.word} | ${relatedMeaning(r, l)}`).join("\n"),
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
  await logUsage(supabaseAdmin, { userId, feature: "pronunciation_assessment", model: "azure-pronunciation-sv-SE", credits: CREDITS.pronunciation_assessment, cost: (seconds / 3600) * 1.32 });

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

export async function cachedSpeech({ supabaseAdmin, text, voiceId }) {
  const clean = String(text || "").trim();
  if (!clean) throw httpError(400, "Svensk text saknas.");
  const voice = String(voiceId || "sv-SE-SofieNeural");
  const hash = createHash("sha256").update(`${voice}|${clean}`).digest("hex");
  const path = `${voice}/${hash.slice(0, 2)}/${hash}.mp3`;
  const bucket = supabaseAdmin.storage.from("tts-cache");
  const publicUrl = bucket.getPublicUrl(path).data.publicUrl;

  const head = await fetch(publicUrl, { method: "HEAD" }).catch(() => null);
  if (head?.ok) return { url: publicUrl, cached: true };

  const speech = await synthesizeSwedishSpeech(clean, voice);
  const { error } = await bucket.upload(path, speech.audioBuffer, { contentType: "audio/mpeg", upsert: true });
  if (error) {
    // Cache write failed — still serve this request.
    return { url: null, dataUrl: `data:audio/mpeg;base64,${speech.audioBuffer.toString("base64")}`, cached: false };
  }
  return { url: publicUrl, cached: false };
}
