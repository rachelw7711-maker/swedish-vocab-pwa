import 'dotenv/config';
import { createClient } from "@supabase/supabase-js";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { randomUUID } from "node:crypto";
import { analyzeReadingResourceFast, analyzeReadingResourceDeep, classifyReadingExpression, generateReadingSummary, extractTextFromImage, calculateCredits } from "./server-reading.mjs";
import { generateWord, promoteCollocationToPhrase, readPublicWords, markWordsReviewed } from "./server-words.mjs";
import { generateShadowingAudio } from "./server-shadowing.mjs";

const PORT = Number(process.env.PORT || 4174);
const ROOT = process.cwd();
const STATIC_ROOT = existsSync(join(ROOT, "dist", "index.html")) ? join(ROOT, "dist") : ROOT;
const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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

// Not auth-required, mirrors api/shadowing/tts.js's readUser — see
// SprakLab-Audit-Report.md §3.2/§4.1. Missing/invalid token just means an
// anonymous, non-persisted synthesis (speakSwedish's "Lyssna" pronunciation
// button relies on exactly this).
async function readShadowingUser(req) {
  if (!bearerToken(req)) return { user: null, userSupabaseClient: null };
  const user = await readAuthenticatedUser(req);
  const userSupabaseClient = createUserSupabaseClient(req);
  return { user, userSupabaseClient };
}

// "Promote" a word-card collocation into a standalone Fraser/Uttryck
// learning_objects entry. Routed through the server (service role) rather
// than a direct client insert because the anon key has no write grant on
// learning_objects (confirmed live: 42501 permission denied) — this is
// shared public catalog content, not a user-private row, so it can't go
// through the same client-side path as personal word edits.
//
// 2026-08-29: now requires login (readAuthenticatedUser below), closing
// the gap this comment used to flag — see SprakLab-Audit-Report.md §3.3.
// Still no separate admin/curator role (none exists in the codebase yet);
// revisit before opening signups if promotion should be curator-only.
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
      // 2026-08-29 audit fix (SprakLab-Audit-Report.md §3.1): was ungated,
      // matching the real production api/generate-word.js fix.
      await readAuthenticatedUser(req);
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
      const { text, sourceType, glossary } = await readBody(req);
      if (!text || typeof text !== "string" || !text.trim()) {
        sendJson(res, 400, { error: "Klistra in en text att analysera." });
        return;
      }
      if (text.length > 20000) {
        sendJson(res, 400, { error: "Texten är för lång (max 20 000 tecken)." });
        return;
      }
      const { textResource, analysis, tier, cached, deepReady } = await analyzeReadingResourceFast({
        supabaseAdmin,
        userId: user.id,
        text: text.trim(),
        sourceType: sourceType || "paste",
        glossary: Array.isArray(glossary) ? glossary : [],
      });
      sendJson(res, 200, { textResource, analysis, tier, cached, deepReady });
      return;
    }

    if (req.method === "POST" && req.url === "/api/reading/analyze-deep") {
      const user = await readAuthenticatedUser(req);
      const { textResourceId } = await readBody(req);
      if (!textResourceId) {
        sendJson(res, 400, { error: "textResourceId saknas." });
        return;
      }
      const { analysis, tier } = await analyzeReadingResourceDeep({ supabaseAdmin, userId: user.id, textResourceId });
      sendJson(res, 200, { analysis, tier });
      return;
    }

    if (req.method === "POST" && req.url === "/api/reading/classify-expression") {
      await readAuthenticatedUser(req);
      const { expressionId, classification } = await readBody(req);
      const entry = await classifyReadingExpression({ supabaseAdmin, expressionId, classification });
      sendJson(res, 200, { entry });
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
      const { text, glossary, usage } = await extractTextFromImage({ imageDataUrl });
      if (!text) {
        sendJson(res, 200, { text: "", glossary: [], warning: "Ingen läsbar svensk text hittades i bilden." });
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
        credits_used: calculateCredits("ocr"),
        actual_cost: (inputTokens / 1_000_000) * 0.75 + (outputTokens / 1_000_000) * 4.5,
        cache_hit: false,
      });
      sendJson(res, 200, { text, glossary });
      return;
    }

    if (req.method === "POST" && req.url === "/api/review/mark-reviewed") {
      const user = await readAuthenticatedUser(req);
      const { ids } = await readBody(req);
      const result = await markWordsReviewed({ supabaseAdmin, ids });
      console.info("[Review gate] marked reviewed", { userId: user.id, ...result });
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && req.url === "/api/shadowing/tts") {
      const { user, userSupabaseClient } = await readShadowingUser(req);
      const { text, voiceId, itemId } = await readBody(req);
      const result = await generateShadowingAudio({ user, userSupabaseClient, text, voiceId, itemId });
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && req.url === "/api/promote-collocation") {
      // 2026-08-29 audit fix (SprakLab-Audit-Report.md §3.3): was ungated,
      // matching the real production api/promote-collocation.js fix.
      await readAuthenticatedUser(req);
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
