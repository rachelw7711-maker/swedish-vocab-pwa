import { createClient } from "@supabase/supabase-js";
import { generateWord } from "../server-words.mjs";

// Real Vercel serverless function — see api/reading/analyze.js for why
// server.mjs's own /api/generate-word route never actually ran in
// production. This is the "Komplettera" button's endpoint.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

// 2026-08-29 audit fix (SprakLab-Audit-Report.md §3.1): this endpoint
// triggers a real paid OpenAI call and previously had no auth check at
// all — copied from api/reading/analyze.js's readUserId, the same pattern
// every other AI-triggering endpoint already uses.
async function readUserId(req) {
  const authHeader = String(req.headers.authorization || req.headers.Authorization || "").trim();
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    const error = new Error("Logga in för att generera ordkort.");
    error.status = 401;
    throw error;
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(authHeader.slice(7).trim());
  if (error || !data?.user?.id) {
    const authError = new Error("Logga in för att generera ordkort.");
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
    await readUserId(req);
    const { word, source } = req.body || {};
    if (!word || typeof word !== "string") {
      sendJson(res, 400, { error: "Skriv ett svenskt ord." });
      return;
    }
    const entry = await generateWord(word.trim(), source);
    sendJson(res, 200, { entry });
  } catch (error) {
    console.error("[api/generate-word]", error);
    sendJson(res, error.status || 500, { error: error.message || "Kunde inte generera ordet." });
  }
}
