import { createClient } from "@supabase/supabase-js";
import { analyzeReadingResource } from "../../server-reading.mjs";

// Real Vercel serverless function — server.mjs's own /api/reading/analyze
// route only ever runs when someone does `node server.mjs` locally.
// vercel.json rewrites every unmatched path to index.html, so in
// production only files under api/ (like this one, and the pre-existing
// api/shadowing/tts.js) actually execute. This was true from the very
// first "Production v1.0" commit — discovered 2026-07-26/27 when Rachel
// hit "Kunde inte analysera texten." testing the new Läsning pipeline; the
// same gap silently affected /api/generate-word, /api/promote-collocation,
// and /api/words too (see Reviews/AI成本控制与阅读模块-实施计划-2026-07-26.md
// follow-up note).

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function clean(value) {
  return String(value || "").trim();
}

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

async function readUserId(req) {
  const authHeader = clean(req.headers.authorization || req.headers.Authorization);
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    const error = new Error("Logga in för att analysera texter.");
    error.status = 401;
    throw error;
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(authHeader.slice(7).trim());
  if (error || !data?.user?.id) {
    const authError = new Error("Logga in för att analysera texter.");
    authError.status = 401;
    throw authError;
  }
  return data.user.id;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      sendJson(res, 500, { error: "Supabase är inte konfigurerat på servern." });
      return;
    }

    const userId = await readUserId(req);
    const { text, sourceType } = req.body || {};
    const trimmed = clean(text);
    if (!trimmed) {
      sendJson(res, 400, { error: "Klistra in en text att analysera." });
      return;
    }
    if (trimmed.length > 20000) {
      sendJson(res, 400, { error: "Texten är för lång (max 20 000 tecken)." });
      return;
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { textResource, analysis, tier, cached } = await analyzeReadingResource({
      supabaseAdmin,
      userId,
      text: trimmed,
      sourceType: sourceType || "paste",
    });
    sendJson(res, 200, { textResource, analysis, tier, cached });
  } catch (error) {
    console.error("[api/reading/analyze]", error);
    sendJson(res, error.status || 500, { error: error.message || "Kunde inte analysera texten." });
  }
}
