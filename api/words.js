import { createClient } from "@supabase/supabase-js";
import { readPublicWords } from "../server-words.mjs";

// Real Vercel serverless function — see api/reading/analyze.js. This is
// only a fallback db.js reaches for if the browser's direct Supabase fetch
// fails (loadWordsThroughServerFallback), not the primary word-loading path.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      sendJson(res, 500, { error: "Supabase är inte konfigurerat på servern." });
      return;
    }
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const words = await readPublicWords({ supabaseAdmin });
    sendJson(res, 200, { words, count: words.length });
  } catch (error) {
    console.error("[api/words]", error);
    sendJson(res, error.status || 500, { error: error.message || "Kunde inte läsa ordlistan." });
  }
}
