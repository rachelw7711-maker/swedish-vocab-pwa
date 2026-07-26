import 'dotenv/config';
import { createClient } from "@supabase/supabase-js";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { randomUUID } from "node:crypto";
import { analyzeReadingResource, generateReadingSummary, extractTextFromImage } from "./server-reading.mjs";
import { generateWord, promoteCollocationToPhrase, readPublicWords } from "./server-words.mjs";

const PORT = Number(process.env.PORT || 4174);
const ROOT = process.cwd();
const STATIC_ROOT = existsSync(join(ROOT, "dist", "index.html")) ? join(ROOT, "dist") : ROOT;
const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY || process.env.SPEECH_KEY;
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || process.env.SPEECH_REGION;
const AZURE_SPEECH_VOICE = process.env.AZURE_SPEECH_VOICE || "sv-SE-SofieNeural";
const AZURE_SPEECH_DIALOGUE_VOICE_A = process.env.AZURE_SPEECH_DIALOGUE_VOICE_A || AZURE_SPEECH_VOICE;
const AZURE_SPEECH_DIALOGUE_VOICE_B = process.env.AZURE_SPEECH_DIALOGUE_VOICE_B || "sv-SE-MattiasNeural";
const AZURE_SPEECH_VOICES = new Set([
  "sv-SE-SofieNeural",
  "sv-SE-MattiasNeural",
  "sv-SE-HilleviNeural",
  "en-US-AvaMultilingualNeural",
  "en-US-AndrewMultilingualNeural",
  "en-US-EmmaMultilingualNeural",
  "en-US-BrianMultilingualNeural",
]);
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_turbo_v2_5";
const ELEVENLABS_LANGUAGE_CODE = process.env.ELEVENLABS_LANGUAGE_CODE || "sv";
const SHADOWING_STANDARD_AUDIO_BUCKET = "shadowing-standard-audio";

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".ts": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".md": "text/markdown; charset=utf-8",
};

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function clean(value) {
  return String(value || "").trim();
}

function escapeXml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function dialogueTurns(text) {
  const lines = String(text || "").split(/\n+/).map((line) => clean(line)).filter(Boolean);
  if (lines.length < 2) return [];
  const speakerVoices = new Map();
  let markedLines = 0;
  const turns = lines.map((line, index) => {
    const speakerMatch = line.match(/^([^:：]{1,32})[:：]\s*(.+)$/u);
    const dashMatch = line.match(/^[-–—]\s*(.+)$/u);
    if (speakerMatch?.[2]) {
      markedLines += 1;
      const speaker = clean(speakerMatch[1]).toLocaleLowerCase("sv-SE");
      if (!speakerVoices.has(speaker)) {
        speakerVoices.set(speaker, speakerVoices.size % 2 === 0 ? AZURE_SPEECH_DIALOGUE_VOICE_A : AZURE_SPEECH_DIALOGUE_VOICE_B);
      }
      return { text: clean(speakerMatch[2]), voice: speakerVoices.get(speaker) };
    }
    if (dashMatch?.[1]) {
      markedLines += 1;
      return { text: clean(dashMatch[1]), voice: index % 2 === 0 ? AZURE_SPEECH_DIALOGUE_VOICE_A : AZURE_SPEECH_DIALOGUE_VOICE_B };
    }
    return { text: line, voice: index % 2 === 0 ? AZURE_SPEECH_DIALOGUE_VOICE_A : AZURE_SPEECH_DIALOGUE_VOICE_B };
  });
  return markedLines >= 2 ? turns.filter((turn) => turn.text) : [];
}

function azureSpeechSsml(text, voice = AZURE_SPEECH_VOICE) {
  return `<speak version="1.0" xml:lang="sv-SE"><voice xml:lang="sv-SE" name="${escapeXml(voice)}">${escapeXml(text)}</voice></speak>`;
}

function elevenLabsSpeechPayload(text) {
  const payload = {
    text,
    model_id: ELEVENLABS_MODEL_ID,
    voice_settings: {
      stability: 0.6,
      similarity_boost: 0.8,
      style: 0,
      use_speaker_boost: true,
    },
  };
  if (ELEVENLABS_LANGUAGE_CODE && ELEVENLABS_MODEL_ID !== "eleven_multilingual_v2") {
    payload.language_code = ELEVENLABS_LANGUAGE_CODE;
  }
  return payload;
}

async function synthesizeAzureTurn(text, voice) {
  if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
    const error = new Error("Azure Speech is not configured.");
    error.status = 500;
    throw error;
  }
  const response = await fetch(`https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-160kbitrate-mono-mp3",
      "User-Agent": "swedish-vocab-pwa",
    },
    body: azureSpeechSsml(text, voice),
  });
  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    const error = new Error(payload || `Azure Speech TTS failed with ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return Buffer.from(await response.arrayBuffer());
}

async function synthesizeWithAzure(text, requestedVoice = "") {
  const turns = dialogueTurns(text);
  const dialogue = turns.length >= 2;
  const selectedVoice = AZURE_SPEECH_VOICES.has(requestedVoice) ? requestedVoice : AZURE_SPEECH_VOICE;
  const audioBuffer = dialogue
    ? Buffer.concat(await Promise.all(turns.map((turn) => synthesizeAzureTurn(turn.text, turn.voice))))
    : await synthesizeAzureTurn(text, selectedVoice);
  return {
    audioBuffer,
    provider: "azure-speech",
    voiceId: dialogue ? `${AZURE_SPEECH_DIALOGUE_VOICE_A}+${AZURE_SPEECH_DIALOGUE_VOICE_B}` : selectedVoice,
    modelId: "azure-speech-tts",
    languageCode: "sv-SE",
  };
}

async function synthesizeWithElevenLabs(text, voice) {
  if (!ELEVENLABS_API_KEY) {
    const error = new Error("ElevenLabs is not configured.");
    error.status = 500;
    throw error;
  }
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      accept: "audio/mpeg",
      "content-type": "application/json",
    },
    body: JSON.stringify(elevenLabsSpeechPayload(text)),
  });
  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    const error = new Error(payload || `ElevenLabs TTS failed with ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return {
    audioBuffer: Buffer.from(await response.arrayBuffer()),
    provider: "elevenlabs",
    voiceId: voice,
    modelId: ELEVENLABS_MODEL_ID,
    languageCode: ELEVENLABS_LANGUAGE_CODE,
  };
}

async function synthesizeSwedishSpeech(text, voice) {
  if (AZURE_SPEECH_KEY && AZURE_SPEECH_REGION) {
    try {
      return await synthesizeWithAzure(text, voice);
    } catch (error) {
      if (!ELEVENLABS_API_KEY) throw error;
      console.warn("[Shadowing TTS] Azure Speech failed. Falling back to ElevenLabs.", error);
    }
  }
  return synthesizeWithElevenLabs(text, voice);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function bearerToken(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function authDebugInfo(req) {
  const header = req.headers.authorization || "";
  const token = bearerToken(req);
  return {
    hasAuthorizationHeader: Boolean(header),
    startsWithBearer: /^Bearer\s+/i.test(header),
    tokenLength: token.length,
  };
}

async function readAuthenticatedUser(req) {
  if (!supabaseAdmin) {
    const error = new Error("Supabase service role is not configured on the server.");
    error.status = 500;
    throw error;
  }
  const token = bearerToken(req);
  console.info("[Shadowing TTS] Authorization", authDebugInfo(req));
  if (!token) {
    const error = new Error("Missing Supabase auth token.");
    error.status = 401;
    throw error;
  }
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user?.id) {
    console.warn("[Shadowing TTS] Supabase getUser failed", {
      success: false,
      errorMessage: error?.message || "No Supabase user returned.",
    });
    const authError = new Error("Invalid Supabase auth token.");
    authError.status = 401;
    throw authError;
  }
  console.info("[Shadowing TTS] Supabase getUser succeeded", {
    success: true,
    userId: data.user.id,
  });
  return data.user;
}

function createUserSupabaseClient(req) {
  const token = bearerToken(req);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !token) {
    const error = new Error("Supabase user client cannot be configured on the server.");
    error.status = 500;
    throw error;
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

function extractOutputText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .join("")
    .trim();
}

async function markShadowingTtsFailed(client, userId, itemId, message, voiceId = "") {
  if (!client || !userId || !itemId) return;
  await client
    .from("shadowing_items")
    .update({
      tts_provider: "elevenlabs",
      tts_voice_id: clean(voiceId),
      tts_status: "failed",
      tts_error: clean(message).slice(0, 1000),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", itemId);
}

async function generateShadowingTts(req) {
  console.info("[Shadowing TTS] /api/shadowing/tts called");
  if (!AZURE_SPEECH_KEY && !ELEVENLABS_API_KEY) {
    const error = new Error("AI Voice is not configured.");
    error.status = 500;
    throw error;
  }
  if (!supabaseAdmin && !SUPABASE_URL) {
    const error = new Error("Supabase service role is not configured on the server.");
    error.status = 500;
    throw error;
  }

  let user = null;
  let supabaseUser = null;
  if (bearerToken(req)) {
    user = await readAuthenticatedUser(req);
    supabaseUser = createUserSupabaseClient(req);
  }
  const { text, voiceId, itemId } = await readBody(req);
  const swedishText = clean(text);
  const voice = clean(voiceId);
  const shadowingItemId = clean(itemId);
  if (!swedishText) {
    const error = new Error("Svensk text saknas.");
    error.status = 400;
    throw error;
  }
  if (!voice) {
    const error = new Error("ElevenLabs voiceId saknas.");
    error.status = 400;
    throw error;
  }
  if (!shadowingItemId) {
    const error = new Error("Shadowing itemId saknas.");
    error.status = 400;
    throw error;
  }

  if (user?.id && supabaseUser) {
    const now = new Date().toISOString();
    const { error: statusError } = await supabaseUser
      .from("shadowing_items")
      .update({
        tts_provider: AZURE_SPEECH_KEY && AZURE_SPEECH_REGION ? "azure-speech" : "elevenlabs",
        tts_voice_id: AZURE_SPEECH_KEY && AZURE_SPEECH_REGION ? AZURE_SPEECH_VOICE : voice,
        tts_model_id: AZURE_SPEECH_KEY && AZURE_SPEECH_REGION ? "azure-speech-tts" : ELEVENLABS_MODEL_ID,
        tts_status: "generating",
        tts_error: "",
        updated_at: now,
      })
      .eq("user_id", user.id)
      .eq("id", shadowingItemId);
    if (statusError) throw statusError;
  }

  try {
    console.info("[Shadowing TTS] Speech synthesis started", {
      itemId: shadowingItemId,
      textLength: swedishText.length,
      provider: AZURE_SPEECH_KEY && AZURE_SPEECH_REGION ? "azure-speech" : "elevenlabs",
    });
    const speech = await synthesizeSwedishSpeech(swedishText, voice);
    console.info("[Shadowing TTS] Speech synthesis completed", {
      provider: speech.provider,
      voiceId: speech.voiceId,
      modelId: speech.modelId,
      languageCode: speech.languageCode,
    });
    const { audioBuffer } = speech;
    if (!user?.id || !supabaseUser) {
      return {
        item: null,
        dataUrl: `data:audio/mpeg;base64,${audioBuffer.toString("base64")}`,
        mimeType: "audio/mpeg",
        sizeBytes: audioBuffer.byteLength,
        provider: speech.provider,
        voiceId: speech.voiceId,
        modelId: speech.modelId,
        languageCode: speech.languageCode,
        status: "ready",
      };
    }

    const storagePath = `${user.id}/${shadowingItemId}/standard.mp3`;
    const { error: uploadError } = await supabaseUser.storage
      .from(SHADOWING_STANDARD_AUDIO_BUCKET)
      .upload(storagePath, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const { data: item, error: updateError } = await supabaseUser
      .from("shadowing_items")
      .update({
        standard_audio_bucket: SHADOWING_STANDARD_AUDIO_BUCKET,
        standard_audio_path: storagePath,
        standard_audio_mime_type: "audio/mpeg",
        standard_audio_size_bytes: audioBuffer.byteLength,
        tts_provider: speech.provider,
        tts_voice_id: speech.voiceId,
        tts_model_id: speech.modelId,
        tts_status: "ready",
        tts_error: "",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("id", shadowingItemId)
      .select()
      .single();
    if (updateError) throw updateError;

    return {
      item,
      bucket: SHADOWING_STANDARD_AUDIO_BUCKET,
      path: storagePath,
      mimeType: "audio/mpeg",
      sizeBytes: audioBuffer.byteLength,
      provider: speech.provider,
      voiceId: speech.voiceId,
      modelId: speech.modelId,
      languageCode: speech.languageCode,
      status: "ready",
    };
  } catch (error) {
    if (user?.id && supabaseUser) {
      await markShadowingTtsFailed(supabaseUser, user.id, shadowingItemId, error.message || "ElevenLabs TTS failed.", voice);
    }
    throw error;
  }
}

// "Promote" a word-card collocation into a standalone Fraser/Uttryck
// learning_objects entry. Routed through the server (service role) rather
// than a direct client insert because the anon key has no write grant on
// learning_objects (confirmed live: 42501 permission denied) — this is
// shared public catalog content, not a user-private row, so it can't go
// through the same client-side path as personal word edits.
//
// NOTE for future multi-user launch: no auth/role check here yet since
// the only caller today is the founder testing locally. Before opening
// signups, add an admin/curator check here so arbitrary users can't
// write into the shared catalog (see spraklab_future_readiness memory).
async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(STATIC_ROOT, safePath);

  try {
    let file = await readFile(filePath);
    const headers = {
      "content-type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "cache-control": "no-store",
    };
    if (safePath === "/src/lib/supabase.js" || safePath === "src/lib/supabase.js") {
      file = Buffer.from(
        file.toString("utf8").replace(
          "const env = import.meta.env || {};",
          `const env = ${JSON.stringify({
            VITE_SUPABASE_URL: SUPABASE_URL || "",
            VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY || "",
          })};`,
        ),
      );
    }
    if (url.searchParams.has("clear")) {
      headers["clear-site-data"] = '"cache", "storage"';
    }
    res.writeHead(200, headers);
    res.end(file);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/generate-word") {
      const { word, source } = await readBody(req);
      if (!word || typeof word !== "string") {
        sendJson(res, 400, { error: "Skriv ett svenskt ord." });
        return;
      }
      const entry = await generateWord(word.trim(), source);
      sendJson(res, 200, { entry });
      return;
    }

    if (req.method === "POST" && req.url === "/api/reading/analyze") {
      // Gated to logged-in users — this calls a paid AI API, and
      // reading_items themselves already require auth (RLS), so an
      // anonymous caller could never save the result anyway. Unlike
      // /api/generate-word (pre-existing, ungated), don't repeat that gap
      // here now that it's been noticed — see spraklab_future_readiness memory.
      const user = await readAuthenticatedUser(req);
      const { text, sourceType } = await readBody(req);
      if (!text || typeof text !== "string" || !text.trim()) {
        sendJson(res, 400, { error: "Klistra in en text att analysera." });
        return;
      }
      if (text.length > 20000) {
        sendJson(res, 400, { error: "Texten är för lång (max 20 000 tecken)." });
        return;
      }
      const { textResource, analysis, tier, cached } = await analyzeReadingResource({
        supabaseAdmin,
        userId: user.id,
        text: text.trim(),
        sourceType: sourceType || "paste",
      });
      sendJson(res, 200, { textResource, analysis, tier, cached });
      return;
    }

    if (req.method === "POST" && req.url === "/api/reading/summary") {
      const user = await readAuthenticatedUser(req);
      const { textResourceId } = await readBody(req);
      if (!textResourceId) {
        sendJson(res, 400, { error: "textResourceId saknas." });
        return;
      }
      const summary = await generateReadingSummary({ supabaseAdmin, userId: user.id, textResourceId });
      sendJson(res, 200, { summary });
      return;
    }

    if (req.method === "POST" && req.url === "/api/reading/ocr") {
      const user = await readAuthenticatedUser(req);
      const { imageDataUrl } = await readBody(req);
      if (!imageDataUrl || typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
        sendJson(res, 400, { error: "Ingen giltig bild mottagen." });
        return;
      }
      const { text, usage } = await extractTextFromImage({ imageDataUrl });
      if (!text) {
        sendJson(res, 200, { text: "", warning: "Ingen läsbar svensk text hittades i bilden." });
        return;
      }
      const inputTokens = usage.input_tokens || 0;
      const outputTokens = usage.output_tokens || 0;
      await supabaseAdmin.from("ai_usage_logs").insert({
        user_id: user.id,
        feature: "ocr",
        model: MODEL,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        credits_used: 0,
        actual_cost: (inputTokens / 1_000_000) * 0.75 + (outputTokens / 1_000_000) * 4.5,
        cache_hit: false,
      });
      sendJson(res, 200, { text });
      return;
    }

    if (req.method === "POST" && req.url === "/api/shadowing/tts") {
      const result = await generateShadowingTts(req);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && req.url === "/api/promote-collocation") {
      const { sourceWordId, phrase, meaning, exampleSv, cefrLevel } = await readBody(req);
      const entry = await promoteCollocationToPhrase({ supabaseAdmin, sourceWordId, phrase, meaning, exampleSv, cefrLevel });
      sendJson(res, 200, { entry });
      return;
    }

    if (req.method === "GET" && req.url === "/api/words") {
      const words = await readPublicWords({ supabaseAdmin });
      sendJson(res, 200, { words, count: words.length });
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      await serveStatic(req, res);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Server error" });
  }
}).listen(PORT, "0.0.0.0", () => {
  console.log(`Min ordbok server: http://localhost:${PORT}/`);
});
