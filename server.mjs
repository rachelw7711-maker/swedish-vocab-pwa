import 'dotenv/config';
import { createClient } from "@supabase/supabase-js";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.env.PORT || 4174);
const ROOT = process.cwd();
const STATIC_ROOT = existsSync(join(ROOT, "dist", "index.html")) ? join(ROOT, "dist") : ROOT;
const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
const SHADOWING_STANDARD_AUDIO_BUCKET = "shadowing-standard-audio";
const WORD_PAGE_SIZE = 1000;

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
    tags: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["swedish", "pos", "pos_detail", "chinese", "english", "forms", "example", "collocations", "related_words", "tags"],
};

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function formatTags(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return String(value || "").trim();
}

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function clean(value) {
  return String(value || "").trim();
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

async function generateWord(word, source = null) {
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
    headers: {
      authorization: `Bearer ${OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      reasoning: { effort: "low" },
      tools: [{ type: "web_search" }],
      tool_choice: "auto",
      text: {
        format: {
          type: "json_schema",
          name: "swedish_word_card",
          strict: true,
          schema: wordSchema,
        },
      },
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
  if (!ELEVENLABS_API_KEY) {
    const error = new Error("ELEVENLABS_API_KEY saknas på servern.");
    error.status = 500;
    throw error;
  }
  if (!supabaseAdmin) {
    const error = new Error("Supabase service role is not configured on the server.");
    error.status = 500;
    throw error;
  }

  const user = await readAuthenticatedUser(req);
  const supabaseUser = createUserSupabaseClient(req);
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

  const now = new Date().toISOString();
  const { error: statusError } = await supabaseUser
    .from("shadowing_items")
    .update({
      tts_provider: "elevenlabs",
      tts_voice_id: voice,
      tts_model_id: ELEVENLABS_MODEL_ID,
      tts_status: "generating",
      tts_error: "",
      updated_at: now,
    })
    .eq("user_id", user.id)
    .eq("id", shadowingItemId);
  if (statusError) throw statusError;

  try {
    console.info("[Shadowing TTS] ElevenLabs call started", {
      itemId: shadowingItemId,
      textLength: swedishText.length,
      voiceId: voice,
      modelId: ELEVENLABS_MODEL_ID,
    });
    const elevenResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}`, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        accept: "audio/mpeg",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        text: swedishText,
        model_id: ELEVENLABS_MODEL_ID,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0,
          use_speaker_boost: true,
        },
      }),
    });
    console.info("[Shadowing TTS] ElevenLabs response", {
      status: elevenResponse.status,
      ok: elevenResponse.ok,
    });
    if (!elevenResponse.ok) {
      const payload = await elevenResponse.text().catch(() => "");
      console.warn("[Shadowing TTS] ElevenLabs error body", {
        status: elevenResponse.status,
        body: payload.slice(0, 1000),
      });
      const error = new Error(payload || `ElevenLabs TTS failed with ${elevenResponse.status}.`);
      error.status = elevenResponse.status;
      throw error;
    }

    const audioBuffer = Buffer.from(await elevenResponse.arrayBuffer());
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
        tts_provider: "elevenlabs",
        tts_voice_id: voice,
        tts_model_id: ELEVENLABS_MODEL_ID,
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
      provider: "elevenlabs",
      voiceId: voice,
      status: "ready",
    };
  } catch (error) {
    await markShadowingTtsFailed(supabaseUser, user.id, shadowingItemId, error.message || "ElevenLabs TTS failed.", voice);
    throw error;
  }
}

async function readPublicWords() {
  if (!supabaseAdmin) {
    const error = new Error("Supabase service role is not configured on the server.");
    error.status = 500;
    throw error;
  }

  const words = [];
  for (let from = 0; ; from += WORD_PAGE_SIZE) {
    const to = from + WORD_PAGE_SIZE - 1;
    const { data, error } = await supabaseAdmin
      .from("words")
      .select("*")
      .order("swedish", { ascending: true })
      .range(from, to);
    if (error) throw error;
    words.push(...(data || []));
    if (!data || data.length < WORD_PAGE_SIZE) break;
  }

  console.log("[Min Ordbok] server public.words query result", {
    error: null,
    count: words.length,
    sample: words.slice(0, 3),
  });
  return words;
}

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

    if (req.method === "POST" && req.url === "/api/shadowing/tts") {
      const result = await generateShadowingTts(req);
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "GET" && req.url === "/api/words") {
      const words = await readPublicWords();
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
