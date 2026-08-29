import { createClient } from "@supabase/supabase-js";
import { generateShadowingAudio } from "../../server-shadowing.mjs";

// Real Vercel serverless function. Synthesis + shadowing_items bookkeeping
// now live in server-shadowing.mjs, shared with server.mjs's local-dev
// mirror (SprakLab-Audit-Report.md §4.1) — this file only does request
// parsing and auth extraction, matching every other api/*.js file's shape.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

function clean(value) {
  return String(value || "").trim();
}

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

// Not auth-required: speakSwedish() in app.js (the "Lyssna" pronunciation
// button on every word card) calls this endpoint with no token by design,
// for both anonymous and logged-in users — see SprakLab-Audit-Report.md
// §3.2. A missing/invalid token just means an anonymous, non-persisted
// synthesis (generateShadowingAudio's ephemeral dataUrl path).
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
    const result = await generateShadowingAudio({ user, userSupabaseClient, text, voiceId, itemId });
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Server error" });
  }
}
