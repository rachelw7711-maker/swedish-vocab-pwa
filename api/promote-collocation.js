import { createClient } from "@supabase/supabase-js";
import { promoteCollocationToPhrase } from "../server-words.mjs";

// Real Vercel serverless function — see api/reading/analyze.js. This is
// the word card's "+ Fraser" button endpoint.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
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
    const { sourceWordId, phrase, meaning, exampleSv, cefrLevel } = req.body || {};
    const entry = await promoteCollocationToPhrase({ supabaseAdmin, sourceWordId, phrase, meaning, exampleSv, cefrLevel });
    sendJson(res, 200, { entry });
  } catch (error) {
    console.error("[api/promote-collocation]", error);
    sendJson(res, error.status || 500, { error: error.message || "Kunde inte skapa frasen." });
  }
}
