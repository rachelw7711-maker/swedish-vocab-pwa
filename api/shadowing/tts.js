import { createClient } from "@supabase/supabase-js";
import { generateShadowingAudio } from "../../server-shadowing.mjs";
import { adminClient, cachedSpeech } from "../../server-native.mjs";

// Real Vercel serverless function. Synthesis + shadowing_items bookkeeping
// now live in server-shadowing.mjs, shared with server.mjs's local-dev
// mirror (SprakLab-Audit-Report.md §4.1) — this file only does request
// parsing and auth extraction, matching every other api/*.js file's shape.
//
// 2026-10-16 (native iOS v1 hardening):
// - itemId "pronunciation" = short word/sentence audio (native app). Served from
//   the shared public "tts-cache" bucket (generate once per text+voice, reuse
//   forever) and returned as a URL.
// - Anonymous callers (the web app's "Lyssna" button sends no token) are capped
//   at ANON_MAX_CHARS so the unauthenticated path can't be used to run up Azure cost.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const ANON_MAX_CHARS = 200;
const CACHE_MAX_CHARS = 1200;

function clean(value) {
  return String(value || "").trim();
}

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

async function readUser(req) {
  const authHeader = clean(req.headers.authorization || req.headers.Authorization);
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return { user: null, userSupabaseClient: null };
  }
  const userSupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await userSupabaseClient.auth.getUser(authHeader.slice(7).trim());
  if (error || !data?.user?.id) {
    const authError = new Error("Logga in för att generera standardljud.");
    authError.status = 401;
    throw authError;
  }
  return { user: data.user, userSupabaseClient };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      sendJson(res, 500, { error: "Supabase is not configured." });
      return;
    }

    const { user, userSupabaseClient } = await readUser(req);
    const { text, voiceId, itemId } = req.body || {};
    const length = clean(text).length;
    if (!user && length > ANON_MAX_CHARS) {
      sendJson(res, 401, { error: "Logga in för att lyssna på längre texter." });
      return;
    }

    // Web app compatibility: its anonymous "Lyssna" call (random itemId, no token)
    // keeps the original ephemeral dataUrl response from generateShadowingAudio.
    if (clean(itemId) === "pronunciation") {
      if (length > CACHE_MAX_CHARS) {
        sendJson(res, 400, { error: "Texten är för lång för uttal." });
        return;
      }
      const cached = await cachedSpeech({ supabaseAdmin: adminClient(), text, voiceId });
      sendJson(res, 200, { ...cached, status: "ready" });
      return;
    }

    const result = await generateShadowingAudio({ user, userSupabaseClient, text, voiceId, itemId });
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Server error" });
  }
}
