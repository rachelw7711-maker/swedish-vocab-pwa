import { createClient } from "@supabase/supabase-js";
import { translateReadingText } from "../../server-reading.mjs";

// Real Vercel serverless function — see api/reading/analyze.js.

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
    const error = new Error("Logga in för att översätta text.");
    error.status = 401;
    throw error;
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(authHeader.slice(7).trim());
  if (error || !data?.user?.id) {
    const authError = new Error("Logga in för att översätta text.");
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
    const { text, scopeType, textResourceId } = req.body || {};
    if (!clean(text)) {
      sendJson(res, 400, { error: "Ingen text att översätta." });
      return;
    }
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const result = await translateReadingText({
      supabaseAdmin,
      userId,
      textResourceId: textResourceId || null,
      text,
      scopeType: scopeType === "full" ? "full" : "selection",
    });
    sendJson(res, 200, result);
  } catch (error) {
    console.error("[api/reading/translate]", error);
    sendJson(res, error.status || 500, { error: error.message || "Kunde inte översätta texten." });
  }
}
