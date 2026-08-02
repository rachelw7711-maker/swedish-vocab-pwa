import { createClient } from "@supabase/supabase-js";
import { analyzeReadingResourceDeep } from "../../server-reading.mjs";

// Deep layer of the two-layer generation pipeline (2026-08-02) — the client
// calls this right after /api/reading/analyze returns a fast-layer result
// with deepReady:false. Runs the heavier vocabulary/expressions/sentences/
// patterns work and fills in the same text_analysis row analyze.js already
// created. See analyze.js for the production-vs-local-dev routing context
// (every real endpoint needs a file under api/, not just a server.mjs
// route, or it silently no-ops in production).

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
    const { textResourceId } = req.body || {};
    const id = clean(textResourceId);
    if (!id) {
      sendJson(res, 400, { error: "textResourceId saknas." });
      return;
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { analysis, tier } = await analyzeReadingResourceDeep({ supabaseAdmin, userId, textResourceId: id });
    sendJson(res, 200, { analysis, tier });
  } catch (error) {
    console.error("[api/reading/analyze-deep]", error);
    sendJson(res, error.status || 500, { error: error.message || "Kunde inte slutföra analysen." });
  }
}
