// Server logic for the native iOS app (2026-10-16, SprakLab_Native_iOS_Readiness_Review_v3
// + product-owner decisions). Shared by the api/* Vercel functions:
//   api/entries/generate.js   — AI word card: dedupe → auth/quota → generate → validate → save → id
//   api/account/delete.js     — App Store account deletion (personal data only)
//   api/shadowing/assess.js   — Azure pronunciation assessment (Talanalys)
// plus the shared TTS cache used by api/shadowing/tts.js.
//
// Every paid call goes through enforceQuota() first (server-side limits, Q3/N7).
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { synthesizeSwedishSpeech } from "./server-shadowing.mjs";

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
    meaning: { type: "string" },
    swedish_explanation: { type: "string" },
    forms: { type: "array", items: pair({ type: { type: "string", enum: ALL_FORM_TYPES }, value: { type: "string" } }) },
    transitivity: { type: "string", enum: ["transitive", "intransitive", "both", ""] },
    passive: { type: "string" },
    examples: { type: "array", items: pair({ swedish: { type: "string" }, translation: { type: "string" } }) },
    collocations: { type: "array", items: pair({ phrase: { type: "string" }, meaning: { type: "string" }, example: { type: "string" } }) },
    related: { type: "array", items: pair({ word: { type: "string" }, meaning: { type: "string" } }) },
    memory_tip: { type: "string" },
  });
}

async function callOpenAIJson({ schemaName, schema, system, user, maxOutputTokens = 2500 }) {
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

async function findExistingEntry(supabaseAdmin, text) {
  const key = normalizeKey(text);
  const { data: direct } = await supabaseAdmin.from("learning_objects").select("id, status").ilike("swedish", key).neq("status", "retired").limit(1);
  if (direct?.length) return direct[0].id;
  const { data: form } = await supabaseAdmin.from("word_forms").select("learning_object_id").ilike("form_value", key).limit(1);
  return form?.[0]?.learning_object_id || null;
}

async function ensureTranslation(supabaseAdmin, entryId, nativeLanguage) {
  const { data } = await supabaseAdmin.from("learning_object_translations").select("id, meaning")
    .eq("learning_object_id", entryId).eq("native_language", nativeLanguage).maybeSingle();
  return Boolean(data?.meaning);
}

/**
 * Returns { entryId, created } — reuses an existing public entry whenever one
 * exists (headword or inflected form), so a word is only ever paid for once.
 */
export async function generateWordEntry({ supabaseAdmin, userId, word, nativeLanguage }) {
  const text = String(word || "").trim();
  if (!text || text.length > 60 || !/^[\p{L}\s-]+$/u.test(text)) throw httpError(400, "Skriv ett svenskt ord eller uttryck.");
  const lang = normalizeLanguage(nativeLanguage);

  const existing = await findExistingEntry(supabaseAdmin, text);
  if (existing && (await ensureTranslation(supabaseAdmin, existing, lang))) return { entryId: existing, created: false };

  // Concurrency guard: one in-flight generation per (text, language).
  const key = `${normalizeKey(text)}|${lang}`;
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
    await enforceQuota(supabaseAdmin, userId, CREDITS.word_generate);
    const langName = languageName(lang);
    const { result, usage } = await callOpenAIJson({
      schemaName: "swedish_word_card_v2",
      schema: wordCardSchema(),
      system: `You are a careful Swedish lexicographer writing a learner's dictionary entry for ${langName}-speaking learners. The UI is Swedish. Return exactly one entry for the Swedish input.
- is_real_word: false if the input is not real Swedish (typo, name, other language). Then leave other fields minimal.
- lemma: the dictionary base form (an inflected input like "förändrade" becomes "förändra"). For multi-word expressions keep the canonical learnable form (infinitive, "någon/något" placeholders).
- meaning: concise core meaning in ${langName} ONLY. swedish_explanation: one simple Swedish definition.
- forms: full inflection for the part of speech using only the allowed form types (verbs include present_participle and perfect_participle when they exist; verb_group / declension_group as "1"–"5" when applicable). Empty for expressions.
- passive: the s-passive for verbs when natural (e.g. "påverkas"), else "".
- examples: 2 natural Swedish sentences with ${langName} translations.
- collocations: 3–5 high-frequency fixed combinations with ${langName} meaning and a Swedish example.
- related: 3–6 word-family members or related words with ${langName} meanings.
- memory_tip: a short ${langName} mnemonic, or "".
Never mix the two languages inside one field. If uncertain about a sense, prefer the most common one.`,
      user: text,
    });
    const cost = ((usage.input_tokens || 0) / 1e6) * 0.75 + ((usage.output_tokens || 0) / 1e6) * 4.5;
    await logUsage(supabaseAdmin, { userId, feature: "word_generate", model: MODEL, inputTokens: usage.input_tokens, outputTokens: usage.output_tokens, credits: CREDITS.word_generate, cost });

    if (!result.is_real_word || !String(result.lemma || "").trim() || !String(result.meaning || "").trim()) {
      throw httpError(422, "Det verkar inte vara ett svenskt ord. Kontrollera stavningen.");
    }
    const lemma = String(result.lemma).trim();

    // The lemma may already exist even if the inflected input didn't match.
    let entryId = await findExistingEntry(supabaseAdmin, lemma);
    if (!entryId) {
      entryId = randomUUID();
      const pos = POS_VALUES.includes(result.pos) ? result.pos : "other";
      const isPhrase = /\s/.test(lemma);
      const { error: insertError } = await supabaseAdmin.from("learning_objects").insert({
        id: entryId,
        swedish: lemma,
        part_of_speech: isPhrase ? "other" : pos,
        pos_detail: result.pos_detail || "",
        object_type: isPhrase ? "phrase" : "word",
        category: isPhrase ? "common_phrase" : null,
        chinese: lang === "zh" ? result.meaning : "",
        swedish_explanation: result.swedish_explanation || "",
        example_sv: (result.examples || []).map((e) => e.swedish).join("\n"),
        transitivity: result.transitivity || null,
        passiv_s: result.passive || "",
        source: "ai search",
        status: "ai_generated",
      });
      if (insertError) {
        // Lost a race with another insert of the same (swedish, pos): reuse it.
        const raced = await findExistingEntry(supabaseAdmin, lemma);
        if (!raced) throw insertError;
        entryId = raced;
      } else {
        const forms = (result.forms || []).filter((f) => f.value && ALL_FORM_TYPES.includes(f.type));
        if (forms.length) {
          await supabaseAdmin.from("word_forms").upsert(
            forms.map((f, i) => ({ learning_object_id: entryId, form_type: f.type, form_value: f.value, sort_order: i })),
            { onConflict: "learning_object_id,form_type" },
          );
        }
        for (const [i, ex] of (result.examples || []).entries()) {
          const { data: exRow } = await supabaseAdmin.from("learning_object_examples")
            .insert({ learning_object_id: entryId, example_swedish: ex.swedish, sort_order: i }).select("id").single();
          if (exRow && ex.translation) {
            await supabaseAdmin.from("learning_object_example_translations")
              .insert({ example_id: exRow.id, native_language: lang, translation: ex.translation });
          }
        }
        const collocations = (result.collocations || []).filter((c) => c.phrase);
        if (collocations.length) {
          await supabaseAdmin.from("learning_object_collocations").insert(
            collocations.map((c, i) => ({ learning_object_id: entryId, phrase_text: c.phrase, sort_order: i })),
          );
        }
      }
    }

    // Explanation-language row (also fills a missing language for an existing entry).
    await supabaseAdmin.from("learning_object_translations").upsert({
      learning_object_id: entryId,
      native_language: lang,
      meaning: result.meaning,
      learning_tip: result.memory_tip || "",
      collocations: (result.collocations || []).map((c) => [c.phrase, c.meaning, c.example].filter(Boolean).join(" | ")).join("\n"),
      related_words: (result.related || []).map((r) => `${r.word} | ${r.meaning}`).join("\n"),
      updated_at: new Date().toISOString(),
    }, { onConflict: "learning_object_id,native_language" });

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
